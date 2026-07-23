'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Loader2, Navigation, Phone, MapPin } from 'lucide-react';
import GoogleMap from '@/components/GoogleMap'; // Assuming this component is robust enough for points

interface SOSAlert {
  id: string;
  user_id: string;
  booking_id: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
  user: {
    full_name: string;
    phone: string;
    role: string;
  };
}

export default function SOSDashboardPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  async function fetchAlerts() {
    try {
      const res = await fetch('/api/admin/sos/active');
      const data = await res.json();
      setAlerts(data.active_alerts || []);
    } catch (err) {
      console.error('Failed to load SOS alerts', err);
    } finally {
      setLoading(false);
    }
  }

  // Poll every 10 seconds for new alerts
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: string) => {
    if (!confirm('Are you sure you want to mark this emergency as RESOLVED? Ensure the user is safe.')) return;
    
    setResolving(id);
    try {
      const res = await fetch('/api/admin/sos/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        await fetchAlerts();
      } else {
        alert('Failed to resolve SOS.');
      }
    } catch (err) {
      console.error(err);
      alert('Error resolving SOS.');
    } finally {
      setResolving(null);
    }
  };

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-red-500/20 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <ShieldAlert className="h-7 w-7 text-red-500 animate-pulse" />
            Emergency SOS Center
          </h1>
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider">
            Critical safety alerts triggered by active workers or customers.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold font-mono">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-ping"></div>
          {alerts.length} Active Alerts
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest font-mono">Scanning for alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-12 shadow-xl flex flex-col items-center text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
          <h3 className="text-xl font-black uppercase text-white mb-2">No Active Emergencies</h3>
          <p className="text-slate-400 text-sm max-w-sm">
            There are currently no active SOS alerts on the platform. Monitoring will continue in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {alerts.map((alert) => (
            <div key={alert.id} className="bg-red-950/20 border-2 border-red-500/30 rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.15)] overflow-hidden flex flex-col lg:flex-row animate-in slide-in-from-bottom-4 duration-300">
              
              {/* Alert Details */}
              <div className="p-6 lg:w-1/3 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-red-500/20">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest font-mono">
                    <AlertTriangle className="h-3.5 w-3.5" /> CRITICAL ALERT
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-white">{alert.user?.full_name || 'Unknown User'}</h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                      Role: <span className={alert.user?.role === 'worker' ? 'text-[#FF8A00]' : 'text-blue-400'}>{alert.user?.role}</span>
                    </span>
                  </div>

                  <div className="bg-[#0A0F1E] border border-[#1F2937] rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Phone</span>
                      <a href={`tel:${alert.user?.phone}`} className="text-white font-black flex items-center gap-1 hover:text-red-400 transition-colors">
                        <Phone className="h-3 w-3" /> {alert.user?.phone || 'N/A'}
                      </a>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Booking ID</span>
                      <span className="text-white font-black font-mono truncate max-w-[120px]">{alert.booking_id || 'None'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Time</span>
                      <span className="text-red-400 font-black">{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => handleResolve(alert.id)}
                    disabled={resolving === alert.id}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50"
                  >
                    {resolving === alert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Map Preview */}
              <div className="lg:w-2/3 h-64 lg:h-auto bg-[#0A0F1E] relative">
                {alert.lat && alert.lng ? (
                  <GoogleMap
                    customerLat={alert.lat}
                    customerLng={alert.lng}
                    workerLat={alert.lat}
                    workerLng={alert.lng}
                    workerName="Emergency Location"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <MapPin className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-widest font-mono">No GPS Data Available</span>
                  </div>
                )}
                
                {alert.lat && alert.lng && (
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2 text-[10px] text-white font-mono flex items-center gap-2 shadow-xl">
                    <Navigation className="h-3 w-3 text-red-500" />
                    {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                  </div>
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
