import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';
import { snapshotRouter } from './routes/snapshots';
import { streamRouter } from './routes/stream';

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/api', snapshotRouter);
  app.use('/stream', streamRouter);

  return app;
}
