import { PolymarketAdapter } from './polymarket-adapter';
import { OrderbookValidator } from './validator';
import { ExecutionRequest, ExecutionResult, OrderSide, OrderMode } from '../../core/src/types';
import { LifecycleEventPublisher } from '../../core/src/event-publisher';
import { LifecycleEventType } from '../../core/src/events';
import { PrismaClient } from '@prisma/client';

const ORDER_TIMEOUT_MS = 10000;
const prisma = new PrismaClient();

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
    
    // In SaaS Mode, the signal's targetId or strategy.marketId aligns with the Pool.
    // We fetch ALL active subscriptions for this market.
    const subscribers = await prisma.subscription.findMany({
      where: { poolId: strategy.marketId, active: true },
      include: { user: { include: { wallets: true } } }
    });

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
        payload: { subscriberCount: subscribers.length }
      });

      if (subscribers.length === 0 && !dryRun) {
         // No one to trade for
         return { success: true, executionTimeMs: Date.now() - startTime };
      }

      const orderbook: any = await this.adapter.getOrderbook(strategy.marketId);
      const validation = this.validator.validate({ ...(orderbook as any), marketId: strategy.marketId } as any, strategy, side);

      if (!validation.passed) {
        await LifecycleEventPublisher.publish({
          ...eventBase,
          eventType: LifecycleEventType.VALIDATION_FAILED,
          payload: { reason: validation.reason }
        });
        return { success: false, error: validation.reason as string, executionTimeMs: Date.now() - startTime };
      }

      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.VALIDATION_PASSED,
        payload: {}
      });

      const execPrice = side === 'BUY' ? Number((orderbook as any).asks[0].price) : Number((orderbook as any).bids[0].price);

      if (dryRun) {
        await LifecycleEventPublisher.publish({
          ...eventBase,
          eventType: LifecycleEventType.DRY_RUN_EXECUTED,
          payload: { simulatedPrice: execPrice, simulatedSize: strategy.maxPositionSizeUsdc, side, fanoutCount: subscribers.length }
        });
        return { success: true, executionTimeMs: Date.now() - startTime };
      }

      // LIVE PATH: MASSIVE FAN-OUT
      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.ORDER_SUBMISSION_STARTED,
        payload: { limitPrice: execPrice, fanoutCount: subscribers.length, side }
      });

      // Fire parallel transactions for all subscribed users
      const tradePromises = subscribers.map(async (sub) => {
         const wallet = sub.user.wallets[0];
         if (!wallet) return null;
         
         // In reality, we'd instantiate a new adapter/signer per user PK here, or pass it into placeOrder
         // For this demo architecture, we'll log the parallel intent.
         const userAdapter = new PolymarketAdapter({
            privateKey: wallet.privateKey,
            chainId: 137,
            host: 'https://clob.polymarket.com'
         });
         
         return userAdapter.placeOrder(strategy.marketId, execPrice, sub.maxTradeSize, side);
      });

      const results = await Promise.allSettled(tradePromises);
      
      const successfulOrders = results.filter(r => r.status === 'fulfilled' && r.value).map((r: any) => r.value.orderID);

      await LifecycleEventPublisher.publish({
        ...eventBase,
        eventType: LifecycleEventType.ORDER_SUBMITTED,
        orderId: successfulOrders[0] || 'batch-exec',
        payload: { limitPrice: execPrice, successfulExecutions: successfulOrders.length, side }
      });

      // We only monitor the first one for the demo timeline, in prod we monitor all
      if (successfulOrders[0]) {
        this.monitorAndCancelOrder(successfulOrders[0], eventBase);
      }

      return { success: true, orderId: successfulOrders[0] || 'batch-exec', executionTimeMs: Date.now() - startTime };

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
