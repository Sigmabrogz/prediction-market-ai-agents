'use client';

import { useEffect, useState } from 'react';

export default function PoolsPage() {
  const [pools, setPools] = useState<any[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

  useEffect(() => {
    fetch(`${apiUrl}/pools`)
      .then(r => r.json())
      .then(d => setPools(d))
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto font-mono text-gray-100">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-purple-400 tracking-widest">Active Sniper Pools</h1>
        <a href="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back to Dashboard</a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pools.length === 0 && <div className="text-gray-500">Loading pools...</div>}
        {pools.map(p => (
          <div key={p.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 hover:border-purple-500/50 transition-all shadow-lg backdrop-blur-sm">
            <h2 className="text-sm font-semibold mb-3 leading-snug line-clamp-2 h-10" title={p.title}>{p.title}</h2>
            <div className="flex justify-between items-center mt-4">
              <span className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded truncate max-w-[150px]">{p.marketId}</span>
              <button 
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-1.5 rounded font-bold shadow-[0_0_10px_rgba(147,51,234,0.3)] transition-colors"
                onClick={async () => {
                  try {
                    await fetch(`${apiUrl}/subscribe`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ poolId: p.id, maxTradeSize: 10 })
                    });
                    alert('Subscribed to pool! Your agent is now armed.');
                  } catch (err) {
                    alert('Failed to subscribe. Check console.');
                  }
                }}
              >
                SUBSCRIBE
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
