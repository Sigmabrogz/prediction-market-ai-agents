import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

export interface PolymarketConfig {
  privateKey: string;
  chainId: number;
  host: string;
}

export class PolymarketAdapter {
  private client: ClobClient | null = null;
  private config: PolymarketConfig;

  constructor(config: PolymarketConfig) {
    this.config = config;
  }

  public async initialize(): Promise<void> {
    if (this.client) return;
    if (!this.config.privateKey) {
      throw new Error('POLYMARKET_PRIVATE_KEY is missing.');
    }
    try {
      const signer = new ethers.Wallet(this.config.privateKey);
      this.client = new ClobClient(this.config.host, this.config.chainId, signer);
      await this.client.createApiKey();
      console.log(`[${new Date().toISOString()}] [PolymarketAdapter] Initialized for wallet: ${signer.address}`);
    } catch (error) {
      console.error(`[PolymarketAdapter] Failed to initialize:`, error);
      throw error;
    }
  }

  public async getOrderbook(tokenID: string) {
    if (!this.client) throw new Error('Client not initialized');
    return this.client.getOrderBook(tokenID);
  }

  public async placeOrder(tokenID: string, price: number, size: number, side: 'BUY' | 'SELL') {
    if (!this.client) throw new Error('Client not initialized');
    return this.client.createOrder({
      tokenID,
      price,
      side,
      size,
      feeRateBps: 0,
    });
  }

  public async cancelOrder(orderId: string) {
    if (!this.client) throw new Error('Client not initialized');
    return this.client.cancelOrder({ orderID: orderId });
  }
}
