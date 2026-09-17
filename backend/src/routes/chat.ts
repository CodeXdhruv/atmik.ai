import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { retrieveContext } from '../lib/retrieval';
import { getSystemPrompt } from '../lib/prompts';
import { updateConversationContext } from '../lib/memory';
import { streamSSE } from 'hono/streaming';

const chat = new Hono<{ Bindings: Bindings }>();

// POST /api/chat
// Unified text-based chat service with RAG (bge-m3 + llama-3.1-8b)
chat.post('/', async (c) => {
  const { text, userId, lang = 'hi' } = await c.req.json();
  
  if (!text || !userId) {
    return c.json({ error: 'Missing text or userId' }, 400);
  }

  const cleanUserId = (userId || 'default_user').trim();

  // STEP 1: Fetch Chat History Summary (D1)
  const { results } = await c.env.DB.prepare('SELECT currentSummary FROM ChatSession WHERE userId = ?').bind(cleanUserId).all();
  const currentSummary = (results[0] as any)?.currentSummary || "No previous context.";

  // STEP 2: RAG Retrieval (Vectorize + BGE-M3 + Reranker)
  const context = await retrieveContext(c.env, text, lang);

  // STEP 3: Build System Prompt
  const systemPrompt = getSystemPrompt(context, currentSummary, lang);

  return streamSSE(c, async (stream) => {
    try {
      // STEP 4: LLM Generation (Streaming)
      const aiStream: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        stream: true
      });

      let fullResponse = "";
      const decoder = new TextDecoder();

      for await (const chunk of aiStream) {
        const decoded = decoder.decode(chunk as Uint8Array, { stream: true });
        const lines = decoded.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.response) {
                const textChunk = data.response;
                fullResponse += textChunk;
                
                await stream.writeSSE({
                  data: JSON.stringify({ type: 'text', content: textChunk }),
                });
              }
            } catch (e) {
              // ignore incomplete JSON chunks
            }
          }
        }
      }

      // STEP 5: Strip Emotion Tag & Background Summary Update
      // The prompt forces the LLM to end with [emotion: tag]
      let visibleText = fullResponse;
      let emotionMatch = fullResponse.match(/\[emotion:\s*(.*?)\]/i);
      if (emotionMatch) {
        visibleText = fullResponse.replace(emotionMatch[0], '').trim();
      }

      await stream.writeSSE({ data: JSON.stringify({ type: 'done', final_text: visibleText }) });

      c.executionCtx.waitUntil(
        updateConversationContext(c.env, cleanUserId, currentSummary, text, visibleText, 'Chat')
      );
      
    } catch (e: any) {
      console.error("Streaming error", e);
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: e.message }) });
    }
  });
});

export default chat;
