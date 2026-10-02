import { Hono } from 'hono';
import { Bindings } from '../types/env';
import { chunkApprovedKnowledge } from '../lib/chunkKnowledge';
import { embedKnowledgeChunks } from '../lib/retrieval';
import { assertAdmin } from '../utils/auth';

const migrate = new Hono<{ Bindings: Bindings }>();

// POST /api/migrate/vectorize
// Body is the approved teachings markdown. Instruction sections are not indexed.
migrate.post('/vectorize', async (c) => {
  const denied = await assertAdmin(c);
  if (denied) return denied;

  try {
    const body = await c.req.text();
    if (!body) {
      return c.json({ error: 'No body provided' }, 400);
    }

    const chunks = chunkApprovedKnowledge(body);
    if (chunks.length === 0) {
      return c.json({ error: 'No principle teachings found to index' }, 400);
    }

    const insertedCount = await embedKnowledgeChunks(c.env, chunks);

    return c.json({
      success: true,
      message: 'Teachings indexed. Older unlabeled vectors remain until this corpus is queried by filter.',
      chunksProcessed: chunks.length,
      insertedCount,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default migrate;
