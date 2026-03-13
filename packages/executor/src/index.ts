import { getRedisSubClient, REDIS_CHANNEL } from '../../core/src/redis';
import { OracleSignal, StrategyConfig, ExecutionRequest } from '../../core/src/types';
import { PolymarketAdapter } from './polymarket-adapter';
import { ExecutionEngine } from './execution-engine';
import dotenv from 'dotenv';

dotenv.config();

// Explicit fail-safes for LIVE mode
const DRY_RUN = process.env.DRY_RUN !== 'false';
const MODE_STR = DRY_RUN ? 'DRY_RUN' : 'LIVE';

console.log(`[${new Date().toISOString()}] [Executor] Starting in ${MODE_STR} mode.`);

if (!DRY_RUN) {
  if (!process.env.POLYMARKET_PRIVATE_KEY) {
    console.error(`[${new Date().toISOString()}] [Executor] FATAL: POLYMARKET_PRIVATE_KEY missing in LIVE mode. Aborting.`);
    process.exit(1);
  }
  console.warn(`[${new Date().toISOString()}] [Executor] WARNING: LIVE EXECUTION MODE ENABLED.`);
}

const adapter = new PolymarketAdapter({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000', // Dummy key for DRY_RUN
  chainId: parseInt(process.env.POLYMARKET_CHAIN_ID || '137', 10),
  host: process.env.POLYMARKET_HOST || 'https://clob.polymarket.com'
});

const engine = new ExecutionEngine(adapter);
const sub = getRedisSubClient();
const processedSignals = new Set<string>();

// Simulated database configuration mapping an Oracle Signal to a User Strategy
const mockStrategy: StrategyConfig = {
  id: 'strat-youtube-100m',
  oracleSource: 'YOUTUBE',
  marketId: '16678291189211314787145083999015737376658799626183230671758641503291735614088', // Example TokenID
  maxPositionSizeUsdc: 10,
  maxSlippageBps: 200, // 0.02c slippage allowance
  triggerThreshold: 100000000
};

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
    
    if (processedSignals.has(signal.id)) {
      console.warn(`[${new Date().toISOString()}] [Executor] Duplicate signal received, ignoring: ${signal.id}`);
      return;
    }
    processedSignals.add(signal.id);
    
    console.log(`\n[${new Date().toISOString()}] [Executor] [${MODE_STR}] Received Signal [${signal.id}] from ${signal.source}`);

    // Execute the mapped strategy
    const req: ExecutionRequest = {
      signal,
      strategy: mockStrategy,
      dryRun: DRY_RUN
    };

    const res = await engine.execute(req, 'BUY');
    console.log(`[${new Date().toISOString()}] [Executor] [${MODE_STR}] Execution Outcome:`, JSON.stringify(res));

  } catch (e) {
    console.error(`[${new Date().toISOString()}] [Executor] Failed to parse message or execute:`, e);
  }
});
