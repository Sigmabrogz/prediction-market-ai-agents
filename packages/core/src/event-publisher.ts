import { getRedisPubClient } from './redis';
import { LifecycleEventEnvelope, REDIS_LIFECYCLE_CHANNEL } from './events';
import { randomUUID } from 'crypto';

export class LifecycleEventPublisher {
  static async publish<T>(event: Omit<LifecycleEventEnvelope<T>, 'eventId' | 'timestamp'>): Promise<void> {
    const envelope: LifecycleEventEnvelope<T> = {
      ...event,
      eventId: randomUUID(),
      timestamp: Date.now()
    };

    // Structured logging strictly enforcing the layout
    console.log(
      `[${new Date(envelope.timestamp).toISOString()}] [${envelope.component}] ` +
      `${envelope.eventType} | Signal: ${envelope.signalId || 'N/A'} | ` +
      `Order: ${envelope.orderId || 'N/A'} | Mode: ${envelope.mode} | Market: ${envelope.marketId || 'N/A'}`
    );

    try {
      const pubClient = getRedisPubClient();
      await pubClient.publish(REDIS_LIFECYCLE_CHANNEL, JSON.stringify(envelope));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [LifecycleEventPublisher] Failed to publish event to Redis:`, error);
    }
  }
}
