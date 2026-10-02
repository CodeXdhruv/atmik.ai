import { Bindings } from '../types/env';
import { KnowledgeChunk, TEACHING_CORPUS, principleKey } from './chunkKnowledge';
import { ReplyMode, expandRetrievalQuery } from './principleRouter';
import { withTimeout } from './timeout';

const VOICE_CONTEXT_CHARS = 1100;
const CHAT_CONTEXT_CHARS = 2600;

type RankedPassage = {
  text: string;
  principle: string;
  section: string;
};

async function queryVectors(env: Bindings, vector: number[], filterCorpus: boolean, topK: number) {
  const options: Record<string, unknown> = { topK, returnMetadata: 'all' };
  if (filterCorpus) options.filter = { corpus: TEACHING_CORPUS };
  return env.VECTORIZE.query(vector, options);
}

function passageText(metadata: Record<string, unknown> | undefined): string {
  const content = metadata?.content;
  return typeof content === 'string' ? content : '';
}

function sectionOf(text: string, metadata?: Record<string, unknown>): string {
  if (typeof metadata?.section === 'string' && metadata.section) return metadata.section;
  const line = text.slice(0, 180);
  if (line.includes('| teaching |')) return 'teaching';
  if (line.includes('| dialogue |')) return 'dialogue';
  if (line.includes('| explanation |')) return 'explanation';
  if (line.includes('| overview |')) return 'overview';
  return '';
}

function preferTeachings(passages: RankedPassage[]): RankedPassage[] {
  const substantive = passages.filter((passage) => passage.section !== 'overview');
  return substantive.length > 0 ? substantive : passages;
}

function diversify(passages: RankedPassage[], limit: number): RankedPassage[] {
  const picked: RankedPassage[] = [];
  const counts = new Map<string, number>();
  const leftovers: RankedPassage[] = [];

  for (const passage of passages) {
    const key = passage.principle || 'other';
    const seen = counts.get(key) ?? 0;
    if (passage.principle && seen >= 2) {
      leftovers.push(passage);
      continue;
    }
    picked.push(passage);
    counts.set(key, seen + 1);
    if (picked.length >= limit) return picked;
  }

  for (const passage of leftovers) {
    if (picked.length >= limit) break;
    picked.push(passage);
  }
  return picked;
}

function clip(text: string, room: number): string {
  if (text.length <= room) return text.trim();
  const breakAt = text.lastIndexOf(' ', room);
  return text.slice(0, breakAt > 80 ? breakAt : room).trim();
}

function capContext(passages: RankedPassage[], limit: number): string {
  const parts: string[] = [];
  let used = 0;
  passages.forEach((passage, index) => {
    const share = index === 0 ? Math.floor(limit * 0.75) : limit - used;
    const room = Math.min(share, limit - used);
    if (room < 220) return;
    const slice = clip(passage.text, room);
    parts.push(slice);
    used += slice.length + 2;
  });
  return parts.join('\n\n');
}

function rerankRows(response: unknown): Array<{ index?: number; score?: number }> | null {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const record = response as { data?: unknown; response?: unknown };
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.response)) return record.response;
  }
  return null;
}

function applyRerank(passages: RankedPassage[], response: unknown): RankedPassage[] {
  const rows = rerankRows(response);
  if (!rows) return passages;
  const ordered = [...rows].sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));
  const ranked = ordered
    .map((item) => (typeof item?.index === 'number' ? passages[item.index] : undefined))
    .filter((item): item is RankedPassage => Boolean(item?.text));
  return ranked.length > 0 ? ranked : passages;
}

export async function retrieveContext(
  env: Bindings,
  query: string,
  _lang: string = 'en',
  mode: ReplyMode = 'chat',
): Promise<string> {
  const fast = mode === 'voice';
  const expanded = expandRetrievalQuery(query);
  const aiResponse: any = await withTimeout(
    env.AI.run('@cf/baai/bge-m3', { text: [expanded] }),
    fast ? 6_000 : 20_000,
    'Embedding',
  );
  const embeddedQuery = aiResponse.data[0];
  const topK = fast ? 8 : 12;

  let vectorResults: any;
  try {
    vectorResults = await queryVectors(env, embeddedQuery, true, topK);
    if (!vectorResults.matches?.length) {
      vectorResults = await queryVectors(env, embeddedQuery, false, topK);
    }
  } catch (error) {
    console.warn('Filtered retrieval unavailable', error);
    vectorResults = await queryVectors(env, embeddedQuery, false, topK);
  }

  if (!vectorResults.matches?.length) {
    return 'No relevant context found.';
  }

  const limit = fast ? 1 : 2;
  const charLimit = fast ? VOICE_CONTEXT_CHARS : CHAT_CONTEXT_CHARS;
  let ranked: RankedPassage[] = vectorResults.matches.map((match: { metadata?: Record<string, unknown> | null }) => {
    const metadata = (match.metadata ?? {}) as Record<string, unknown>;
    const text = passageText(metadata);
    return { text, principle: principleKey(text, metadata), section: sectionOf(text, metadata) };
  }).filter((item: RankedPassage) => item.text);

  try {
    const documents = ranked.map((item) => item.text);
    const rerankResponse: any = await withTimeout(env.AI.run('@cf/baai/bge-reranker-base', {
      query,
      documents,
    }), fast ? 8_000 : 20_000, 'Reranker');
    ranked = applyRerank(ranked, rerankResponse);
  } catch (error) {
    console.error('Reranking failed, returning raw matches', error);
  }

  const context = capContext(diversify(preferTeachings(ranked), limit), charLimit);
  return context || 'No relevant context found.';
}

export async function embedKnowledgeChunks(env: Bindings, chunks: KnowledgeChunk[]): Promise<number> {
  let inserted = 0;
  const batchSize = 5;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const aiResponse: any = await env.AI.run('@cf/baai/bge-m3', {
      text: batch.map((chunk) => chunk.text),
    });

    const vectors = batch.map((chunk, idx) => {
      const metadata: Record<string, string> = {
        content: chunk.text.slice(0, 9000),
      };
      if (chunk.principle) {
        metadata.principle = chunk.principle;
        metadata.topics = chunk.topics;
        metadata.section = chunk.section;
        metadata.claim = chunk.claim;
        metadata.corpus = TEACHING_CORPUS;
      }
      return {
        id: chunk.id,
        values: aiResponse.data[idx],
        metadata,
      };
    });

    const result = await env.VECTORIZE.insert(vectors);
    inserted += result.count || vectors.length;
  }

  return inserted;
}
