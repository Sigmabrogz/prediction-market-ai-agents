import { OrderSimulator } from './simulator';
import { PositionManager } from './position-manager';
import { LifecycleEventPublisher } from '../../core/src/event-publisher';
import { LifecycleEventType } from '../../core/src/events';
import { ExecutionRequest, OrderbookSnapshot, OrderSide, OrderMode } from '../../core/src/types';

export class PaperEngine {
  private simulator: OrderSimulator;
  private positionManager: PositionManager;

  constructor() {
    this.simulator = new OrderSimulator();
    this.positionManager = new PositionManager();
  }

  /**
   * Executes a simulated trade and automatically publishes lifecycle events to Redis
   * so the EventWriter can sync it to the unified Postgres DB.
   */
  public async executePaperTrade(
    req: ExecutionRequest,
    orderbook: OrderbookSnapshot,
    side: OrderSide,
    limitPrice: number
  ) {
    const { signal, strategy } = req;
    const mode: OrderMode = 'PAPER';

    const eventBase = {
      mode,
      signalId: signal.id,
      strategyId: strategy.id,
      marketId: strategy.marketId,
      component: 'paper-engine' as const
    };

    await LifecycleEventPublisher.publish({
      ...eventBase,
      eventType: LifecycleEventType.ORDER_SUBMISSION_STARTED,
      payload: { limitPrice, size: strategy.maxPositionSizeUsdc, side }
    });

    const result = this.simulator.simulateOrder(
      orderbook,
      strategy,
      side,
      strategy.maxPositionSizeUsdc,
      limitPrice
    );

    await LifecycleEventPublisher.publish({
      ...eventBase,
      orderId: result.orderId,
      eventType: LifecycleEventType.ORDER_SUBMITTED,
      payload: { limitPrice, size: strategy.maxPositionSizeUsdc, side }
    });

    // Log the resultant state (Partial, Full, or Open)
    await LifecycleEventPublisher.publish({
      ...eventBase,
      orderId: result.orderId,
      eventType: result.status,
      payload: { fills: result.fills, remainingSize: result.remainingSize, avgFillPrice: result.avgFillPrice }
    });

    if (result.fills.length > 0) {
      const position = this.positionManager.updatePosition(strategy.marketId, strategy.id, side, result.fills);
      const unrealizedPnl = this.positionManager.calculateUnrealizedPnl(position, orderbook);
      
      // We emit a system event for PnL that the DB can catch
      await LifecycleEventPublisher.publish({
        ...eventBase,
        orderId: result.orderId,
        eventType: 'PNL_SNAPSHOT_CREATED' as any,
        payload: { position, unrealizedPnl }
      });
    }

    // Handle Timeout Simulation (if order didn't completely fill)
    if (result.status === LifecycleEventType.ORDER_OPEN || result.status === LifecycleEventType.ORDER_PARTIALLY_FILLED) {
      setTimeout(async () => {
        const timeoutRes = this.simulator.applyTimeout(result);
        await LifecycleEventPublisher.publish({
          ...eventBase,
          orderId: timeoutRes.orderId,
          eventType: LifecycleEventType.ORDER_CANCEL_REQUESTED,
          payload: { reason: 'Timeout' }
        });
        await LifecycleEventPublisher.publish({
          ...eventBase,
          orderId: timeoutRes.orderId,
          eventType: timeoutRes.status,
          payload: { reason: timeoutRes.reason }
        });
      }, 5000); // 5 sec paper timeout
    }

    return result;
  }
}
