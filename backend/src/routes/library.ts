import { Hono } from 'hono';
import { Bindings } from '../types/env';

import { assertAdmin, authenticate } from '../utils/auth';
import { isFuturePublish, notifyContentPublished, notifyContentUpdated } from '../lib/publishContent';

const library = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// Auth middleware
library.use('*', async (c, next) => {
  // Allow public access to files so Images and Audio players can stream them directly
  if (c.req.path.startsWith('/api/library/file/')) {
    await next();
    return;
  }

  const payload = await authenticate(c);
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (c.req.method !== 'GET') {
    const denied = await assertAdmin(c);
    if (denied) return denied;
  } else {
    c.set('user', payload);
  }

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
    const { title, type, coverUrl, fileUrl, description, subtitle, author, readTime, category, featured, publishAt } = await c.req.json();
    
    if (!title || !type || !fileUrl) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO Content (id, title, type, coverUrl, fileUrl, createdAt, description, subtitle, author, readTime, category, featured, publishAt, publishNotified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, title, type, coverUrl || null, fileUrl, createdAt, description || null, subtitle || null, author || null, readTime || null, category || null, featured ? 1 : 0, publishAt || null, isFuturePublish(publishAt) ? 0 : 1).run();

    if (!isFuturePublish(publishAt)) {
      try {
        await notifyContentPublished(c.env, title, id);
      } catch (e) {
        console.error('Failed to send automatic notification:', e);
      }
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
    const { title, type, coverUrl, fileUrl, description, subtitle, author, readTime, category, featured, publishAt } = await c.req.json();

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
           subtitle = COALESCE(?, subtitle),
           author = COALESCE(?, author),
           readTime = COALESCE(?, readTime),
           category = COALESCE(?, category),
           featured = COALESCE(?, featured),
           publishAt = ?,
           publishNotified = ?
       WHERE id = ?`
    ).bind(
      title || null,
      type || null,
      coverUrl || null,
      fileUrl || null,
      description || null,
      subtitle || null,
      author || null,
      readTime || null,
      category || null,
      featured === undefined || featured === null ? null : (featured ? 1 : 0),
      publishAt || null,
      isFuturePublish(publishAt) ? 0 : 1,
      id
    ).run();

    if (!isFuturePublish(publishAt)) {
      try {
        await notifyContentUpdated(c.env, title, id);
      } catch (e) {
        console.error('Failed to send automatic update notification:', e);
      }
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
    const user = c.get('user');
    const roleRow = await c.env.DB.prepare('SELECT role FROM User WHERE firebaseUid = ?')
      .bind(user?.sub)
      .first() as { role: string } | null;
    const now = new Date().toISOString();
    const { results } = roleRow?.role === 'ADMIN'
      ? await c.env.DB.prepare('SELECT * FROM Content ORDER BY createdAt DESC').all()
      : await c.env.DB.prepare(
          'SELECT * FROM Content WHERE publishAt IS NULL OR publishAt <= ? ORDER BY createdAt DESC'
        ).bind(now).all();
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
