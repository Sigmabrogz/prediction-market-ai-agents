import { create } from 'zustand';
import { 
  DashboardSignal, 
  DashboardOrder, 
  DashboardOrderEvent, 
  DashboardPosition, 
  DashboardPnlSummary 
} from '../types';

interface DashboardState {
  isHydrated: boolean;
  setHydrated: (val: boolean) => void;

  isConnected: boolean;
  setConnected: (val: boolean) => void;

  isStale: boolean;
  setStale: (val: boolean) => void;
  
  lastHeartbeat: number;
  setHeartbeat: (timestamp: number) => void;

  mode: 'PAPER' | 'LIVE';
  setMode: (mode: 'PAPER' | 'LIVE') => void;

  signals: DashboardSignal[];
  setSignals: (signals: DashboardSignal[]) => void;
  addSignal: (signal: DashboardSignal) => void;

  orders: DashboardOrder[];
  setOrders: (orders: DashboardOrder[]) => void;
  addOrderEvent: (event: DashboardOrderEvent) => void;

  positions: DashboardPosition[];
  setPositions: (positions: DashboardPosition[]) => void;
  updatePosition: (pos: DashboardPosition) => void;

  pnl: DashboardPnlSummary;
  updatePnl: (pnl: DashboardPnlSummary) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  isHydrated: false,
  setHydrated: (val) => set({ isHydrated: val }),

  isConnected: false,
  setConnected: (val) => set({ isConnected: val }),

  isStale: false,
  setStale: (val) => set({ isStale: val }),

  lastHeartbeat: Date.now(),
  setHeartbeat: (timestamp) => set({ lastHeartbeat: timestamp, isStale: false }),

  mode: 'PAPER',
  setMode: (mode) => set({ mode }),

  signals: [],
  setSignals: (signals) => set({ signals }),
  addSignal: (signal) => set((state) => {
    // Deduplicate
    if (state.signals.some(s => s.eventId === signal.eventId)) return state;
    return { signals: [signal, ...state.signals].slice(0, 50) };
  }),

  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrderEvent: (event) => set((state) => {
    // We group events into orders.
    const orders = [...state.orders];
    let orderIndex = orders.findIndex(o => o.id === event.orderId);
    
    if (orderIndex === -1) {
      // Create new order container if we receive an event for a new order
      const newOrder: DashboardOrder = {
        id: event.orderId,
        marketId: event.marketId,
        mode: event.mode,
        status: event.status,
        createdAt: event.timestamp,
        events: [event]
      };
      return { orders: [newOrder, ...orders].slice(0, 50) };
    }

    // Append to existing order, deduplicating event
    const order = { ...orders[orderIndex] };
    if (!order.events.some(e => e.eventId === event.eventId)) {
      order.events = [event, ...order.events];
      order.status = event.status; // latest status
      orders[orderIndex] = order;
    }

    return { orders };
  }),

  positions: [],
  setPositions: (positions) => set({ positions }),
  updatePosition: (pos) => set((state) => {
    const existing = state.positions.findIndex(p => p.id === pos.id);
    if (existing >= 0) {
      const newPos = [...state.positions];
      newPos[existing] = pos;
      return { positions: newPos };
    }
    return { positions: [pos, ...state.positions] };
  }),

  pnl: { realized: 0, unrealized: 0, total: 0 },
  updatePnl: (pnl) => set({ pnl })
}));
