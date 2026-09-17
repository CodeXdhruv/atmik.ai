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
    
    // Route English to Cloudflare's edge-hosted Deepgram Aura female models (<300ms latency)
    if (cleanLang === 'en' || cleanLang.startsWith('en')) {
      const normEmotion = (emotionTag || '').toLowerCase().trim();
      let femaleSpeaker = 'asteria'; // Default: smooth, warm female voice

      if (normEmotion.includes('joy') || normEmotion.includes('encourag') || normEmotion.includes('enthusiast')) {
        femaleSpeaker = 'stella'; // Bright, enthusiastic female voice
      } else if (normEmotion.includes('calm') || normEmotion.includes('empath') || normEmotion.includes('sad')) {
        femaleSpeaker = 'luna'; // Smooth, gentle, empathetic female voice
      }

      console.log(`🎙️ [TTS] Synthesizing English Female Voice (${femaleSpeaker}) for emotion [${normEmotion}]: "${text}"`);
      
      let response: any;
      try {
        response = await env.AI.run('@cf/deepgram/aura-1', { text, speaker: femaleSpeaker });
      } catch (err) {
        // Fallback to direct model name endpoint if speaker property varies
        try {
          response = await env.AI.run(`@cf/deepgram/aura-${femaleSpeaker}-en` as any, { text });
        } catch (e) {
          response = await env.AI.run('@cf/deepgram/aura-1', { text });
        }
      }

      if (response) {
        const audioBuffer = await new Response(response).arrayBuffer();
        return arrayBufferToBase64(audioBuffer);
      }
    } else {
      // Route Hindi to YourVoic Aura Lite API if API key is provided
      if (env.YOURVOIC_API_KEY) {
        console.log(`🎙️ [TTS] Using YourVoic Aura Lite for Hindi: "${text}"`);
        const normEmotion = (emotionTag || '').toLowerCase().trim();
        let hindiVoice = 'Deepika'; // Default smooth female voice

        if (normEmotion.includes('joy') || normEmotion.includes('encourag')) {
          hindiVoice = 'Tanvi';
        } else if (normEmotion.includes('calm') || normEmotion.includes('empath')) {
          hindiVoice = 'Kavita';
        }

        try {
          const response = await fetch('https://yourvoic.com/api/v1/tts/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': env.YOURVOIC_API_KEY,
              'Authorization': `Bearer ${env.YOURVOIC_API_KEY}`
            },
            body: JSON.stringify({
              text: text,
              model: 'aura-lite',
              language: 'hi',
              voice: hindiVoice,
              speed: 1.0
            })
          });

          if (response.ok) {
            const audioBuffer = await response.arrayBuffer();
            return arrayBufferToBase64(audioBuffer);
          } else {
            console.error("YourVoic API error response:", await response.text());
          }
        } catch (yvErr) {
          console.error("YourVoic API exception:", yvErr);
        }
      }

      // Fallback: Hosted Piper TTS service on Render free tier
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

