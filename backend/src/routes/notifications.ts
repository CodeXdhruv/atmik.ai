import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { authenticate } from '../utils/auth';

const notifications = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// Auth middleware for user routes
notifications.use('*', async (c, next) => {
  const payload = await authenticate(c);
  if (!payload?.sub) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Get user ID from Firebase UID
  const { results } = await c.env.DB.prepare('SELECT id FROM User WHERE firebaseUid = ?')
    .bind(payload.sub)
    .all();

  if (results.length === 0) {
    return c.json({ error: 'User not found in database' }, 404);
  }

  c.set('user', { ...payload, dbId: results[0].id });
  await next();
});

// GET /api/notifications
// Fetch recent notifications for the user (including broadcasts)
notifications.get('/', async (c) => {
  try {
    const user = c.get('user');

    // Fetch notifications that are specifically for this user or broadcasts (userId IS NULL)
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM Notification 
      WHERE userId = ? OR userId IS NULL 
      ORDER BY createdAt DESC 
      LIMIT 50
    `)
    .bind(user.dbId)
    .all();

    return c.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Notifications fetch failed', error);
    return c.json({ error: 'Could not load notifications' }, 500);
  }
});

export default notifications;
