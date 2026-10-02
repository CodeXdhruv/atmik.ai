import { Bindings } from '../types/env';
import { cleanSpokenText } from './speechText';
import { withTimeout } from './timeout';

export interface MemoryTurn {
  role: 'user' | 'assistant';
  text: string;
  mode: 'Voice' | 'Chat';
}

export interface MemoryState {
  summary: string;
  facts: string;
  keywords: string[];
  insights: string[];
  turns: MemoryTurn[];
}

export function parseMemory(raw: string | null | undefined): MemoryState {
  if (!raw || raw.trim() === '' || raw.trim() === 'No previous context.') {
    return { summary: '', facts: '', keywords: [], insights: [], turns: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.turns)) {
      return {
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        facts: typeof parsed.facts === 'string' ? parsed.facts : '',
        keywords: stringList(parsed.keywords, 16),
        insights: stringList(parsed.insights, 8),
        turns: parsed.turns
          .filter((turn: MemoryTurn) => turn && (turn.role === 'user' || turn.role === 'assistant') && typeof turn.text === 'string')
          .slice(-8),
      };
    }
  } catch {
    // Older rows stored a plain summary sentence.
  }
  return { summary: raw.trim(), facts: '', keywords: [], insights: [], turns: [] };
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 160))
    .slice(-max);
}

function remember(existing: string[], incoming: string[], max: number): string[] {
  const seen = new Set(existing.map((item) => item.toLowerCase()));
  const next = [...existing];
  for (const item of incoming) {
    const clean = item.trim().replace(/\s+/g, ' ').slice(0, 160);
    if (clean.length < 3 || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    next.push(clean);
  }
  return next.slice(-max);
}

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'the', 'a', 'an', 'and', 'to', 'of', 'is', 'it', 'that', 'this', 'am', 'are', 'was',
  'for', 'with', 'you', 'your', 'have', 'has', 'feel', 'feeling', 'about', 'just', 'what', 'when',
  'they', 'them', 'from', 'but', 'not', 'can', 'how', 'why', 'please', 'been', 'being', 'into', 'than',
  'then', 'there', 'their', 'would', 'could', 'should', 'really', 'very', 'also', 'some', 'more',
]);

function keywordsFrom(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\u0900-\u097f\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    .slice(0, 6);
}

export function formatMemoryForPrompt(raw: string | null | undefined): string {
  const memory = parseMemory(raw);
  const lines: string[] = [];
  if (memory.keywords.length > 0) {
    lines.push(`Words that still matter: ${memory.keywords.join(', ')}`);
  }
  if (memory.insights.length > 0) {
    lines.push('What this person has already shared:');
    for (const insight of memory.insights) lines.push(`- ${insight}`);
  }
  if (memory.facts) lines.push(`Who they are: ${memory.facts}`);
  if (memory.turns.length > 0) {
    lines.push('Recent conversation, in order. Continue from the last line. Do not start over and do not ask them to repeat this:');
    for (const turn of memory.turns) {
      lines.push(`${turn.role === 'user' ? 'Person' : 'You'}: ${turn.text}`);
    }
  }
  if (memory.summary) lines.push(`Thread so far: ${memory.summary}`);
  if (lines.length === 0) return 'This is the beginning of the conversation.';
  return lines.join('\n');
}

/**
 * Keeps the last few raw turns plus a short fact line in the existing
 * ChatSession.currentSummary column. Older plain-text summaries still load.
 */
export async function updateConversationContext(
  env: Bindings,
  userId: string,
  oldSummary: string,
  userText: string,
  aiResponse: string,
  mode: 'Voice' | 'Chat'
): Promise<void> {
  const cleanUserId = (userId || 'default_user').trim();
  const userLine = cleanSpokenText(userText);
  const assistantLine = cleanSpokenText(aiResponse);
  if (!userLine || !assistantLine) return;

  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO User (id, firebaseUid, email, role) VALUES (?, ?, ?, 'USER')`
    ).bind(cleanUserId, cleanUserId, `${cleanUserId}@app.local`).run();

    const existing = await env.DB.prepare(
      'SELECT currentSummary, updatedAt FROM ChatSession WHERE userId = ?'
    ).bind(cleanUserId).first<{ currentSummary: string; updatedAt: string }>();

    const baseSummary = existing?.currentSummary ?? oldSummary;
    const next = parseMemory(baseSummary);
    next.turns.push(
      { role: 'user', text: userLine, mode },
      { role: 'assistant', text: assistantLine, mode },
    );
    next.turns = next.turns.slice(-8);
    next.keywords = remember(next.keywords, keywordsFrom(userLine), 16);
    next.insights = remember(next.insights, [userLine], 8);

    try {
      const prompt = `Update memory for an ongoing personal conversation.

Previous keywords: ${next.keywords.join(', ') || 'None'}
Previous insights: ${next.insights.join(' | ') || 'None'}
Previous facts: ${next.facts || 'None'}

Latest turn (${mode}):
Person: "${userLine}"
Guide: "${assistantLine}"

Return JSON only:
{"keywords":["short topic words from this turn"],"insights":["one specific fact they revealed, in their situation, not generic"],"facts":"one sentence about who they are and what is unresolved","summary":"two sentences that would let the next reply continue without asking them to repeat"}`;

      const summaryResponse: any = await withTimeout(env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: 'You write compact JSON memory. No markdown.' },
          { role: 'user', content: prompt },
        ],
      }), 20_000, 'Memory');

      let raw = summaryResponse?.response?.trim() || summaryResponse?.text?.trim() || '';
      raw = raw.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const updated = JSON.parse(match[0]);
        if (typeof updated.facts === 'string' && updated.facts.trim()) next.facts = updated.facts.trim();
        if (typeof updated.summary === 'string' && updated.summary.trim()) next.summary = updated.summary.trim();
        next.keywords = remember(next.keywords, stringList(updated.keywords, 8), 16);
        next.insights = remember(next.insights, stringList(updated.insights, 4), 8);
      }
    } catch (err: any) {
      console.warn('🧠 [Memory] Fact update skipped:', err?.message || err);
    }

    const saved = JSON.stringify(next);
    const now = new Date().toISOString();
    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO ChatSession (id, userId, currentSummary, updatedAt)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET currentSummary = excluded.currentSummary, updatedAt = excluded.updatedAt`
      ).bind(cleanUserId, cleanUserId, saved, now).run();
    } else {
      const updated = await env.DB.prepare(
        `UPDATE ChatSession
         SET currentSummary = ?, updatedAt = ?
         WHERE userId = ? AND updatedAt = ?`
      ).bind(saved, now, cleanUserId, existing.updatedAt).run();

      if (!Number(updated.meta?.changes || 0)) {
        console.warn('🧠 [Memory] Skipped write because a newer turn was saved first');
      }
    }
  } catch (err: any) {
    console.error('🧠 [Memory ERROR] Failed to update conversation context:', err?.message || err);
  }
}
