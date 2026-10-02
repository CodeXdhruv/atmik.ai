import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { Bindings } from '../types/env';
import { retrieveContext } from '../lib/retrieval';
import { getSystemPrompt } from '../lib/prompts';
import { feelingFromUser, synthesizeBytes, warmVoice } from '../lib/tts';
import { updateConversationContext } from '../lib/memory';
import { shapeConversationalReply, shouldRetrieveKnowledge } from '../lib/speechText';
import { verifyFirebaseToken } from '../utils/auth';
import { allowRequest } from '../lib/rateLimit';
import { withTimeout } from '../lib/timeout';

const voice = new Hono<{ Bindings: Bindings }>();

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

async function readAiPayload(result: any): Promise<any> {
  if (result && typeof result.json === 'function') {
    return result.json();
  }
  if (result && typeof result.text === 'function') {
    const text = await result.text();
    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + size, bytes.length)));
  }
  return btoa(binary);
}

async function transcribeAudio(ai: any, audioBytes: Uint8Array, lang: string): Promise<string> {
  if (audioBytes.byteLength < 1000) {
    console.warn(`🎙️ [Backend] Audio payload too short (${audioBytes.byteLength} bytes).`);
    return '';
  }

  const targetLang = (lang || 'hi').toLowerCase().startsWith('en') ? 'en' : 'hi';
  const contentType = audioBytes.length > 2 && audioBytes[0] === 0xff && (audioBytes[1] & 0xf0) === 0xf0
    ? 'audio/aac'
    : 'audio/mp4';
  console.log(`🎙️ [Backend] Transcribing ${audioBytes.byteLength} bytes as ${contentType}, lang=${targetLang}`);

  const transcriptOf = (payload: any) => (
    payload?.text || payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript || payload?.result?.text || ''
  ).trim();

  try {
    const fast = await withTimeout(ai.run('@cf/deepgram/nova-3', {
      audio: {
        body: audioBytes.buffer.slice(audioBytes.byteOffset, audioBytes.byteOffset + audioBytes.byteLength),
        contentType,
      },
      language: targetLang,
      punctuate: true,
      smart_format: true,
    }), 6_000, 'Transcription');
    const fastText = transcriptOf(await readAiPayload(fast));
    if (fastText) {
      const cleaned = tidyTranscript(fastText, targetLang);
      console.log(`🎙️ [Backend] Transcript: "${cleaned}"`);
      return cleaned;
    }
    console.warn('🎙️ [Backend] Fast transcription returned no text, using Whisper');
  } catch (err) {
    console.warn('🎙️ [Backend] Fast transcription unavailable, using Whisper', err);
  }

  const response = await withTimeout(ai.run('@cf/openai/whisper-large-v3-turbo', {
    audio: bytesToBase64(audioBytes),
    language: targetLang,
  }), 18_000, 'Transcription');

  const text = tidyTranscript(transcriptOf(await readAiPayload(response)), targetLang);
  console.log(`🎙️ [Backend] Transcript: "${text}"`);
  return text;
}

function tidyTranscript(text: string, lang: string): string {
  let next = text.replace(/\s+/g, ' ').trim();
  if (!next || lang.startsWith('en')) return next;
  next = next
    .replace(/([।!?])(?=\S)/g, '$1 ')
    .replace(/(हूँ|हूं|हैं|है|था|थी|थे|रहा|रही|रहे|रहता|रहती)(?=[\u0900-\u097F])/g, '$1 ')
    .replace(/क्या(?=[\u0900-\u097F])/g, 'क्या ')
    .replace(/बूडा|बुड़ा/g, 'बूढ़ा')
    .replace(/अदमी/g, 'आदमी');
  return next.replace(/\s+/g, ' ').trim();
}

function messageText(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    // Control messages are JSON. Some mobile sockets deliver that text as bytes.
    if (bytes.length > 0 && bytes[0] === 0x7b) {
      return new TextDecoder().decode(bytes);
    }
  }
  return null;
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

