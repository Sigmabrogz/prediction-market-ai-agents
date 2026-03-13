import { getRedisSubClient, getRedisCmdClient, REDIS_CHANNEL } from '../../core/src/redis';
import { OracleSignal, StrategyConfig, ExecutionRequest } from '../../core/src/types';
import { PolymarketAdapter } from './polymarket-adapter';
import { ExecutionEngine } from './execution-engine';
import dotenv from 'dotenv';

dotenv.config();

// Explicit fail-safes for LIVE mode
const DRY_RUN = process.env.DRY_RUN !== 'false';
const LIVE_CONFIRMATION = process.env.LIVE_CONFIRMATION === 'true';
const MODE_STR = DRY_RUN ? 'DRY_RUN' : 'LIVE';

// Priority 3: Hard Safety Rails
const WHITELISTED_MARKET = process.env.WHITELISTED_MARKET || '16678291189211314787145083999015737376658799626183230671758641503291735614088';
const WHITELISTED_WALLET = process.env.WHITELISTED_WALLET || '0x0000000000000000000000000000000000000000';
const HARD_MAX_TRADE_SIZE = 5; // $5 USD max for first live tests

console.log(`[${new Date().toISOString()}] [Executor] Starting in ${MODE_STR} mode.`);

if (!DRY_RUN) {
  if (!LIVE_CONFIRMATION) {
    console.error(`[${new Date().toISOString()}] [Executor] FATAL: LIVE_CONFIRMATION=true is required to disable DRY_RUN. Aborting.`);
    process.exit(1);
  }
  if (!process.env.POLYMARKET_PRIVATE_KEY) {
    console.error(`[${new Date().toISOString()}] [Executor] FATAL: POLYMARKET_PRIVATE_KEY missing in LIVE mode. Aborting.`);
    process.exit(1);
  }
  console.warn(`[${new Date().toISOString()}] [Executor] WARNING: LIVE EXECUTION MODE ENABLED.`);
  console.warn(`[${new Date().toISOString()}] [Executor] SECURITY: Hard Max Trade Size locked to $${HARD_MAX_TRADE_SIZE}`);
  console.warn(`[${new Date().toISOString()}] [Executor] SECURITY: Whitelisted Market locked to ${WHITELISTED_MARKET}`);
}

const adapter = new PolymarketAdapter({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  chainId: parseInt(process.env.POLYMARKET_CHAIN_ID || '137', 10),
  host: process.env.POLYMARKET_HOST || 'https://clob.polymarket.com'
});

const engine = new ExecutionEngine(adapter);
const sub = getRedisSubClient();
const cmd = getRedisCmdClient();

// Simulated database configuration mapping an Oracle Signal to a User Strategy
const mockStrategy: StrategyConfig = {
  id: 'strat-youtube-100m',
  oracleSource: 'YOUTUBE',
  marketId: WHITELISTED_MARKET,
  maxPositionSizeUsdc: 2, // Only $2 for the test strategy
  maxSlippageBps: 200, 
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
    
    // Priority 1: Redis-based Deduplication Lock
    const lockKey = `lock:execution:${signal.id}:${mockStrategy.id}`;
    // SETNX: Set if Not eXists, EX: Expire in 600 seconds (10 mins)
    const acquired = await cmd.set(lockKey, '1', 'EX', 600, 'NX');
    
    if (!acquired) {
      console.log(`[${new Date().toISOString()}] [Executor] Redis lock ${lockKey} exists. Skipping duplicate execution for signal: ${signal.id}`);
      return;
    }
    
    console.log(`\n[${new Date().toISOString()}] [Executor] [${MODE_STR}] Received Signal [${signal.id}] from ${signal.source}`);

    // Priority 3: Enforce hard safety limits
    if (mockStrategy.marketId !== WHITELISTED_MARKET) {
      console.error(`[${new Date().toISOString()}] [Executor] SECURITY BLOCK: Strategy marketId does not match WHITELISTED_MARKET.`);
      return;
    }
    if (mockStrategy.maxPositionSizeUsdc > HARD_MAX_TRADE_SIZE) {
      console.error(`[${new Date().toISOString()}] [Executor] SECURITY BLOCK: Strategy size (${mockStrategy.maxPositionSizeUsdc}) exceeds HARD_MAX_TRADE_SIZE (${HARD_MAX_TRADE_SIZE}).`);
      return;
    }

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
