import { create } from 'zustand';

interface Position {
  id: string;
  marketId: string;
  size: number;
  avgEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
}

interface Signal {
  eventId: string;
  timestamp: number;
  source: string;
  targetId: string;
  triggerCondition?: string;
  value?: any;
}

interface OrderEvent {
  eventId: string;
  orderId: string;
  status: string;
  timestamp: number;
  marketId: string;
  mode: string;
}

interface DashboardState {
  isConnected: boolean;
  setConnected: (val: boolean) => void;
  
  mode: 'PAPER' | 'LIVE';
  setMode: (mode: 'PAPER' | 'LIVE') => void;

  signals: Signal[];
  addSignal: (signal: Signal) => void;

  orderEvents: OrderEvent[];
  addOrderEvent: (event: OrderEvent) => void;

  positions: Position[];
  updatePosition: (pos: Position) => void;

  pnl: { realized: number; unrealized: number; total: number };
  updatePnl: (pnl: { realized: number; unrealized: number; total: number }) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isConnected: false,
  setConnected: (val) => set({ isConnected: val }),

  mode: 'PAPER',
  setMode: (mode) => set({ mode }),

  signals: [],
  addSignal: (signal) => set((state) => ({ 
    signals: [signal, ...state.signals].slice(0, 50) 
  })),

  orderEvents: [],
  addOrderEvent: (event) => set((state) => ({ 
    orderEvents: [event, ...state.orderEvents].slice(0, 100) 
  })),

  positions: [],
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
