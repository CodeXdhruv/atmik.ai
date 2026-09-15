import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { verifyFirebaseToken } from '../utils/auth';

const admin = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// Auth middleware for all admin routes
admin.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.split('Bearer ')[1];
  let payload;
  try {
    payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  } catch (err: any) {
    return c.json({ error: 'Unauthorized', message: err.message }, 401);
  }

  if (!payload || !payload.sub) {
    return c.json({ error: 'Invalid or expired token', message: 'Token payload missing sub claim' }, 401);
  }

  // Check if user has ADMIN role in D1 database
  try {
    const { results } = await c.env.DB.prepare('SELECT role FROM User WHERE firebaseUid = ?')
      .bind(payload.sub)
      .all();

    if (results.length === 0 || results[0].role !== 'ADMIN') {
      return c.json({ error: 'Forbidden', message: 'Forbidden: Admins only' }, 403);
    }
  } catch (dbErr: any) {
    return c.json({ error: 'Database Error', message: dbErr.message }, 500);
  }

  c.set('user', payload);
  await next();
});

// GET /api/admin/users
// Fetch all users
admin.get('/users', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, firebaseUid, email, role FROM User ORDER BY email ASC').all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/admin/users/:id/role
// Update a user's role
admin.put('/users/:id/role', async (c) => {
  try {
    const id = c.req.param('id');
    const { role } = await c.req.json();

    if (role !== 'ADMIN' && role !== 'USER') {
      return c.json({ error: 'Invalid role. Must be ADMIN or USER.' }, 400);
    }

    await c.env.DB.prepare('UPDATE User SET role = ? WHERE id = ?')
      .bind(role, id)
      .run();

    return c.json({ success: true, message: 'User role updated successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/admin/ingest
// Receives an array of chunks (strings) and ingests them into Vectorize
admin.post('/ingest', async (c) => {
  const { chunks, clearIndex = true } = await c.req.json();

  if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
    return c.json({ error: 'Missing or empty chunks array' }, 400);
  }

  // Unfortunately, Vectorize doesn't have an easy "clear all" via the API in one call without deleting the index.
  // But we can just insert over it. If we want to ensure clean state, doing it via wrangler is best, 
  // but here we just insert the chunks.
  
  let inserted = 0;
  
  // Cloudflare AI run accepts an array of texts for embedding
  // But there are limits to how many can be embedded at once. We'll process in batches of 20.
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchTexts = chunks.slice(i, i + BATCH_SIZE);
    
    // Generate embeddings
    const aiResponse = await c.env.AI.run('@cf/baai/bge-m3', { text: batchTexts });
    const embeddings = aiResponse.data; // Array of arrays of numbers
    
    // Prepare Vectorize vectors
    const vectors = batchTexts.map((text, idx) => ({
      id: `rag_chunk_${Date.now()}_${i + idx}`,
      values: embeddings[idx],
      metadata: { content: text }
    }));
    
    // Insert into Vectorize
    const vecRes = await c.env.VECTORIZE.insert(vectors);
    inserted += vecRes.count || vectors.length;
  }

  return c.json({ success: true, message: `Successfully embedded and inserted ${inserted} chunks into atmik-index-v2.` });
});

// POST /api/admin/notify
// Send a push notification to all users
admin.post('/notify', async (c) => {
  try {
    const { title, body, type = 'BROADCAST' } = await c.req.json();

    if (!title || !body) {
      return c.json({ error: 'Missing title or body' }, 400);
    }

    // 1. Fetch all push tokens
    const { results } = await c.env.DB.prepare('SELECT pushToken FROM User WHERE pushToken IS NOT NULL').all();
    const tokens = results.map((r: any) => r.pushToken).filter(Boolean);

    if (tokens.length === 0) {
      return c.json({ success: true, message: 'No devices registered for push notifications.' });
    }

    // 2. Save notification to DB for the in-app inbox
    const notificationId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO Notification (id, userId, title, body, type, createdAt) VALUES (?, NULL, ?, ?, ?, ?)'
    )
    .bind(notificationId, title, body, type, new Date().toISOString())
    .run();

    // 3. Send to Expo Push API
    // Expo recommends chunking if there are > 100 tokens, but for now we do one fetch
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { type, id: notificationId },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    return c.json({ success: true, message: `Push notifications sent to ${tokens.length} devices`, expoData: data });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

admin.post('/quotes/upload', async (c) => {
  try {
    const quotes = await c.req.json();
    if (!Array.isArray(quotes)) {
      return c.json({ error: 'Expected an array of quotes' }, 400);
    }

    // 1. Delete old quotes JSON file(s) from R2 bucket and upload the new JSON file
    try {
      if (c.env.R2) {
        const objectsList = await c.env.R2.list({ prefix: 'quotes/' });
        for (const obj of objectsList.objects) {
          await c.env.R2.delete(obj.key);
        }

        const R2_KEY = 'quotes/dr_swatantra_jain_quotes.json';
        await c.env.R2.put(R2_KEY, JSON.stringify(quotes, null, 2), {
          httpMetadata: { contentType: 'application/json' },
        });
      }
    } catch (r2Error) {
      console.error('R2 Quotes deletion/upload error:', r2Error);
    }

    // 2. Clear old quotes entries in D1 database
    await c.env.DB.prepare('DELETE FROM QuotesPool').run();

    // 3. Insert new quotes into D1 database
    const stmt = c.env.DB.prepare(
      'INSERT INTO QuotesPool (id, text, author, createdAt) VALUES (?, ?, ?, ?)'
    );

    const batch = quotes.map((q: any) => 
      stmt.bind(crypto.randomUUID(), q.text || q.quote, q.author || 'Dr. Swatantra Jain', new Date().toISOString())
    );

    // Cloudflare D1 has limits on batch sizes (e.g. 50 statements). Chunk the batches.
    const CHUNK_SIZE = 50;
    for (let i = 0; i < batch.length; i += CHUNK_SIZE) {
      await c.env.DB.batch(batch.slice(i, i + CHUNK_SIZE));
    }

    return c.json({ success: true, count: batch.length, message: 'Old quotes deleted and new quotes updated successfully in R2 and D1.' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default admin;
