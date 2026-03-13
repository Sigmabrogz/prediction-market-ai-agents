import { describe, it, expect } from 'vitest';
import { PositionManager } from '../src/position-manager';

describe('PositionManager', () => {
  const pm = new PositionManager();

  it('should open a new position on fill', () => {
    const pos = pm.updatePosition('market1', 'strat1', 'BUY', [
      { price: 0.50, size: 100, timestamp: Date.now() }
    ]);
    expect(pos.size).toBe(100);
    expect(pos.avgEntryPrice).toBe(0.50);
    expect(pos.side).toBe('BUY');
    expect(pos.realizedPnl).toBe(0);
  });

  it('should increase size and calculate correct average entry', () => {
    const pos = pm.updatePosition('market1', 'strat1', 'BUY', [
      { price: 0.60, size: 100, timestamp: Date.now() }
    ]);
    expect(pos.size).toBe(200);
    expect(pos.avgEntryPrice).toBe(0.55); // (100*0.5 + 100*0.6) / 200
  });

  it('should realize PnL when position is reduced', () => {
    // We are LONG 200 at 0.55. We SELL 100 at 0.65.
    // Profit = (0.65 - 0.55) * 100 = 10.
    const pos = pm.updatePosition('market1', 'strat1', 'SELL', [
      { price: 0.65, size: 100, timestamp: Date.now() }
    ]);
    expect(pos.size).toBe(100);
    expect(pos.avgEntryPrice).toBe(0.55); // Avg entry doesn't change on reduction
    expect(pos.realizedPnl).toBeCloseTo(10);
  });

  it('should flip position side if sold past 0', () => {
    // We are LONG 100 at 0.55. We SELL 150 at 0.60.
    // Reduce 100 (Profit: (0.60 - 0.55) * 100 = 5). Total Realized PnL = 10 + 5 = 15.
    // New Position: SHORT 50 at 0.60.
    const pos = pm.updatePosition('market1', 'strat1', 'SELL', [
      { price: 0.60, size: 150, timestamp: Date.now() }
    ]);
    expect(pos.size).toBe(50);
    expect(pos.side).toBe('SELL');
    expect(pos.avgEntryPrice).toBe(0.60);
    expect(pos.realizedPnl).toBeCloseTo(15);
  });
});
