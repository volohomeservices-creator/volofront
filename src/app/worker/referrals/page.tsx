'use client';

import React, { useState } from 'react';
import { Users, Copy, CheckCircle2, MessageCircle, Mail, Link as LinkIcon, Loader2, AlertCircle, Clock } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function WorkerReferralsPage() {
  const [copied, setCopied] = useState(false);
  const { data, error, isLoading } = useSWR('/api/worker/referrals', fetcher);

  const code = data?.code || null;
  const stats = data?.stats || { successCount: 0, pendingCount: 0, totalEarned: 0, pendingAmount: 0 };
  const settings = data?.settings || { referrer_reward: 500, referee_reward: 0, min_bookings_to_qualify: 5 };
  const referrals: any[] = data?.referrals || [];
  const referralLink = code ? `${typeof window !== 'undefined' ? window.location.origin : 'https://volo.app'}/worker/login?ref=${code}` : '';

  const copyToClipboard = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-3 text-[#124E66]">
        <Loader2 className="w-6 h-6 animate-spin text-[#124E66]" />
        <span className="text-xs font-semibold uppercase tracking-wider font-mono">Loading referrals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-3 text-red-600 font-mono">
        <AlertCircle className="w-5 h-5" />
        <span className="text-xs font-black uppercase tracking-wider">Failed to load referral data.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Referral Hub
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Know someone who wants to work as a VOLO partner? Refer them and earn{' '}
            <span className="text-white font-extrabold underline decoration-wavy underline-offset-4">{formatCurrency(settings.referrer_reward)}</span>{' '}
            once they complete their first {settings.min_bookings_to_qualify} jobs.
          </p>
        </div>
      </div>

      {/* 2. TWO-COLUMN SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
        
        {/* LEFT COLUMN: SHARE CONTROL & FLOW CHART */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Share Box */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">
                Your Unique Partner Referral Link
              </label>
              {code ? (
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center overflow-hidden">
                    <span className="text-xs font-semibold text-slate-700 truncate font-mono">{referralLink}</span>
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="shrink-0 bg-[#124E66] hover:bg-[#206783] text-white px-4 py-3 rounded-xl transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm"
                    title="Copy Link"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-400 italic font-mono">
                  Generating referral coordinates...
                </div>
              )}
              {code && (
                <p className="text-[10px] text-slate-400 font-mono pl-1">
                  Unique Code: <span className="text-[#124E66] font-extrabold uppercase">{code}</span>
                </p>
              )}
            </div>

            <div className="relative font-mono select-none">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase">
                <span className="px-3 bg-white text-slate-400">Or share via</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => referralLink && window.open(`https://wa.me/?text=${encodeURIComponent('Join VOLO as a service partner and start earning! ' + referralLink)}`, '_blank')}
                className="p-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Share on WhatsApp"
              >
                <MessageCircle className="w-5.5 h-5.5 text-white" />
              </button>
              <button
                onClick={() => referralLink && window.open(`mailto:?subject=Join VOLO as a Partner&body=${encodeURIComponent('Earn money as a VOLO service partner! ' + referralLink)}`, '_blank')}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Share via Email"
              >
                <Mail className="w-5.5 h-5.5 text-white" />
              </button>
              <button
                onClick={copyToClipboard}
                className="p-3 bg-[#124E66] hover:bg-[#206783] text-white rounded-full transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Copy Link"
              >
                <LinkIcon className="w-5.5 h-5.5 text-white" />
              </button>
            </div>
          </div>

          {/* Process Flow */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 font-mono select-none">
              How Referral Program Works
            </h3>
            <div className="flex flex-col md:flex-row gap-6 justify-center">
              <div className="flex-1 text-center space-y-2">
                <div className="w-10 h-10 bg-[#124E66]/10 border border-[#124E66]/15 rounded-full flex items-center justify-center mx-auto text-[#124E66] font-black text-sm font-mono mb-3">1</div>
                <h4 className="font-extrabold text-xs text-slate-850">Share Link</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Send your code or link to potential service partners.</p>
              </div>
              <div className="flex-1 text-center space-y-2">
                <div className="w-10 h-10 bg-[#124E66]/10 border border-[#124E66]/15 rounded-full flex items-center justify-center mx-auto text-[#124E66] font-black text-sm font-mono mb-3">2</div>
                <h4 className="font-extrabold text-xs text-slate-850">KYC Approval</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">They sign up, submit verification documents, and get approved.</p>
              </div>
              <div className="flex-1 text-center space-y-2">
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-150 rounded-full flex items-center justify-center mx-auto text-emerald-600 font-black text-sm font-mono mb-3">3</div>
                <h4 className="font-extrabold text-xs text-slate-850">Collect Rewards</h4>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Earn {formatCurrency(settings.referrer_reward)} automatically after they complete {settings.min_bookings_to_qualify} jobs.</p>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: OVERVIEW STATS & HISTORY */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Stats Summary Stack */}
          <div className="space-y-4 font-mono">
            <div className="bg-white border border-slate-200 rounded-[20px] p-4.5 flex justify-between items-center shadow-sm">
              <span className="text-[9px] text-slate-450 font-black uppercase tracking-wider block">Successful Referrals</span>
              <p className="text-xl font-black text-slate-800">{stats.successCount}</p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[20px] p-4.5 flex justify-between items-center shadow-sm">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-450 font-black uppercase tracking-wider block">Pending Rewards</span>
                <span className="text-[8px] text-slate-400 block font-semibold font-sans">{stats.pendingCount} awaiting jobs</span>
              </div>
              <p className="text-xl font-black text-amber-600">{formatCurrency(stats.pendingAmount)}</p>
            </div>

            <div className="bg-[#124E66]/5 border border-[#124E66]/15 rounded-[20px] p-4.5 flex justify-between items-center shadow-sm">
              <span className="text-[9px] text-[#124E66] font-black uppercase tracking-wider block">Total Earned</span>
              <p className="text-xl font-black text-[#124E66]">{formatCurrency(stats.totalEarned)}</p>
            </div>
          </div>

          {/* Referrals History List */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 font-mono select-none">
              <Clock className="h-4.5 w-4.5 text-[#124E66]" />
              Referral History
            </h3>

            {referrals.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {referrals.map((ref: any) => (
                  <div key={ref.id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-[#124E66]/10 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#124E66]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate">Referred Partner</p>
                        <p className="text-[8px] text-slate-450 font-mono font-bold">{new Date(ref.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                        ref.status === 'REWARDED' ? 'bg-emerald-50 text-emerald-600 border-emerald-150' :
                        ref.status === 'QUALIFIED' ? 'bg-blue-50 text-blue-600 border-blue-150' :
                        'bg-amber-50 text-amber-600 border-amber-150'
                      }`}>
                        {ref.status}
                      </span>
                      {ref.status === 'REWARDED' && (
                        <span className="text-xs font-black text-emerald-600 font-bold">+₹{ref.reward_amount}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center gap-2 select-none border border-slate-100 rounded-2xl">
                <Clock className="w-7 h-7 text-slate-300" />
                <p className="text-xs font-bold text-slate-400">No referrals yet</p>
                <p className="text-[9px] text-slate-400 font-semibold px-4 text-center leading-relaxed">Share your code link to start collecting rewards!</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