voice.get('/', upgradeWebSocket((c) => {
  let sessionUserId = '';
  let sessionLang = 'hi';
  let voiceWarmed = false;
  let sessionAuthed = false;
  let utteranceOpen = false;
  let audioChunks: Uint8Array[] = [];
  let audioSize = 0;

  const acceptToken = async (token: string) => {
    const payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    if (!payload?.sub) return false;
    sessionUserId = String(payload.sub);
    sessionAuthed = true;
    return true;
  };

  let authReady: Promise<unknown> = (async () => {
    const token = c.req.query('token') || '';
    if (!token) return;
    try {
      await acceptToken(token);
    } catch (err: any) {
      console.error('Voice token verification failed:', err?.message || err);
    }
  })();

  const acceptSession = async (data: any, ws: any) => {
    sessionLang = data.lang || sessionLang || 'hi';
    const token = typeof data.token === 'string' ? data.token : '';
    if (!token) {
      if (!sessionAuthed) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sign in to use voice.' }));
      }
      return;
    }
    try {
      const ok = await acceptToken(token);
      if (!ok) {
        ws.send(JSON.stringify({ type: 'error', message: 'Sign in to use voice.' }));
      }
    } catch (err: any) {
      console.error('Voice token verification failed:', err?.message || err);
      sessionAuthed = false;
      ws.send(JSON.stringify({ type: 'error', message: 'Sign in to use voice.' }));
    }
  };

  const warmCurrentVoice = () => {
    if (voiceWarmed) return;
    voiceWarmed = true;
    c.executionCtx.waitUntil(warmVoice(c.env, sessionLang));
  };

  const resetUtterance = () => {
    utteranceOpen = true;
    audioChunks = [];
    audioSize = 0;
  };

  const appendAudio = (bytes: Uint8Array, ws: any) => {
    if (audioSize + bytes.byteLength > MAX_AUDIO_BYTES) {
      ws.send(JSON.stringify({ type: 'error', message: 'Audio too large. Keep recordings under 20 seconds.' }));
      return false;
    }
    audioChunks.push(bytes);
    audioSize += bytes.byteLength;
    return true;
  };

  const finishUtterance = async (ws: any) => {
    utteranceOpen = false;
    const bytes = concatBytes(audioChunks);
    audioChunks = [];
    audioSize = 0;
    if (!sessionAuthed) {
      ws.send(JSON.stringify({ type: 'error', message: 'Sign in to use voice.' }));
      return;
    }
    if (!allowRequest(`voice:${sessionUserId}`, 12, 60_000)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Too many voice messages. Wait a moment and try again.' }));
      return;
    }
    try {
      const transcribedText = await transcribeAudio(c.env.AI, bytes, sessionLang);
      if (!transcribedText) {
        ws.send(JSON.stringify({ type: 'error', message: 'Could not transcribe audio. Please try again.' }));
        return;
      }
      ws.send(JSON.stringify({ type: 'transcription', text: transcribedText }));
      await processTranscription(c, ws, sessionUserId, sessionLang, transcribedText);
    } catch (aiErr: any) {
      console.error('🎙️ [Backend] Transcription error:', aiErr);
      ws.send(JSON.stringify({ type: 'error', message: 'Transcription failed. Please try again.' }));
    }
  };

  return {
    onMessage: async (event, ws) => {
      try {
        const text = messageText(event.data);

        if (!text && event.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(event.data);
          if (!utteranceOpen) resetUtterance();
          if (!appendAudio(bytes, ws)) return;
          return;
        }

        if (!text) return;
        const data = JSON.parse(text);
        if (data.type === 'ping') return;

        if (data.type === 'session_init') {
          if (!sessionAuthed) {
            authReady = acceptSession(data, ws);
            await authReady;
          } else if (data.lang) {
            sessionLang = data.lang;
          }
          console.log(`🎙️ [Backend] Session ready: user=${sessionUserId}, lang=${sessionLang}`);
          if (sessionAuthed) {
            warmCurrentVoice();
            ws.send(JSON.stringify({ type: 'session_ready' }));
          }
          return;
        }

        if (data.type === 'utterance_start' || data.type === 'audio_begin') {
          if (data.lang) sessionLang = data.lang;
          if (!sessionAuthed) {
            authReady = acceptSession(data, ws);
            await authReady;
          }
          if (!sessionAuthed) return;
          if (!utteranceOpen || audioSize === 0) resetUtterance();
          return;
        }

        if (data.type === 'utterance_end') {
          if (data.lang) sessionLang = data.lang;
          await authReady;
          await finishUtterance(ws);
          return;
        }

        if (data.type === 'audio_chunk' && data.audioBase64) {
          if (!sessionAuthed) {
            authReady = acceptSession(data, ws);
            await authReady;
          }
          if (!sessionAuthed) return;
          if (data.lang) sessionLang = data.lang;
          const binaryString = atob(data.audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (!utteranceOpen) resetUtterance();
          if (!appendAudio(bytes, ws)) return;
          await finishUtterance(ws);
        }
      } catch (e: any) {
        console.error('WebSocket Error:', e);
        ws.send(JSON.stringify({ type: 'error', message: 'Voice failed. Please try again.' }));
      }
    },
    onClose: () => {
      console.log('WebSocket closed');
    },
  };
}));

