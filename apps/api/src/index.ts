import { createServer } from './server';
import dotenv from 'dotenv';
import { setupRedisListener } from './services/redis-listener';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function start() {
  console.log(`[API] Booting Observable Metrics API...`);
  
  if (!process.env.DATABASE_URL) {
    console.error(`[API] FATAL: DATABASE_URL missing`);
    process.exit(1);
  }
  
  const app = createServer();
  
  // Start the background worker that proxies Redis events to the SSE clients
  setupRedisListener();

  app.listen(PORT, () => {
    console.log(`[API] Server running on http://localhost:${PORT}`);
  });
}

start();
