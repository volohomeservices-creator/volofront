'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Search, Sparkles, Clock, AlertCircle, Loader2, 
  ArrowRight, ShieldCheck, HelpCircle, LayoutGrid
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerServicesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch categories and service items
  const url = `/api/customer/services?` + 
    (selectedCategory ? `categoryId=${selectedCategory}&` : '') + 
    (searchQuery ? `search=${encodeURIComponent(searchQuery)}` : '');

  const { data, error, isLoading } = useSWR(url, fetcher);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      
      {/* 1. HERO BANNER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 sm:p-8 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-24 -bottom-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-[#D3D9D4]" />
            100% Vetted Expert Technicians
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight leading-none text-white">
            Professional Home Services
          </h1>
          <p className="text-[13px] text-[#D3D9D4] font-medium leading-relaxed">
            Book top-rated experts for electrical switches, plumbing repairs, wiring setups, and household upgrades with dynamic GPS status tracking.
          </p>
        </div>
      </div>

      {/* 2. MAIN LAYOUT GRID */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: Categories Sidebar (Desktop) & Top Scroller (Mobile) */}
        <aside className="w-full lg:w-64 shrink-0 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono px-1 block">Categories</span>
            
            {/* Desktop list view */}
            <div className="hidden lg:flex flex-col gap-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                  selectedCategory === null
                    ? 'bg-[#124E66] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                All Services
              </button>
              {data?.categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                    selectedCategory === cat.id
                      ? 'bg-[#124E66] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {cat.icon_url ? (
                    <img src={cat.icon_url} alt="" className="h-4 w-4 rounded object-cover shrink-0" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Mobile horizontal scroller view */}
            <div className="flex lg:hidden gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                  selectedCategory === null
                    ? 'bg-[#124E66] border-[#124E66] text-white shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                All Services
              </button>
              {data?.categories?.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#124E66] border-[#124E66] text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {cat.icon_url && (
                    <img src={cat.icon_url} alt="" className="h-3.5 w-3.5 rounded-sm object-cover" />
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Search & Catalog Grid */}
        <div className="flex-grow w-full space-y-6">
          
          {/* Search bar */}
          <div className="bg-white border border-slate-200/80 rounded-[24px] p-4 shadow-sm">
            <div className="relative group">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-[#124E66] transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search home repairs, cleaning, plumbing..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all focus:ring-4 focus:ring-teal-500/10 shadow-inner"
              />
            </div>
          </div>

          {/* Catalog Listing */}
          {isLoading ? (
            <div className="py-24 text-center">
              <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider font-mono">Loading dynamic catalog...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50/50 border border-red-200 p-6 rounded-[24px] text-center text-xs text-red-500 font-semibold font-mono">
              Failed to load service items. Please try refreshing.
            </div>
          ) : !data.items || data.items.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center space-y-4 shadow-sm">
              <div className="h-12 w-12 rounded-2xl bg-[#D3D9D4]/20 border border-[#124E66]/10 flex items-center justify-center mx-auto text-[#124E66]">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <h4 className="font-display font-black text-slate-900 text-sm">No services matched your filters</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">Try updating your search text or selecting another category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
              {data.items.map((item: any) => {
                const slug = item.name
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, '');

                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/customer/services/${slug}`)}
                    className="bg-white border border-slate-200/80 rounded-[24px] p-5 flex gap-4 items-start justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all duration-300 group shadow-sm"
                  >
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                          {item.service_categories?.name || 'Service'}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-sm text-slate-900 leading-snug group-hover:text-[#124E66] transition-colors truncate">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-medium">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 pt-1 font-semibold select-none font-mono text-[10px]">
                        <span className="text-xs font-black text-[#124E66]">
                          {formatCurrency(item.base_price)}
                        </span>
                        <span className="text-slate-450 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-[#124E66]" />
                          {item.estimated_mins} mins
                        </span>
                      </div>
                    </div>

                    {/* Image Thumbnail & Action Arrow */}
                    <div className="flex flex-col items-center justify-between h-full gap-4 shrink-0">
                      {item.service_categories?.icon_url ? (
                        <img 
                          src={item.service_categories.icon_url} 
                          alt="" 
                          className="h-16 w-16 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0" 
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                          <Sparkles className="h-6 w-6" />
                        </div>
                      )}
                      
                      <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 group-hover:bg-[#124E66] group-hover:border-[#124E66] flex items-center justify-center transition-all shadow-sm">
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
