import { getRedisSubClient, getRedisCmdClient, REDIS_CHANNEL } from '../../core/src/redis';
import { LifecycleEventPublisher } from '../../core/src/event-publisher';
import { LifecycleEventType } from '../../core/src/events';
import { OracleSignal, StrategyConfig, ExecutionRequest, OrderMode } from '../../core/src/types';
import { PolymarketAdapter } from './polymarket-adapter';
import { ExecutionEngine } from './execution-engine';
import dotenv from 'dotenv';

dotenv.config();

const DRY_RUN = process.env.DRY_RUN !== 'false';
const LIVE_CONFIRMATION = process.env.LIVE_CONFIRMATION === 'true';
const MODE: OrderMode = DRY_RUN ? 'DRY_RUN' : 'LIVE';

const WHITELISTED_MARKET = process.env.WHITELISTED_MARKET || '16678291189211314787145083999015737376658799626183230671758641503291735614088';
const HARD_MAX_TRADE_SIZE = 5; 

console.log(`[${new Date().toISOString()}] [Executor] Starting in ${MODE} mode.`);

if (!DRY_RUN) {
  if (!LIVE_CONFIRMATION) {
    console.error(`[${new Date().toISOString()}] [Executor] FATAL: LIVE_CONFIRMATION=true is required to disable DRY_RUN. Aborting.`);
    process.exit(1);
  } else {
    console.log(`[Executor] Subscribed to ${REDIS_CHANNEL}`);
  }
  if (!process.env.POLYMARKET_PRIVATE_KEY) {
    console.error(`[${new Date().toISOString()}] [Executor] FATAL: POLYMARKET_PRIVATE_KEY missing in LIVE mode. Aborting.`);
    process.exit(1);
  } else {
    console.log(`[Executor] Subscribed to ${REDIS_CHANNEL}`);
  }
}

const adapter = new PolymarketAdapter({
  privateKey: process.env.POLYMARKET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
  chainId: parseInt(process.env.POLYMARKET_CHAIN_ID || '137', 10),
  host: process.env.POLYMARKET_HOST || 'https://clob.polymarket.com'
});

const engine = new ExecutionEngine(adapter);
const sub = getRedisSubClient();
const cmd = getRedisCmdClient();

const mockStrategy: StrategyConfig = {
  id: 'strat-youtube-100m',
  oracleSource: 'YOUTUBE',
  marketId: WHITELISTED_MARKET,
  maxPositionSizeUsdc: 2, 
  maxSlippageBps: 200, 
  triggerThreshold: 100000000
};

sub.subscribe(REDIS_CHANNEL, (err) => {
  if (err) {
    console.error(`Error:`, err);
    process.exit(1);
  } else {
    console.log(`[Executor] Subscribed to ${REDIS_CHANNEL}`);
  }
});

sub.on('message', async (channel, message) => {
  if (channel !== REDIS_CHANNEL) return;

  try {
    const signal: OracleSignal = JSON.parse(message);
    
    await LifecycleEventPublisher.publish({
      eventType: LifecycleEventType.SIGNAL_RECEIVED,
      mode: MODE,
      signalId: signal.id,
      strategyId: mockStrategy.id,
      marketId: mockStrategy.marketId,
      component: 'executor',
      payload: { source: signal.source, trigger: signal.triggerCondition }
    });

    const lockKey = `lock:execution:${signal.id}:${mockStrategy.id}`;
    const acquired = await cmd.set(lockKey, '1', 'EX', 600, 'NX');
    
    if (!acquired) {
      await LifecycleEventPublisher.publish({
        eventType: LifecycleEventType.SIGNAL_DEDUP_SKIPPED,
        mode: MODE,
        signalId: signal.id,
        strategyId: mockStrategy.id,
        marketId: mockStrategy.marketId,
        component: 'executor',
        payload: { lockKey }
      });
      return;
    }
    
    if (mockStrategy.marketId !== WHITELISTED_MARKET || mockStrategy.maxPositionSizeUsdc > HARD_MAX_TRADE_SIZE) {
       console.error(`[${new Date().toISOString()}] [Executor] SECURITY BLOCK: Strategy violates hard safety limits.`);
       return;
    }

    const req: ExecutionRequest = {
      signal,
      strategy: mockStrategy,
      dryRun: DRY_RUN
    };

    await engine.execute(req, 'BUY', MODE);

  } catch (e) {
    console.error(`[${new Date().toISOString()}] [Executor] Exception caught in subscriber loop:`, e);
  }
});
