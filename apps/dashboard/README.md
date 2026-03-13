# Oracle Sniper Dashboard

A Next.js App Router dashboard built to consume realtime prediction market trading telemetry. 
Features zero-polling updates via Server-Sent Events (SSE) and strict hydration boot flows.

## Development
1. Ensure `apps/api` is running on `localhost:4000`.
2. Run `pnpm dev`.

## Vercel Deployment Readiness
This dashboard is completely stateless and ready to be deployed to Vercel out of the box.

### Required Environment Variables:
- `NEXT_PUBLIC_API_URL`: The deployed URL of your Express/Railway backend API (e.g., `https://api.oraclesniper.ai/api`).

### Setup Instructions for Vercel
1. Select the `prediction-market-ai-agents` repository.
2. Set the **Root Directory** to `apps/dashboard`.
3. Add the `NEXT_PUBLIC_API_URL` environment variable.
4. Deploy.

The dashboard will automatically handle initial state hydration from `/recent` REST endpoints before silently transitioning to the `/stream` SSE pipeline for live updates.
