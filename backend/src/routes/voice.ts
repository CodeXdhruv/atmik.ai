import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { Bindings } from '../types/env';
import { retrieveContext } from '../lib/retrieval';
import { getSystemPrompt } from '../lib/prompts';
import { synthesize } from '../lib/tts';

const voice = new Hono<{ Bindings: Bindings }>();

// Maximum audio size: 2MB (after base64 decoding)
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;

/**
 * Transcribe audio using Cloudflare AI REST API directly.
 * Bypasses the buggy c.env.AI.run() binding which mangles large byte arrays
 * during internal JSON serialization.
 */
async function transcribeAudio(ai: any, audioBytes: Uint8Array): Promise<string> {
  console.log(`🎙️ [Backend] Transcribing audio chunk size: ${audioBytes.byteLength} bytes`);
  try {
    const response: any = await ai.run('@cf/openai/whisper-large-v3-turbo', {
      audio: Array.from(audioBytes)
    });
    const transcribedText = response?.text?.trim() || "";
    console.log(`🎙️ [Backend] Whisper STT Output: "${transcribedText}"`);
    return transcribedText;
  } catch (err: any) {
    console.error(`🎙️ [Backend] Whisper STT Error:`, err);
    throw err;
  }
}

// GET /api/voice-chat
// WebSocket endpoint for real-time voice streaming
voice.get('/', upgradeWebSocket((c) => {
  // Per-connection session state
  let sessionUserId = '';
  let sessionLang = 'hi';

  return {
    onMessage: async (event, ws) => {
      try {
        // Handle binary WebSocket frames (raw audio bytes)
        if (event.data instanceof ArrayBuffer) {
          console.log(`🎙️ [Backend] Received binary audio frame: ${event.data.byteLength} bytes`);
          
          if (event.data.byteLength > MAX_AUDIO_BYTES) {
            ws.send(JSON.stringify({ type: 'error', message: 'Audio too large. Keep recordings under 20 seconds.' }));
            return;
          }

          const audioBytes = new Uint8Array(event.data);
          
          try {
            // 1. STT: Transcribe audio using Whisper
            console.log('🎙️ [Backend] Sending audio to Whisper (STT)...');
            const transcribedText = await transcribeAudio(c.env.AI, audioBytes);
            console.log(`🎙️ [Backend] Transcription Result: "${transcribedText}"`);

            if (!transcribedText || transcribedText.trim().length === 0) {
              ws.send(JSON.stringify({ type: 'error', message: 'Could not transcribe audio. Please try again.' }));
              return;
            }

            // Send transcription back to UI for display
            ws.send(JSON.stringify({ type: 'transcription', text: transcribedText }));

            // Continue with LLM + TTS pipeline
            await processTranscription(c, ws, sessionUserId, sessionLang, transcribedText);
          } catch (aiErr: any) {
            console.error('🎙️ [Backend] AI transcription error:', aiErr);
            ws.send(JSON.stringify({ type: 'error', message: `Transcription failed: ${aiErr.message}` }));
          }
          return;
        }

        // Handle JSON text messages
        const data = JSON.parse(event.data as string);
        
        // Ignore ping messages (keep-alive)
        if (data.type === 'ping') return;
        
        // Session init message — client sends metadata before binary audio
        if (data.type === 'session_init') {
          sessionUserId = data.userId || '';
          sessionLang = data.lang || 'hi';
          console.log(`🎙️ [Backend] Session initialized: user=${sessionUserId}, lang=${sessionLang}`);
          
          // Pre-warm Render Hindi TTS endpoint in background if Hindi selected
          if (sessionLang === 'hi' && c.env.TTS_ENDPOINT) {
            c.executionCtx.waitUntil(fetch(`${c.env.TTS_ENDPOINT}/health`).catch(() => {}));
          }

          ws.send(JSON.stringify({ type: 'session_ready' }));
          return;
        }

        // Legacy: JSON+base64 audio (fallback for compatibility)
        if (data.type === 'audio_chunk' && data.audioBase64) {
          const { userId, lang = 'hi' } = data;
          sessionUserId = userId;
          sessionLang = lang;
          console.log(`🎙️ [Backend] Received base64 audio chunk from user: ${userId}, lang: ${lang}`);
          
          // Decode Base64 audio to Uint8Array
          const binaryString = atob(data.audioBase64);
          
          if (binaryString.length > MAX_AUDIO_BYTES) {
            ws.send(JSON.stringify({ type: 'error', message: 'Audio too large. Keep recordings under 20 seconds.' }));
            return;
          }
          
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          try {
            // 1. STT: Transcribe audio using Whisper
            console.log('🎙️ [Backend] Sending audio to Whisper (STT)...');
            const transcribedText = await transcribeAudio(c.env.AI, bytes);
            console.log(`🎙️ [Backend] Transcription Result: "${transcribedText}"`);

            if (!transcribedText || transcribedText.trim().length === 0) {
              ws.send(JSON.stringify({ type: 'error', message: 'Could not transcribe audio. Please try again.' }));
              return;
            }

            // Send transcription back to UI for display
            ws.send(JSON.stringify({ type: 'transcription', text: transcribedText }));

            // Continue with LLM + TTS pipeline
            await processTranscription(c, ws, userId, lang, transcribedText);
          } catch (aiErr: any) {
            console.error('🎙️ [Backend] AI transcription error:', aiErr);
            ws.send(JSON.stringify({ type: 'error', message: `Transcription failed: ${aiErr.message}` }));
          }
        }
      } catch (e: any) {
        console.error("WebSocket Error:", e);
        ws.send(JSON.stringify({ type: 'error', message: e.message }));
      }
    },
    onClose: () => {
      console.log('WebSocket closed');
    }
  }
}));

