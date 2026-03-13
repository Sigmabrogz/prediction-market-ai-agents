# API & Streaming Architecture

The `apps/api` service acts as the read-only observability layer for the dashboard. It decouples the UI from the high-speed execution components.

## Routing
- `GET /health`: System diagnostics and dependency checks (Redis + Postgres).
- `GET /api/signals/recent`: Returns the last 50 signals.
- `GET /api/orders/recent`: Returns the last 50 orders with their nested lifecycle history.
- `GET /api/positions`: Returns currently open or historically closed positions.
- `GET /api/pnl/summary`: Returns the aggregated Realized and Unrealized PnL.
- `GET /stream`: The Server-Sent Events (SSE) endpoint for realtime updates.

## SSE Stream Design
The frontend connects to `/stream` once. The `SSEBroker` maintains the connection and sends periodic `ping` events every 30 seconds to prevent reverse-proxies (like Nginx or Cloudflare) from terminating the idle connection.

### Event Normalization
We do not push raw internal system events to the frontend. The `RedisListener` intercepts messages from `oracle_signals` and `order_lifecycle_events`, and normalizes them into stable UI events:

1. `event: signal.created`
2. `event: order.updated` (Contains current status and payload metadata)
3. `event: position.updated` (Triggered implicitly when a fill happens)
4. `event: pnl.updated`

## Frontend Consumption Pattern
The Dashboard should:
1. Fetch initial state via the REST `/api/...` endpoints.
2. Open the `/stream` connection.
3. Update local Zustand/Redux stores dynamically as SSE events stream in.
