import Redis from 'ioredis';
import { OracleSignal } from './types';

export const REDIS_CHANNEL = 'oracle_signals';

let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let cmdClient: Redis | null = null; // Used for SETNX locks

export function getRedisClient(url?: string): Redis {
  return new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

export function getRedisPubClient(url?: string): Redis {
  if (!pubClient) {
    pubClient = getRedisClient(url);
    pubClient.on('error', (err) => console.error(`[Redis Pub] Connection Error:`, err.message));
  }
  return pubClient;
}

export function getRedisSubClient(url?: string): Redis {
  if (!subClient) {
    subClient = getRedisClient(url);
    subClient.on('error', (err) => console.error(`[Redis Sub] Connection Error:`, err.message));
  }
  return subClient;
}

export function getRedisCmdClient(url?: string): Redis {
  if (!cmdClient) {
    cmdClient = getRedisClient(url);
    cmdClient.on('error', (err) => console.error(`[Redis Cmd] Connection Error:`, err.message));
  }
  return cmdClient;
}

export async function publishSignal(signal: OracleSignal): Promise<void> {
  try {
    const client = getRedisPubClient();
    const payload = JSON.stringify(signal);
    await client.publish(REDIS_CHANNEL, payload);
    console.log(`[${new Date().toISOString()}] [Redis] PUBLISHED SIGNAL [${signal.id}] to ${REDIS_CHANNEL}`);
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] [Redis] Failed to publish signal ${signal.id}. Fallback local log:`, JSON.stringify(signal));
  }
}
