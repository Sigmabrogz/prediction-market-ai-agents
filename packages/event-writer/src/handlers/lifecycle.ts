import { LifecycleEventEnvelope, LifecycleEventType } from '../../../core/src/events';
import { prisma, OrderStatus, OrderMode, OrderSide } from '../../../db/src';

export async function handleLifecycleEvent(event: LifecycleEventEnvelope) {
  const { eventId, eventType, timestamp, mode, signalId, orderId, strategyId, marketId, payload } = event;

  try {
    // 1. Idempotency Check: Don't process the same eventId twice
    const existingEvent = await prisma.orderLifecycleEvent.findUnique({ where: { id: eventId } });
    if (existingEvent) {
      console.log(`[EventWriter] Lifecycle Event ${eventId} already processed. Skipping.`);
      return;
    }

    const orderStatus = eventType as unknown as OrderStatus;
    const mappedMode = mode as OrderMode;

    // 2. Genesis Event (SIGNAL_RECEIVED / VALIDATION_STARTED) creates the Order skeleton
    if (!orderId && signalId && marketId) {
      // Upsert a pending order attached to the signal
      // We use signalId as a surrogate key for the order until ORDER_SUBMITTED provides the real orderId
      const surrogateOrderId = `pending-${signalId}`;
      
      await prisma.order.upsert({
        where: { id: surrogateOrderId },
        update: {
          status: orderStatus,
          lastStatusAt: new Date(timestamp)
        },
        create: {
          id: surrogateOrderId,
          signalId,
          strategyId,
          marketId,
          mode: mappedMode,
          side: OrderSide.BUY, // Default MVP
          orderType: 'LIMIT',
          limitPrice: payload?.limitPrice || 0,
          requestedSize: payload?.size || 0,
          status: orderStatus,
          createdAt: new Date(timestamp)
        }
      });

      await insertLifecycleRow(eventId, surrogateOrderId, orderStatus, payload, timestamp);
      return;
    }

    // 3. Normal update to existing Order
    if (orderId) {
      // If the real orderId just arrived (ORDER_SUBMITTED), we need to update the surrogate order's ID
      // Prisma doesn't allow primary key updates easily, so we might need to handle this differently in a production system.
      // For MVP, we will try to upsert by the real OrderId
      await prisma.order.upsert({
        where: { id: orderId },
        update: {
          status: orderStatus,
          lastStatusAt: new Date(timestamp),
          submittedSize: payload?.size,
          limitPrice: payload?.limitPrice !== undefined ? payload.limitPrice : undefined
        },
        create: {
          id: orderId,
          externalOrderId: orderId,
          signalId,
          strategyId,
          marketId: marketId || 'unknown',
          mode: mappedMode,
          side: payload?.side || OrderSide.BUY,
          orderType: 'LIMIT',
          limitPrice: payload?.limitPrice || 0,
          requestedSize: payload?.size || 0,
          status: orderStatus,
          createdAt: new Date(timestamp)
        }
      });

      await insertLifecycleRow(eventId, orderId, orderStatus, payload, timestamp);
    }

  } catch (error) {
    console.error(`[EventWriter] Failed to handle lifecycle event ${eventType} (${eventId}):`, error);
  }
}

async function insertLifecycleRow(eventId: string, orderId: string, status: OrderStatus, payload: any, timestamp: number) {
  await prisma.orderLifecycleEvent.create({
    data: {
      id: eventId,
      orderId,
      status,
      payload: payload || {},
      timestamp: new Date(timestamp)
    }
  });
  console.log(`[EventWriter] Persisted Lifecycle Event ${status} for Order ${orderId}`);
}
