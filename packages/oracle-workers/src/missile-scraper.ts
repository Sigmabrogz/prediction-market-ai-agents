import Parser from 'rss-parser';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const parser = new Parser();

// Multiple official and highly responsive news feeds for South Korea / World News
const FEEDS = [
  'https://en.yna.co.kr/RSS/news.xml', // Yonhap News Agency (South Korea) - usually the first to report NK launches
  'https://feeds.bbci.co.uk/news/world/asia/rss.xml', // BBC Asia
  'http://rss.cnn.com/rss/edition_asia.rss' // CNN Asia
];

const KEYWORDS = ['north korea', 'pyongyang', 'dprk'];
const ACTION_WORDS = ['fires', 'launches', 'test', 'missile', 'projectile'];

// We store seen GUIDs so we don't trigger the same news twice
const seenItems = new Set<string>();

// The target Polymarket ID for "North Korea missile test/launch by March 31?"
const TARGET_MARKET = '87915864746181321818693023750442452900141952464887572055123798263124868647875';

async function pollFeeds() {
  console.log(`[Oracle: Missile] Polling ${FEEDS.length} RSS feeds...`);
  
  for (const feedUrl of FEEDS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      
      for (const item of feed.items) {
        if (!item.title || !item.guid) continue;
        if (seenItems.has(item.guid)) continue;
        
        seenItems.add(item.guid);
        
        const titleLower = item.title.toLowerCase();
        
        const hasKeyword = KEYWORDS.some(k => titleLower.includes(k));
        const hasAction = ACTION_WORDS.some(a => titleLower.includes(a));
        
        if (hasKeyword && hasAction) {
          console.log(`\n🚨 [Oracle: Missile] TRIGGER DETECTED!`);
          console.log(`🗞️  Headline: ${item.title}`);
          console.log(`🔗 Link: ${item.link}`);
          
          const signal = {
            id: randomUUID(),
            source: 'RSS_YONHAP_BBC_CNN',
            targetId: TARGET_MARKET,
            triggerCondition: 'NK_MISSILE_LAUNCH',
            timestamp: Date.now(),
            value: { headline: item.title, link: item.link }
          };

          console.log(`[Oracle: Missile] Broadcasting BUY signal to Redis...`);
          await redis.publish('oracle_signals', JSON.stringify(signal));
          
          // Once we trigger, we don't want to trigger again immediately.
          // In production, we might want to shut down this specific worker or pause it.
          console.log(`[Oracle: Missile] Signal published. Oracle entering cooldown.`);
          return;
        }
      }
    } catch (err) {
      console.error(`[Oracle: Missile] Failed to parse feed ${feedUrl}:`, err);
    }
  }
}

// Start polling every 15 seconds (aggressive polling for RSS)
console.log(`[Oracle: Missile] Worker started. Monitoring for North Korean missile launches...`);
setInterval(pollFeeds, 15000);
pollFeeds(); // Initial run
