import { PaperPosition, SimulatedFill } from './types';
import { OrderSide, OrderbookSnapshot } from '../../core/src/types';

export class PositionManager {
  private positions: Map<string, PaperPosition> = new Map();

  public getPosition(marketId: string, strategyId: string): PaperPosition | undefined {
    const key = `${marketId}-${strategyId}`;
    return this.positions.get(key);
  }

  public updatePosition(marketId: string, strategyId: string, side: OrderSide, fills: SimulatedFill[]): PaperPosition {
    const key = `${marketId}-${strategyId}`;
    let position = this.positions.get(key);

    if (!position) {
      position = {
        id: key,
        marketId,
        strategyId,
        side,
        size: 0,
        avgEntryPrice: 0,
        realizedPnl: 0,
      };
    }

    for (const fill of fills) {
      if (position.size === 0) {
        // Open new position
        position.side = side;
        position.size = fill.size;
        position.avgEntryPrice = fill.price;
      } else if (position.side === side) {
        // Add to existing position
        const totalCost = (position.size * position.avgEntryPrice) + (fill.size * fill.price);
        position.size += fill.size;
        position.avgEntryPrice = totalCost / position.size;
      } else {
        // Reduce / Close position
        const reduceSize = Math.min(position.size, fill.size);
        const pnlMultiplier = side === 'SELL' ? 1 : -1; 
        // If we are LONG (BUY), selling locks in: (exitPrice - entryPrice).
        // If we are SHORT (SELL), buying locks in: (entryPrice - exitPrice).
        const pnl = (fill.price - position.avgEntryPrice) * reduceSize * pnlMultiplier;
        
        position.realizedPnl += pnl;
        position.size -= reduceSize;

        // If we over-filled and flipped the position (e.g. was LONG 10, SOLD 15 -> now SHORT 5)
        const remainingFill = fill.size - reduceSize;
        if (remainingFill > 0) {
          position.side = side;
          position.size = remainingFill;
          position.avgEntryPrice = fill.price;
        } else if (position.size === 0) {
          position.avgEntryPrice = 0;
        }
      }
    }

    this.positions.set(key, position);
    return position;
  }

  /**
   * Calculates the Unrealized PnL of a position based on the current orderbook midpoint.
   */
  public calculateUnrealizedPnl(position: PaperPosition, orderbook: OrderbookSnapshot): number {
    if (position.size === 0) return 0;

    const topAsk = orderbook.asks[0]?.price || 1;
    const topBid = orderbook.bids[0]?.price || 0;
    const markPrice = (topAsk + topBid) / 2;

    const pnlMultiplier = position.side === 'BUY' ? 1 : -1;
    return (markPrice - position.avgEntryPrice) * position.size * pnlMultiplier;
  }
}
