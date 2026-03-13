import { PolymarketAdapter } from './polymarket-adapter';
import { OrderbookValidator } from './validator';
import { ExecutionRequest, ExecutionResult, OrderSide } from '../../core/src/types';

const ORDER_TIMEOUT_MS = 10000; // 10 seconds

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
      const execPrice = side === 'BUY' ? topAsk : topBid;

      if (dryRun) {
        console.log(`[${new Date().toISOString()}] [ExecutionEngine] [DRY_RUN] Simulated ${side} ${strategy.maxPositionSizeUsdc} shares @ $${execPrice}`);
        return { success: true, executionTimeMs: Date.now() - startTime };
      }

      // Priority 2: Live Execution and Timeout Handling
      console.log(`[${new Date().toISOString()}] [ExecutionEngine] [LIVE] Placing ${side} order: ${strategy.maxPositionSizeUsdc} @ $${execPrice}`);
      const order = await this.adapter.placeOrder(
        strategy.marketId,
        execPrice,
        strategy.maxPositionSizeUsdc,
        side
      );

      console.log(`[${new Date().toISOString()}] [ExecutionEngine] [LIVE] Order submitted successfully: ${order.orderID}`);
      
      // Start async cancellation loop
      this.monitorAndCancelOrder(order.orderID);

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

  private async monitorAndCancelOrder(orderId: string) {
    console.log(`[${new Date().toISOString()}] [ExecutionEngine] Monitoring order ${orderId} for ${ORDER_TIMEOUT_MS}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, ORDER_TIMEOUT_MS));
    
    try {
      // Future: Poll actual order status to check if filled.
      // For MVP safety: we blindly send a cancel request after timeout. 
      // If it filled, the cancel drops safely. If it hung, it's neutralized.
      console.log(`[${new Date().toISOString()}] [ExecutionEngine] Timeout reached. Attempting to cancel order ${orderId}...`);
      await this.adapter.cancelOrder(orderId);
      console.log(`[${new Date().toISOString()}] [ExecutionEngine] Order ${orderId} cancellation requested.`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ExecutionEngine] Failed to cancel order ${orderId}:`, error instanceof Error ? error.message : String(error));
    }
  }
}
