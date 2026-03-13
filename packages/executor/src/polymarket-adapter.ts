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
      throw new Error('POLYMARKET_PRIVATE_KEY is missing from environment variables.');
    }

    try {
      const signer = new ethers.Wallet(this.config.privateKey);
      this.client = new ClobClient(this.config.host, this.config.chainId, signer);
      
      // Attempt to create API credentials (required for CLOB trading)
      const creds = await this.client.createApiKey();
      if (!creds) {
         console.warn(`[PolymarketAdapter] No API credentials created, might already exist or failed.`);
      }
      
      console.log(`[${new Date().toISOString()}] [PolymarketAdapter] Initialized successfully for wallet: ${signer.address}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [PolymarketAdapter] Failed to initialize client:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  public async getOrderbook(tokenID: string) {
    if (!this.client) throw new Error('Polymarket client not initialized');
    return this.client.getOrderBook(tokenID);
  }

  public async placeOrder(tokenID: string, price: number, size: number, side: 'BUY' | 'SELL') {
    if (!this.client) throw new Error('Polymarket client not initialized');
    
    console.log(`[${new Date().toISOString()}] [PolymarketAdapter] Placing ${side} order for ${size} shares at $${price} on token ${tokenID}`);
    return this.client.createOrder({
      tokenID,
      price,
      side,
      size,
      feeRateBps: 0,
    });
  }
}
