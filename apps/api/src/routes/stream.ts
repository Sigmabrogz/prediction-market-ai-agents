import { Router } from 'express';
import { randomUUID } from 'crypto';
import { broker } from '../services/sse-broker';

export const streamRouter = Router();

streamRouter.get('/', (req, res) => {
  // Setup SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = randomUUID();
  broker.addClient(clientId, res);

  // Initial connection success payload
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

  req.on('close', () => {
    broker.removeClient(clientId);
  });
});
