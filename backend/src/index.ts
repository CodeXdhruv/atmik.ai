import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Bindings } from './types/env';

// Import routes
import authRoutes from './routes/auth';
import libraryRoutes from './routes/library';
import voiceRoutes from './routes/voice';
import chatRoutes from './routes/chat';
import migrateRoutes from './routes/migrate';
import adminRoutes from './routes/admin';
import notificationsRoutes from './routes/notifications';
import journeyRoutes from './routes/journey';

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*', // Restrict this in production
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'atmik-ai-backend' }));

// Root route to display API endpoints
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Atmik AI Backend API</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 3rem 1rem;
          margin: 0;
        }
        .container {
          max-width: 800px;
          width: 100%;
          background: #1e293b;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: -webkit-linear-gradient(45deg, #38bdf8, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: #94a3b8;
          margin-bottom: 2rem;
        }
        .endpoint-group {
          margin-bottom: 1.5rem;
        }
        h2 {
          font-size: 1.25rem;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
          padding-bottom: 0.5rem;
          margin-bottom: 1rem;
        }
        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        li {
          background: #0f172a;
          margin-bottom: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #334155;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }
        li:hover {
          border-color: #38bdf8;
          transform: translateY(-2px);
        }
        .method {
          background: #3b82f6;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          margin-right: 1rem;
          text-transform: uppercase;
        }
        .method.get { background: #10b981; }
        .method.api { background: #8b5cf6; }
        .path {
          font-family: monospace;
          font-size: 1rem;
          color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Atmik AI Backend API</h1>
        <p>Welcome to the Atmik AI Backend. Below is a list of available base API endpoints.</p>
        
        <div class="endpoint-group">
          <h2>System</h2>
          <ul>
            <li><span class="method get">GET</span> <span class="path">/</span></li>
            <li><span class="method get">GET</span> <span class="path">/health</span></li>
          </ul>
        </div>

        <div class="endpoint-group">
          <h2>API Routes</h2>
          <ul>
            <li><span class="method api">API</span> <span class="path">/api/auth/*</span></li>
            <li><span class="method api">API</span> <span class="path">/api/library/*</span></li>
            <li><span class="method api">API</span> <span class="path">/api/voice-chat/*</span></li>
            <li><span class="method api">API</span> <span class="path">/api/chat/*</span></li>
            <li><span class="method api">API</span> <span class="path">/api/migrate/*</span></li>
            <li><span class="method api">API</span> <span class="path">/api/admin/*</span></li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Mount routes
app.route('/api/auth', authRoutes);
app.route('/api/library', libraryRoutes);
app.route('/api/voice-chat', voiceRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/migrate', migrateRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/journey', journeyRoutes);
app.route('/api/admin/journey', journeyRoutes);

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default app;
