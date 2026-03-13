import { prisma } from '../client';
import { OrderMode, OrderSide, OrderStatus, Prisma } from '@prisma/client';

export class OrderRepository {
  static async createOrder(data: {
    signalId?: string;
    strategyId: string;
    marketId: string;
    mode: OrderMode;
    side: OrderSide;
    orderType: string;
    limitPrice: number;
    requestedSize: number;
  }) {
    return prisma.order.create({
      data: {
        ...data,
        status: OrderStatus.SIGNAL_RECEIVED,
        lifecycle: {
          create: {
            status: OrderStatus.SIGNAL_RECEIVED,
          },
        },
      },
    });
  }

  static async updateOrderStatus(
    orderId: string, 
    status: OrderStatus, 
    payload?: Prisma.InputJsonValue
  ) {
    return prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { 
          status,
          lastStatusAt: new Date()
        },
      }),
      prisma.orderLifecycleEvent.create({
        data: {
          orderId,
          status,
          payload: payload ?? Prisma.JsonNull,
        },
      }),
    ]);
  }

  static async getRecentOrders(mode?: OrderMode, limit: number = 50) {
    return prisma.order.findMany({
      where: mode ? { mode } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        signal: true,
      }
    });
  }
}
