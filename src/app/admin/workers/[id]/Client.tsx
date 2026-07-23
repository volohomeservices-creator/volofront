'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HardHat, Phone, Star, Award, ShieldAlert, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WorkerDetailClient() {
  const { id } = useParams();
  const router = useRouter();
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWorkerDetails() {
      try {
        const res = await fetch(`/api/admin/workers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setWorker(data.worker || data);
        }
      } catch (err) {
        console.error('Failed to fetch worker details:', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchWorkerDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#124E66]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Workers
      </button>

      {worker ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#124E66]/10 text-[#124E66] flex items-center justify-center font-bold text-2xl">
                {worker.full_name?.charAt(0) || 'W'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{worker.full_name || 'Worker'}</h1>
                <p className="text-sm text-slate-500 font-mono">{worker.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                {worker.status || 'ACTIVE'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                KYC: {worker.kyc_status || 'APPROVED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Rating</span>
              <p className="text-xl font-bold text-slate-900 flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {worker.rating || 5.0}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Total Jobs</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{worker.total_jobs || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Wallet Balance</span>
              <p className="text-xl font-bold text-slate-900 mt-1">₹{worker.commission_wallet_balance || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Location Tracking</span>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                <Link href={`/admin/workers/${id}/location-history`} className="text-[#124E66] hover:underline">
                  View Location History
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 font-medium">Worker profile not found.</p>
        </div>
      )}
    </div>
  );
}
