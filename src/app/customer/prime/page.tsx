'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useRouter } from 'next/navigation';
import { Check, Star, Shield, Clock, Loader2, ArrowRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PrimeSubscriptionPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR('/api/auth/me', fetcher);

  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!confirm('Subscribe to Volo Prime? (This is a demo, no real charge will be applied)')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customer/prime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SUBSCRIBE' })
      });
      if (res.ok) {
        mutate('/api/auth/me');
        mutate('/api/customer/dashboard');
        alert('Welcome to Volo Prime!');
        router.push('/customer/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Are you sure you want to cancel your Volo Prime membership? You will lose all exclusive benefits.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customer/prime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNSUBSCRIBE' })
      });
      if (res.ok) {
        mutate('/api/auth/me');
        mutate('/api/customer/dashboard');
        alert('Volo Prime membership cancelled.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
      </div>
    );
  }

  const isPrime = data?.user?.is_prime;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-orange-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#124E66]/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 bg-gradient-to-tr from-[#124E66] to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Star className="h-8 w-8 text-white fill-white" />
          </div>
          <h1 className="text-3xl font-display font-black text-white">Volo <span className="text-[#124E66]">Prime</span></h1>
          <p className="text-slate-300 max-w-md text-sm font-semibold leading-relaxed">
            Unlock premium home services. Get priority dispatch, zero cancellation fees, and exclusive member discounts on every booking.
          </p>

          {isPrime ? (
            <div className="mt-4 inline-flex flex-col items-center space-y-3">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                Active Member
              </span>
              <button onClick={handleUnsubscribe} disabled={loading} className="text-xs text-slate-500 hover:text-slate-300 hover:underline cursor-pointer">
                Cancel Membership
              </button>
            </div>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="mt-4 px-8 py-3.5 bg-gradient-to-r from-[#124E66] to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all shadow-xl shadow-orange-500/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Prime for ₹299/mo'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] border border-white/[0.08] p-6 rounded-3xl space-y-3">
          <div className="h-10 w-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Priority Dispatch</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Jump the manual assignment queue. Prime bookings are instantly routed to the nearest top-rated professionals.</p>
        </div>

        <div className="bg-[#0F172A] border border-white/[0.08] p-6 rounded-3xl space-y-3">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Zero Cancellation Fees</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Plans change. Cancel any booking up to 5 minutes before arrival without any penalty charges applied to your wallet.</p>
        </div>

        <div className="bg-[#0F172A] border border-white/[0.08] p-6 rounded-3xl space-y-3">
          <div className="h-10 w-10 bg-pink-500/10 text-pink-400 rounded-xl flex items-center justify-center border border-pink-500/20">
            <Star className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-white text-sm">Exclusive Discounts</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Enjoy an automatic 10% discount on all service labor charges, applied seamlessly at checkout.</p>
        </div>
      </div>

    </div>
  );
}
