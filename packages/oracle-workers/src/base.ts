import { OracleSignal } from '../../core/src/types';

export abstract class BaseOracleWorker {
  protected intervalMs: number;
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[${this.constructor.name}] Started worker with interval ${this.intervalMs}ms`);
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log(`[${this.constructor.name}] Stopped worker`);
  }

  protected abstract poll(): Promise<void>;

  protected emitSignal(signal: OracleSignal) {
    console.log(`[${this.constructor.name}] EMIT SIGNAL [${signal.id}]:`, JSON.stringify(signal));
    // TODO: Redis Pub/Sub integration will go here
  }
}
