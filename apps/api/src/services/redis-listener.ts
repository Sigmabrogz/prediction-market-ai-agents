import { getRedisSubClient, REDIS_CHANNEL as ORACLE_CHANNEL } from '../../../packages/core/src/redis';
import { REDIS_LIFECYCLE_CHANNEL, LifecycleEventEnvelope } from '../../../packages/core/src/events';
import { broker } from './sse-broker';

export function setupRedisListener() {
  const sub = getRedisSubClient();

  sub.subscribe(ORACLE_CHANNEL, REDIS_LIFECYCLE_CHANNEL, (err, count) => {
    if (err) {
      console.error(`[API RedisListener] Failed to subscribe:`, err);
      return;
    }
    console.log(`[API RedisListener] Listening to ${count} channels for realtime fanout.`);
  });

  sub.on('message', (channel, message) => {
    try {
      const payload = JSON.parse(message);
      
      // We normalize the events before pushing them over SSE
      // This protects the frontend from backend schema drift.
      
      if (channel === ORACLE_CHANNEL) {
        broker.broadcast('signal.created', {
          eventId: payload.id,
          source: payload.source,
          targetId: payload.targetId,
          value: payload.value,
          timestamp: payload.timestamp
        });
      } else if (channel === REDIS_LIFECYCLE_CHANNEL) {
        const lifecycleEvent = payload as LifecycleEventEnvelope;
        
        // Map raw lifecycle events into UI-facing schema events
        const uiPayload = {
          eventId: lifecycleEvent.eventId,
          status: lifecycleEvent.eventType,
          orderId: lifecycleEvent.orderId,
          mode: lifecycleEvent.mode,
          timestamp: lifecycleEvent.timestamp,
          marketId: lifecycleEvent.marketId,
          details: lifecycleEvent.payload
        };

        broker.broadcast('order.updated', uiPayload);

        // Explicitly trigger PnL/Position updates for the frontend to react to
        if (lifecycleEvent.eventType === 'PNL_SNAPSHOT_CREATED' as any) {
          broker.broadcast('pnl.updated', lifecycleEvent.payload);
        } else if (lifecycleEvent.eventType === 'ORDER_FILLED' || lifecycleEvent.eventType === 'ORDER_PARTIALLY_FILLED') {
          broker.broadcast('position.updated', { orderId: lifecycleEvent.orderId });
        }
      }
    } catch (error) {
      console.error(`[API RedisListener] Failed to broadcast message from ${channel}:`, error);
    }
  });
}
