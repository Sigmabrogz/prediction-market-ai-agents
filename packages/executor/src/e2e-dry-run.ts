import { getRedisPubClient, REDIS_CHANNEL } from '../../core/src/redis';
import { OracleSignal } from '../../core/src/types';

// Simulate an Oracle Signal firing (as if YouTube hit 100m subs)
const simulatedSignal: OracleSignal = {
  id: `test-signal-${Date.now()}`,
  source: 'YOUTUBE',
  targetId: 'UCX6OQ3DkcsbYNE6H8uQQuVA',
  triggerCondition: '>= 100000000',
  timestamp: Date.now(),
  value: 100000500
};

async function run() {
  console.log(`[E2E] Firing simulated Oracle Signal into Redis...`);
  const pub = getRedisPubClient();
  await pub.publish(REDIS_CHANNEL, JSON.stringify(simulatedSignal));
  console.log(`[E2E] Signal published. Check the executor process terminal.`);
  process.exit(0);
}

run();
