'use client';

import { useDashboardStore } from '@/store/useDashboardStore';
import { format } from 'date-fns';
import { useState } from 'react';

export default function Dashboard() {
  const { isConnected, isStale, mode, pnl, signals, orders, positions } = useDashboardStore();
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrder = (id: string) => {
    const newSet = new Set(expandedOrders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedOrders(newSet);
  };

  // Compute generic Strategy Health from the loaded orders/signals
  const totalSignals = signals.length;
  const totalOrders = orders.length;
  const fills = orders.filter(o => o.status === 'ORDER_FILLED' || o.status === 'ORDER_PARTIALLY_FILLED').length;
  const rejects = orders.filter(o => o.status === 'VALIDATION_FAILED' || o.status === 'ORDER_FAILED').length;
  
  const fillRate = totalOrders > 0 ? Math.round((fills / totalOrders) * 100) : 0;
  const rejectRate = totalOrders > 0 ? Math.round((rejects / totalOrders) * 100) : 0;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-[#030014]/80 backdrop-blur-md flex justify-between items-center mb-8 border-b border-gray-800 pb-4 pt-2">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-purple-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]">
            Σ
          </div>
          <h1 className="text-xl font-semibold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">
            ORACLE SNIPER
          </h1>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          {isStale && (
            <div className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 rounded text-xs font-semibold animate-pulse">
              STREAM STALE
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-gray-500 uppercase tracking-widest">Connection</span>
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm font-medium">{isConnected ? 'ONLINE' : 'RECONNECTING'}</span>
          </div>
          <div className={`px-3 py-1 rounded border text-sm font-semibold tracking-wide 
            ${mode === 'LIVE' ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-blue-500/10 border-blue-500/50 text-blue-400'}`}>
            {mode} MODE
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Signals */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[400px] lg:h-[800px] flex flex-col hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xs uppercase tracking-widest text-purple-400 font-semibold flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                Live Signals
              </h2>
              <span className="text-xs text-gray-500">{signals.length} total</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {signals.length === 0 ? (
                <div className="text-gray-500 text-sm flex flex-col items-center justify-center h-full gap-2 opacity-50">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
                  Awaiting oracles...
                </div>
              ) : (
                signals.map((s, i) => (
                  <div key={s.eventId} className={`bg-gray-800/40 border ${i === 0 ? 'border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' : 'border-gray-700/50'} rounded-lg p-3 text-sm transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-blue-400 px-2 py-0.5 bg-blue-500/10 rounded">{s.source}</span>
                      <span className="text-[10px] text-gray-500">{format(s.timestamp, 'HH:mm:ss.SSS')}</span>
                    </div>
                    <div className="text-gray-300 font-medium truncate text-xs">{s.targetId}</div>
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
            <StatCard label="Realized PnL" value={pnl.realized} />
            <StatCard label="Unrealized PnL" value={pnl.unrealized} />
            <StatCard label="Total Net" value={pnl.total} highlight />
          </div>

          {/* Order Lifecycle Feed */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[660px] flex flex-col hover:border-gray-700 transition-colors">
            <h2 className="text-xs uppercase tracking-widest text-purple-400 mb-4 font-semibold">Execution Timeline</h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {orders.length === 0 ? (
                <div className="text-gray-500 text-sm text-center mt-10 opacity-50">System armed and waiting...</div>
              ) : (
                orders.map(order => {
                  const isExpanded = expandedOrders.has(order.id);
                  const latestEvent = order.events[0];
                  
                  return (
                    <div key={order.id} className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/20">
                      {/* Order Header / Summary */}
                      <div 
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/30 transition-colors"
                        onClick={() => toggleOrder(order.id)}
                      >
                        <div className="flex items-center gap-4">
                          <StatusBadge status={order.status} />
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-200 font-medium truncate max-w-[200px] md:max-w-[300px]">
                              {order.marketId}
                            </span>
                            <span className="text-[10px] text-gray-500">{order.id.split('-')[0]}...</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {format(order.createdAt, 'HH:mm:ss')}
                        </div>
                      </div>

                      {/* Expanded Timeline View */}
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-800 bg-black/20 space-y-4">
                          <div className="pl-2 border-l border-gray-700 space-y-3 relative">
                            {order.events.map((e, idx) => (
                              <div key={e.eventId} className="relative pl-4 text-xs">
                                <div className="absolute left-[-5px] top-1.5 h-2 w-2 rounded-full bg-gray-600 ring-4 ring-gray-900" />
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-semibold text-gray-300">{e.status}</span>
                                  <span className="text-[10px] text-gray-500">{format(e.timestamp, 'HH:mm:ss.SSS')}</span>
                                </div>
                                {e.details && (
                                  <pre className="mt-1 bg-gray-950 p-2 rounded text-[10px] text-gray-400 overflow-x-auto border border-gray-800">
                                    {JSON.stringify(e.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Positions & Health */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          
          {/* Health Stats */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm hover:border-gray-700 transition-colors">
            <h2 className="text-xs uppercase tracking-widest text-purple-400 mb-4 font-semibold">Strategy Health</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/30 p-3 rounded border border-gray-800/50">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Signals</div>
                <div className="font-bold text-gray-200">{totalSignals}</div>
              </div>
              <div className="bg-gray-800/30 p-3 rounded border border-gray-800/50">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Orders Placed</div>
                <div className="font-bold text-gray-200">{totalOrders}</div>
              </div>
              <div className="bg-gray-800/30 p-3 rounded border border-gray-800/50">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Fill Rate</div>
                <div className="font-bold text-green-400">{fillRate}%</div>
              </div>
              <div className="bg-gray-800/30 p-3 rounded border border-gray-800/50">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Reject/Fail Rate</div>
                <div className="font-bold text-red-400">{rejectRate}%</div>
              </div>
            </div>
          </section>

          {/* Active Positions */}
          <section className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 backdrop-blur-sm h-[570px] flex flex-col hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xs uppercase tracking-widest text-purple-400 font-semibold">Active Positions</h2>
               <span className="text-xs text-gray-500">{positions.length} open</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
               {positions.length === 0 ? (
                 <div className="text-gray-500 text-sm text-center mt-10 opacity-50">No open positions</div>
               ) : (
                 positions.map(pos => (
                   <div key={pos.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 text-sm">
                     <div className="flex justify-between items-center mb-2">
                       <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${pos.side === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                         {pos.side}
                       </span>
                       <span className="text-[10px] text-gray-400 bg-gray-900 px-1 rounded">{pos.mode}</span>
                     </div>
                     <div className="text-gray-300 font-medium text-xs mb-3 truncate">{pos.marketId}</div>
                     
                     <div className="flex justify-between items-end border-t border-gray-800 pt-2 mt-2">
                       <div>
                         <div className="text-[10px] text-gray-500">Size / Avg</div>
                         <div className="font-mono text-xs text-gray-300">{pos.size} @ ${(pos.avgEntryPrice).toFixed(3)}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-[10px] text-gray-500">Unrealized</div>
                         <div className={`font-mono text-xs font-bold ${pos.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                           {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                         </div>
                       </div>
                     </div>
                   </div>
                 ))
               )}
            </div>
          </section>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------

function StatCard({ label, value, highlight = false }: { label: string, value: number, highlight?: boolean }) {
  const isPositive = value >= 0;
  return (
    <div className={`bg-gray-900/40 border ${highlight ? 'border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.05)]' : 'border-gray-800'} rounded-xl p-4 backdrop-blur-sm relative overflow-hidden transition-all duration-300 hover:border-gray-700`}>
      {highlight && <div className="absolute inset-0 bg-purple-500/5" />}
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 relative">{label}</div>
      <div className={`text-xl lg:text-2xl font-bold relative tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : '-'}${Math.abs(value).toFixed(2)}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = 'bg-gray-800 text-gray-300 border-gray-700';
  
  if (status.includes('PASSED')) color = 'bg-green-500/10 text-green-400 border-green-500/20';
  else if (status.includes('FAILED') || status.includes('EXPIRED')) color = 'bg-red-500/10 text-red-400 border-red-500/20';
  else if (status.includes('SUBMITTED')) color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  else if (status.includes('FILLED')) color = 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.2)]';
  else if (status.includes('CANCEL')) color = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';

  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold tracking-wider w-24 text-center ${color}`}>
      {status.split('_').pop() || status}
    </span>
  );
}
