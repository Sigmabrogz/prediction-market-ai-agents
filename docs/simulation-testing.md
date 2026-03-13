# End-to-End Simulation Testing

The `scripts/run-simulation.ts` is the master validation harness for the platform. It stress-tests the entire event pipeline (Oracle -> EventWriter -> API -> Dashboard) without relying on live market hours or real capital.

## Architecture Tested

1. **Pub/Sub Bus (`ioredis`)**: Can it handle high-frequency bursts without dropping signals?
2. **Executor Validation**: Do duplicate signals get blocked? Do invalid targets get rejected?
3. **Paper Engine**: Do synthetic fills trigger correctly?
4. **Event Writer**: Is the Postgres DB remaining idempotent? Are we double-counting `ORDER_FILLED` VWAPs?
5. **Realtime API (SSE)**: Does the Next.js Dashboard render the timeline accurately without freezing under load?

## How to Run a Simulation

Before running, you must boot the entire platform. In separate terminals or via your process manager (PM2/Docker), start:
1. `pnpm run dev --filter @sigmabrogz/executor`
2. `pnpm run dev --filter @sigmabrogz/event-writer`
3. `pnpm run dev --filter @sigmabrogz/paper-engine`
4. `pnpm run dev --filter @sigmabrogz/api`
5. `pnpm run dev --filter @sigmabrogz/dashboard`

Once the ecosystem is online, trigger the simulation:

```bash
cd scripts
npx ts-node run-simulation.ts [COUNT] [INTERVAL_MS]
```

Example (100 signals, 50ms apart):
```bash
npx ts-node run-simulation.ts 100 50
```

## Failure Injection
The simulation harness automatically injects edge-case behaviors:
- **10% Duplicate Signals**: Randomly double-fires exact UUIDs into the bus to ensure the Executor's Redis `SETNX` lock accurately blocks the second one and prevents duplicate database entries.

## Expected Metrics
At the end of the script, a `simulation-reports/report-<timestamp>.json` will be generated.
- **Validations Failed** should perfectly match the injected duplicate count.
- **Fills** should realistically match the Paper Engine's configured fill probability (e.g. 80-90%).
- **Average E2E Latency** should remain under 15ms.
