import { Router } from 'express';
import { prisma } from '../../../packages/db/src';

export const snapshotRouter = Router();

snapshotRouter.get('/signals/recent', async (req, res) => {
  const mode = req.query.mode as string;
  try {
    const signals = await prisma.signal.findMany({
      where: mode ? { mode: mode as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(signals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

snapshotRouter.get('/orders/recent', async (req, res) => {
  const mode = req.query.mode as string;
  try {
    const orders = await prisma.order.findMany({
      where: mode ? { mode: mode as any } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { lifecycle: true }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

snapshotRouter.get('/positions', async (req, res) => {
  const mode = req.query.mode as string;
  try {
    const positions = await prisma.position.findMany({
      where: mode ? { mode: mode as any } : { size: { gt: 0 } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

snapshotRouter.get('/pnl/summary', async (req, res) => {
  try {
    // Simplified MVP sum query
    const positions = await prisma.position.findMany();
    const summary = positions.reduce((acc, pos) => {
      acc.realized += pos.realizedPnl;
      acc.unrealized += pos.unrealizedPnl || 0;
      return acc;
    }, { realized: 0, unrealized: 0, total: 0 });
    
    summary.total = summary.realized + summary.unrealized;
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute PnL summary' });
  }
});

snapshotRouter.get('/system/events', async (req, res) => {
  try {
    const events = await prisma.systemEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch system events' });
  }
});
