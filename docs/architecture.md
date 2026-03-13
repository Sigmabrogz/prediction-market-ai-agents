# Architecture

The system is designed to execute fast, deterministic trades on prediction markets based on off-chain Oracle updates.

## Component Flow

1. **Oracle Worker** (Data Source)
   - Polls external APIs (e.g., YouTube, FAA) at high frequency.
   - Detects state transitions (false -> true).
   - Emits an `OracleSignal` to the Redis Bus.

2. **Redis Signal Bus**
   - Message broker that decouples the slow polling layer from the fast execution layer.

3. **Executor** (Trade Execution)
   - Listens for `OracleSignal`.
   - Maps the signal to a specific Polymarket `MarketID`.
   - Checks the Orderbook depth and spread.
   - Applies risk limits (Max 5% capital).
   - Fires an aggressive Limit Order (maker/taker) via the Polygon RPC.
