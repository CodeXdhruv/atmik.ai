import { Bindings } from '../types/env';
import { withTimeout } from './timeout';

async function readAudio(response: unknown): Promise<Uint8Array | null> {
  if (!response) return null;
  if (response instanceof ArrayBuffer) {
    return response.byteLength > 80 ? new Uint8Array(response) : null;
  }
  if (ArrayBuffer.isView(response)) {
    const view = new Uint8Array(response.buffer, response.byteOffset, response.byteLength);
    return view.byteLength > 80 ? view : null;
  }
  const buffer = await new Response(response as BodyInit).arrayBuffer();
  if (buffer.byteLength < 80) return null;
  return new Uint8Array(buffer);
}

async function englishVoice(env: Bindings, text: string): Promise<Uint8Array | null> {
  const response = await withTimeout(
    env.AI.run('@cf/deepgram/aura-1', { text, speaker: 'luna' }),
    20_000,
    'English voice',
  );
  return readAudio(response);
}

async function requestHindiVoice(env: Bindings, text: string, model: string): Promise<Uint8Array | null> {
  const key = env.YOURVOIC_API_KEY;
  if (!key) return null;
  const response = await fetch('https://yourvoic.com/api/v1/tts/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': key,
      Authorization: `Bearer ${key}`,
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      text,
      model,
      language: 'hi-IN',
      voice: 'Deepika',
      speed: 0.94,
      format: 'mp3',
    }),
  });
  if (!response.ok) {
    console.error(`YourVoic ${model} error:`, await response.text());
    return null;
  }
  const audio = new Uint8Array(await response.arrayBuffer());
  return audio.byteLength > 80 ? audio : null;
}

async function hindiVoice(env: Bindings, text: string): Promise<Uint8Array | null> {
  const natural = await requestHindiVoice(env, text, 'aura-prime');
  if (natural) return natural;
  return requestHindiVoice(env, text, 'aura-lite');
}

export async function synthesizeBytes(env: Bindings, text: string, lang: string = 'en'): Promise<Uint8Array | null> {
  const cleanLang = (lang || 'en').toLowerCase().trim();
  try {
    if (cleanLang === 'en' || cleanLang.startsWith('en')) {
      console.log(`🎙️ [TTS] English edge voice: "${text}"`);
      return await englishVoice(env, text);
    }
    console.log(`🎙️ [TTS] Hindi voice: "${text}"`);
    const hindi = await hindiVoice(env, text);
    if (hindi) return hindi;
    if (!env.TTS_ENDPOINT) return null;
    console.log(`🎙️ [TTS] Hindi backup voice: "${text}"`);
    const backup = await fetch(env.TTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ inputs: text, language: 'hi', emotion: 'neutral' }),
    });
    if (!backup.ok) return null;
    const audio = new Uint8Array(await backup.arrayBuffer());
    return audio.byteLength > 80 ? audio : null;
  } catch (err) {
    console.error('TTS Exception:', err);
    return null;
  }
}

export async function warmVoice(env: Bindings, lang: string): Promise<void> {
  try {
    if ((lang || 'hi').toLowerCase().startsWith('en')) {
      await englishVoice(env, 'Hello.');
      return;
    }
    await hindiVoice(env, 'नमस्ते');
  } catch (err) {
    console.warn('🎙️ [TTS] Voice warm-up failed', err);
  }
}
