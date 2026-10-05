import { Bindings } from '../types/env';

async function notifyLibrary(env: Bindings, title: string, body: string, contentId: string, type: string) {
  const { results } = await env.DB.prepare('SELECT pushToken FROM User WHERE pushToken IS NOT NULL').all();
  const tokens = results.map((row: any) => row.pushToken).filter(Boolean);
  if (tokens.length === 0) return;

  const notificationId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO Notification (id, userId, title, body, type, createdAt) VALUES (?, NULL, ?, ?, ?, ?)'
  ).bind(notificationId, title, body, type, new Date().toISOString()).run();

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { type, id: notificationId, contentId, route: '/learn' },
    }))),
  });
}

export function isFuturePublish(publishAt: string | null | undefined): boolean {
  if (!publishAt) return false;
  const when = new Date(publishAt).getTime();
  return Number.isFinite(when) && when > Date.now();
}

export async function notifyContentPublished(env: Bindings, title: string, contentId: string) {
  await notifyLibrary(env, 'New Content Available!', `${title} is now available in the library.`, contentId, 'CONTENT');
}

export async function notifyContentUpdated(env: Bindings, title: string, contentId: string) {
  await notifyLibrary(env, 'Library Content Updated!', `"${title}" has been updated in the library. Tap to view!`, contentId, 'CONTENT_UPDATE');
}

export async function publishDueContent(env: Bindings) {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id, title FROM Content
     WHERE publishAt IS NOT NULL AND publishAt <= ? AND publishNotified = 0`
  ).bind(now).all();

  for (const row of results as { id: string; title: string }[]) {
    try {
      await notifyContentPublished(env, row.title, row.id);
      await env.DB.prepare('UPDATE Content SET publishNotified = 1 WHERE id = ?').bind(row.id).run();
    } catch (error) {
      console.error('Failed to publish scheduled content', row.id, error);
    }
  }
}
