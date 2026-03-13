import { OrderSide, OrderMode } from './types';

export const REDIS_LIFECYCLE_CHANNEL = 'order_lifecycle_events';

export enum LifecycleEventType {
  SIGNAL_RECEIVED = 'SIGNAL_RECEIVED',
  SIGNAL_DEDUP_SKIPPED = 'SIGNAL_DEDUP_SKIPPED',
  VALIDATION_STARTED = 'VALIDATION_STARTED',
  VALIDATION_PASSED = 'VALIDATION_PASSED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  ORDER_SUBMISSION_STARTED = 'ORDER_SUBMISSION_STARTED',
  ORDER_SUBMITTED = 'ORDER_SUBMITTED',
  ORDER_OPEN = 'ORDER_OPEN',
  ORDER_PARTIALLY_FILLED = 'ORDER_PARTIALLY_FILLED',
  ORDER_FILLED = 'ORDER_FILLED',
  ORDER_CANCEL_REQUESTED = 'ORDER_CANCEL_REQUESTED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_FAILED = 'ORDER_FAILED',
  ORDER_EXPIRED = 'ORDER_EXPIRED',
  DRY_RUN_EXECUTED = 'DRY_RUN_EXECUTED'
}

export interface LifecycleEventEnvelope<T = any> {
  eventId: string;
  eventType: LifecycleEventType;
  timestamp: number;
  mode: OrderMode;
  signalId?: string;
  orderId?: string;
  strategyId: string;
  marketId?: string;
  component: 'executor' | 'paper-engine';
  payload: T;
}

export interface ValidationResultPayload {
  passed: boolean;
  reason?: string;
  spread?: number;
  depth?: number;
}

export interface OrderSubmittedPayload {
  limitPrice: number;
  size: number;
  side: OrderSide;
}

export interface OrderCancelledPayload {
  reason: string;
}

export interface DryRunExecutedPayload {
  simulatedPrice: number;
  simulatedSize: number;
  side: OrderSide;
}
