import { LifecycleEventEnvelope, LifecycleEventType } from '../../../core/src/events';
import { prisma } from '../../../db/src';
import { SimulatedFill } from '../../../paper-engine/src/types';

export async function handleFillEvents(event: LifecycleEventEnvelope) {
  const { eventType, orderId, payload, strategyId, marketId, mode } = event;

  if (
    eventType !== LifecycleEventType.ORDER_FILLED && 
    eventType !== LifecycleEventType.ORDER_PARTIALLY_FILLED
  ) {
    return; // Not a fill event
  }

  if (!orderId || !payload?.fills) return;

  const fills: SimulatedFill[] = payload.fills;

  try {
    for (const fill of fills) {
      // 1. Create the Fill Record
      // We use a composite ID or hash to ensure idempotency if the same fill is broadcast twice
      const fillId = `fill-${orderId}-${fill.timestamp}-${fill.size}`;
      
      const existingFill = await prisma.fill.findUnique({ where: { id: fillId } });
      if (existingFill) continue;

      await prisma.fill.create({
        data: {
          id: fillId,
          orderId: orderId,
          fillPrice: fill.price,
          fillSize: fill.size,
          filledAt: new Date(fill.timestamp)
        }
      });

      console.log(`[EventWriter] Persisted Fill ${fillId} for Order ${orderId}`);

      // 2. Update Position
      await updatePosition(marketId!, strategyId, mode as any, payload.side, fill);
    }
  } catch (error) {
    console.error(`[EventWriter] Failed to process fills for Order ${orderId}:`, error);
  }
}

async function updatePosition(marketId: string, strategyId: string, mode: any, side: string, fill: SimulatedFill) {
  const positionId = `pos-${marketId}-${strategyId}-${mode}`;

  // Simple Upsert logic to keep the position table in sync with the live/paper fills
  // (In a highly concurrent prod system, you might use a transactional queue or pure SQL update statement to avoid race conditions)
  const existing = await prisma.position.findUnique({ where: { id: positionId } });

  if (!existing) {
    await prisma.position.create({
      data: {
        id: positionId,
        marketId,
        strategyId,
        mode,
        side,
        quantity: fill.size,
        avgEntryPrice: fill.price,
        status: 'OPEN'
      }
    });
  } else {
    // Basic aggregation (Note: the PaperEngine already emits the aggregated position, 
    // but building it here guarantees the DB is the ultimate source of truth for LIVE fills as well).
    const totalCost = (existing.quantity * existing.avgEntryPrice) + (fill.size * fill.price);
    const newQuantity = existing.quantity + fill.size;
    const newAvg = totalCost / newQuantity;

    await prisma.position.update({
      where: { id: positionId },
      data: {
        quantity: newQuantity,
        avgEntryPrice: newAvg,
        updatedAt: new Date()
      }
    });
  }
  console.log(`[EventWriter] Updated Position ${positionId}`);
}
