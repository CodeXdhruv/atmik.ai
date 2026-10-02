import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { retrieveContext } from '../lib/retrieval';
import { getSystemPrompt } from '../lib/prompts';
import { updateConversationContext } from '../lib/memory';
import { asksWhoTheAssistantIs, shapeConversationalReply, shouldRetrieveKnowledge, wantsDeeperReply } from '../lib/speechText';
import { streamSSE } from 'hono/streaming';
import { assertUser } from '../utils/auth';
import { allowRequest } from '../lib/rateLimit';
import { withTimeout } from '../lib/timeout';

const chat = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// DELETE /api/chat/session
// Drops remembered conversation so a language change starts clean.
chat.delete('/session', async (c) => {
  const denied = await assertUser(c);
  if (denied) return denied;

  const uid = String(c.get('user').sub);
  await c.env.DB.prepare(
    `DELETE FROM ChatSession
     WHERE userId = ? OR id = ?
        OR userId IN (SELECT id FROM User WHERE firebaseUid = ?)`
  ).bind(uid, uid, uid).run();
  return c.json({ success: true });
});

// POST /api/chat
// Unified text-based chat service with RAG (bge-m3 + llama-3.1-8b)
chat.post('/', async (c) => {
  const denied = await assertUser(c);
  if (denied) return denied;

  const uid = String(c.get('user').sub);
  if (!allowRequest(`chat:${uid}`, 30, 60_000)) {
    return c.json({ error: 'Too many messages. Wait a moment and try again.' }, 429);
  }

  const { text, lang = 'hi' } = await c.req.json();
  
  if (!text || typeof text !== 'string') {
    return c.json({ error: 'Missing text' }, 400);
  }

  const cleanUserId = uid;

  // STEP 1: Fetch Chat History Summary (D1)
  const { results } = await c.env.DB.prepare('SELECT currentSummary FROM ChatSession WHERE userId = ?').bind(cleanUserId).all();
  const currentSummary = (results[0] as any)?.currentSummary || "No previous context.";

  // STEP 2: RAG Retrieval (Vectorize + BGE-M3 + Reranker)
  const greeting = /^(hi|hello|hey|namaste|ok|okay|thanks|thank you|धन्यवाद|नमस्ते)\.?$/i.test(text.trim());
  let context = 'No relevant context found.';
  if (!asksWhoTheAssistantIs(text) && !greeting && (shouldRetrieveKnowledge(text) || text.trim().split(/\s+/).length > 2)) {
    try {
      context = await retrieveContext(c.env, text, lang, 'chat');
    } catch (err) {
      console.warn('Chat retrieval skipped', err);
    }
  }

  console.log(`chat retrieval: ${context.startsWith('No relevant') ? 'none' : context.slice(0, 90).replace(/\s+/g, ' ')}`);

  // STEP 3: Build System Prompt
  const systemPrompt = getSystemPrompt(context, currentSummary, lang, 'chat', text);
  const userContent = text;
  const replyShape = wantsDeeperReply(text)
    ? { maxSentences: 8, maxWords: 160, paragraphs: true }
    : { maxSentences: 5, maxWords: 90, paragraphs: true };

  return streamSSE(c, async (stream) => {
    try {
      // STEP 4: LLM Generation (Streaming)
      const aiStream: any = await withTimeout(c.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        stream: true
      }), 45_000, 'Chat model');

      let fullResponse = "";
      let sent = "";
      const decoder = new TextDecoder();

      for await (const chunk of aiStream) {
        const decoded = decoder.decode(chunk as Uint8Array, { stream: true });
        const lines = decoded.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.response) {
                fullResponse += data.response;
                const visible = shapeConversationalReply(fullResponse, replyShape);
                if (visible.startsWith(sent) && visible.length > sent.length) {
                  await stream.writeSSE({
                    data: JSON.stringify({ type: 'text', content: visible.slice(sent.length) }),
                  });
                  sent = visible;
                }
              }
            } catch (e) {
              // ignore incomplete JSON chunks
            }
          }
        }
      }

      // STEP 5: Keep three spoken lines, then update memory
      const visibleText = shapeConversationalReply(fullResponse, replyShape);

      await stream.writeSSE({ data: JSON.stringify({ type: 'done', final_text: visibleText }) });

      c.executionCtx.waitUntil(
        updateConversationContext(c.env, cleanUserId, currentSummary, text, visibleText, 'Chat')
      );
      
    } catch (e: any) {
      console.error("Streaming error", e);
      await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: 'Something went wrong. Please try again.' }) });
    }
  });
});

export default chat;
