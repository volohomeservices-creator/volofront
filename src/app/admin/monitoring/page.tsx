'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, Cpu, Clock, RefreshCw, AlertTriangle, 
  ShieldCheck, Database, Server, Flame, Sparkles
} from 'lucide-react';

interface EventLog {
  id: string;
  user_id: string | null;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  created_at: string;
}

interface Metrics {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  activeSessions: number;
  recentEvents: EventLog[];
  timestamp: string;
}

export default function MonitoringPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/monitoring');
      if (!res.ok) {
        throw new Error(`Metrics API returned status ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      console.error('[Monitoring UI] Error loading metrics:', e);
      setError(e.message || 'Failed to load system metrics.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000); // auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#124E66] font-display">System Monitor</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time health, server metrics, memory, and database security audit logs.</p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[#124E66] text-white hover:bg-[#124E66]/90 transition-all rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4.5 w-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing...' : 'Force Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>Error loading monitoring data: {error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-[#124E66] mb-3" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Collecting Node Metrics...</span>
        </div>
      ) : data ? (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Stat Card 1: Server Uptime */}
            <div className="bg-white border border-[#124E66]/10 p-6 rounded-3xl flex items-center gap-4 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-[#124E66]/5 flex items-center justify-center text-[#124E66]">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Server Uptime</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono block">
                  {formatUptime(data.uptime)}
                </span>
                <span className="text-[9px] text-slate-400 font-medium block">Uptime count reset on redeploy</span>
              </div>
            </div>

            {/* Stat Card 2: Memory Heap Usage */}
            <div className="bg-white border border-[#124E66]/10 p-6 rounded-3xl flex flex-col justify-between shadow-xs">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#124E66]/5 flex items-center justify-center text-[#124E66]">
                  <Cpu className="h-6 w-6" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Heap Memory (NodeJS)</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xl font-extrabold text-slate-900 font-mono">
                      {data.memory.heapUsed} MB
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      / {data.memory.heapTotal} MB
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-teal-600 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (data.memory.heapUsed / data.memory.heapTotal) * 100)}%` }}
                />
              </div>
            </div>

            {/* Stat Card 3: Active Sessions */}
            <div className="bg-white border border-[#124E66]/10 p-6 rounded-3xl flex items-center gap-4 shadow-xs">
              <div className="h-12 w-12 rounded-2xl bg-[#124E66]/5 flex items-center justify-center text-[#124E66]">
                <Database className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active JWT Sessions</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono block">
                  {data.activeSessions}
                </span>
                <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active sessions logged in DB
                </span>
              </div>
            </div>

          </div>

          {/* System Logs Table */}
          <div className="bg-white border border-[#124E66]/10 rounded-3xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Recent System Audit & Security Events</h3>
              <span className="text-[9px] text-slate-400 font-bold font-mono">Last Checked: {new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3 font-bold">Timestamp</th>
                    <th className="pb-3 font-bold">Event Type</th>
                    <th className="pb-3 font-bold">Severity</th>
                    <th className="pb-3 font-bold">Uptime (s)</th>
                    <th className="pb-3 font-bold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                        No security events logged yet
                      </td>
                    </tr>
                  ) : (
                    data.recentEvents.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 font-mono text-slate-500 text-[10px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 font-bold text-slate-800">
                          {log.event_type}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-1 text-[9px] font-bold rounded-full border ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-slate-500 text-[10px]">
                          {log.details?.uptime ? Math.round(log.details.uptime) : 'N/A'}
                        </td>
                        <td className="py-3.5 max-w-xs truncate font-mono text-[10px] text-slate-500" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
