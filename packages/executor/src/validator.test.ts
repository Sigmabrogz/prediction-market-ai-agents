import { OrderbookValidator } from './validator';
import { OrderbookSnapshot, StrategyConfig } from '../../core/src/types';

const validator = new OrderbookValidator();

const strategy: StrategyConfig = {
  id: 'test-strat',
  oracleSource: 'YOUTUBE',
  marketId: 'test-market',
  maxPositionSizeUsdc: 100,
  maxSlippageBps: 500, // 0.05
  triggerThreshold: 100
};

const goodOrderbook: OrderbookSnapshot = {
  marketId: 'test-market',
  timestamp: Date.now(),
  bids: [{ price: 0.40, size: 500 }],
  asks: [{ price: 0.42, size: 500 }, { price: 0.45, size: 1000 }]
};

const badOrderbook: OrderbookSnapshot = {
  marketId: 'test-market',
  timestamp: Date.now(),
  bids: [{ price: 0.40, size: 500 }],
  asks: [{ price: 0.42, size: 10 }, { price: 0.99, size: 1000 }] // Slippage too high for target size
};

console.log("Testing Good Orderbook (BUY)...");
const res1 = validator.validate(goodOrderbook, strategy, 'BUY');
if (!res1.passed) throw new Error("Good orderbook failed validation");

console.log("Testing Bad Orderbook (BUY) - Not enough depth within slippage...");
const res2 = validator.validate(badOrderbook, strategy, 'BUY');
if (res2.passed) throw new Error("Bad orderbook passed validation");

console.log("Validator tests passed.");
