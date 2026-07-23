'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  History, Loader2, AlertCircle, Clock, 
  CheckCircle2, XCircle, ChevronRight, Calendar, Sparkles
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerBookingHistoryPage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/customer/booking-history', fetcher);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const bookings = data?.bookings || [];
  const filteredBookings = bookings.filter((b: any) => {
    if (statusFilter === 'ALL') return true;
    return b.status === statusFilter;
  });

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <History className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Booking History
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            View details of all your completed home repairs, installations, and cancelled service calls.
          </p>
        </div>
      </div>

      {/* 2. FILTER TABS */}
      <div className="flex gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl select-none max-w-md">
        {(['ALL', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              statusFilter === tab
                ? 'bg-[#124E66] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 3. MAIN HISTORY FEED */}
      {isLoading ? (
        <div className="py-24 text-center">
          <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider font-mono">Fetching past records...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50/50 border border-red-200 p-6 rounded-[24px] text-center text-xs text-red-500 font-semibold font-mono">
          Failed to load booking history records.
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center select-none space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-450">
            <History className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-display font-black text-slate-900 text-xs">No Records Found</h4>
            <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
              You do not have any {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} service requests registered.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
          {filteredBookings.map((booking: any) => (
            <div
              key={booking.id}
              onClick={() => router.push(`/customer/bookings/${booking.id}`)}
              className={`bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm space-y-4 cursor-pointer hover:border-slate-350 hover:shadow-md transition-all duration-300 group border-l-[4px] flex flex-col justify-between ${
                booking.status === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-red-500'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded font-mono border ${
                      booking.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {booking.status}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold font-mono">
                      #{booking.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-sm text-slate-900 leading-snug group-hover:text-[#124E66] transition-colors truncate">
                    {booking.service_items?.name || 'Service Call'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-semibold line-clamp-1">{booking.address_line}</p>
                </div>
                
                <span className="text-xs font-black text-[#124E66] shrink-0 font-mono">
                  {formatCurrency(Number(booking.total_amount))}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[10px] text-slate-450 font-semibold select-none mt-auto">
                <span className="flex items-center gap-1.5 font-mono">
                  {booking.status === 'COMPLETED' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                  {booking.status === 'COMPLETED' ? 'Completed: ' : 'Cancelled: '}
                  {booking.completed_at 
                    ? new Date(booking.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : new Date(booking.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>

                <span className="flex items-center gap-0.5 text-[#124E66] group-hover:translate-x-0.5 transition-all text-[10px] font-black uppercase tracking-wider font-mono">
                  Details
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
