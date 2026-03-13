import { prisma } from '../client';
import { OrderMode, Prisma } from '@prisma/client';

export class SignalRepository {
  static async createSignal(data: {
    id: string;
    signalId: string;
    strategyId: string;
    oracleSource: string;
    marketId: string;
    marketSlug?: string;
    triggerType: string;
    triggerPayload: Prisma.InputJsonValue;
    emittedAt: Date;
    mode: OrderMode;
  }) {
    return prisma.signal.create({
      data,
    });
  }

  static async getRecentSignals(limit: number = 50) {
    return prisma.signal.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        strategy: true,
      }
    });
  }
}
