'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';
import { 
  DashboardOrder, 
  DashboardOrderEvent 
} from '@/types';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const store = useDashboardStore();
  const eventSource = useRef<EventSource | null>(null);

  // 1. Initial Snapshot Fetch
  useEffect(() => {
    async function hydrate() {
      if (store.isHydrated) return;
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        
        // Fetch all snapshots in parallel
        const [signalsRes, ordersRes, positionsRes, pnlRes, healthRes] = await Promise.all([
          fetch(`${apiUrl}/signals/recent`),
          fetch(`${apiUrl}/orders/recent`),
          fetch(`${apiUrl}/positions`),
          fetch(`${apiUrl}/pnl/summary`),
          fetch(`${apiUrl.replace('/api', '/health')}`)
        ]);

        if (signalsRes.ok) store.setSignals(await signalsRes.json());
        if (positionsRes.ok) store.setPositions(await positionsRes.json());
        if (pnlRes.ok) store.updatePnl(await pnlRes.json());
        
        if (healthRes.ok) {
          const health = await healthRes.json();
          store.setMode(health.mode === 'DRY_RUN' ? 'PAPER' : 'LIVE');
        }

        if (ordersRes.ok) {
          const rawOrders = await ordersRes.json();
          // Normalize nested prisma structure into flat dashboard groups
          const normalizedOrders: DashboardOrder[] = rawOrders.map((ro: any) => ({
            id: ro.id,
            marketId: ro.marketId,
            mode: ro.mode,
            status: ro.status,
            createdAt: ro.createdAt,
            events: (ro.lifecycle || []).map((lce: any) => ({
              eventId: lce.id,
              orderId: lce.orderId,
              status: lce.status,
              timestamp: new Date(lce.timestamp).getTime(),
              marketId: lce.marketId,
              mode: ro.mode,
              details: lce.payload
            })).sort((a: any, b: any) => b.timestamp - a.timestamp) // newest first
          }));
          store.setOrders(normalizedOrders);
        }

        store.setHydrated(true);
      } catch (e) {
        console.error('Hydration failed', e);
      }
    }
    hydrate();
  }, [store]);

  // 2. Heartbeat Monitor
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (store.isConnected && now - store.lastHeartbeat > 40000) {
        store.setStale(true);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [store]);

  // 3. SSE Stream Connection
  useEffect(() => {
    if (!store.isHydrated) return; // Wait for initial load

    const url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '/stream');
    eventSource.current = new EventSource(url);

    eventSource.current.onopen = () => {
      console.log('SSE Connected');
      store.setConnected(true);
      store.setHeartbeat(Date.now());
      store.setStale(false);
    };

    eventSource.current.addEventListener('ping', () => {
      store.setHeartbeat(Date.now());
    });

    eventSource.current.addEventListener('signal.created', (e) => {
      store.addSignal(JSON.parse(e.data));
    });

    eventSource.current.addEventListener('order.updated', (e) => {
      store.addOrderEvent(JSON.parse(e.data) as DashboardOrderEvent);
    });

    eventSource.current.addEventListener('position.updated', async (e) => {
      // For positions, it's safer to fetch the latest snapshot to ensure accurate VWAP/size
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const positionsRes = await fetch(`${apiUrl}/positions`);
        if (positionsRes.ok) store.setPositions(await positionsRes.json());
      } catch (err) {}
    });

    eventSource.current.addEventListener('pnl.updated', (e) => {
      const data = JSON.parse(e.data);
      store.updatePnl({
        realized: data.position?.realizedPnl || 0,
        unrealized: data.unrealizedPnl || 0,
        total: (data.position?.realizedPnl || 0) + (data.unrealizedPnl || 0)
      });
    });

    eventSource.current.onerror = () => {
      console.error('SSE Error / Disconnect');
      store.setConnected(false);
      eventSource.current?.close();
      
      // Auto reconnect after a short backoff
      setTimeout(() => {
        // Next iteration of effect loop handles new instance if we clear it out, 
        // but since we're inside effect, the simplest is reload or setting a trigger.
        // For production: implement robust retry. MVP: reload on catastrophic drop.
        if (document.visibilityState === 'visible') {
           window.location.reload();
        }
      }, 5000);
    };

    return () => {
      eventSource.current?.close();
    };
  }, [store.isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
