import { PolymarketAdapter } from './polymarket-adapter';
import { OrderbookValidator } from './validator';
import { ExecutionRequest, ExecutionResult, OrderSide } from '../../core/src/types';

export class ExecutionEngine {
  private adapter: PolymarketAdapter;
  private validator: OrderbookValidator;

  constructor(adapter: PolymarketAdapter) {
    this.adapter = adapter;
    this.validator = new OrderbookValidator();
  }

  public async execute(req: ExecutionRequest, side: OrderSide): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { signal, strategy, dryRun } = req;

    try {
      console.log(`[${new Date().toISOString()}] [ExecutionEngine] Processing ${side} for ${signal.id} on ${strategy.marketId}`);

      const orderbook = await this.adapter.getOrderbook(strategy.marketId);
      const validation = this.validator.validate(orderbook, strategy, side);

      if (!validation.passed) {
        console.warn(`[${new Date().toISOString()}] [ExecutionEngine] Validation Failed: ${validation.reason}`);
        return {
          success: false,
          error: `Validation failed: ${validation.reason}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Compute aggressive limit price
      const topAsk = orderbook.asks[0].price;
      const topBid = orderbook.bids[0].price;
      
      // If we buy, we bid slightly above current top bid, or just hit the ask if depth allows.
      // For MVP, we place an aggressive limit order right at the top ask/bid to ensure fill.
      const execPrice = side === 'BUY' ? topAsk : topBid;

      if (dryRun) {
        console.log(`[${new Date().toISOString()}] [ExecutionEngine] [DRY_RUN] Would execute ${side} ${strategy.maxPositionSizeUsdc} shares @ $${execPrice}`);
        return {
          success: true,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Live Execution
      const order = await this.adapter.placeOrder(
        strategy.marketId,
        execPrice,
        strategy.maxPositionSizeUsdc,
        side
      );

      console.log(`[${new Date().toISOString()}] [ExecutionEngine] [LIVE] Order placed successfully: ${order.orderID}`);

      // Future enhancement: Add order tracking/cancellation loop here if not filled.

      return {
        success: true,
        orderId: order.orderID,
        executionTimeMs: Date.now() - startTime
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ExecutionEngine] Execution crashed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: Date.now() - startTime
      };
    }
  }
}
