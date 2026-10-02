export const TEACHING_CORPUS = 'atmik-teachings-v1';

const MAX_CHARS = 3200;

export type KnowledgeChunk = {
  id: string;
  text: string;
  principle: string;
  topics: string;
  section: string;
  claim: string;
};

const PRINCIPLE_HEADING = /^## PRINCIPLE\s+(\d+)(?:\s*\([^)]*\))?\s*:\s*(.+?)\s*(?:\{#.*)?$/i;

function principleId(num: string): string {
  return `P${num.padStart(2, '0')}`;
}

function classifySection(title: string, body: string): { section: string; claim: string } {
  const explanation = /Approved Atmik explanation/i.test(body);
  if (/dialogue/i.test(title)) {
    return { section: 'dialogue', claim: explanation ? 'philosophical_interpretation' : 'dialogue_example' };
  }
  if (/original teaching|atmik teaching of/i.test(title)) {
    return { section: 'teaching', claim: 'spiritual_teaching' };
  }
  if (/science|neuroscience|psychology/i.test(title) || /#(?:ScientificPerspective|Neuroscience|Psychology)/i.test(body.slice(0, 500))) {
    return { section: 'explanation', claim: 'scientific_claim' };
  }
  if (/practice|exercise|\blived\b/i.test(title)) {
    return { section: 'explanation', claim: 'practical_guidance' };
  }
  if (/^overview/i.test(title)) {
    return { section: 'overview', claim: explanation ? 'philosophical_interpretation' : 'spiritual_teaching' };
  }
  return { section: 'explanation', claim: 'philosophical_interpretation' };
}

function groundingLine(claim: string): string {
  if (claim === 'scientific_claim') {
    return 'Explanatory passage. Wording about the brain or science is a model, not a proven medical fact, and not a quotation.';
  }
  if (claim === 'philosophical_interpretation') {
    return 'Explanatory passage. This is not an established scientific claim and not a verbatim quotation.';
  }
  if (claim === 'practical_guidance') {
    return 'Practical passage from the approved text. Do not turn it into a quotation.';
  }
  if (claim === 'dialogue_example') {
    return 'Dialogue passage. Do not add lines that are not written here.';
  }
  return '';
}

function packPieces(pieces: string[]): string[] {
  const packed: string[] = [];
  let buffer = '';
  for (const piece of pieces) {
    const next = buffer ? `${buffer}\n\n${piece}` : piece;
    if (buffer && next.length > MAX_CHARS) {
      packed.push(buffer.trim());
      buffer = piece;
    } else {
      buffer = next;
    }
  }
  if (buffer.trim()) packed.push(buffer.trim());
  return packed.flatMap((item) => (item.length <= MAX_CHARS + 200 ? [item] : hardSplit(item)));
}

function hardSplit(text: string): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > MAX_CHARS) {
    const window = rest.slice(0, MAX_CHARS);
    const breakAt = Math.max(window.lastIndexOf('\n\n'), window.lastIndexOf('\n'));
    const cut = breakAt > 400 ? breakAt : MAX_CHARS;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

function splitSection(body: string): string[] {
  const trimmed = body.trim();
  if (trimmed.length <= MAX_CHARS) return [trimmed];
  const byHeading = trimmed.split(/\n(?=#### )/);
  if (byHeading.length > 1) return packPieces(byHeading);
  const paragraphs = trimmed.split(/\n\n+/);
  if (paragraphs.length > 1) return packPieces(paragraphs);
  return hardSplit(trimmed);
}

function chunkBlock(headingLine: string, body: string, sequence: { n: number }): KnowledgeChunk[] {
  const heading = headingLine.match(PRINCIPLE_HEADING);
  if (!heading) return [];
  const id = principleId(heading[1]);
  const name = heading[2].replace(/\s*\{#.*$/, '').trim();
  const keywords = body.match(/\*\*Keywords:\*\*\s*(.+)/);
  const topics = (keywords ? keywords[1].replace(/`/g, '') : name).trim().slice(0, 180);

  const sectionParts = body.split(/\n(?=### )/);
  const chunks: KnowledgeChunk[] = [];

  const push = (title: string, raw: string) => {
    const { section, claim } = classifySection(title, raw);
    for (const part of splitSection(raw)) {
      if (part.length < 180) continue;
      const caution = groundingLine(claim);
      const text = `${id} ${name} | ${section} | ${claim}\ntopics: ${topics}\n${caution ? `${caution}\n` : ''}\n${part.trim()}`;
      const index = sequence.n++;
      chunks.push({
        id: `${TEACHING_CORPUS}-${id}-${section}-${index}`,
        text,
        principle: id,
        topics,
        section,
        claim,
      });
    }
  };

  const intro = sectionParts[0] ?? '';
  if (intro.trim().length > 180) push('overview', intro);

  for (const part of sectionParts.slice(1)) {
    const title = part.match(/^###\s+(.+)/)?.[1] ?? 'explanation';
    push(title, part);
  }
  return chunks;
}

/** Index principle teachings only. Operating instructions and keyword indexes are skipped. */
export function chunkApprovedKnowledge(markdown: string): KnowledgeChunk[] {
  const sequence = { n: 0 };
  const blocks = markdown.split(/\n(?=## )/);
  const chunks: KnowledgeChunk[] = [];
  for (const block of blocks) {
    const lineEnd = block.indexOf('\n');
    const headingLine = (lineEnd === -1 ? block : block.slice(0, lineEnd)).trim();
    if (!PRINCIPLE_HEADING.test(headingLine)) continue;
    const body = lineEnd === -1 ? '' : block.slice(lineEnd + 1);
    chunks.push(...chunkBlock(headingLine, body, sequence));
  }
  return chunks;
}

export function principleKey(text: string, metadata?: Record<string, unknown>): string {
  const fromMeta = metadata?.principle;
  if (typeof fromMeta === 'string' && /^P\d{2}$/.test(fromMeta)) return fromMeta;
  const labeled = text.match(/^P(\d{1,2})\b/);
  const heading = text.match(/PRINCIPLE\s+(\d{1,2})/i);
  const num = labeled?.[1] || heading?.[1];
  return num ? principleId(num) : '';
}
