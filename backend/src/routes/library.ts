import { Hono } from 'hono';
import { Bindings } from '../types/env';

import { assertAdmin, authenticate } from '../utils/auth';
import { isFuturePublish, notifyContentPublished, notifyContentUpdated } from '../lib/publishContent';

const library = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();
const MAX_VIDEO_BYTES = 15 * 1024 * 1024;
const CONTENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

function normalizeStatus(status: unknown): string | null {
  const normalized = typeof status === 'string' ? status.trim().toUpperCase() : 'PUBLISHED';
  return CONTENT_STATUSES.has(normalized) ? normalized : null;
}

function isVideoFile(file: File): boolean {
  return file.type.toLowerCase().startsWith('video/') || /\.(mp4|mov|mkv|webm|m4v)$/i.test(file.name);
}

function youtubeIdFromUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.slice(1).match(/^[A-Za-z0-9_-]{11}$/)?.[0] || null;
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const id = url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})/)?.[1];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeTags(value: unknown): string | null {
  if (value === undefined || value === null) return '[]';
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) return null;
  return JSON.stringify([...new Set(value.map((tag: string) => tag.trim()).filter(Boolean))]);
}

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
    if (isVideoFile(fileObj) && fileObj.size > MAX_VIDEO_BYTES) {
      return c.json({ error: 'Video files must be 15 MB or smaller' }, 413);
    }
    const safeName = fileObj.name.split(/[\\/]/).pop()?.replace(/[^A-Za-z0-9._-]/g, '_') || 'upload';
    const fileKey = `${crypto.randomUUID()}-${safeName}`;
    
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
  const rangeHeader = c.req.header('Range');
  const requestedRange = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
  const object = await c.env.R2.get(fileKey, requestedRange ? {
    range: requestedRange[1]
      ? { offset: Number(requestedRange[1]), length: requestedRange[2] ? Number(requestedRange[2]) - Number(requestedRange[1]) + 1 : undefined }
      : { suffix: Number(requestedRange[2]) }
  } : undefined);
  
  if (!object) {
    return c.notFound();
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');

  if (requestedRange && object.range) {
    const range = object.range as { offset?: number; length?: number; suffix?: number };
    const start = range.offset ?? Math.max(0, object.size - (range.suffix || 0));
    const length = range.length ?? (object.size - start);
    const end = Math.min(object.size - 1, start + length - 1);
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { headers });
});

