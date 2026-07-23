'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { 
  History, Calendar, Search, Filter, ChevronLeft, ChevronRight, 
  Loader2, AlertCircle, IndianRupee, CheckCircle2, XCircle, X
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function WorkerJobHistoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '10',
    search,
    status,
    date_from: dateFrom,
    date_to: dateTo
  });

  const { data, error, isLoading } = useSWR(`/api/worker/job-history?${queryParams.toString()}`, fetcher);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = search || status || dateFrom || dateTo;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <History className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Job History Archive
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            View and search through your completed and cancelled service dispatch records.
          </p>
        </div>
      </div>

      {/* 2. FILTER PANEL */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4 animate-fade-in-up">
        
        {/* Search Input */}
        <div className="relative group">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-[#124E66] transition-colors" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by service name..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-800 placeholder-slate-400 font-semibold outline-none transition-all focus:ring-4 focus:ring-[#124E66]/5"
          />
        </div>

        {/* Status and Date Range Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest flex items-center gap-1 pl-1 font-mono">
              <Filter className="h-3 w-3 text-[#124E66]" />
              Status Filter
            </label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-bold outline-none transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest flex items-center gap-1 pl-1 font-mono">
              <Calendar className="h-3 w-3 text-[#124E66]" />
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-mono outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-slate-450 tracking-widest flex items-center gap-1 pl-1 font-mono">
              <Calendar className="h-3 w-3 text-[#124E66]" />
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-800 font-mono outline-none transition-all"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#124E66] hover:text-[#206783] transition-colors cursor-pointer font-mono"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* 3. HISTORY CONTENT GRID */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-500">
          <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider animate-pulse font-mono">Loading archived dispatches...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-150 p-6 rounded-3xl text-center text-xs text-red-600 font-bold">
          Failed to load job history logs.
        </div>
      ) : !data?.history || data.history.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-[24px] p-14 text-center select-none space-y-3">
          <History className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="font-black text-slate-700 text-sm">No History Records Found</h4>
          <p className="text-xs text-slate-450 max-w-xs mx-auto leading-relaxed font-semibold">
            No completed or cancelled bookings were found matching your search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            {data.history.map((item: any) => (
              <div 
                key={item.id} 
                className={`bg-white border border-slate-200/80 hover:border-[#124E66]/30 rounded-[24px] px-5 py-4.5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border-l-[6px] ${
                  item.status === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-red-500'
                }`}
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-800 text-sm leading-tight truncate">{item.service_name}</h3>
                    {item.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-150 font-mono">
                        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-150 font-mono">
                        <XCircle className="h-2.5 w-2.5 shrink-0" />Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold truncate">{item.customer_area}</p>
                  <span className="text-[9px] text-slate-400 font-mono font-bold block">
                    {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[8px] uppercase font-black text-slate-450 block select-none font-mono">Net Earnings</span>
                  <div className="flex items-center justify-end gap-0.5 text-sm font-black text-[#124E66] mt-1 font-mono">
                    <span>₹{item.earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          {data.totalPages > 1 && (
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-[20px] px-5 py-3 text-xs select-none shadow-sm animate-fade-in-up font-mono">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-[#124E66]" />
                Prev
              </button>
              
              <span className="text-slate-450 font-bold">
                Page <span className="text-slate-850 font-extrabold">{page}</span> of <span className="text-slate-850 font-extrabold">{data.totalPages}</span>
              </span>

              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4 text-[#124E66]" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
