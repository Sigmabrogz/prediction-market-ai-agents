import { getRedisSubClient, REDIS_CHANNEL as ORACLE_CHANNEL } from '../../core/src/redis';
import { REDIS_LIFECYCLE_CHANNEL, LifecycleEventEnvelope } from '../../core/src/events';
import { OracleSignal } from '../../core/src/types';

export class EventConsumer {
  private sub = getRedisSubClient();

  constructor(
    private signalHandler: (signal: OracleSignal) => Promise<void>,
    private lifecycleHandler: (event: LifecycleEventEnvelope) => Promise<void>
  ) {}

  public start() {
    this.sub.subscribe(ORACLE_CHANNEL, REDIS_LIFECYCLE_CHANNEL, (err, count) => {
      if (err) {
        console.error(`[EventConsumer] Failed to subscribe:`, err);
        process.exit(1);
      }
      console.log(`[EventConsumer] Subscribed to ${count} channels.`);
    });

    this.sub.on('message', async (channel, message) => {
      try {
        const payload = JSON.parse(message);
        if (channel === ORACLE_CHANNEL) {
          await this.signalHandler(payload as OracleSignal);
        } else if (channel === REDIS_LIFECYCLE_CHANNEL) {
          await this.lifecycleHandler(payload as LifecycleEventEnvelope);
        }
      } catch (err) {
        console.error(`[EventConsumer] Error parsing or handling message from ${channel}:`, err);
      }
    });
  }
}
