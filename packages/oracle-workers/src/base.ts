import { OracleSignal } from '../../core/src/types';
import { publishSignal } from '../../core/src/redis';

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
    console.log(`[${new Date().toISOString()}] [${this.constructor.name}] Started worker with interval ${this.intervalMs}ms`);
    this.timer = setInterval(() => this.poll(), this.intervalMs);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log(`[${new Date().toISOString()}] [${this.constructor.name}] Stopped worker`);
  }

  protected abstract poll(): Promise<void>;

  protected async emitSignal(signal: OracleSignal) {
    console.log(`[${new Date().toISOString()}] [${this.constructor.name}] EMIT SIGNAL [${signal.id}]`);
    await publishSignal(signal);
  }
}
