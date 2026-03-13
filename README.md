# Prediction Market AI Agents

A high-performance, user-facing AI agent orchestration platform built to trade on prediction markets (Polymarket, Kalshi). 

This platform allows users to deploy autonomous agents that execute specific, deterministic trading strategies with millisecond precision.

## The Strategy: Oracle Sniping

The core V1 strategy engine focuses on **Oracle Sniping**. Instead of relying on slow, probabilistic LLM sentiment analysis or fighting HFT firms for cross-market arbitrage pennies, this platform monitors the exact data APIs that Prediction Market Oracles use (e.g., FAA flight delays, YouTube subscriber counts, Box Office APIs).

When an external API triggers a state change, a centralized worker broadcasts a signal via Redis, and the Execution Engine fires parallel limit orders to the Polymarket Central Limit Order Book (CLOB) for all subscribed user agents *before* the market can manually reprice.

## System Architecture

The monorepo is divided into highly specialized, isolated packages designed for speed and horizontal scaling.

- **`packages/oracle-workers`**: Standalone processes that poll specific external APIs (e.g., YouTube API) at high frequency.
- **`packages/core`**: Shared types, Redis pub/sub interfaces, and generic utilities.
- **`packages/strategies`**: The deterministic logic gates that translate Oracle data into buy/sell signals.
- **`packages/executor`**: The transactional core. Listens for Redis signals, builds CLOB limit orders, signs transactions via `viem`, and dispatches to the Polygon blockchain.
- **`apps/dashboard`**: (Phase 2) Next.js frontend for user onboarding, agent configuration, and PnL tracking.
- **`infra/`**: Docker configurations and deployment scripts.

## Module Responsibilities

1. **Oracle Worker:** Fetch data -> Detect state change -> Broadcast to Redis.
2. **Strategy Engine:** Read data -> Evaluate against market threshold -> Emit Trade Signal.
3. **Execution Engine:** Read Trade Signal -> Fetch user wallets -> Fire parallel orders to Polymarket.
