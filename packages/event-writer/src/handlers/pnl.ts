import { LifecycleEventEnvelope } from '../../../core/src/events';
import { prisma } from '../../../db/src';

export async function handlePnlSnapshot(event: LifecycleEventEnvelope) {
  // Custom eventType emitted by Paper Engine
  if (event.eventType !== 'PNL_SNAPSHOT_CREATED' as any) {
    return;
  }

  const { strategyId, mode, payload, timestamp } = event;

  try {
    await prisma.pnlSnapshot.create({
      data: {
        strategyId,
        mode: mode as any,
        realizedPnl: payload.position.realizedPnl || 0,
        unrealizedPnl: payload.unrealizedPnl || 0,
        timestamp: new Date(timestamp)
      }
    });

    console.log(`[EventWriter] Persisted PNL Snapshot for Strategy ${strategyId}`);
  } catch (error) {
    console.error(`[EventWriter] Failed to process PNL Snapshot:`, error);
  }
}