async function processTranscription(c: any, ws: any, userId: string, lang: string, transcribedText: string) {
  const cleanUserId = (userId || 'default_user').trim();
  const summaryPromise = c.env.DB.prepare('SELECT currentSummary FROM ChatSession WHERE userId = ?')
    .bind(cleanUserId)
    .all();
  const quickCheck = /सुन पा|hear me|can you hear|^(hi|hello|hey|नमस्ते|हाय)\b/i.test(transcribedText);
  const contextPromise = !quickCheck && shouldRetrieveKnowledge(transcribedText)
    ? Promise.race([
        retrieveContext(c.env, transcribedText, lang, 'voice').catch((err) => {
          console.warn('Voice retrieval skipped', err);
          return 'No relevant context found.';
        }),
        new Promise<string>((resolve) => setTimeout(() => resolve('No relevant context found.'), 700)),
      ])
    : Promise.resolve('No relevant context found.');

  const [{ results }, context] = await Promise.all([summaryPromise, contextPromise]);
  const currentSummary = (results[0] as any)?.currentSummary || 'No previous context.';
  const systemPrompt = getSystemPrompt(context, currentSummary, lang, 'voice', transcribedText);

  console.log('🎙️ [Backend] Requesting AI response (Llama 3.1)...');
  const aiStream: any = await withTimeout(c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcribedText },
    ],
    max_tokens: 180,
    stream: true,
  }), 20_000, 'Voice model');

  let rawResponse = '';
  let published = '';
  const decoder = new TextDecoder();

  const replyShape = { maxSentences: 6, maxWords: 120 };
  const feeling = feelingFromUser(transcribedText);

  const jobs: Promise<void>[] = [];
  let handed = 0;
  let clips = 0;
  const queueSentence = (sentence: string) => {
    const index = clips;
    clips += 1;
    console.log(`🎙️ [Backend] Speaking sentence ${index + 1}`);
    jobs.push((async () => {
      sendClip(index, sentence, await synthesizeBytes(c.env, sentence, lang, feeling));
    })());
  };
  const drain = (flush: boolean) => {
    const clean = shapeConversationalReply(rawResponse, replyShape);
    let rest = clean.slice(handed);
    const limit = replyShape.maxSentences ?? 2;
    while (clips < limit) {
      const match = rest.match(/^([\s\S]*?[.?!।])\s*/);
      if (match && match[1].trim().length > 1) {
        handed += match[0].length;
        queueSentence(match[1].trim());
        rest = clean.slice(handed);
        continue;
      }
      if (flush && rest.trim().length > 1) {
        handed = clean.length;
        queueSentence(rest.trim());
      }
      break;
    }
    return clips >= limit;
  };

  const publishText = () => {
    const clean = shapeConversationalReply(rawResponse, replyShape);
    if (clean.length > published.length && clean.startsWith(published)) {
      ws.send(JSON.stringify({ type: 'text_stream', text: clean.slice(published.length) }));
      published = clean;
    } else if (clean !== published) {
      ws.send(JSON.stringify({ type: 'text_replace', text: clean }));
      published = clean;
    }
    return clean;
  };

  const sendClip = (index: number, text: string, audio: Uint8Array | null) => {
    if (audio) {
      ws.send(JSON.stringify({
        type: 'tts_audio',
        index,
        text,
        audioBase64: bytesToBase64(audio),
      }));
      return;
    }
    ws.send(JSON.stringify({ type: 'tts_audio', index, skipped: true }));
  };

  let replyReady = false;
  for await (const chunk of aiStream) {
    if (replyReady) break;
    const decoded = decoder.decode(chunk as Uint8Array, { stream: true });
    for (const line of decoded.split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try {
        const data = JSON.parse(line.substring(6));
        if (data.response) {
          rawResponse += data.response;
          publishText();
          if (drain(false)) {
            replyReady = true;
            break;
          }
        }
      } catch {
        // ignore incomplete JSON chunks
      }
    }
  }

  const spokenReply = publishText();
  drain(true);
  await Promise.all(jobs);
  console.log('🎙️ [Backend] Completed sending the spoken reply');
  ws.send(JSON.stringify({ type: 'generation_done' }));

  c.executionCtx.waitUntil(
    updateConversationContext(c.env, cleanUserId, currentSummary, transcribedText, spokenReply, 'Voice'),
  );
}

export default voice;
