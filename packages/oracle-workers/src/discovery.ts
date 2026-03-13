import https from 'https';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const DOME_API_KEY = process.env.DOME_API_KEY || '93547cfc-c0ed-4d6a-8203-ef69003a2400';

async function runDiscovery() {
  console.log(`[Discovery] Fetching open high-volume markets from DomeAPI...`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.domeapi.io',
      port: 443,
      path: '/v1/polymarket/markets?limit=100&status=open',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DOME_API_KEY}`
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.markets) {
            console.error('[Discovery] No markets array in response');
            return resolve(false);
          }

          // Filter for volume and create Sniper Pools
          let added = 0;
          for (const m of parsed.markets) {
            if (m.volume_1_week > 1000 && m.side_a && m.side_a.id) {
              const pool = await prisma.sniperPool.upsert({
                where: { marketId: m.side_a.id },
                update: { title: m.title, status: 'ACTIVE' },
                create: {
                  marketId: m.side_a.id,
                  title: m.title,
                  resolutionSource: m.resolution_source || 'Unknown',
                  status: 'ACTIVE'
                }
              });
              added++;
            }
          }
          console.log(`[Discovery] Upserted ${added} high-volume Sniper Pools into database.`);
          resolve(true);
        } catch (e) {
          console.error(e);
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Run immediately if called directly
if (require.main === module) {
  runDiscovery()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
