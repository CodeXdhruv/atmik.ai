import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { verifyFirebaseToken } from '../utils/auth';

const journey = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

async function ensureJourneyPoolTableExists(db: any) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS JourneyPool (
          id TEXT PRIMARY KEY,
          todaysReflection TEXT NOT NULL,
          lookWithin TEXT NOT NULL,
          thoughtToCarry TEXT NOT NULL,
          isUsed INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL
      )
    `).run();
  } catch (e) {
    console.error("Auto-create JourneyPool table error:", e);
  }
}

// GET /api/journey/today
// Returns today's active bundle for the mobile app (rotates automatically at 12:00 AM midnight)
journey.get('/today', async (c) => {
  try {
    await ensureJourneyPoolTableExists(c.env.DB);

    // 1. Fetch all items from D1 JourneyPool table ordered by original sequence
    const poolRes = await c.env.DB.prepare(
      'SELECT * FROM JourneyPool ORDER BY createdAt ASC, id ASC'
    ).all();

    if (!poolRes.results || poolRes.results.length === 0) {
      return c.json({ success: false, message: 'No journey items found in pool' }, 444);
    }

    // 2. Calculate deterministic daily index based on 12:00 AM midnight (IST UTC+5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const localDayNumber = Math.floor((now.getTime() + istOffsetMs) / (24 * 60 * 60 * 1000));

    const totalItems = poolRes.results.length;
    const selectedIndex = localDayNumber % totalItems;
    const selectedItem: any = poolRes.results[selectedIndex];

    return c.json({
      success: true,
      dayIndex: selectedIndex + 1,
      totalDays: totalItems,
      data: {
        id: selectedItem.id,
        todaysReflection: typeof selectedItem.todaysReflection === 'string' 
          ? JSON.parse(selectedItem.todaysReflection) 
          : selectedItem.todaysReflection,
        lookWithin: typeof selectedItem.lookWithin === 'string' 
          ? JSON.parse(selectedItem.lookWithin) 
          : selectedItem.lookWithin,
        thoughtToCarry: typeof selectedItem.thoughtToCarry === 'string' 
          ? JSON.parse(selectedItem.thoughtToCarry) 
          : selectedItem.thoughtToCarry,
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});



// POST /api/admin/journey/upload
// Upload JSON array of daily journey items
journey.post('/upload', async (c) => {
  try {
    const items = await c.req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return c.json({ error: 'Expected an array of journey items' }, 400);
    }

    await ensureJourneyPoolTableExists(c.env.DB);

    // Clear existing pool in D1
    await c.env.DB.prepare('DELETE FROM JourneyPool').run();

    // Prepare insert statements
    const stmt = c.env.DB.prepare(
      'INSERT INTO JourneyPool (id, todaysReflection, lookWithin, thoughtToCarry, isUsed, createdAt) VALUES (?, ?, ?, ?, 0, ?)'
    );

    const batch = items.map((item: any, idx: number) => {
      const id = item.id || `journey_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      const todaysReflection = JSON.stringify(item.todaysReflection || item.todayReflection || {});
      const lookWithin = JSON.stringify(item.lookWithin || {});
      const thoughtToCarry = JSON.stringify(item.thoughtToCarry || item.thoughtsToCarry || {});
      const createdAt = new Date().toISOString();

      return stmt.bind(id, todaysReflection, lookWithin, thoughtToCarry, createdAt);
    });

    // Execute in batch chunks of 50
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      await c.env.DB.batch(batch.slice(i, i + CHUNK_SIZE));
    }

    // Overwrite JSON file in R2 bucket if available
    try {
      if (c.env.R2) {
        await c.env.R2.put('journey/journey_pool.json', JSON.stringify(items, null, 2), {
          httpMetadata: { contentType: 'application/json' },
        });
      }
    } catch (r2Err) {
      console.error('R2 storage sync warning:', r2Err);
    }

    return c.json({
      success: true,
      count: batch.length,
      message: `Successfully uploaded ${batch.length} new daily journey items.`
    });
  } catch (error: any) {
    console.error('Journey upload backend error:', error);
    return c.json({ error: error.message || 'Failed to upload journey pool to server.' }, 500);
  }
});

export default journey;
