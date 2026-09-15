import { Bindings } from '../types/env';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function synthesize(env: Bindings, text: string, emotionTag: string = 'neutral', lang: string = 'en'): Promise<string | null> {
  try {
    const cleanLang = (lang || 'en').toLowerCase().trim();
    
    // Route English to Cloudflare's edge-hosted Deepgram Aura model (<300ms latency, zero cost)
    if (cleanLang === 'en' || cleanLang.startsWith('en')) {
      console.log(`🎙️ [TTS] Using Deepgram Aura (@cf/deepgram/aura-1) for English: "${text}"`);
      const response: any = await env.AI.run('@cf/deepgram/aura-1', { text });
      if (response) {
        const audioBuffer = await new Response(response).arrayBuffer();
        return arrayBufferToBase64(audioBuffer);
      }
    } else {
      // Route Hindi to hosted Piper TTS service on Render free tier
      console.log(`🎙️ [TTS] Using Hosted Piper TTS for Hindi (${cleanLang}): "${text}"`);
      if (!env.TTS_ENDPOINT) {
        console.warn("TTS_ENDPOINT not configured");
        return null;
      }

      const ttsResponse = await fetch(env.TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          language: cleanLang,
          emotion: emotionTag.replace('[emotion: ', '').replace(']', '').trim()
        })
      });

      if (ttsResponse.ok) {
        const audioBuffer = await ttsResponse.arrayBuffer();
        return arrayBufferToBase64(audioBuffer);
      } else {
        console.error("TTS Error from hosted API:", await ttsResponse.text());
        return null;
      }
    }
    return null;
  } catch (err) {
    console.error("TTS Exception:", err);
    return null;
  }
}

