'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Award, Coins, ArrowRight, Loader2, History, ChevronRight } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function RewardsPage() {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR('/api/customer/rewards', fetcher);
  const [converting, setConverting] = useState(false);
  
  // Slider state
  const [sliderValue, setSliderValue] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
      </div>
    );
  }

  const coins = data?.coins || 0;
  const history = data?.history || [];
  
  // Tier calculation based on lifetime coins (simplified to current coins for demo)
  let tier = 'Bronze';
  let tierColor = 'text-[#748D92]';
  let nextTier = 1000;
  
  if (coins >= 5000) {
    tier = 'Platinum';
    tierColor = 'text-slate-300';
    nextTier = 10000;
  } else if (coins >= 1000) {
    tier = 'Gold';
    tierColor = 'text-yellow-400';
    nextTier = 5000;
  } else if (coins >= 500) {
    tier = 'Silver';
    tierColor = 'text-slate-400';
    nextTier = 1000;
  }
  
  const progressPercent = Math.min(100, (coins / nextTier) * 100);

  const handleConvert = async () => {
    if (sliderValue === 0) return;
    if (!confirm(`Convert ${sliderValue} coins to ₹${sliderValue / 10}?`)) return;
    
    setConverting(true);
    try {
      const res = await fetch('/api/customer/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountToConvert: sliderValue })
      });
      if (res.ok) {
        alert('Converted successfully!');
        setSliderValue(0);
        mutate('/api/customer/rewards');
        mutate('/api/customer/wallet');
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to convert');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-500" />
            Volo Rewards
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Earn coins for every completed service.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tier & Balance Card */}
        <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full" />
          
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono tracking-widest">Available Balance</p>
                <h2 className="text-4xl font-display font-black text-white mt-1 flex items-center gap-2">
                  <Coins className="h-8 w-8 text-yellow-500" />
                  {coins}
                </h2>
              </div>
              <div className={`px-3 py-1 rounded-xl bg-white/5 border border-white/10 ${tierColor} font-black uppercase text-xs tracking-widest font-mono`}>
                {tier} Tier
              </div>
            </div>

            <div className="pt-6">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono mb-2">
                <span>Progress to next tier</span>
                <span>{coins} / {nextTier}</span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden shadow-inner">
                <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Converter Card */}
        <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-5">
          <div className="space-y-1 border-b border-white/[0.06] pb-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">Redeem Coins</h3>
            <p className="text-xs text-slate-400">Convert Volo Coins directly into Wallet Balance. (10 Coins = ₹1)</p>
          </div>

          <div className="space-y-6 pt-2">
            <div>
              <div className="flex justify-between text-xs font-bold text-white mb-3 font-mono">
                <span>Select Amount: {sliderValue} Coins</span>
                <span className="text-[#5CBF2A]">₹{(sliderValue / 10).toFixed(2)} Value</span>
              </div>
              <input
                type="range"
                min="0"
                max={coins}
                step="10"
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                className="w-full accent-[#124E66] h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-2 font-mono">
                <span>0</span>
                <span>{coins} Max</span>
              </div>
            </div>

            <button
              type="button"
              disabled={sliderValue === 0 || converting}
              onClick={handleConvert}
              className="w-full py-3.5 bg-[#124E66] hover:bg-[#2e5e73] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Convert to Wallet Balance'}
            </button>
          </div>
        </div>

      </div>

      {/* Transaction History */}
      <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          Coin History
        </h3>
        
        <div className="space-y-1">
          {history.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono py-4 text-center">No coin transactions yet.</p>
          ) : (
            history.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-white/[0.02] rounded-xl transition-colors border-b border-white/[0.04] last:border-0">
                <div>
                  <p className="text-xs font-bold text-white">{tx.description || 'Activity'}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <div className={`font-black text-sm font-mono ${tx.amount > 0 ? 'text-[#5CBF2A]' : 'text-slate-300'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
