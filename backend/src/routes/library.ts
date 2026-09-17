import { Hono } from 'hono';
import { Bindings } from '../types/env';

import { verifyFirebaseToken } from '../utils/auth';

const library = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// Auth middleware
library.use('*', async (c, next) => {
  // Allow public access to files so Images and Audio players can stream them directly
  if (c.req.path.startsWith('/api/library/file/')) {
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split('Bearer ')[1];
  
  if (token === 'temp-user-token') {
    // Keep this bypass ONLY for the mobile app right now since mobile app doesn't have Firebase Auth fully setup yet
    c.set('user', { sub: 'dev-user' });
    await next();
    return;
  }


  let payload;
  try {
    payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
  } catch (err: any) {
    return c.json({ error: `Verification threw: ${err.message}` }, 401);
  }

  if (!payload || !payload.sub) {
    return c.json({ error: `Invalid or expired token. verifyFirebaseToken returned null.` }, 401);
  }

  // Check if user has ADMIN role in D1 database
  const { results } = await c.env.DB.prepare('SELECT role FROM User WHERE firebaseUid = ?')
    .bind(payload.sub)
    .all();

  if (results.length === 0 || results[0].role !== 'ADMIN') {
    // Enforce ADMIN role only for modifications (POST/PUT/DELETE)
    if (c.req.method !== 'GET') {
      return c.json({ error: 'Forbidden: Admins only' }, 403);
    }
  }

  c.set('user', payload);
  await next();
});

// POST /api/library/upload
// Uploads a file directly to Cloudflare R2 via the worker binding
library.post('/upload', async (c) => {
  try {
    const formData = await c.req.parseBody();
    const file = formData['file'];
    
    // In some environments, instanceof File fails for FormData entries, so we also check if it has a size and name
    if (!file || typeof file === 'string' || !('size' in (file as any))) {
      console.error('Invalid file upload. Received:', file);
      return c.json({ error: 'No file provided or invalid file format' }, 400);
    }
    
    const fileObj = file as File;
    const fileKey = `${crypto.randomUUID()}-${fileObj.name}`;
    
    // Upload directly using the R2 binding
    await c.env.R2.put(fileKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    
    // We will serve the file via a worker route for now
    const url = new URL(c.req.url);
    const publicUrl = `${url.protocol}//${url.host}/api/library/file/${fileKey}`;

    return c.json({
      success: true,
      fileKey,
      publicUrl
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/library/file/:fileKey
// Serves files from R2
library.get('/file/:fileKey', async (c) => {
  const fileKey = c.req.param('fileKey');
  const object = await c.env.R2.get(fileKey);
  
  if (!object) {
    return c.notFound();
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  return new Response(object.body, { headers });
});

// POST /api/library/content
// Saves the uploaded media metadata to D1
library.post('/content', async (c) => {
  try {
    const { title, type, coverUrl, fileUrl, description, author, readTime, category } = await c.req.json();
    
    if (!title || !type || !fileUrl) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO Content (id, title, type, coverUrl, fileUrl, createdAt, description, author, readTime, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title, type, coverUrl || null, fileUrl, createdAt, description || null, author || null, readTime || null, category || null).run();

    // Trigger Push Notification automatically
    try {
      const { results } = await c.env.DB.prepare('SELECT pushToken FROM User WHERE pushToken IS NOT NULL').all();
      const tokens = results.map((r: any) => r.pushToken).filter(Boolean);

      if (tokens.length > 0) {
        const notifTitle = 'New Content Available!';
        const notifBody = `${title} is now available in the library.`;
        const notificationId = crypto.randomUUID();

        // Save to Notification inbox
        await c.env.DB.prepare(
          'INSERT INTO Notification (id, userId, title, body, type, createdAt) VALUES (?, NULL, ?, ?, ?, ?)'
        ).bind(notificationId, notifTitle, notifBody, 'CONTENT', new Date().toISOString()).run();

        const messages = tokens.map(token => ({
          to: token,
          sound: 'default',
          title: notifTitle,
          body: notifBody,
          data: { type: 'CONTENT', id: notificationId, contentId: id, route: '/health' },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      }
    } catch (e) {
      console.error('Failed to send automatic notification:', e);
    }

    return c.json({ success: true, message: 'Content added successfully', id }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/library/content/:id
// Updates existing content metadata in D1 and triggers a push notification
library.put('/content/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { title, type, coverUrl, fileUrl, description, author, readTime, category } = await c.req.json();

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    await c.env.DB.prepare(
      `UPDATE Content 
       SET title = COALESCE(?, title),
           type = COALESCE(?, type),
           coverUrl = COALESCE(?, coverUrl),
           fileUrl = COALESCE(?, fileUrl),
           description = COALESCE(?, description),
           author = COALESCE(?, author),
           readTime = COALESCE(?, readTime),
           category = COALESCE(?, category)
       WHERE id = ?`
    ).bind(
      title || null,
      type || null,
      coverUrl || null,
      fileUrl || null,
      description || null,
      author || null,
      readTime || null,
      category || null,
      id
    ).run();

    // Trigger Push Notification automatically for Library Update
    try {
      const { results } = await c.env.DB.prepare('SELECT pushToken FROM User WHERE pushToken IS NOT NULL').all();
      const tokens = results.map((r: any) => r.pushToken).filter(Boolean);

      if (tokens.length > 0) {
        const notifTitle = '📚 Library Content Updated!';
        const notifBody = `"${title}" has been updated in the library. Tap to view!`;
        const notificationId = crypto.randomUUID();

        // Save to Notification inbox in D1
        await c.env.DB.prepare(
          'INSERT INTO Notification (id, userId, title, body, type, createdAt) VALUES (?, NULL, ?, ?, ?, ?)'
        ).bind(notificationId, notifTitle, notifBody, 'CONTENT_UPDATE', new Date().toISOString()).run();

        const messages = tokens.map(token => ({
          to: token,
          sound: 'default',
          title: notifTitle,
          body: notifBody,
          data: { type: 'CONTENT_UPDATE', id: notificationId, contentId: id, route: '/health' },
        }));

        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });
      }
    } catch (e) {
      console.error('Failed to send automatic update notification:', e);
    }

    return c.json({ success: true, message: 'Content updated successfully', id });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/library/content/:id
library.delete('/content/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM Content WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Content deleted successfully' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/library/content
library.get('/content', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM Content ORDER BY createdAt DESC').all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/library/categories
library.get('/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM Category ORDER BY createdAt ASC').all();
    return c.json({ success: true, data: results });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/library/categories
library.post('/categories', async (c) => {
  try {
    const { name, parentId, icon } = await c.req.json();
    if (!name) return c.json({ error: 'Name is required' }, 400);

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO Category (id, name, parentId, icon, createdAt) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, name, parentId || null, icon || null, createdAt).run();

    return c.json({ success: true, id, name, parentId, icon, createdAt }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/library/categories/:id
library.put('/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, icon } = await c.req.json();
    if (!name) return c.json({ error: 'Name is required' }, 400);

    await c.env.DB.prepare('UPDATE Category SET name = ?, icon = ? WHERE id = ?').bind(name, icon || null, id).run();

    return c.json({ success: true, id, name, icon });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /api/library/categories/:id
library.delete('/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Delete the category and any child categories
    await c.env.DB.prepare('DELETE FROM Category WHERE id = ? OR parentId = ?').bind(id, id).run();

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

library.get('/quotes', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT * FROM QuotesPool ORDER BY createdAt DESC'
  ).all();

  return c.json(result.results);
});

export default library;
