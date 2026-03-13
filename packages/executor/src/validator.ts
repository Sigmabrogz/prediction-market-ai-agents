import { OrderbookSnapshot, RiskCheckResult, StrategyConfig } from '../../core/src/types';

export class OrderbookValidator {
  public validate(
    orderbook: OrderbookSnapshot,
    strategy: StrategyConfig,
    targetSide: 'BUY' | 'SELL'
  ): RiskCheckResult {
    // Basic checks
    if (!orderbook.asks || !orderbook.bids) {
      return { passed: false, reason: 'Invalid orderbook data' };
    }

    const topAsk = orderbook.asks[0];
    const topBid = orderbook.bids[0];

    if (!topAsk || !topBid) {
      return { passed: false, reason: 'Orderbook is empty' };
    }

    // Spread Validation
    const spread = topAsk.price - topBid.price;
    if (spread > 0.10) { // Example constraint: spread too wide
      return { passed: false, reason: `Spread too wide: ${spread.toFixed(3)}` };
    }

    // Depth Validation (Aggressive check)
    const targetBook = targetSide === 'BUY' ? orderbook.asks : orderbook.bids;
    let availableDepth = 0;
    
    for (const level of targetBook) {
      // Check if price is within our acceptable slippage range
      // For a BUY, we only count depth if the ask price is <= (topAsk + maxSlippage)
      // Since it's prediction markets, maxSlippage is usually in cents (e.g. 0.02)
      const slippageAllowed = strategy.maxSlippageBps / 10000;
      if (targetSide === 'BUY' && level.price > topAsk.price + slippageAllowed) break;
      if (targetSide === 'SELL' && level.price < topBid.price - slippageAllowed) break;
      
      availableDepth += level.size;
    }

    if (availableDepth < strategy.maxPositionSizeUsdc) {
      return { 
        passed: false, 
        reason: `Insufficient depth. Need ${strategy.maxPositionSizeUsdc}, found ${availableDepth}` 
      };
    }

    return { passed: true };
  }
}
