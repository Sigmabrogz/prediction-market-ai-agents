export type OracleSource = 'YOUTUBE' | 'FAA' | 'BOXOFFICE';
export type OrderSide = 'BUY' | 'SELL';
export type OrderOutcome = 'YES' | 'NO';
export type OrderMode = 'PAPER' | 'LIVE' | 'DRY_RUN';

export interface OracleSignal {
  id: string;
  source: OracleSource;
  targetId: string;
  triggerCondition: string;
  timestamp: number;
  value: any;
}

export interface StrategyConfig {
  id: string;
  oracleSource: OracleSource;
  marketId: string;
  maxPositionSizeUsdc: number;
  maxSlippageBps: number;
  triggerThreshold: number | string;
}

export interface ExecutionRequest {
  signal: OracleSignal;
  strategy: StrategyConfig;
  dryRun: boolean;
}

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
