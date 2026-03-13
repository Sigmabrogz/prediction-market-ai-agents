import { getRedisSubClient, REDIS_CHANNEL } from '../../core/src/redis';
import { OracleSignal } from '../../core/src/types';
import dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.env.DRY_RUN !== 'false';
const MODE_STR = DRY_RUN ? 'DRY_RUN' : 'LIVE';

console.log(`[${new Date().toISOString()}] [Executor] Starting in ${MODE_STR} mode.`);

const sub = getRedisSubClient();
const processedSignals = new Set<string>();

sub.subscribe(REDIS_CHANNEL, (err, count) => {
  if (err) {
    console.error(`[${new Date().toISOString()}] [Executor] Redis Subscription Error:`, err.message);
    process.exit(1);
  }
  console.log(`[${new Date().toISOString()}] [Executor] Subscribed to ${count} channel(s). Waiting for signals on ${REDIS_CHANNEL}...`);
});

sub.on('message', async (channel, message) => {
  if (channel !== REDIS_CHANNEL) return;

  try {
    const signal: OracleSignal = JSON.parse(message);
    
    // Deduplication check
    if (processedSignals.has(signal.id)) {
      console.warn(`[${new Date().toISOString()}] [Executor] Duplicate signal received, ignoring: ${signal.id}`);
      return;
    }
    processedSignals.add(signal.id);
    
    console.log(`\n[${new Date().toISOString()}] [Executor] [${MODE_STR}] Received Signal [${signal.id}] from ${signal.source}`);
    console.log(JSON.stringify(signal, null, 2));

    await processSignal(signal);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] [Executor] Failed to parse message:`, message);
  }
});

async function processSignal(signal: OracleSignal) {
  // Business logic will be routed here in future commits.
  // For now, just structured logging.
  console.log(`[${new Date().toISOString()}] [Executor] [${MODE_STR}] Signal [${signal.id}] routed to execution engine. Target: ${signal.targetId}`);
  
  if (DRY_RUN) {
    console.log(`[${new Date().toISOString()}] [Executor] [DRY_RUN] Simulated execution complete for signal ${signal.id}.`);
    return;
  }
  
  // Real execution path placeholder
  console.log(`[${new Date().toISOString()}] [Executor] [LIVE] Execution sequence initiated for signal ${signal.id}.`);
}
