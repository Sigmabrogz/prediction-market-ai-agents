# Data Model & Order Lifecycle

The Database (`packages/db`) acts as the immutable system of record for all trading activity (both PAPER and LIVE).

## Schema Principles
1. **Event Sourcing Mentality:** The `OrderLifecycleEvent` table is append-only. We never mutate history. Every status transition (e.g., `VALIDATION_PASSED` -> `ORDER_SUBMITTED`) generates a new row with the exact timestamp and metadata payload.
2. **Unified Schema:** PAPER and LIVE modes share the exact same tables, isolated by the `mode: OrderMode` enum. This ensures the Dashboard and Replay engines use a single source of truth.

## The Order Lifecycle State Machine

Every order flows through these strict deterministic states:

- `SIGNAL_RECEIVED`: Trigger detected by Oracle.
- `VALIDATION_PASSED` / `VALIDATION_FAILED`: Pre-trade risk and orderbook checks.
- `ORDER_SUBMITTED`: Request sent to Polymarket CLOB.
- `ORDER_OPEN`: Polymarket confirms limit order is sitting on the book.
- `ORDER_PARTIALLY_FILLED`: Trade execution started but not completed.
- `ORDER_FILLED`: Desired size fully matched.
- `ORDER_CANCEL_REQUESTED`: Timeout hit, cancellation sent.
- `ORDER_CANCELLED`: Confirmed canceled by exchange.
- `ORDER_FAILED`: Hard crash or rejection by CLOB.
- `ORDER_EXPIRED`: Specific to Time-In-Force constraints.

## Repositories
We enforce typed access through classes like `OrderRepository`.
For example, calling `OrderRepository.updateOrderStatus()` automatically executes a Prisma transaction that both updates the current `status` on the `Order` table *and* appends the history to the `OrderLifecycleEvent` table atomically.
