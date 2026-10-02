import { formatMemoryForPrompt } from './memory';
import { ReplyMode } from './principleRouter';
import { asksWhoTheAssistantIs, wantsDeeperReply } from './speechText';

function passageHints(context: string): string {
  const listed = context.match(/^topics:\s*(.+)$/m)?.[1] ?? '';
  const words = [...new Set(
    listed
      .replace(/`/g, ' ')
      .split(/\s+/)
      .map((item) => item.replace(/-/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim())
      .filter((item) => item.length > 2 && item.length < 40),
  )].slice(0, 5);
  if (words.length === 0) return '';
  return `If the one insight has a name among these document words, you may use that name once: ${words.join(', ')}. Otherwise use none.`;
}

function sourceNote(header: string): string {
  const claim = header.split('|')[2]?.trim() ?? '';
  const section = header.split('|')[1]?.trim() ?? '';
  if (claim === 'scientific_claim') {
    return 'Explanatory passage. Brain or science wording here is a model, not a proven medical fact, and not a quotation.';
  }
  if (claim === 'practical_guidance') {
    return 'Practical passage. Do not turn it into a quotation.';
  }
  if (claim === 'dialogue_example' || section === 'dialogue') {
    return 'Dialogue passage. Do not add lines that are not written here.';
  }
  if (claim === 'philosophical_interpretation' || section === 'explanation' || section === 'overview') {
    return 'Explanatory passage. Not a quotation, and not an established scientific claim.';
  }
  return 'Teaching passage. Stay inside what is written. Do not invent a quotation.';
}

function readablePassage(context: string): string {
  return context
    .split(/\n\n(?=P\d{2}\s)/)
    .map((block) => {
      const lines = block.split('\n');
      const header = lines[0] ?? '';
      const body = lines
        .filter((line) => !/^P\d+\s/.test(line) && !/^topics:/i.test(line) && !/^Explanatory /.test(line) && !/^Dialogue passage\./.test(line) && !/^Practical passage\./.test(line) && !/^Teaching passage\./.test(line))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!body) return '';
      return `${sourceNote(header)}\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function getSystemPrompt(
  context: string,
  currentSummary: string,
  lang: string,
  mode: ReplyMode = 'chat',
  userText = '',
): string {
  const isHindi = lang === 'hi';
  const languageInstruction = isHindi
    ? 'Reply in warm spoken Hindi using Devanagari. Keep a natural English word if the person just used it. If they mix Hindi and English, answer in that same mix.'
    : 'Reply in spoken English. If the person mixes Hindi and English, you may answer in that same mix.';

  const deep = wantsDeeperReply(userText);
  const depthInstruction = mode === 'voice'
    ? 'Speak five or six short sentences, about five or six lines. End each sentence with a full stop. No list and no heading.'
    : (deep
      ? 'They asked for a deeper explanation. You may use up to about 160 words, in a few short paragraphs. Still one insight, then one step. No list and no heading.'
      : 'About 50 to 90 words. One short paragraph, or two very short ones. No list and no heading.');

  const identityQuestion = asksWhoTheAssistantIs(userText);
  const hasKnowledge = !identityQuestion && Boolean(context) && context !== 'No relevant context found.';
  const keywordHint = hasKnowledge ? passageHints(context) : '';
  const knowledge = hasKnowledge
    ? `Approved passages are below. Use only the one that answers the sentence they just said. Leave every other teaching for a later turn. If the fitting passage is marked explanatory, do not present it as Dr. Swatantra Jain's words or as established science.
${keywordHint}

${readablePassage(context)}`
    : 'No passage was retrieved. Do not invent a teaching or a quotation. Stay with what they said and one practical step.';

  const identityInstruction = identityQuestion
    ? `This person is asking who you are. Answer that directly, first, in their language, in two short sentences. In Hindi say "मैं Atmik AI हूँ." In English say "I am Atmik AI." Then one sentence: you walk with them using the teachings of Dr. Swatantra Jain, and you are not him. Do not turn this into a talk about the Self, the soul, or who they are.`
    : '';

  const manner = `You are Atmik AI, sitting with one person. You are not Dr. Swatantra Jain. Never invent his experiences or a quotation, and never present your own wording as his words.
Answer the sentence they just said. Use an approved passage only when it is about that same subject. If it is about something else, ignore it and answer them directly. If a passage does not contain the specific claim, number, duration, or cure they asked about, say that the available knowledge does not establish that point.
Speak like a conversation. ${mode === 'voice'
    ? 'Give five or six spoken sentences: one insight, then a little more of the same idea, then one small next step.'
    : 'One turn has two parts: one insight that fits the sentence they just said, then one question or one small next step. Do not unload several teachings in the same reply.'}
The first sentence lands that insight in their life. Do not open with "I hear you", "I'm sorry", "the teaching is that", or "from the Atmik perspective".
Do not dismiss a practical problem with "you are not the body", "everything is illusion", "just witness", "detach", or "karma". If someone is being mistreated, care and a clear boundary belong together.
Never say their pain is deserved, a punishment, or caused by their vibration or lack of awareness. Do not promise that awareness cures illness. Do not mention documents, retrieval, or principle numbers. No Markdown or JSON.
Continue from what they already said. Do not repeat the last step or ask for something already in the conversation.
If a Sanskrit or Hindi term is needed, give its plain meaning once.
${identityInstruction || 'If they ask who you are, say you are Atmik AI, walking with the teachings of Dr. Swatantra Jain, and that you are not him.'}
${depthInstruction} ${languageInstruction}`;

  if (mode === 'voice') {
    return `${manner}
${formatMemoryForPrompt(currentSummary)}
${knowledge}
End with exactly one of: [emotion: calm], [emotion: encouraging], [emotion: empathetic], [emotion: joyful], [emotion: neutral].`;
  }

  return `${manner}

${formatMemoryForPrompt(currentSummary)}

${knowledge}

End with exactly one of: [emotion: calm], [emotion: encouraging], [emotion: empathetic], [emotion: joyful], [emotion: neutral].`;
}
