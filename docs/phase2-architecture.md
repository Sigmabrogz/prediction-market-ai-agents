# Phase 2: Paper Trading & Realtime Observability Architecture

This document defines the production-grade architecture required to transform the Oracle Sniper MVP into a robust, observable, and scalable prediction market trading platform.

## 1. Full Architecture for Paper Trading & Realtime Monitoring

The system is split into independent microservices communicating via Redis, backed by PostgreSQL for state persistence.

### **The Subsystems**
1. **Oracle Workers (Data Ingest):** Poll APIs and broadcast `OracleSignal` events to Redis.
2. **Execution Engine (Order Router):** Subscribes to `OracleSignal`. Fetches the live CLOB, runs risk validation, and routes to either the Live Adapter or the Paper Engine based on the Strategy Config.
3. **Paper Trading Engine (Simulated Exchange):** An isolated module that acts exactly like the Polymarket CLOB. It receives the order, snapshots the orderbook, models latency/slippage, and emits lifecycle events (e.g., `ORDER_FILLED`, `ORDER_CANCELLED`).
4. **Metrics/Event Streamer (Backend API):** Subscribes to all Redis lifecycle events and pushes them to the frontend via Server-Sent Events (SSE). Writes state transitions to PostgreSQL.
5. **Dashboard (Next.js):** Consumes SSE to display live orderbooks, signal feeds, and PnL metrics.

---

## 2. Database Schema Design (Prisma / PostgreSQL)

```prisma
enum OrderMode {
  PAPER
  LIVE
}

enum OrderStatus {
  SIGNAL_RECEIVED
  VALIDATION_FAILED
  ORDER_SUBMITTED
  ORDER_OPEN
  ORDER_PARTIALLY_FILLED
  ORDER_FILLED
  ORDER_CANCEL_REQUESTED
  ORDER_CANCELLED
  ORDER_FAILED
}

model Signal {
  id               String   @id
  source           String   // 'YOUTUBE', 'FAA'
  targetId         String
  triggerCondition String
  timestamp        DateTime
  value            Json
  orders           Order[]
}

model Order {
  id               String      @id @default(uuid())
  signalId         String
  signal           Signal      @relation(fields: [signalId], references: [id])
  marketId         String
  mode             OrderMode
  side             String      // 'BUY' | 'SELL'
  limitPrice       Float
  size             Float
  status           OrderStatus @default(SIGNAL_RECEIVED)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  fills            Fill[]
  lifecycle        OrderLifecycle[]
}

model OrderLifecycle {
  id        String      @id @default(uuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id])
  status    OrderStatus
  timestamp DateTime    @default(now())
  metadata  Json?       // E.g., spread width, validation failure reason, or latency
}

model Fill {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  price       Float
  size        Float
  timestamp   DateTime @default(now())
}

model Position {
  id          String   @id @default(uuid())
  marketId    String
  mode        OrderMode
  size        Float
  avgEntry    Float
  realizedPnl Float    @default(0.0)
  updatedAt   DateTime @updatedAt
}
```

---

## 3. Dashboard Page & Component Structure

**Framework:** Next.js (App Router), TailwindCSS, shadcn/ui.
**State/Data:** Server-Sent Events (SSE) streaming directly into Zustand stores.

**Layout Structure:**
- `/` (Command Center)
  - **Top Bar:** Global Mode Toggle (Paper / Live), Global PnL, Total Open Exposure.
  - **Left Panel (Live Feed):** 
    - `SignalFeed` Component: Scrolling log of Oracle Triggers.
    - `OrderLifecycle` Component: Visual pipeline (Received -> Validated -> Submitted -> Filled).
  - **Center Panel (Positions):**
    - `PositionsTable`: Market, Side, Size, Avg Entry, Mark Price, Unrealized PnL.
  - **Right Panel (Strategy Health):**
    - `MetricsCard`: Fill Rate %, Avg Slippage (bps), Avg Execution Latency (ms), Cancel Rate %.
- `/settings`
  - Oracle configuration, Strategy sizing, and Risk parameters.

---

## 4. Deployment Architecture

To ensure millisecond precision, we strictly decouple the frontend (Vercel) from the long-running worker processes.

| Component | Hosting Provider | Description |
| :--- | :--- | :--- |
| **Dashboard UI** | Vercel | Static Next.js build. Handles user interactions. |
| **API / SSE Server** | Railway / Render / AWS AppRunner | Long-running Node.js process. Serves standard API routes and maintains SSE connections to the Vercel frontend. Connects to Postgres and Redis. |
| **Oracle Workers** | Railway / Render / EC2 | Persistent Node.js/Go processes. Must run 24/7 to poll APIs. No open ports required. |
| **Execution Engine**| AWS EC2 (us-east-1) / Dedicated VPS | Deployed geographically close to Polygon RPCs. Listens to Redis, executes trades, writes to Postgres. |
| **Redis** | Upstash / AWS ElastiCache | Central message broker for signals and deduplication locks. |
| **PostgreSQL** | Supabase / Neon / RDS | The permanent trade ledger and configuration store. |

**Secrets Handling:**
- Frontend: No secrets.
- Backend/Workers: Doppler or AWS Secrets Manager. `POLYMARKET_PRIVATE_KEY` is strictly confined to the Execution Engine VPS.

---

## 5. Phased Implementation Plan

I propose the following rigorous build order to construct the observability engine without breaking the existing core.

**Step 1: Database Foundation**
- Setup `packages/db` with Prisma.
- Migrate the schema (Signals, Orders, Fills, Positions, Lifecycle).

**Step 2: State Machine & Order Lifecycle Tracking**
- Refactor `packages/executor` to emit normalized status events (`ORDER_SUBMITTED`, `ORDER_FILLED`, `VALIDATION_FAILED`) to a new Redis channel (`order_events`).
- Build a dedicated `EventWriter` worker to ingest these events and write them to PostgreSQL asynchronously (preventing DB writes from blocking execution speed).

**Step 3: The Paper Trading Engine**
- Create `packages/paper-engine`.
- Build a mock CLOB adapter that accepts `ExecutionRequest`, snapshots the real Polymarket orderbook, and probabilistically decides if the order fills (based on size vs depth).
- Wire it to emit the exact same lifecycle events as the live adapter.

**Step 4: Realtime Backend Stream**
- Create `apps/api`. An Express/Hono server that subscribes to `order_events` in Redis and broadcasts them to clients via Server-Sent Events (SSE).

**Step 5: Dashboard UI**
- Create `apps/dashboard`.
- Build the React components to visualize the SSE data stream and query historical trades via Prisma.

**Step 6: Controlled Simulation Replay**
- Fire a battery of dry-run tests: Network latency injection, partial fills, stale orderbook data, and duplicate signals to verify the UI and DB track failures gracefully.

