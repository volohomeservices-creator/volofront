'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, Shield, LogOut, Trash2, Loader2, 
  CheckCircle2, AlertTriangle, Volume2, Mail, Info, HelpCircle
} from 'lucide-react';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6.5 w-12 shrink-0 items-center rounded-full transition-colors duration-300 border focus:outline-none cursor-pointer ${
        value ? 'bg-[#124E66] border-[#124E66]' : 'bg-slate-200 border-slate-300 hover:bg-slate-250'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function WorkerSettingsPage() {
  const router = useRouter();
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const [deactivating, setDeactivating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  useEffect(() => {
    const soundPref = localStorage.getItem('volo_worker_sound_pref');
    const emailPref = localStorage.getItem('volo_worker_email_pref');
    if (soundPref !== null) setSoundEnabled(soundPref === 'true');
    if (emailPref !== null) setEmailEnabled(emailPref === 'true');
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('volo_worker_sound_pref', String(soundEnabled));
    localStorage.setItem('volo_worker_email_pref', String(emailEnabled));
    setPreferencesSaved(true);
    setTimeout(() => setPreferencesSaved(false), 2500);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/worker/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    setDeactivateError('');
    try {
      const res = await fetch('/api/worker/profile', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate account.');
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/worker/login');
    } catch (err: any) {
      setDeactivateError(err.message || 'Error deactivating account.');
      setDeactivating(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <Bell className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Account Settings
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Configure sound alerts, dispatch notifications, and manage account security.
          </p>
        </div>
      </div>

      {/* 2. TWO-COLUMN SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
        
        {/* LEFT COLUMN: GUIDANCE INFO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-4 select-none">
            <div className="h-10 w-10 bg-[#124E66]/10 text-[#124E66] rounded-xl flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Security Guidelines</h3>
              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                Your credentials and verified data are stored in highly secure, encrypted environments. 
                Keep your notification switches enabled to receive updates about allocations instantly.
              </p>
            </div>
            
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <h4 className="text-[9px] font-black uppercase text-slate-450 tracking-widest font-mono">Support</h4>
              <a 
                href="mailto:support@volohome.com" 
                className="text-[10px] text-[#124E66] hover:underline font-bold flex items-center gap-1.5"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Contact Onboarding Support
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREFERENCES & OPERATIONS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Preferences Panel */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <Bell className="h-4.5 w-4.5 text-[#124E66]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Preferences</h3>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Volume2 className="h-4.5 w-4.5 text-[#124E66]" />
                    Sound Alerts
                  </label>
                  <span className="text-[10px] text-slate-450 block leading-tight font-semibold">Play audio chime when a new dispatch job arrives</span>
                </div>
                <Toggle value={soundEnabled} onChange={setSoundEnabled} />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                    <Mail className="h-4.5 w-4.5 text-[#124E66]" />
                    Email Reports
                  </label>
                  <span className="text-[10px] text-slate-455 block leading-tight font-semibold">Receive weekly payment and settlement reports by email</span>
                </div>
                <Toggle value={emailEnabled} onChange={setEmailEnabled} />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between font-mono">
              {preferencesSaved ? (
                <span className="flex items-center gap-1.5 text-[9px] text-emerald-600 font-black uppercase tracking-wider select-none">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Saved
                </span>
              ) : <span />}

              <button
                type="button"
                onClick={handleSavePreferences}
                className="bg-[#124E66] hover:bg-[#206783] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer shadow shadow-[#124E66]/10"
              >
                Save Preferences
              </button>
            </div>
          </div>

          {/* Account Operations Panel */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
              <Shield className="h-4.5 w-4.5 text-[#124E66]" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Account Operations</h3>
            </div>

            <div className="space-y-3 font-mono">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-3 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all select-none cursor-pointer"
              >
                Sign Out of Account
                <LogOut className="h-4.5 w-4.5 text-[#124E66]" />
              </button>

              <button
                type="button"
                onClick={() => { setDeactivateError(''); setShowConfirmModal(true); }}
                className="w-full flex items-center justify-between bg-red-50 hover:bg-red-100/80 border border-red-200/80 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 hover:text-red-700 transition-all select-none cursor-pointer"
              >
                Deactivate Partner Profile
                <Trash2 className="h-4.5 w-4.5 text-red-500" />
              </button>
              
              {deactivateError && (
                <p className="text-[10px] text-red-600 font-bold bg-red-50 px-3.5 py-2 rounded-xl border border-red-155">
                  {deactivateError}
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* App Info Footer */}
      <div className="flex items-center justify-center gap-2 text-[9px] text-slate-450 font-black uppercase font-mono select-none">
        <Info className="h-3.5 w-3.5 text-slate-400" />
        <span>Volo Partner Application • Version 1.0.0 (Phase 5)</span>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-sm w-full p-6 shadow-2xl space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-2.5 text-red-600 font-black text-sm uppercase tracking-wider font-mono">
              <AlertTriangle className="h-5.5 w-5.5 text-red-500" />
              Deactivate Profile?
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              This will hide your profile from dispatches, pause active settlement timelines, and sign you out immediately.
            </p>

            <div className="flex gap-3 font-mono">
              <button
                type="button"
                disabled={deactivating}
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 px-4 rounded-xl text-xs font-bold uppercase transition-all select-none cursor-pointer text-slate-600"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={deactivating}
                onClick={handleDeactivate}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl text-xs font-black uppercase transition-all select-none flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
              >
                {deactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
