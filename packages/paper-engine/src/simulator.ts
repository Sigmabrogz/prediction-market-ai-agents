import { OrderbookSnapshot, OrderSide, StrategyConfig } from '../../core/src/types';
import { LifecycleEventType } from '../../core/src/events';
import { SimulationResult, SimulatedFill } from './types';
import { randomUUID } from 'crypto';

export class OrderSimulator {
  
  /**
   * Deterministically simulates a limit order fill against an orderbook snapshot.
   */
  public simulateOrder(
    orderbook: OrderbookSnapshot,
    strategy: StrategyConfig,
    side: OrderSide,
    requestedSize: number,
    limitPrice: number
  ): SimulationResult {
    const orderId = randomUUID();
    
    let remainingSize = requestedSize;
    const fills: SimulatedFill[] = [];
    
    // Select the opposing side of the book to match against
    const bookSide = side === 'BUY' ? orderbook.asks : orderbook.bids;

    for (const level of bookSide) {
      if (remainingSize <= 0) break;

      // Price matching logic
      const isPriceMatch = side === 'BUY' 
        ? level.price <= limitPrice 
        : level.price >= limitPrice;

      if (isPriceMatch) {
        const fillSize = Math.min(remainingSize, level.size);
        fills.push({
          price: level.price,
          size: fillSize,
          timestamp: Date.now()
        });
        remainingSize -= fillSize;
      } else {
        // Since orderbooks are sorted (asks asc, bids desc), 
        // if we hit a level that doesn't match, no further levels will match.
        break;
      }
    }

    let status: LifecycleEventType = LifecycleEventType.ORDER_OPEN;
    if (fills.length > 0) {
      status = remainingSize > 0 
        ? LifecycleEventType.ORDER_PARTIALLY_FILLED 
        : LifecycleEventType.ORDER_FILLED;
    }

    // Calculate Volume-Weighted Average Price (VWAP)
    let avgFillPrice = undefined;
    if (fills.length > 0) {
      const totalCost = fills.reduce((sum, fill) => sum + (fill.price * fill.size), 0);
      const totalFilledSize = requestedSize - remainingSize;
      avgFillPrice = totalCost / totalFilledSize;
    }

    return {
      orderId,
      status,
      fills,
      remainingSize,
      avgFillPrice
    };
  }

  public applyTimeout(result: SimulationResult): SimulationResult {
    if (result.status === LifecycleEventType.ORDER_OPEN || result.status === LifecycleEventType.ORDER_PARTIALLY_FILLED) {
      return {
        ...result,
        status: LifecycleEventType.ORDER_CANCELLED,
        reason: 'Simulated Order Timeout'
      };
    }
    return result;
  }
}
