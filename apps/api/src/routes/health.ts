import { Router } from 'express';
import { prisma } from '../../../packages/db/src';
import { getRedisSubClient } from '../../../packages/core/src/redis';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'disconnected';
  }

  try {
    const sub = getRedisSubClient();
    if (sub.status !== 'ready') {
      redisStatus = sub.status;
    }
  } catch (e) {
    redisStatus = 'disconnected';
  }

  res.json({
    status: dbStatus === 'ok' && redisStatus === 'ok' ? 'healthy' : 'degraded',
    services: {
      db: dbStatus,
      redis: redisStatus
    },
    mode: process.env.DRY_RUN !== 'false' ? 'DRY_RUN' : 'LIVE'
  });
});
