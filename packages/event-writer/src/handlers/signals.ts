import { OracleSignal } from '../../../core/src/types';
import { prisma, OrderMode } from '../../../db/src';

export async function handleOracleSignal(signal: OracleSignal) {
  try {
    // Idempotency: skip if signal ID already exists
    const existing = await prisma.signal.findUnique({ where: { id: signal.id } });
    if (existing) {
      console.log(`[EventWriter] Signal ${signal.id} already exists. Skipping.`);
      return;
    }

    // Default to a dummy strategy if unmapped for now (MVP constraint)
    const MOCK_STRATEGY_ID = 'strat-youtube-100m';

    // Ensure the strategy exists (create if missing for MVP simulation)
    await prisma.strategy.upsert({
      where: { id: MOCK_STRATEGY_ID },
      update: {},
      create: {
        id: MOCK_STRATEGY_ID,
        name: 'MVP Mock Strategy',
        type: 'ORACLE_SNIPER',
        config: {}
      }
    });

    await prisma.signal.create({
      data: {
        id: signal.id,
        signalId: signal.id,
        strategyId: MOCK_STRATEGY_ID,
        oracleSource: signal.source,
        marketId: signal.targetId,
        triggerType: 'THRESHOLD_CROSSED',
        triggerPayload: signal.value,
        emittedAt: new Date(signal.timestamp),
        mode: OrderMode.PAPER, // Default for unstructured signal logging
      }
    });
    console.log(`[EventWriter] Persisted Signal ${signal.id}`);
  } catch (error) {
    console.error(`[EventWriter] Failed to persist signal ${signal.id}:`, error);
  }
}
