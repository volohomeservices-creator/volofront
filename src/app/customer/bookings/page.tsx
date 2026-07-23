'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Briefcase, Loader2, AlertCircle, Sparkles, 
  ArrowRight, Clock, Plus, ChevronRight 
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerBookingsPage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/customer/bookings', fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-[#D3D9D4]/20 text-[#124E66] border border-[#124E66]/20 tracking-wider">Pending Assignment</span>;
      case 'WORKER_ASSIGNED':
      case 'WORKER_ACCEPTED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-blue-50 text-blue-600 border border-blue-200 tracking-wider">Technician Assigned</span>;
      case 'ON_THE_WAY':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] tracking-wider">En Route</span>;
      case 'ARRIVED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 tracking-wider">Arrived</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-teal-50 text-teal-600 border border-teal-200 tracking-wider">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-slate-50 text-slate-600 border border-slate-200 tracking-wider">{status.replace(/_/g, ' ')}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      {/* Title Header */}
      <div className="bg-[#FFFAF5] border border-orange-100 rounded-[20px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-[22px] font-display font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="p-2 bg-[#D3D9D4]/40/50 rounded-xl">
                <Briefcase className="h-5 w-5 text-[#124E66]" />
              </span>
              Active Bookings
            </h2>
            <p className="text-[13px] text-slate-600 font-medium">Track ongoing, arrived, and scheduled home repairs in real-time.</p>
          </div>
          
          <button
            onClick={() => router.push('/customer/services')}
            className="inline-flex items-center justify-center gap-2 bg-[#124E66] hover:bg-[#2e5e73] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all tracking-wider shadow-sm"
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
            Book Service
          </button>
        </div>
      </div>

      {/* Bookings List view */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-405">
          <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold uppercase tracking-wider font-mono">Loading active journeys...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center text-xs text-red-400 font-bold font-mono">
          Failed to load active bookings.
        </div>
      ) : !data.bookings || data.bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[24px] p-10 text-center select-none space-y-4 hover-scale duration-300 shadow-sm">
          <Briefcase className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="font-display font-black text-slate-900 text-sm">No Active Journeys</h4>
          <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">You do not have any active or scheduled bookings running at the moment.</p>
          <div className="pt-2">
            <button
              onClick={() => router.push('/customer/services')}
              className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono"
            >
              Explore Services
              <ArrowRight className="h-4 w-4 text-[#124E66]" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
          {data.bookings.map((booking: any) => (
            <div
              key={booking.id}
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
              className="bg-white border border-slate-200 hover:border-[#124E66]/30 rounded-[20px] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] cursor-pointer transition-all flex flex-col justify-between gap-5 group"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-slate-100 text-slate-700 tracking-wider">
                    {booking.booking_type}
                  </span>
                  <h3 className="font-display font-black text-[15px] text-slate-900 truncate leading-snug mt-1 group-hover:text-[#124E66] transition-colors">
                    {booking.service_items?.name || 'Service Call'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed truncate">{booking.address_line}</p>
                </div>
                
                <div className="shrink-0">
                  {getStatusBadge(booking.status)}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-[11px] font-bold select-none">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-[#124E66]" />
                  {booking.scheduled_at 
                    ? new Date(booking.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Instant (Asap)'}
                </span>

                <span className="flex items-center gap-0.5 text-slate-900 group-hover:text-[#124E66] group-hover:translate-x-1 transition-all duration-200">
                  Track
                  <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
