# Event Stream Architecture

The system uses a strictly decoupled, event-driven architecture. 

## Philosophy
The `ExecutionEngine` is pure. It does not import `packages/db`. It does not execute SQL queries. It performs two jobs:
1. Trade Execution via `PolymarketAdapter`.
2. Emitting standardized events to the Redis `order_lifecycle_events` channel via `LifecycleEventPublisher`.

A separate background worker (The `EventWriter`) will listen to this Redis channel and translate these normalized payloads into PostgreSQL database rows.

## The Event Schema

Every event published to Redis conforms to the `LifecycleEventEnvelope<T>` interface:

```typescript
export interface LifecycleEventEnvelope<T = any> {
  eventId: string;           // UUID
  eventType: LifecycleEventType; // e.g. 'VALIDATION_PASSED'
  timestamp: number;         // Epoch MS
  mode: OrderMode;           // 'PAPER' | 'LIVE' | 'DRY_RUN'
  signalId?: string;
  orderId?: string;          // Nullable until 'ORDER_SUBMITTED'
  strategyId: string;
  marketId?: string;
  component: 'executor' | 'paper-engine';
  payload: T;                // Event-specific JSON payload
}
```

## Standard Execution Flow
1. `SIGNAL_RECEIVED`
2. `VALIDATION_STARTED`
3. `VALIDATION_PASSED`
4. `ORDER_SUBMISSION_STARTED` (Live only)
5. `ORDER_SUBMITTED` (Includes Polymarket `orderId`)
6. `ORDER_CANCEL_REQUESTED` (If timeout hits)
7. `ORDER_CANCELLED`
