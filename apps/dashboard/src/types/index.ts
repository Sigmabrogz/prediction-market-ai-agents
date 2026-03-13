export interface DashboardSignal {
  eventId: string;
  timestamp: number;
  source: string;
  targetId: string;
  triggerCondition?: string;
  value?: any;
}

export interface DashboardOrderEvent {
  eventId: string;
  orderId: string;
  status: string;
  timestamp: number;
  marketId: string;
  mode: string;
  details?: any;
}

export interface DashboardOrder {
  id: string;
  marketId: string;
  mode: string;
  status: string;
  createdAt: number;
  events: DashboardOrderEvent[];
}

export interface DashboardPosition {
  id: string;
  marketId: string;
  side: string;
  size: number;
  avgEntryPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  mode: string;
}

export interface DashboardPnlSummary {
  realized: number;
  unrealized: number;
  total: number;
}