// POST /api/library/content
// Saves the uploaded media metadata to D1
library.post('/content', async (c) => {
  try {
    const {
      title, type, coverUrl, fileUrl, description, subtitle, author, readTime, category,
      featured, publishAt, status, videoSource, youtubeVideoId, fileName, fileSizeBytes,
      language, tags
    } = await c.req.json();
    
    if (!title || !type || !fileUrl) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const normalizedType = String(type).trim().toUpperCase();
    const normalizedStatus = normalizeStatus(status);
    const normalizedTags = normalizeTags(tags);
    if (!normalizedStatus) return c.json({ error: 'Invalid content status' }, 400);
    if (normalizedTags === null) return c.json({ error: 'Tags must be an array of strings' }, 400);

    let normalizedVideoSource: string | null = null;
    let normalizedYoutubeId: string | null = null;
    if (normalizedType === 'VIDEO' && !(normalizedStatus === 'DRAFT' && fileUrl === 'text-only' && !videoSource)) {
      normalizedVideoSource = String(videoSource || '').trim().toUpperCase();
      if (normalizedVideoSource === 'YOUTUBE') {
        normalizedYoutubeId = youtubeIdFromUrl(fileUrl);
        if (!normalizedYoutubeId && !(normalizedStatus === 'DRAFT' && fileUrl === 'text-only')) {
          return c.json({ error: 'A valid YouTube video URL is required' }, 400);
        }
      } else if (normalizedVideoSource === 'UPLOAD') {
        if (normalizedStatus !== 'DRAFT' && fileUrl === 'text-only') {
          return c.json({ error: 'A video file is required before publishing' }, 400);
        }
        if (fileSizeBytes !== undefined && (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes < 0 || fileSizeBytes > MAX_VIDEO_BYTES)) {
          return c.json({ error: 'Video files must be 15 MB or smaller' }, 413);
        }
        normalizedVideoSource = 'UPLOAD';
      } else {
        return c.json({ error: 'Video source must be UPLOAD or YOUTUBE' }, 400);
      }
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO Content
       (id, title, type, coverUrl, fileUrl, createdAt, description, subtitle, author, readTime,
        category, featured, publishAt, publishNotified, status, videoSource, youtubeVideoId,
        fileName, fileSizeBytes, language, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, title.trim(), normalizedType, coverUrl || null, fileUrl, createdAt, description || null,
      subtitle || null, author || null, readTime || null, category || null, featured ? 1 : 0,
      publishAt || null, normalizedStatus === 'PUBLISHED' && !isFuturePublish(publishAt) ? 1 : 0,
      normalizedStatus, normalizedVideoSource, normalizedYoutubeId, fileName || null,
      Number.isSafeInteger(fileSizeBytes) ? fileSizeBytes : null, language || 'English', normalizedTags
    ).run();

    if (normalizedStatus === 'PUBLISHED' && !isFuturePublish(publishAt)) {
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
    const {
      title, type, coverUrl, fileUrl, description, subtitle, author, readTime, category,
      featured, publishAt, status, videoSource, youtubeVideoId, fileName, fileSizeBytes,
      language, tags
    } = await c.req.json();

    if (!title) {
      return c.json({ error: 'Title is required' }, 400);
    }

    const normalizedStatus = status === undefined ? null : normalizeStatus(status);
    const normalizedTags = tags === undefined ? null : normalizeTags(tags);
    if (status !== undefined && !normalizedStatus) return c.json({ error: 'Invalid content status' }, 400);
    if (tags !== undefined && normalizedTags === null) return c.json({ error: 'Tags must be an array of strings' }, 400);
    if ((String(type || '').toUpperCase() === 'VIDEO' || videoSource !== undefined) && !(normalizedStatus === 'DRAFT' && fileUrl === 'text-only' && !videoSource)) {
      const source = String(videoSource || '').trim().toUpperCase();
      if (source !== 'UPLOAD' && source !== 'YOUTUBE') return c.json({ error: 'Video source must be UPLOAD or YOUTUBE' }, 400);
      if (source === 'YOUTUBE' && !youtubeIdFromUrl(fileUrl) && !(normalizedStatus === 'DRAFT' && fileUrl === 'text-only')) {
        return c.json({ error: 'A valid YouTube video URL is required' }, 400);
      }
      if (source === 'UPLOAD' && normalizedStatus !== 'DRAFT' && fileUrl === 'text-only') {
        return c.json({ error: 'A video file is required before publishing' }, 400);
      }
      if (source === 'UPLOAD' && fileSizeBytes !== undefined && (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes < 0 || fileSizeBytes > MAX_VIDEO_BYTES)) {
        return c.json({ error: 'Video files must be 15 MB or smaller' }, 413);
      }
    }

    const current = await c.env.DB.prepare('SELECT status, publishAt FROM Content WHERE id = ?').bind(id).first() as {
      status: string;
      publishAt: string | null;
    } | null;
    const effectiveStatus = normalizedStatus || current?.status || 'PUBLISHED';
    const effectivePublishAt = publishAt === undefined ? current?.publishAt : publishAt;

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
           publishAt = CASE WHEN ? = 1 THEN ? ELSE publishAt END,
           publishNotified = CASE WHEN ? = 1 THEN ? ELSE publishNotified END,
           status = COALESCE(?, status),
           videoSource = COALESCE(?, videoSource),
           youtubeVideoId = COALESCE(?, youtubeVideoId),
           fileName = COALESCE(?, fileName),
           fileSizeBytes = COALESCE(?, fileSizeBytes),
           language = COALESCE(?, language),
           tags = COALESCE(?, tags)
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
      publishAt === undefined ? 0 : 1,
      publishAt || null,
      normalizedStatus || publishAt !== undefined ? 1 : 0,
      effectiveStatus === 'PUBLISHED' && !isFuturePublish(effectivePublishAt) ? 1 : (normalizedStatus || publishAt !== undefined ? 0 : null),
      normalizedStatus,
      videoSource ? String(videoSource).toUpperCase() : null,
      youtubeVideoId || (String(videoSource || '').toUpperCase() === 'YOUTUBE' ? youtubeIdFromUrl(fileUrl) : null),
      fileName || null,
      Number.isSafeInteger(fileSizeBytes) ? fileSizeBytes : null,
      language || null,
      normalizedTags,
      id
    ).run();

    if (effectiveStatus === 'PUBLISHED' && !isFuturePublish(effectivePublishAt)) {
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
          `SELECT * FROM Content
           WHERE status = 'PUBLISHED' AND (publishAt IS NULL OR publishAt <= ?)
           ORDER BY createdAt DESC`
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
