'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { 
  Wallet, Plus, Activity, ArrowUpRight, ArrowDownRight, 
  Loader2, CreditCard, Sparkles, CheckCircle
} from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to load wallet data');
  }
  return res.json();
};

export default function CustomerWalletPage() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR('/api/customer/wallet', fetcher);
  
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleTopUp = async (amountToTopUp: number) => {
    if (isNaN(amountToTopUp) || amountToTopUp <= 0) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/customer/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToTopUp })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to top up wallet');
      }

      triggerToast(`Successfully added ₹${amountToTopUp} to Volo Wallet! 💳`);
      setTopUpAmount('');
      mutate('/api/customer/wallet');
      mutate('/api/customer/dashboard'); // Mutate dashboard cache if needed
    } catch (err: any) {
      alert(err.message || 'Error processing top up');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-900">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-600 mt-3 font-bold select-none uppercase tracking-wider font-mono">Retrieving Volo Wallet balance...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-12 shadow-sm">
        <p className="text-xs text-red-500 font-bold font-mono">Failed to load wallet data.</p>
        <button
          onClick={() => mutate('/api/customer/wallet')}
          className="px-4 py-2 bg-[#124E66] hover:bg-[#2e5e73] text-white rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { balance, transactions = [] } = data;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 select-none relative">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-24 right-6 z-50 bg-white border border-slate-200 text-slate-900 px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-2.5 text-xs font-bold animate-fade-in-up">
          <CheckCircle className="h-4 w-4 text-[#5CBF2A]" />
          {successMessage}
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Wallet className="h-7 w-7 text-[#124E66] animate-pulse" />
            Volo Wallet
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-1">Manage your digital balance, refunds, and pay instantly for bookings.</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Balance & Topup */}
        <div className="lg:col-span-1 space-y-6">
          {/* Balance Card - Premium layout with orange glow overlay */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#D3D9D4]/40 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Available Balance</span>
              <Sparkles className="h-4.5 w-4.5 text-[#124E66] animate-pulse" />
            </div>

            <h2 className="text-3xl font-display font-black tracking-tight mt-4 select-text font-mono relative z-10">
              ₹{Number(balance).toFixed(2)}
            </h2>

            <div className="mt-10 flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono text-slate-700 relative z-10">
              <CreditCard className="h-4 w-4 text-[#124E66]" />
              100% Secured Vault Pay
            </div>
          </div>

          {/* Quick Topup Options */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Top Up Balance</span>
            
            <div className="grid grid-cols-3 gap-2.5 select-none">
              {[500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleTopUp(amt)}
                  disabled={isSubmitting}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 border border-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer font-mono text-slate-700 shadow-sm"
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            {/* Custom Amount Form */}
            <div className="space-y-2 pt-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Or Enter Custom Amount</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 text-slate-900 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none transition-all placeholder-slate-400 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleTopUp(Number(topUpAmount))}
                  disabled={isSubmitting || !topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0}
                  className="px-4 py-2 bg-[#124E66] hover:bg-[#2e5e73] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 font-mono shadow-sm"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                  Add Cash
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Transactions History */}
        <div className="lg:col-span-2 space-y-4">
          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider px-1 font-mono">Transaction Ledger</span>
          
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {transactions.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500 font-semibold font-mono">
                <Activity className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                No transactions recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((tx: any) => {
                  const isTopUp = tx.type === 'TOP_UP' || tx.type === 'REFUND';
                  return (
                    <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          isTopUp 
                            ? 'bg-emerald-50 border-emerald-200 text-[#059669]' 
                            : 'bg-[#D3D9D4]/20 border-[#124E66]/20 text-[#124E66]'
                        }`}>
                          {isTopUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-snug">{tx.description || tx.type}</p>
                          <span className="text-[9px] text-slate-500 block font-bold leading-none mt-1 font-mono">
                            {new Date(tx.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black font-mono ${
                          isTopUp ? 'text-[#059669]' : 'text-slate-900'
                        }`}>
                          {isTopUp ? '+' : '-'}₹{Number(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
