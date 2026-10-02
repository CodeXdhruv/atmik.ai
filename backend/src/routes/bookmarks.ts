import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { assertUser } from '../utils/auth';

const bookmarks = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

bookmarks.use('*', async (c, next) => {
  const denied = await assertUser(c);
  if (denied) return denied;
  await next();
});

bookmarks.get('/:userId', async (c) => {
  try {
    const uid = String(c.get('user').sub);
    if (c.req.param('userId') !== uid) {
      return c.json({ success: false, error: 'Forbidden' }, 403);
    }

    const res = await c.env.DB.prepare(
      'SELECT contentId, createdAt FROM Bookmark WHERE userId = ? ORDER BY createdAt DESC'
    ).bind(uid).all();

    return c.json({ success: true, bookmarks: res.results || [] });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return c.json({ success: false, error: 'Failed to fetch bookmarks' }, 500);
  }
});

bookmarks.post('/toggle', async (c) => {
  try {
    const uid = String(c.get('user').sub);
    const { contentId } = await c.req.json();
    if (!contentId || typeof contentId !== 'string') {
      return c.json({ success: false, error: 'Missing contentId' }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT userId FROM Bookmark WHERE userId = ? AND contentId = ?'
    ).bind(uid, contentId).first();

    if (existing) {
      await c.env.DB.prepare(
        'DELETE FROM Bookmark WHERE userId = ? AND contentId = ?'
      ).bind(uid, contentId).run();
      return c.json({ success: true, action: 'removed' });
    }

    await c.env.DB.prepare(
      'INSERT INTO Bookmark (userId, contentId, createdAt) VALUES (?, ?, ?)'
    ).bind(uid, contentId, new Date().toISOString()).run();
    return c.json({ success: true, action: 'added' });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return c.json({ success: false, error: 'Failed to toggle bookmark' }, 500);
  }
});

export default bookmarks;
