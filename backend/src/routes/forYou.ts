import { Hono } from 'hono';
import { Bindings } from '../types/env';

const forYou = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

async function ensureForYouPoolTableExists(db: any) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ForYouPool (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          question TEXT NOT NULL,
          helper TEXT NOT NULL,
          releaseOptions TEXT NOT NULL,
          transitionLabel TEXT NOT NULL,
          secondQuestion TEXT NOT NULL,
          spaceOptions TEXT NOT NULL,
          completion TEXT NOT NULL,
          response_messages TEXT,
          createdAt TEXT NOT NULL
      )
    `).run();
  } catch (e) {
    console.error("Auto-create ForYouPool table error:", e);
  }
}

// GET /api/for-you/today
// Returns today's active micro-experience for the mobile app (rotates automatically at midnight IST)
forYou.get('/today', async (c) => {
  try {
    await ensureForYouPoolTableExists(c.env.DB);

    // Fetch all items from D1 ForYouPool table ordered by original sequence
    const poolRes = await c.env.DB.prepare(
      'SELECT * FROM ForYouPool ORDER BY createdAt ASC, id ASC'
    ).all();

    if (!poolRes.results || poolRes.results.length === 0) {
      return c.json({ success: false, message: 'No for-you items found in pool' }, 404);
    }

    const allItems = poolRes.results as any[];
    const totalItems = allItems.length;

    // Optional query parameter `seen` (comma separated IDs) to guarantee non-repeating items
    const seenParam = c.req.query('seen') || '';
    const seenIds = seenParam ? seenParam.split(',').map(s => s.trim()).filter(Boolean) : [];

    let availableItems = allItems.filter(item => !seenIds.includes(item.id));
    let resetHistory = false;

    if (availableItems.length === 0) {
      // All items in the pool have been completed! Reset cycle
      availableItems = allItems;
      resetHistory = true;
    }

    // Calculate deterministic daily index based on 12:00 AM midnight (IST UTC+5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const localDayNumber = Math.floor((now.getTime() + istOffsetMs) / (24 * 60 * 60 * 1000));

    const selectedIndex = localDayNumber % availableItems.length;
    const selectedItem: any = availableItems[selectedIndex];

    return c.json({
      success: true,
      dayIndex: selectedIndex + 1,
      totalDays: totalItems,
      resetHistory,
      data: {
        id: selectedItem.id,
        label: selectedItem.label,
        question: selectedItem.question,
        helper: selectedItem.helper,
        releaseOptions: typeof selectedItem.releaseOptions === 'string'
          ? JSON.parse(selectedItem.releaseOptions)
          : selectedItem.releaseOptions,
        transitionLabel: selectedItem.transitionLabel,
        secondQuestion: selectedItem.secondQuestion,
        spaceOptions: typeof selectedItem.spaceOptions === 'string'
          ? JSON.parse(selectedItem.spaceOptions)
          : selectedItem.spaceOptions,
        completion: typeof selectedItem.completion === 'string'
          ? JSON.parse(selectedItem.completion)
          : selectedItem.completion,
        response_messages: selectedItem.response_messages
          ? (typeof selectedItem.response_messages === 'string' ? JSON.parse(selectedItem.response_messages) : selectedItem.response_messages)
          : { first_choice: {}, second_choice: {} }
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/for-you/upload (also mounted at /api/admin/for-you/upload)
// Upload JSON array of micro-experiences
forYou.post('/upload', async (c) => {
  try {
    const rawPayload = await c.req.json();
    const items = Array.isArray(rawPayload)
      ? rawPayload
      : (rawPayload.experiences || rawPayload.items || rawPayload.data || [rawPayload]);

    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Expected an array of for-you items' }, 400);
    }

    await ensureForYouPoolTableExists(c.env.DB);

    // Clear existing pool in D1
    await c.env.DB.prepare('DELETE FROM ForYouPool').run();

    // Prepare insert statement
    const stmt = c.env.DB.prepare(
      `INSERT INTO ForYouPool (
        id, label, question, helper, releaseOptions, transitionLabel, secondQuestion, spaceOptions, completion, response_messages, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const batch = items.map((item: any, idx: number) => {
      const id = item.id || `for_you_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      const label = item.label || 'RELEASE';
      const question = item.question || '';
      const helper = item.helper || '';
      const releaseOptions = JSON.stringify(item.releaseOptions || []);
      const transitionLabel = item.transitionLabel || 'MAKE SPACE';
      const secondQuestion = item.secondQuestion || '';
      const spaceOptions = JSON.stringify(item.spaceOptions || []);
      const completion = JSON.stringify(item.completion || {
        title: 'A little more space.',
        message_template: null,
        message_templates: [
          'You noticed {first_choice} and made space for {second_choice}. Let that be enough for this moment.'
        ],
        message_selection: {
          strategy: 'deterministic_from_selected_choices',
          formula: '(firstChoiceIndex + secondChoiceIndex + experienceIndex) % message_templates.length',
          fallbackIndex: 0
        }
      });
      const responseMessages = JSON.stringify(item.response_messages || { first_choice: {}, second_choice: {} });
      const createdAt = new Date().toISOString();

      return stmt.bind(
        id, label, question, helper, releaseOptions, transitionLabel, secondQuestion, spaceOptions, completion, responseMessages, createdAt
      );
    });

    // Execute in batch chunks of 50
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      await c.env.DB.batch(batch.slice(i, i + CHUNK_SIZE));
    }

    // Overwrite JSON file in R2 bucket if available
    try {
      if (c.env.R2) {
        await c.env.R2.put('for_you/for_you_pool.json', JSON.stringify(items, null, 2), {
          httpMetadata: { contentType: 'application/json' },
        });
      }
    } catch (r2Err) {
      console.error('R2 storage sync warning:', r2Err);
    }

    return c.json({
      success: true,
      count: batch.length,
      message: `Successfully uploaded ${batch.length} new for-you micro-experiences.`
    });
  } catch (error: any) {
    console.error('For You upload backend error:', error);
    return c.json({ error: error.message || 'Failed to upload for-you pool to server.' }, 500);
  }
});

export default forYou;
