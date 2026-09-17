import { Bindings } from '../types/env';

/**
 * Smart Zero-Storage Conversation Memory System.
 * Reuses the existing single D1 ChatSession.currentSummary row per user
 * to store structured user facts and conversation context across Voice & Chat.
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
  if (!userText || !aiResponse) return;

  try {
    // 1. Ensure User record exists in D1 to prevent Foreign Key constraint failure
    await env.DB.prepare(
      `INSERT OR IGNORE INTO User (id, firebaseUid, email, role) VALUES (?, ?, ?, 'USER')`
    ).bind(cleanUserId, cleanUserId, `${cleanUserId}@app.local`).run();

    // 2. Build Memory Prompt
    const prompt = `You are a memory manager for Atmik AI assistant. Update the conversation memory for this user.

Previous Conversation Summary:
${oldSummary && oldSummary !== "No previous context." ? oldSummary : "None (start of conversation)."}

New Message Turn (${mode}):
User said: "${userText}"
AI replied: "${aiResponse}"

Task: Write an updated 2 to 3 sentence summary of the entire ongoing conversation and what key topics or questions the user discussed. Be specific about what was talked about so the AI can recall it later.`;

    const summaryResponse: any = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
      messages: [
        { 
          role: "system", 
          content: "You are a precise memory summarizer that creates concise conversation summaries." 
        },
        { role: "user", content: prompt }
      ]
    });

    let newSummary = summaryResponse?.response?.trim() || summaryResponse?.text?.trim() || "";
    // Clean codeblock markdown formatting if present
    newSummary = newSummary.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

    if (newSummary.length > 5) {
      await env.DB.prepare(
        `INSERT INTO ChatSession (id, userId, currentSummary, updatedAt) 
         VALUES (?, ?, ?, ?) 
         ON CONFLICT(id) DO UPDATE SET currentSummary = excluded.currentSummary, updatedAt = excluded.updatedAt`
      )
        .bind(cleanUserId, cleanUserId, newSummary, new Date().toISOString())
        .run();
      console.log(`🧠 [Memory SUCCESS] Context saved for user="${cleanUserId}" (${mode}): "${newSummary.slice(0, 80)}..."`);
    } else {
      console.warn(`🧠 [Memory WARN] Summary generation returned empty result for user="${cleanUserId}"`);
    }
  } catch (err: any) {
    console.error("🧠 [Memory ERROR] Failed to update conversation context:", err?.message || err);
  }
}
