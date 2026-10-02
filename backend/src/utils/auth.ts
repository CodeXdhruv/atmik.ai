import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export async function verifyFirebaseToken(token: string, projectId: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload;
}

export async function authenticate(c: any): Promise<JWTPayload | null> {
  const authHeader = c.req.header('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token === 'temp-user-token') return null;

  try {
    const payload = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    if (!payload?.sub) return null;
    return payload;
  } catch (err) {
    console.error('JWT verification failed');
    return null;
  }
}

export async function assertUser(c: any): Promise<Response | null> {
  const payload = await authenticate(c);
  if (!payload) return c.json({ error: 'Unauthorized' }, 401);
  c.set('user', payload);
  return null;
}

export async function assertAdmin(c: any): Promise<Response | null> {
  const payload = await authenticate(c);
  if (!payload) return c.json({ error: 'Unauthorized' }, 401);

  const row = await c.env.DB.prepare('SELECT role FROM User WHERE firebaseUid = ?')
    .bind(payload.sub)
    .first() as { role: string } | null;

  if (!row || row.role !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('user', payload);
  return null;
}
