import axios from 'axios';
import { BaseOracleWorker } from './base';
import { OracleSignal } from '../../core/src/types';

interface YouTubeWorkerConfig {
  apiKey: string;
  channelId: string;
  targetSubscribers: number;
  intervalMs: number;
}

export class YouTubeOracleWorker extends BaseOracleWorker {
  private config: YouTubeWorkerConfig;
  private hasTriggered: boolean = false;

  constructor(config: YouTubeWorkerConfig) {
    super(config.intervalMs);
    this.config = config;
  }

  protected async poll(): Promise<void> {
    if (this.hasTriggered) {
      // Prevent spamming the execution engine once the condition is met
      return;
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${this.config.channelId}&key=${this.config.apiKey}`;
      const response = await axios.get(url);
      
      const items = response.data.items;
      if (!items || items.length === 0) {
        console.error(`[YouTubeOracle] Channel ${this.config.channelId} not found.`);
        return;
      }

      const subscriberCount = parseInt(items[0].statistics.subscriberCount, 10);
      console.log(`[YouTubeOracle] Channel ${this.config.channelId} has ${subscriberCount} subs (Target: ${this.config.targetSubscribers})`);

      if (subscriberCount >= this.config.targetSubscribers) {
        this.hasTriggered = true;
        
        const signal: OracleSignal = {
          id: `yt-${this.config.channelId}-${Date.now()}`,
          source: 'YOUTUBE',
          targetId: this.config.channelId,
          triggerCondition: `>= ${this.config.targetSubscribers}`,
          timestamp: Date.now(),
          value: subscriberCount
        };

        this.emitSignal(signal);
      }
    } catch (error) {
      console.error(`[YouTubeOracle] Polling error:`, error instanceof Error ? error.message : String(error));
    }
  }
}
