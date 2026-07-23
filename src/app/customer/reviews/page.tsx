'use client';

import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  Star, MessageSquare, Loader2, AlertCircle, 
  CheckCircle2, Plus, Calendar, X, Save, ShieldCheck
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ReviewItem {
  id: string;
  booking_id: string;
  rating: number;
  comment: string;
  created_at: string;
  bookings: {
    service_items: {
      name: string;
    };
  };
  workers: {
    users: {
      full_name: string;
    };
  };
}

export default function CustomerReviewsPage() {
  const { data: revData, error: revErr, isLoading: revLoading } = useSWR('/api/customer/reviews', fetcher);
  const { data: histData, isLoading: histLoading } = useSWR('/api/customer/booking-history', fetcher);

  const [showModal, setShowModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleOpenReview = (bookingId: string, serviceName: string) => {
    setSelectedBookingId(bookingId);
    setSelectedServiceName(serviceName);
    setRating(5);
    setComment('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedBookingId || rating < 1 || rating > 5) {
      setErrorMsg('Invalid review data.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBookingId,
          rating,
          comment
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit review.');
      }

      setSuccessMsg('Thank you! Your feedback has been recorded.');
      mutate('/api/customer/reviews');
      mutate('/api/customer/booking-history');
      setTimeout(() => setShowModal(false), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const loading = revLoading || histLoading;

  const reviewedBookingIds = revData?.reviews?.map((r: ReviewItem) => r.booking_id) || [];
  const pendingReviews = histData?.bookings?.filter((b: any) => 
    b.status === 'COMPLETED' && !reviewedBookingIds.includes(b.id)
  ) || [];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <Star className="h-5.5 w-5.5 text-[#D3D9D4] fill-[#D3D9D4]" />
            Ratings & Reviews
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Grade technician performances and share your home service experience to help keep the community standard high.
          </p>
        </div>
      </div>

      {/* 2. DUAL-COLUMN LAYOUT */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="h-8 w-8 text-[#124E66] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider font-mono">Loading reviews ledger...</p>
        </div>
      ) : revErr ? (
        <div className="bg-red-50/50 border border-red-200 p-6 rounded-[24px] text-center text-xs text-red-500 font-semibold font-mono">
          Failed to load review details.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
          
          {/* LEFT COLUMN: AWAITING FEEDBACK CONTAINER */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-[10px] uppercase font-black text-slate-450 tracking-widest font-mono px-1">Awaiting Feedback</h3>
            
            {pendingReviews.length > 0 ? (
              <div className="space-y-4">
                {pendingReviews.map((b: any) => (
                  <div 
                    key={b.id}
                    className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm flex items-center justify-between gap-4 hover:border-slate-300 hover:shadow-md transition-all duration-300"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className="font-display font-bold text-sm text-slate-900 truncate">{b.service_items?.name || 'Service Call'}</h4>
                      <span className="text-[10px] text-slate-450 block font-bold font-mono">
                        Completed: {new Date(b.completed_at || b.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReview(b.id, b.service_items?.name || 'Service Call')}
                      className="px-4 py-2 bg-[#124E66] hover:bg-[#206783] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      Rate Job
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-[24px] p-8 text-center space-y-3.5 shadow-sm">
                <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-[#124E66]">
                  <ShieldCheck className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display font-black text-slate-900 text-xs">All Caught Up!</h4>
                  <p className="text-[10px] text-slate-500 font-semibold max-w-xs mx-auto leading-relaxed">No pending reviews. Thank you for rating all your completed tasks!</p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: MY SUBMITTED REVIEWS FEED */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-[10px] uppercase font-black text-slate-450 tracking-widest font-mono px-1">My Submitted Reviews</h3>

            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
              {revData?.reviews?.length > 0 ? (
                <div className="space-y-5 divide-y divide-slate-100">
                  {revData.reviews.map((r: ReviewItem, idx: number) => (
                    <div key={r.id} className={`space-y-3 ${idx > 0 ? 'pt-5' : ''}`}>
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-0.5">
                          <h4 className="font-display font-bold text-sm text-slate-900">{r.bookings?.service_items?.name || 'Service Call'}</h4>
                          <span className="text-[10px] text-slate-450 font-bold font-mono block">
                            Specialist: {r.workers?.users?.full_name || 'Volo Specialist'}
                          </span>
                        </div>
                        
                        {/* Rating stars */}
                        <div className="flex items-center gap-0.5 shrink-0 select-none bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                            />
                          ))}
                        </div>
                      </div>

                      {r.comment && (
                        <p className="text-[10px] text-slate-650 font-semibold italic bg-slate-50 p-3 rounded-xl border border-slate-200/50 leading-relaxed select-all">
                          "{r.comment}"
                        </p>
                      )}

                      <span className="text-[9px] text-slate-400 font-bold font-mono block select-none">
                        Submitted: {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-450 italic font-semibold text-xs select-none">
                  You haven't submitted any feedback logs yet.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Review Submission Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 rounded-[24px] max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fade-in-up">
            
            <div className="flex justify-between items-center select-none border-b border-slate-100 pb-2">
              <h3 className="font-display font-black text-slate-900 text-sm">Write Review</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Rate your service request for <span className="font-bold text-slate-800">{selectedServiceName}</span>:
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              
              {/* Clickable Rating Stars */}
              <div className="flex justify-center gap-2 py-1 select-none">
                {Array.from({ length: 5 }).map((_, i) => {
                  const starVal = i + 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star 
                        className={`h-8 w-8 ${
                          starVal <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>

              {/* Comment field */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Comment Description (Max 500 chars)</label>
                <textarea
                  rows={4}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all resize-none leading-relaxed"
                  placeholder="Share details of the technician's speed, behavior..."
                />
              </div>

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-650 text-[10px] font-bold text-center rounded-xl flex items-center justify-center gap-1.5 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-emerald-650 text-[10px] font-bold text-center rounded-xl flex items-center justify-center gap-1.5 font-mono">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#124E66] hover:bg-[#206783] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Submit Review
                  </>
                )}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
