'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/useDashboardStore';

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const setConnected = useDashboardStore(s => s.setConnected);
  const addSignal = useDashboardStore(s => s.addSignal);
  const addOrderEvent = useDashboardStore(s => s.addOrderEvent);
  const updatePnl = useDashboardStore(s => s.updatePnl);
  const eventSource = useRef<EventSource | null>(null);

  useEffect(() => {
    // In dev, assuming API runs on 4000
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/stream';
    
    eventSource.current = new EventSource(url);

    eventSource.current.onopen = () => {
      console.log('SSE Connected');
      setConnected(true);
    };

    eventSource.current.addEventListener('signal.created', (e) => {
      const data = JSON.parse(e.data);
      addSignal(data);
    });

    eventSource.current.addEventListener('order.updated', (e) => {
      const data = JSON.parse(e.data);
      addOrderEvent(data);
    });

    eventSource.current.addEventListener('pnl.updated', (e) => {
      const data = JSON.parse(e.data);
      updatePnl({
        realized: data.position?.realizedPnl || 0,
        unrealized: data.unrealizedPnl || 0,
        total: (data.position?.realizedPnl || 0) + (data.unrealizedPnl || 0)
      });
    });

    eventSource.current.onerror = () => {
      console.error('SSE Disconnected');
      setConnected(false);
      eventSource.current?.close();
      
      // Auto reconnect after 5s
      setTimeout(() => {
        // Simple reconnect logic for MVP
        window.location.reload();
      }, 5000);
    };

    return () => {
      eventSource.current?.close();
    };
  }, [addOrderEvent, addSignal, setConnected, updatePnl]);

  return <>{children}</>;
}
