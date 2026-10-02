import { wantsKnowledgeRetrieval } from './principleRouter';

const EMOTION_TAG = /\[emotion:\s*[^\]]*\]/gi;
const PARTIAL_EMOTION = /\[(?:e(?:m(?:o(?:t(?:i(?:o(?:n(?::(?:\s*[^\]]*)?)?)?)?)?)?)?)?)?$/i;

export function cleanSpokenText(text: string): string {
  return text
    .replace(EMOTION_TAG, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_#>`]/g, '')
    .replace(/^\s*\d+[\.\)]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hidePartialEmotionTag(text: string): string {
  const open = text.lastIndexOf('[');
  if (open === -1) return text;
  if (PARTIAL_EMOTION.test(text.slice(open))) {
    return text.slice(0, open).trimEnd();
  }
  return text;
}

export function publishableSpeech(raw: string): string {
  return hidePartialEmotionTag(cleanSpokenText(raw));
}

const STOCK_ATTRIBUTION = /(?:In Dr\.?\s*Swatantra Jain's teaching|According to Dr\.?\s*Swatantra Jain|Dr\.?\s*Swatantra Jain teaches that|From the Atmik(?: AI)? perspective|From Atmik AI's perspective|आत्मिक(?:\s*AI)?\s*दृष्टिकोण\s*से|(?:The|This) teaching (?:is|says|here is) that|यह शिक्षा है कि|शिक्षा यह है कि),?\s*/gi;

function withoutStockAttribution(text: string): string {
  return text
    .replace(STOCK_ATTRIBUTION, '')
    .replace(/(^|[.?!।]\s+)([a-z])/g, (_match, lead: string, letter: string) => lead + letter.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

export type ReplyShape = {
  maxSentences?: number;
  maxWords?: number;
  paragraphs?: boolean;
};

export function shapeConversationalReply(raw: string, shape: ReplyShape | number = {}): string {
  const limits = typeof shape === 'number'
    ? { maxSentences: shape, maxWords: 110, paragraphs: false }
    : { maxSentences: 6, maxWords: 110, paragraphs: false, ...shape };
  const withoutTag = hidePartialEmotionTag(raw.replace(EMOTION_TAG, ' '));
  const blocks = withoutTag
    .replace(/[*_#>`]/g, ' ')
    .split(/\n+/)
    .map((block) => withoutStockAttribution(block))
    .filter(Boolean);
  if (blocks.length === 0) return '';

  const kept: string[] = [];
  let sentences = 0;
  for (const block of blocks) {
    const parts = block.match(/[^.?!।]+[.?!।]+|[^.?!।]+$/g) ?? [];
    const blockKept: string[] = [];
    for (const part of parts) {
      const bit = part.trim();
      if (!bit) continue;
      if (sentences >= limits.maxSentences) break;
      blockKept.push(bit);
      sentences += 1;
    }
    if (blockKept.length > 0) kept.push(blockKept.join(' '));
    if (sentences >= limits.maxSentences) break;
  }

  let text = limits.paragraphs ? kept.slice(0, 2).join('\n\n') : kept.join(' ');
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > limits.maxWords) {
    text = `${words.slice(0, limits.maxWords).join(' ').replace(/[,:;]+$/, '')}.`;
  }
  return text.trim();
}

const KNOWLEDGE_CUE = /what|why|how|explain|meaning|tell me|who is|difference|क्या|क्यों|कैसे|मतलब|बताओ|अर्थ/i;

/** Who the assistant is. Not the spiritual question "who am I". */
export function asksWhoTheAssistantIs(text: string): boolean {
  const q = text.trim().toLowerCase();
  if (/who am i|main kaun|मैं कौन|मेरा स्वरूप/.test(q)) return false;
  return /who are you|who r u|what(?:'s| is) your name|your name|aap\s*(?:kon|kaun)|app\s*(?:kon|kaun)|tum\s*(?:kon|kaun)|tu\s+kaun|(?:kon|kaun)\s+(?:ho|hai|hain)\s+(?:aap|app|tum)|आप\s*कौन|तुम\s*कौन|आपका नाम|तेरा नाम|नाम क्या/.test(q);
}

export function wantsDeeperReply(text: string): boolean {
  return /explain.{0,30}deep|in detail|go deeper|tell me more|elaborate|पूरी तरह|गहराई|विस्तार से/i.test(text);
}

export function shouldRetrieveKnowledge(text: string): boolean {
  if (asksWhoTheAssistantIs(text)) return false;
  if (wantsKnowledgeRetrieval(text)) return true;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 6 && !text.includes('?')) return false;
  if (KNOWLEDGE_CUE.test(text)) return true;
  return words.length > 10;
}

export function takeSpeakable(
  pending: string,
  firstClip: boolean,
): { speak: string; rest: string } | null {
  const words = pending.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const sentence = pending.match(/^([\s\S]*?[.?!।])(?:\s+|$)/);
  if (sentence && sentence[1].trim().split(/\s+/).filter(Boolean).length >= 2) {
    return {
      speak: sentence[1].trim(),
      rest: pending.slice(sentence[0].length),
    };
  }

  if (firstClip) {
    if (words.length >= 14) return splitAtWord(pending, 12);
    return null;
  }

  if (words.length >= 20) return splitAtBreath(pending);
  if (words.length >= 14) {
    const comma = pending.search(/,(?=\s)/);
    if (comma > 0) {
      return { speak: pending.slice(0, comma).trim(), rest: pending.slice(comma + 1) };
    }
  }
  return null;
}

function splitAtBreath(pending: string): { speak: string; rest: string } {
  const conjunction = pending.search(/\s(?:and|but|so|because|और|लेकिन|तो|क्योंकि)\s/i);
  if (conjunction > 12) {
    return {
      speak: pending.slice(0, conjunction).trim(),
      rest: pending.slice(conjunction),
    };
  }
  return splitAtWord(pending, 16);
}

function splitAtWord(pending: string, count: number): { speak: string; rest: string } {
  const matches = [...pending.matchAll(/\S+/g)];
  if (matches.length <= count) {
    return { speak: pending.trim(), rest: '' };
  }
  const cut = matches[count - 1];
  const end = (cut.index ?? 0) + cut[0].length;
  return {
    speak: pending.slice(0, end).trim(),
    rest: pending.slice(end),
  };
}
