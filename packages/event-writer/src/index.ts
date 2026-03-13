import { EventConsumer } from './consumer';
import { handleOracleSignal } from './handlers/signals';
import { handleLifecycleEvent } from './handlers/lifecycle';
import { handleFillEvents } from './handlers/fills';
import { handlePnlSnapshot } from './handlers/pnl';
import { LifecycleEventEnvelope } from '../../core/src/events';

console.log(`[${new Date().toISOString()}] [EventWriter] Starting service...`);

const consumer = new EventConsumer(
  // 1. Handle raw Oracle signals coming off the bus
  async (signal) => {
    await handleOracleSignal(signal);
  },
  
  // 2. Handle the Execution/Paper Engine Lifecycle events
  async (event: LifecycleEventEnvelope) => {
    // Write state machine progression
    await handleLifecycleEvent(event);
    
    // Write Fills and update positions if applicable
    await handleFillEvents(event);
    
    // Write PNL data if applicable
    await handlePnlSnapshot(event);
  }
);

consumer.start();
console.log(`[${new Date().toISOString()}] [EventWriter] Listening for Redis events...`);
