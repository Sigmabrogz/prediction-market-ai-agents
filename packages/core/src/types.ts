export type OracleSource = 'YOUTUBE' | 'FAA' | 'BOXOFFICE';

export interface OracleSignal {
  id: string;
  source: OracleSource;
  targetId: string; // e.g., YouTube Channel ID
  triggerCondition: string;
  timestamp: number;
  value: any; // The raw data that triggered this
}

export interface StrategyConfig {
  id: string;
  oracleSource: OracleSource;
  marketId: string; // Polymarket condition/market ID
  maxPositionSizeUsdc: number;
  maxSlippageBps: number;
  triggerThreshold: number | string;
}

export interface ExecutionRequest {
  signal: OracleSignal;
  strategy: StrategyConfig;
  dryRun: boolean;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderOutcome = 'YES' | 'NO';

export interface ExecutionResult {
  success: boolean;
  orderId?: string;
  txHash?: string;
  executionTimeMs: number;
  error?: string;
}

export interface OrderbookSnapshot {
  marketId: string;
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
  timestamp: number;
}

export interface RiskCheckResult {
  passed: boolean;
  reason?: string;
}