/**
 * Process a transcription through the LLM + TTS pipeline.
 * Extracted as a shared function for both binary and base64 audio paths.
 */
async function processTranscription(c: any, ws: any, userId: string, lang: string, transcribedText: string) {
  // 2. Fetch Summary & Retrieve Context
  const { results } = await c.env.DB.prepare('SELECT currentSummary FROM ChatSession WHERE userId = ?').bind(userId).all();
  const currentSummary = (results[0] as any)?.currentSummary || "No previous context.";
  
  const context = await retrieveContext(c.env, transcribedText, lang);
  const systemPrompt = getSystemPrompt(context, currentSummary, lang);

  // 3. Stream LLM (Llama 3.1)
  console.log('🎙️ [Backend] Requesting AI response (Llama 3.1)...');
  const aiStream: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcribedText }
    ],
    stream: true
  });

  let currentSentence = "";
  let fullResponse = "";
  let chunkIndex = 0;
  let ttsPromises: Promise<void>[] = [];
  const decoder = new TextDecoder();

  // 4. Sentence Buffering & TTS Streaming
  for await (const chunk of aiStream) {
    const decoded = decoder.decode(chunk as Uint8Array, { stream: true });
    const lines = decoded.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ') && !line.includes('[DONE]')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.response) {
            const textChunk = data.response;
            currentSentence += textChunk;
            fullResponse += textChunk;

            // Send live text to client
            ws.send(JSON.stringify({ type: 'text_stream', text: textChunk }));

            // Check for chunk boundaries (more granular for lower latency, including Hindi Purna Viram '।')
            const wordCount = currentSentence.trim().split(/\s+/).length;
            const isPunctuation = /[.?!,;:।]\s/.test(currentSentence) || /[.?!,;:।]$/.test(currentSentence) || /\n/.test(currentSentence);
            const targetWords = chunkIndex === 0 ? 4 : 5;
            
            if (isPunctuation || wordCount >= targetWords) {
              let sentenceToSpeak = currentSentence.trim();
              currentSentence = ""; 

              // Extract emotion tag if present in this sentence
              let emotionTag = 'neutral';
              const emotionMatch = sentenceToSpeak.match(/\[emotion:\s*(.*?)\]/i);
              if (emotionMatch) {
                emotionTag = emotionMatch[1];
                sentenceToSpeak = sentenceToSpeak.replace(emotionMatch[0], '').trim();
              }

              if (sentenceToSpeak.length > 1) {
                const currentIndex = chunkIndex++;
                const currentSentenceToSpeak = sentenceToSpeak;
                const currentEmotion = emotionTag;
                
                // Fire TTS asynchronously immediately instead of sequentially waiting
                const ttsTask = (async () => {
                  console.log(`🎙️ [Backend] Synthesizing TTS chunk [${currentIndex}]: "${currentSentenceToSpeak}"`);
                  const audioBase64 = await synthesize(c.env, currentSentenceToSpeak, currentEmotion, lang);
                  if (audioBase64) {
                    ws.send(JSON.stringify({ 
                      type: 'tts_audio', 
                      index: currentIndex, 
                      audioBase64 
                    }));
                  }
                })();
                ttsPromises.push(ttsTask);
              }
            }
          }
        } catch (e) {
          // ignore JSON parse errors from SSE stream
        }
      }
    }
  }

  // Process leftover text
  if (currentSentence.trim().length > 2) {
    let sentenceToSpeak = currentSentence.trim();
    let emotionTag = 'neutral';
    const emotionMatch = sentenceToSpeak.match(/\[emotion:\s*(.*?)\]/i);
    if (emotionMatch) {
      emotionTag = emotionMatch[1];
      sentenceToSpeak = sentenceToSpeak.replace(emotionMatch[0], '').trim();
    }

    const currentIndex = chunkIndex++;
    const ttsTask = (async () => {
      const audioBase64 = await synthesize(c.env, sentenceToSpeak, emotionTag, lang);
      if (audioBase64) {
        ws.send(JSON.stringify({ type: 'tts_audio', index: currentIndex, audioBase64 }));
      }
    })();
    ttsPromises.push(ttsTask);
  }

  // Wait for all concurrent TTS chunks to finish before marking as done
  await Promise.all(ttsPromises);
  console.log('🎙️ [Backend] Completed sending all TTS chunks');
  ws.send(JSON.stringify({ type: 'generation_done' }));

  // 5. Background Summary Update
  c.executionCtx.waitUntil((async () => {
    try {
      const summaryResponse: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: "system", content: "Summarize the ongoing conversation in two short sentences." },
          { role: "user", content: `Old Summary: ${currentSummary}\nUser said: ${transcribedText}\nAI replied: ${fullResponse}\nNew Summary:` }
        ]
      });
      const newSummary = summaryResponse.response;
      await c.env.DB.prepare('INSERT INTO ChatSession (id, userId, currentSummary, updatedAt) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET currentSummary = excluded.currentSummary, updatedAt = excluded.updatedAt')
        .bind(userId, userId, newSummary, new Date().toISOString())
        .run();
    } catch (err) {
      console.error("Summary update failed:", err);
    }
  })());
}

export default voice;
