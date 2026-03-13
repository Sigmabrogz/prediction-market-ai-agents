'use client';

import { useDashboardStore } from '@/store/useDashboardStore';
import { format } from 'date-fns';

export default function Dashboard() {
  const { isConnected, mode, pnl, signals, orderEvents } = useDashboardStore();

  return (
    <div className="min-h-screen bg-[#030014] text-gray-100 p-6 font-mono selection:bg-purple-500/30">
      
      {/* Top Bar */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-purple-600 rounded flex items-center justify-center font-bold">
            Σ
          </div>
          <h1 className="text-xl font-semibold tracking-wider">ORACLE SNIPER</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-widest">Status</span>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm">{isConnected ? 'ONLINE' : 'RECONNECTING'}</span>
          </div>
          
          <div className="px-3 py-1 rounded bg-gray-800/50 border border-gray-700 text-sm font-semibold tracking-wide">
            {mode} MODE
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Signals */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[800px] overflow-hidden flex flex-col">
            <h2 className="text-xs uppercase tracking-widest text-purple-400 mb-4 font-semibold">Live Signals</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {signals.length === 0 ? (
                <div className="text-gray-500 text-sm text-center mt-10">Awaiting oracle triggers...</div>
              ) : (
                signals.map(s => (
                  <div key={s.eventId} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-blue-400">{s.source}</span>
                      <span className="text-[10px] text-gray-500">{format(s.timestamp, 'HH:mm:ss.SSS')}</span>
                    </div>
                    <div className="truncate text-gray-300">{s.targetId}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Center Column: Orders & PnL */}
        <div className="col-span-1 lg:col-span-6 space-y-6">
          
          {/* PnL Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Realized PnL</div>
              <div className={`text-2xl font-bold ${pnl.realized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${pnl.realized.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Unrealized PnL</div>
              <div className={`text-2xl font-bold ${pnl.unrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${pnl.unrealized.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/5" />
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1 relative">Total Net</div>
              <div className={`text-2xl font-bold relative ${pnl.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${pnl.total.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Order Lifecycle Feed */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[660px] flex flex-col">
            <h2 className="text-xs uppercase tracking-widest text-purple-400 mb-4 font-semibold">Execution Timeline</h2>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {orderEvents.length === 0 ? (
                <div className="text-gray-500 text-sm text-center mt-10">System is armed and waiting...</div>
              ) : (
                orderEvents.map(e => (
                  <div key={e.eventId} className="flex items-center gap-4 text-sm border-l-2 border-gray-800 pl-4 py-1">
                    <span className="text-[10px] text-gray-500 w-20 shrink-0">{format(e.timestamp, 'HH:mm:ss.SSS')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider
                      ${e.status.includes('PASSED') ? 'bg-green-500/10 text-green-400' : 
                        e.status.includes('FAILED') ? 'bg-red-500/10 text-red-400' : 
                        e.status.includes('SUBMITTED') ? 'bg-blue-500/10 text-blue-400' : 
                        e.status.includes('FILLED') ? 'bg-purple-500/10 text-purple-400' : 
                        'bg-gray-800 text-gray-300'}`}
                    >
                      {e.status}
                    </span>
                    <span className="text-gray-400 truncate">{e.orderId || e.marketId}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Positions & Health */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[800px]">
             <h2 className="text-xs uppercase tracking-widest text-purple-400 mb-4 font-semibold">Active Strategies</h2>
             {/* Stubbed for Phase 2 UI expansion */}
             <div className="text-sm text-gray-500">
               Market mapping and open position tables will mount here.
             </div>
          </section>
        </div>

      </div>
    </div>
  );
}
