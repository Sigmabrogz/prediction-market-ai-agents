import { getRedisSubClient, REDIS_CHANNEL } from './redis';

console.log(`[${new Date().toISOString()}] [TestSubscriber] Starting Redis subscription on channel: ${REDIS_CHANNEL}`);

const sub = getRedisSubClient();

sub.subscribe(REDIS_CHANNEL, (err, count) => {
  if (err) {
    console.error("Failed to subscribe:", err.message);
    process.exit(1);
  }
  console.log(`Subscribed to ${count} channel(s). Waiting for signals...`);
});

sub.on('message', (channel, message) => {
  console.log(`\n[${new Date().toISOString()}] [TestSubscriber] RECEIVED MESSAGE ON ${channel}`);
  try {
    const payload = JSON.parse(message);
    console.log(JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("Failed to parse message:", message);
  }
});
