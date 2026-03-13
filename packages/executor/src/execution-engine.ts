import { PolymarketAdapter } from './polymarket-adapter';
import { OrderbookValidator } from './validator';
import { ExecutionRequest, ExecutionResult, OrderSide, OrderMode } from '../../core/src/types';
import { LifecycleEventPublisher } from '../../core/src/event-publisher';
import { LifecycleEventType } from '../../core/src/events';

const ORDER_TIMEOUT_MS = 10000;

export class ExecutionEngine {
  private adapter: PolymarketAdapter;
  private validator: OrderbookValidator;

  constructor(adapter: PolymarketAdapter) {
    this.adapter = adapter;
    this.validator = new OrderbookValidator();
  }

  public async execute(req: ExecutionRequest, side: OrderSide, mode: OrderMode): Promise<ExecutionResult> {
    const startTime = Date.now();
    const { signal, strategy, dryRun } = req;
    
    const eventBase = {
      mode,
      signalId: signal.id,
      strategyId: strategy.id,
      marketId: strategy.marketId,
      component: 'executor' as const
    };

    try {
      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.VALIDATION_STARTED,
        payload: {}
      });

      const orderbook = await this.adapter.getOrderbook(strategy.marketId);
      const validation = this.validator.validate(orderbook, strategy, side);

      if (!validation.passed) {
        await LifecycleEventPublisher.publish({
          ...eventBase,
          eventType: LifecycleEventType.VALIDATION_FAILED,
          payload: { reason: validation.reason }
        });
        return { success: false, error: validation.reason, executionTimeMs: Date.now() - startTime };
      }

      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.VALIDATION_PASSED,
        payload: {}
      });

      const execPrice = side === 'BUY' ? orderbook.asks[0].price : orderbook.bids[0].price;

      if (dryRun) {
        await LifecycleEventPublisher.publish({
          ...eventBase,
          eventType: LifecycleEventType.DRY_RUN_EXECUTED,
          payload: { simulatedPrice: execPrice, simulatedSize: strategy.maxPositionSizeUsdc, side }
        });
        return { success: true, executionTimeMs: Date.now() - startTime };
      }

      // LIVE PATH
      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.ORDER_SUBMISSION_STARTED,
        payload: { limitPrice: execPrice, size: strategy.maxPositionSizeUsdc, side }
      });

      const order = await this.adapter.placeOrder(strategy.marketId, execPrice, strategy.maxPositionSizeUsdc, side);

      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.ORDER_SUBMITTED,
        orderId: order.orderID,
        payload: { limitPrice: execPrice, size: strategy.maxPositionSizeUsdc, side }
      });

      this.monitorAndCancelOrder(order.orderID, eventBase);

      return { success: true, orderId: order.orderID, executionTimeMs: Date.now() - startTime };

    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.ORDER_FAILED,
        payload: { reason: errMessage }
      });
      return { success: false, error: errMessage, executionTimeMs: Date.now() - startTime };
    }
  }

  private async monitorAndCancelOrder(orderId: string, eventBase: any) {
    await new Promise(resolve => setTimeout(resolve, ORDER_TIMEOUT_MS));
    try {
      await LifecycleEventPublisher.publish({
        ...eventBase,
        orderId,
        eventType: LifecycleEventType.ORDER_CANCEL_REQUESTED,
        payload: { reason: 'Timeout reached' }
      });

      await this.adapter.cancelOrder(orderId);

      await LifecycleEventPublisher.publish({
        ...eventBase,
        orderId,
        eventType: LifecycleEventType.ORDER_CANCELLED,
        payload: { reason: 'Timeout reached' }
      });
    } catch (error) {
      await LifecycleEventPublisher.publish({
        ...eventBase,
        orderId,
        eventType: LifecycleEventType.ORDER_FAILED,
        payload: { reason: `Cancel failed: ${error instanceof Error ? error.message : String(error)}` }
      });
    }
  }
}
