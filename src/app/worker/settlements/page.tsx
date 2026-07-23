'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  CreditCard, Calendar, Loader2, IndianRupee, Clock,
  Landmark, AlertCircle, CheckCircle2, ChevronRight, History
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function WorkerSettlementsPage() {
  const { data: stlData, mutate: mutateStl } = useSWR('/api/worker/settlements', fetcher);
  const { data: bankData, mutate: mutateBank } = useSWR('/api/worker/bank-accounts', fetcher);

  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: ''
  });
  const [savingBank, setSavingBank] = useState(false);

  const earnings = stlData?.earnings || {};
  const history = stlData?.history || [];
  const account = bankData?.account || null;

  useEffect(() => {
    if (account && !isEditingBank) {
      setBankForm({
        account_holder_name: account.account_holder_name || '',
        bank_name: account.bank_name || '',
        account_number: account.account_number_decrypted || '',
        ifsc_code: account.ifsc_code || ''
      });
    }
  }, [account, isEditingBank]);

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    try {
      const res = await fetch('/api/worker/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm)
      });
      if (res.ok) {
        await mutateBank();
        setIsEditingBank(false);
      } else {
        alert('Failed to save bank details. Please verify your entries.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingBank(false);
    }
  }

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
      case 'COMPLETED':
      case 'SUCCESS':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-emerald-50 text-emerald-600 border border-emerald-150 font-mono">Completed</span>;
      case 'PROCESSING':
      case 'IN_TRANSIT':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-amber-50 text-amber-600 border border-amber-150 font-mono animate-pulse">Processing</span>;
      case 'PENDING':
      case 'UNPAID':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-50 text-slate-500 border border-slate-200 font-mono">Pending</span>;
      case 'FAILED':
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-red-50 text-red-600 border border-red-150 font-mono">Failed</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[8px] font-black uppercase rounded bg-slate-50 text-slate-550 border border-slate-200 font-mono">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <CreditCard className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Settlements Ledger
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Manage bank credentials, monitor pending payouts, and view transaction history.
          </p>
        </div>
      </div>

      {/* 2. FULL-WIDTH TOP KPI BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
        
        <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm hover:border-[#124E66]/30 hover:shadow-md transition-all duration-300">
          <span className="text-[9px] text-slate-450 font-black uppercase tracking-wider block font-mono">Pending Balance</span>
          <p className="text-lg font-black text-[#124E66] mt-2 font-mono">{formatCurrency(earnings.pending_amount || 0)}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm hover:border-amber-400/30 hover:shadow-md transition-all duration-300">
          <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider block font-mono">Processing Payout</span>
          <p className="text-lg font-black text-amber-600 mt-2 font-mono">{formatCurrency(earnings.processing_amount || 0)}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm hover:border-emerald-400/30 hover:shadow-md transition-all duration-300">
          <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider block font-mono">Ready / Disbursed</span>
          <p className="text-lg font-black text-emerald-600 mt-2 font-mono">
            {formatCurrency((earnings.ready_for_payout_amount || 0) + (earnings.paid_amount || 0))}
          </p>
        </div>

        <div className="bg-[#124E66]/5 border border-[#124E66]/15 rounded-[24px] p-5 shadow-sm transition-all duration-300">
          <span className="text-[9px] text-[#124E66] font-black uppercase tracking-wider block font-mono">Lifetime Net Payouts</span>
          <p className="text-lg font-black text-[#124E66] mt-2 font-mono">{formatCurrency(earnings.net_earnings || 0)}</p>
        </div>

      </div>

      {/* 3. TWO-COLUMN SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
        
        {/* LEFT COLUMN: BANK CREDENTIALS FORM */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 select-none">
            <h2 className="text-xs font-black text-slate-800 flex items-center gap-2 uppercase tracking-wider font-mono">
              <Landmark className="h-4.5 w-4.5 text-[#124E66]" />
              Bank Credentials
            </h2>
            {account && !isEditingBank && (
              <button 
                type="button"
                onClick={() => setIsEditingBank(true)} 
                className="text-[10px] text-[#124E66] font-black hover:text-[#206783] uppercase tracking-widest cursor-pointer transition-colors font-mono"
              >
                Edit details
              </button>
            )}
          </div>

          {(!account || isEditingBank) ? (
            <form onSubmit={handleSaveBank} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">Account Holder Name</label>
                  <input 
                    required 
                    value={bankForm.account_holder_name} 
                    onChange={e=>setBankForm({...bankForm, account_holder_name: e.target.value})} 
                    placeholder="e.g. Akhil"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-semibold" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">Bank Name</label>
                  <input 
                    required 
                    value={bankForm.bank_name} 
                    onChange={e=>setBankForm({...bankForm, bank_name: e.target.value})} 
                    placeholder="e.g. HDFC Bank"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-semibold" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">Account Number</label>
                  <input 
                    required 
                    value={bankForm.account_number} 
                    onChange={e=>setBankForm({...bankForm, account_number: e.target.value})} 
                    placeholder="Enter account number"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-mono font-bold" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest pl-1">IFSC Code</label>
                  <input 
                    required 
                    value={bankForm.ifsc_code} 
                    onChange={e=>setBankForm({...bankForm, ifsc_code: e.target.value})} 
                    placeholder="IFSC code"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none transition-all font-mono uppercase font-bold" 
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2.5 mt-5 select-none font-mono">
                {account && (
                  <button 
                    type="button" 
                    onClick={() => setIsEditingBank(false)} 
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  disabled={savingBank} 
                  type="submit" 
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#124E66] hover:bg-[#206783] text-white shadow shadow-[#124E66]/10 cursor-pointer disabled:opacity-40 transition-colors"
                >
                  {savingBank ? 'Saving...' : 'Save Bank Details'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200/60 shadow-inner">
              <div className="space-y-1.5 font-semibold">
                <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Institution: <span className="text-slate-800 font-bold">{account.bank_name}</span></p>
                <p className="text-xs text-slate-700 font-mono mt-1">Number: {account.account_number_decrypted || `XXXXXX${account.account_last_four}`}</p>
                <p className="text-[9px] text-slate-450 uppercase tracking-wider font-mono">IFSC: {account.ifsc_code} • Holder: {account.account_holder_name}</p>
              </div>
              <div className="mt-4 sm:mt-0 select-none">
                {account.is_verified ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-150 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-150 px-3.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider font-mono animate-pulse">
                    <Clock className="h-3.5 w-3.5" /> Audit Pending
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SETTLEMENT HISTORY */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 font-mono select-none">
            <History className="h-4.5 w-4.5 text-[#124E66]" />
            Settlement history
          </h3>
          
          {history.length === 0 ? (
            <div className="text-center text-slate-450 text-xs font-semibold italic py-16 select-none">
              No settlement ledger logs found.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
              {history.map((h: any) => (
                <div 
                  key={h.id} 
                  className="bg-slate-50 border border-slate-200/60 hover:border-slate-300 rounded-2xl p-4 flex justify-between items-center shadow-sm hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] text-slate-450 font-mono font-bold">
                      {new Date(h.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs leading-none font-semibold">
                      <p className="text-slate-800">Net: <span className="font-bold font-mono">{formatCurrency(h.net_amount)}</span></p>
                      <p className="text-red-500 text-[10px] font-mono">Comm: -{formatCurrency(h.commission_amount)}</p>
                    </div>
                    {h.settlement_batches && (
                      <p className="text-[9px] font-mono text-slate-400 truncate font-bold">Ref: {h.settlement_batches.batch_reference}</p>
                    )}
                  </div>
                  <div className="shrink-0 select-none">
                    {getPayoutStatusBadge(h.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
