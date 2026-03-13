import { YouTubeOracleWorker } from './youtube';

// Test script to verify the deduplication and polling behavior
const MOCK_API_KEY = 'mock_key'; // In a real run, you need a YouTube Data API v3 Key
const MOCK_CHANNEL = 'UCX6OQ3DkcsbYNE6H8uQQuVA'; // MrBeast (example)

const worker = new YouTubeOracleWorker({
  apiKey: MOCK_API_KEY,
  channelId: MOCK_CHANNEL,
  targetSubscribers: 300000000, 
  intervalMs: 5000 // Poll every 5s
});

console.log("Starting YouTube Oracle Worker (Dry Run Test)");
// In a real execution environment with a valid API key, this will fetch and log properly.
worker.start();

// Stop after 15 seconds for the test
setTimeout(() => {
  worker.stop();
  process.exit(0);
}, 15000);
