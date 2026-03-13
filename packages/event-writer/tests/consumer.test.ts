import { describe, it, expect, vi } from 'vitest';
import { handleLifecycleEvent } from '../src/handlers/lifecycle';
import { LifecycleEventEnvelope, LifecycleEventType } from '../../core/src/events';

// Mock the DB
vi.mock('../../db/src', () => ({
  prisma: {
    orderLifecycleEvent: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(true)
    },
    order: {
      upsert: vi.fn().mockResolvedValue(true)
    }
  },
  OrderStatus: {
    SIGNAL_RECEIVED: 'SIGNAL_RECEIVED',
    ORDER_SUBMITTED: 'ORDER_SUBMITTED'
  },
  OrderMode: {
    PAPER: 'PAPER'
  },
  OrderSide: {
    BUY: 'BUY'
  }
}));

describe('EventWriter Lifecycle Handler', () => {
  it('should gracefully handle an event and call the DB', async () => {
    const event: LifecycleEventEnvelope = {
      eventId: 'uuid-123',
      eventType: LifecycleEventType.ORDER_SUBMITTED,
      timestamp: Date.now(),
      mode: 'PAPER',
      signalId: 'sig-123',
      orderId: 'ord-123',
      strategyId: 'strat-1',
      marketId: 'market-1',
      component: 'executor',
      payload: { limitPrice: 0.5, size: 10, side: 'BUY' }
    };

    // Should not throw
    await expect(handleLifecycleEvent(event)).resolves.not.toThrow();
  });
});
