'use client';

import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';
import Pagination from '@/components/admin/shared/Pagination';
import LoadingSkeleton from '@/components/admin/shared/LoadingSkeleton';
import { Star, EyeOff, Eye, Loader2, X, FileText, Users } from 'lucide-react';
import SearchInput from '@/components/admin/shared/SearchInput';

interface WorkerRatingRow {
  id: string;
  full_name: string;
  phone: string;
  rating: number;
  total_jobs: number;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string;
  is_hidden: boolean;
  created_at: string;
  customer_name: string;
  service_name: string;
}

export default function ReviewsPage() {
  const [workers, setWorkers] = useState<WorkerRatingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Drawer states
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeWorker, setActiveWorker] = useState<WorkerRatingRow | null>(null);
  const [workerReviews, setWorkerReviews] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const url = `/api/admin/workers?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setWorkers(data.workers || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load workers for reviews', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWorkers();
  }, [page, search]);

  const handleOpenDrawer = async (worker: WorkerRatingRow) => {
    setActiveWorker(worker);
    setShowDrawer(true);
    setReviewsLoading(true);
    try {
      // Fetch reviews specifically for this worker
      const res = await fetch(`/api/admin/reviews?worker_id=${worker.id}&limit=50`);
      const data = await res.json();
      setWorkerReviews(data.reviews || []);
    } catch (e) {
      console.error('Failed to fetch worker reviews:', e);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleToggleHide = async (id: string, currentlyHidden: boolean) => {
    if (!confirm(`Are you sure you want to ${currentlyHidden ? 'unhide' : 'hide'} this review?`)) return;
    
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: currentlyHidden ? 'UNHIDE' : 'HIDE' })
      });
      if (res.ok) {
        // Update local state to reflect change without refetching everything
        setWorkerReviews(prev => prev.map(r => r.id === id ? { ...r, is_hidden: !currentlyHidden } : r));
      } else {
        alert('Failed to update review visibility.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating review.');
    } finally {
      setActionLoading(null);
    }
  };

  const columns: Column<WorkerRatingRow>[] = [
    {
      key: 'avatar',
      header: 'Avatar',
      render: (row) => (
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#FF8A00]/20 to-[#FF9F2E]/20 text-[#FF8A00] flex items-center justify-center font-bold font-mono">
          {row.full_name?.charAt(0) || '?'}
        </div>
      )
    },
    {
      key: 'full_name',
      header: 'Worker Name',
      render: (row) => <span className="font-bold">{row.full_name || 'Unknown'}</span>
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span className="text-slate-400">{row.phone}</span>
    },
    {
      key: 'rating',
      header: 'Average Rating',
      render: (row) => (
        <span className={`font-bold flex items-center gap-1 ${row.rating < 3 ? 'text-red-400' : 'text-amber-400'}`}>
          <Star className={`h-4 w-4 ${row.rating < 3 ? 'fill-red-400' : 'fill-amber-400'}`} />
          {Number(row.rating).toFixed(2)}
        </span>
      )
    },
    {
      key: 'total_jobs',
      header: 'Total Jobs',
      render: (row) => <span className="text-slate-300 font-mono">{row.total_jobs} Completed</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenDrawer(row)}
          className="text-xs font-black uppercase text-[#FF8A00] hover:text-[#FF9F2E] font-mono cursor-pointer flex items-center gap-1"
        >
          <FileText className="h-3.5 w-3.5" /> View Reviews
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-200 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/50 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-400" />
            Reviews & Reputation
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Monitor and moderate worker feedback across the platform.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-4 bg-[#111827] border border-[#1F2937] p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 w-full lg:max-w-md">
          <SearchInput
            placeholder="Search workers by name or phone..."
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={10} cols={6} />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={workers}
            onRowClick={handleOpenDrawer}
            emptyMessage="No workers found."
          />
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / limit)}
            totalResults={total}
            limit={limit}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Reviews Drawer */}
      {showDrawer && activeWorker && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          <div 
            onClick={() => setShowDrawer(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300" 
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-[#111827] border-l border-[#1F2937] shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
              
              {/* Header */}
              <div className="p-6 border-b border-[#1F2937] flex items-center justify-between bg-[#0A0F1E]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#FF8A00]/20 to-[#FF9F2E]/20 text-[#FF8A00] flex items-center justify-center font-bold text-lg font-mono">
                    {activeWorker.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase font-mono">{activeWorker.full_name}'s Reviews</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Average Rating: {Number(activeWorker.rating).toFixed(2)} ★
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 hover:bg-[#172033] rounded-xl text-slate-500 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[#070B14]">
                {reviewsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-8 w-8 text-[#FF8A00] animate-spin" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">Loading Reviews...</span>
                  </div>
                ) : workerReviews.length > 0 ? (
                  workerReviews.map((review) => (
                    <div key={review.id} className={`p-4 rounded-2xl border transition-all ${review.is_hidden ? 'bg-[#0A0F1E] border-red-500/20 opacity-60' : 'bg-[#111827] border-[#1F2937]'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-white">{review.customer_name || 'Anonymous Customer'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{new Date(review.created_at).toLocaleDateString()} • {review.service_name || 'Service'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`font-black flex items-center gap-1 text-sm ${review.rating < 3 ? 'text-red-400' : 'text-amber-400'}`}>
                            {review.rating}.0 <Star className={`h-3.5 w-3.5 ${review.rating < 3 ? 'fill-red-400' : 'fill-amber-400'}`} />
                          </span>
                          
                          <button
                            type="button"
                            disabled={actionLoading === review.id}
                            onClick={() => handleToggleHide(review.id, review.is_hidden)}
                            className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all cursor-pointer flex items-center gap-1 ${
                              review.is_hidden 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            }`}
                          >
                            {actionLoading === review.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (review.is_hidden ? <><Eye className="h-3 w-3"/> Restore</> : <><EyeOff className="h-3 w-3"/> Hide</>)}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className={`text-sm leading-relaxed ${review.is_hidden ? 'text-slate-500 italic line-through' : 'text-slate-300'}`}>
                          {review.comment ? `"${review.comment}"` : <span className="italic text-slate-500">No comment provided.</span>}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">No reviews left for this worker yet.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
