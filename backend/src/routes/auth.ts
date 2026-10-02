import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { assertUser } from '../utils/auth';

const auth = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// POST /api/auth/sync
// Syncs the signed-in Firebase user with D1. Identity comes from the token.
auth.post('/sync', async (c) => {
  const denied = await assertUser(c);
  if (denied) return denied;

  try {
    const payload = c.get('user');
    const firebaseUid = String(payload.sub);
    const email = typeof payload.email === 'string' && payload.email
      ? payload.email
      : `${firebaseUid}@app.local`;

    const { results } = await c.env.DB.prepare('SELECT id, role FROM User WHERE firebaseUid = ?')
      .bind(firebaseUid)
      .all();

    if (results.length === 0) {
      const id = crypto.randomUUID();
      const role = 'USER';

      await c.env.DB.prepare(
        'INSERT INTO User (id, firebaseUid, email, role) VALUES (?, ?, ?, ?)'
      )
        .bind(id, firebaseUid, email, role)
        .run();

      return c.json({ success: true, message: 'User created in D1', id, role }, 201);
    }

    return c.json({ success: true, message: 'User already exists', id: results[0].id, role: results[0].role }, 200);
  } catch (error) {
    console.error('Auth sync failed', error);
    return c.json({ error: 'Could not sync account' }, 500);
  }
});

// POST /api/auth/push-token
auth.post('/push-token', async (c) => {
  const denied = await assertUser(c);
  if (denied) return denied;

  try {
    const { pushToken } = await c.req.json();
    if (!pushToken || typeof pushToken !== 'string') {
      return c.json({ error: 'Missing pushToken' }, 400);
    }

    const uid = String(c.get('user').sub);
    const { results } = await c.env.DB.prepare('SELECT id FROM User WHERE firebaseUid = ?').bind(uid).all();
    if (results.length === 0) {
      await c.env.DB.prepare('INSERT INTO User (id, firebaseUid, email, role, pushToken) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), uid, `${uid}@app.local`, 'USER', pushToken).run();
    } else {
      await c.env.DB.prepare('UPDATE User SET pushToken = ? WHERE firebaseUid = ?')
        .bind(pushToken, uid)
        .run();
    }

    return c.json({ success: true, message: 'Push token updated successfully' });
  } catch (error) {
    console.error('Push token update failed', error);
    return c.json({ error: 'Could not save push token' }, 500);
  }
});

// POST /api/auth/delete-account
// Removes server-side rows for the signed-in user. Call this before Firebase user.delete().
auth.post('/delete-account', async (c) => {
  const denied = await assertUser(c);
  if (denied) return denied;

  try {
    const uid = String(c.get('user').sub);
    const user = await c.env.DB.prepare('SELECT id FROM User WHERE firebaseUid = ?')
      .bind(uid)
      .first<{ id: string }>();

    const statements = [
      c.env.DB.prepare('DELETE FROM Bookmark WHERE userId = ? OR userId = ?').bind(uid, user?.id || uid),
      c.env.DB.prepare('DELETE FROM ChatSession WHERE userId = ? OR id = ? OR userId = ?').bind(uid, uid, user?.id || uid),
      c.env.DB.prepare('DELETE FROM Notification WHERE userId = ? OR userId = ?').bind(uid, user?.id || uid),
      c.env.DB.prepare('DELETE FROM User WHERE firebaseUid = ? OR id = ?').bind(uid, uid),
    ];

    await c.env.DB.batch(statements);
    return c.json({ success: true });
  } catch (error) {
    console.error('Account deletion failed', error);
    return c.json({ error: 'Could not delete account data' }, 500);
  }
});

export default auth;
