import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

// Define expected Types matching the Core schemas
const ORACLE_CHANNEL = 'oracle_signals';
const REDIS_LIFECYCLE_CHANNEL = 'order_lifecycle_events';

const redisPub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Metrics Collector
const metrics = {
  totalSignalsEmitted: 0,
  validationsPassed: 0,
  validationsFailed: 0,
  ordersSubmitted: 0,
  ordersOpen: 0,
  fills: 0,
  partialFills: 0,
  cancels: 0,
  totalLatencyMs: 0,
  latencySamples: 0,
  errors: 0
};

// Track Signal start times for latency calculation
const signalStartTimes = new Map<string, number>();

// Sleep helper
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runSimulation() {
  console.log('======================================================');
  console.log('🚀 E2E PREDICTION MARKET AI - SIMULATION HARNESS');
  console.log('======================================================');
  
  const args = process.argv.slice(2);
  const count = parseInt(args[0] || '10') || 10;
  const intervalMs = parseInt(args[1] || '500') || 500;
  
  console.log(`[Config] Simulating ${count} signals with ${intervalMs}ms delay...`);
  
  // 1. Subscribe to Lifecycle events to track metrics
  await redisSub.subscribe(REDIS_LIFECYCLE_CHANNEL, (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
      process.exit(1);
    }
  });

  redisSub.on('message', (channel, message) => {
    if (channel === REDIS_LIFECYCLE_CHANNEL) {
      try {
        const event = JSON.parse(message);
        
        // Track Latency from Signal Emitted to First Executor Response (VALIDATION_PASSED/FAILED)
        if (event.eventType === 'VALIDATION_PASSED' || event.eventType === 'VALIDATION_FAILED') {
          const startTime = signalStartTimes.get(event.signalId);
          if (startTime) {
            const latency = Date.now() - startTime;
            metrics.totalLatencyMs += latency;
            metrics.latencySamples++;
            // Remove to only measure the very first executor tick
            signalStartTimes.delete(event.signalId);
          }
        }

        // Aggregate Metrics
        switch (event.eventType) {
          case 'VALIDATION_PASSED': metrics.validationsPassed++; break;
          case 'VALIDATION_FAILED': metrics.validationsFailed++; break;
          case 'ORDER_SUBMITTED': metrics.ordersSubmitted++; break;
          case 'ORDER_OPEN': metrics.ordersOpen++; break;
          case 'ORDER_FILLED': metrics.fills++; break;
          case 'ORDER_PARTIALLY_FILLED': metrics.partialFills++; break;
          case 'ORDER_CANCELLED': metrics.cancels++; break;
        }

        console.log(`[Lifecycle] ${event.orderId || event.signalId} -> ${event.eventType}`);
      } catch (error) {
        metrics.errors++;
      }
    }
  });

  // 2. Emit Signals
  console.log('\n[Oracle] Firing signals...');
  for (let i = 0; i < count; i++) {
    const signalId = randomUUID();
    
    // Simulate Edge Cases probabilistically
    const isDuplicate = Math.random() < 0.1; // 10% chance to send exact same signal twice
    const targetId = isDuplicate ? 'mock-target-duplicate' : `mock-target-${i}`;
    
    const signal = {
      id: isDuplicate ? `dup-1234` : signalId,
      source: 'SIMULATION_HARNESS',
      targetId: targetId,
      triggerCondition: 'VOLUME_SPIKE',
      timestamp: Date.now(),
      value: { volume: Math.random() * 1000000 }
    };

    signalStartTimes.set(signal.id, Date.now());
    await redisPub.publish(ORACLE_CHANNEL, JSON.stringify(signal));
    metrics.totalSignalsEmitted++;

    if (isDuplicate) {
      console.log(`[Oracle] Fired DUPLICATE Signal: ${signal.id}`);
      // Fire it again to test idempotency
      await redisPub.publish(ORACLE_CHANNEL, JSON.stringify(signal));
      metrics.totalSignalsEmitted++;
    } else {
      console.log(`[Oracle] Fired Signal: ${signal.id}`);
    }

    await sleep(intervalMs);
  }

  // 3. Wait for pipeline to drain
  console.log('\n[Harness] Waiting for execution pipeline to drain (15s)...');
  await sleep(15000);

  // 4. Generate Report
  const avgLatency = metrics.latencySamples > 0 
    ? (metrics.totalLatencyMs / metrics.latencySamples).toFixed(2) 
    : '0';
  
  const fillRate = metrics.ordersSubmitted > 0 
    ? ((metrics.fills / metrics.ordersSubmitted) * 100).toFixed(1) 
    : '0';

  const report = {
    timestamp: new Date().toISOString(),
    config: { count, intervalMs },
    metrics: {
      ...metrics,
      averageExecutorLatencyMs: Number(avgLatency),
      fillRatePercent: Number(fillRate)
    }
  };

  const reportPath = path.join(__dirname, '../simulation-reports', `report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n======================================================');
  console.log('📊 SIMULATION RESULTS');
  console.log('======================================================');
  console.log(`Signals Emitted:     ${metrics.totalSignalsEmitted}`);
  console.log(`Validations Passed:  ${metrics.validationsPassed}`);
  console.log(`Validations Failed:  ${metrics.validationsFailed} (Expected for duplicates)`);
  console.log(`Orders Submitted:    ${metrics.ordersSubmitted}`);
  console.log(`Fills Simulated:     ${metrics.fills}`);
  console.log(`Partial Fills:       ${metrics.partialFills}`);
  console.log(`Cancellations:       ${metrics.cancels}`);
  console.log(`Avg E2E Latency:     ${avgLatency} ms`);
  console.log(`Fill Rate:           ${fillRate}%`);
  console.log('======================================================');
  console.log(`💾 Report saved to: ${reportPath}`);

  process.exit(0);
}

runSimulation().catch(console.error);
