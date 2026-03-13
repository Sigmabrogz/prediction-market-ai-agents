# Phase 1 Flow (Headless MVP)

This document outlines the scope of the Phase 1 MVP.

## Scope Limitations
- **Oracle:** YouTube Subscriber Milestones only.
- **Strategy:** Single trigger execution (Sub count > Target -> Buy YES).
- **Users:** Single wallet connection (hardcoded private key).
- **Execution:** Polymarket CLOB integration only.

## Lifecycle
1. The `YouTubeOracle` polls the Google Data API every 5 seconds.
2. If `subscriberCount >= TARGET`, the worker ensures this state hasn't triggered recently (deduplication).
3. A normalized `OracleSignal` is broadcast to Redis.
4. The `Executor` receives the signal.
5. In `DRY_RUN=true` mode, it logs the exact order parameters.
6. In `DRY_RUN=false` mode, it queries the Polymarket CLOB for the L2 orderbook, calculates slippage, and executes a Limit Order.
