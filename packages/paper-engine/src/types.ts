import { OrderSide, OrderMode, OrderbookSnapshot, OracleSignal, StrategyConfig } from '../../core/src/types';
import { LifecycleEventType } from '../../core/src/events';

export interface SimulatedFill {
  price: number;
  size: number;
  timestamp: number;
}

export interface SimulationResult {
  orderId: string;
  status: LifecycleEventType;
  fills: SimulatedFill[];
  remainingSize: number;
  avgFillPrice?: number;
  reason?: string;
}

export interface PaperPosition {
  id: string;
  marketId: string;
  strategyId: string;
  side: OrderSide;
  size: number;
  avgEntryPrice: number;
  realizedPnl: number;
}
