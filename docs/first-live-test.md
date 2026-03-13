# First Live Test Playbook

This document details the exact procedures and safety protocols required to execute the first real-money Oracle Snipe on the Polymarket CLOB.

## 1. Required Environment Variables
To disable the `DRY_RUN` lock, the executor environment MUST contain:
```env
DRY_RUN=false
LIVE_CONFIRMATION=true
POLYMARKET_PRIVATE_KEY=0xYourBurnerWalletPrivateKey
WHITELISTED_MARKET=16678291189211314787145083999015737376658799626183230671758641503291735614088
WHITELISTED_WALLET=0xYourBurnerWalletPublicKey
REDIS_URL=redis://localhost:6379
```

## 2. Wallet Funding Instructions
1. Create a fresh MetaMask wallet (Burner Wallet).
2. Bridge exactly $10 USDC to the Polygon PoS network.
3. Add a fraction of a MATIC token (e.g., $0.50 worth) to pay for gas fees.
4. Do **not** use a main wallet. 

## 3. Execution Commands
Open two terminals.

Terminal 1 (The Executor):
```bash
cd packages/executor
npm run start
```

Terminal 2 (The Simulator/Oracle Trigger):
```bash
cd packages/executor
npx ts-node src/e2e-dry-run.ts
```

## 4. Expected Log Sequence
1. `[Executor] Starting in LIVE mode.`
2. `[Executor] WARNING: LIVE EXECUTION MODE ENABLED.`
3. `[Executor] SECURITY: Hard Max Trade Size locked to $5`
4. `[Executor] Received Signal [...]`
5. `[ExecutionEngine] Placing BUY order: 2 @ $0.45`
6. `[ExecutionEngine] Order submitted successfully: <order_id>`
7. `[ExecutionEngine] Monitoring order <order_id> for 10000ms...`
8. `[ExecutionEngine] Timeout reached. Attempting to cancel order...`

## 5. Abort Conditions (Kill Switch)
- If `Validation Failed: Spread too wide` loops.
- If `Redis Subscription Error` appears.
- If the Orderbook returns `null` or `undefined`.
*(Action: `Ctrl+C` the Executor process immediately).*

## 6. Post-Trade Verification Checklist
- [ ] Check PolygonScan to verify the transaction was sent.
- [ ] Check Polymarket Portfolio UI to confirm the shares are held.
- [ ] Check USDC balance to confirm no more than $5 was spent.
- [ ] Verify the cancellation loop successfully killed any unfilled remainder.
