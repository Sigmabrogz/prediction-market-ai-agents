import { describe, it, expect } from 'vitest';
import { OrderSimulator } from '../src/simulator';
import { OrderbookSnapshot, StrategyConfig } from '../../core/src/types';
import { LifecycleEventType } from '../../core/src/events';

describe('OrderSimulator', () => {
  const simulator = new OrderSimulator();

  const strategy: StrategyConfig = {
    id: 'test-strat',
    oracleSource: 'YOUTUBE',
    marketId: 'test-market',
    maxPositionSizeUsdc: 100,
    maxSlippageBps: 200,
    triggerThreshold: 1
  };

  const orderbook: OrderbookSnapshot = {
    marketId: 'test-market',
    timestamp: Date.now(),
    bids: [{ price: 0.40, size: 50 }],
    asks: [{ price: 0.45, size: 50 }, { price: 0.46, size: 50 }]
  };

  it('should simulate a FULL fill if liquidity exists', () => {
    const res = simulator.simulateOrder(orderbook, strategy, 'BUY', 50, 0.45);
    expect(res.status).toBe(LifecycleEventType.ORDER_FILLED);
    expect(res.remainingSize).toBe(0);
    expect(res.fills.length).toBe(1);
    expect(res.fills[0].price).toBe(0.45);
  });

  it('should simulate a PARTIAL fill if liquidity is split across price limits', () => {
    // Want 100, willing to pay up to 0.45. 
    // The book only has 50 at 0.45, the next 50 is at 0.46 (which we won't pay).
    const res = simulator.simulateOrder(orderbook, strategy, 'BUY', 100, 0.45);
    expect(res.status).toBe(LifecycleEventType.ORDER_PARTIALLY_FILLED);
    expect(res.remainingSize).toBe(50);
    expect(res.fills.length).toBe(1);
    expect(res.fills[0].size).toBe(50);
  });

  it('should simulate a PARTIAL fill traversing multiple price levels', () => {
    // Want 100, willing to pay up to 0.46. 
    // The book has 50 at 0.45, and 50 at 0.46. Should sweep both.
    const res = simulator.simulateOrder(orderbook, strategy, 'BUY', 100, 0.46);
    expect(res.status).toBe(LifecycleEventType.ORDER_FILLED);
    expect(res.remainingSize).toBe(0);
    expect(res.fills.length).toBe(2);
    expect(res.avgFillPrice).toBe(0.455); // (50*0.45 + 50*0.46)/100
  });

  it('should simulate an OPEN order if no liquidity exists at limit price', () => {
    // Want to buy at 0.40, but cheapest ask is 0.45.
    const res = simulator.simulateOrder(orderbook, strategy, 'BUY', 50, 0.40);
    expect(res.status).toBe(LifecycleEventType.ORDER_OPEN);
    expect(res.remainingSize).toBe(50);
    expect(res.fills.length).toBe(0);
  });

  it('should handle timeout cancellation', () => {
    const res = simulator.simulateOrder(orderbook, strategy, 'BUY', 100, 0.45);
    expect(res.status).toBe(LifecycleEventType.ORDER_PARTIALLY_FILLED); // 50 left
    
    const canceledRes = simulator.applyTimeout(res);
    expect(canceledRes.status).toBe(LifecycleEventType.ORDER_CANCELLED);
    expect(canceledRes.reason).toBe('Simulated Order Timeout');
  });
});
