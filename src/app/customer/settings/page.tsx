'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, ShieldAlert, Loader2, 
  CheckCircle2, AlertCircle, Save, MessageSquare, Mail, Zap 
} from 'lucide-react';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full transition-colors duration-300 border focus:outline-none cursor-pointer ${
        value ? 'bg-[#124E66]/20 border-[#124E66]/50' : 'bg-slate-100 border-slate-250 hover:border-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full transition-transform duration-300 shadow-sm ${
          value ? 'translate-x-7 bg-[#124E66]' : 'translate-x-1 bg-slate-400'
        }`}
      />
    </button>
  );
}

export default function CustomerSettingsPage() {
  const router = useRouter();
  
  const [smsNotif, setSmsNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Notification preferences updated successfully.');
    }, 800);
  };

  const handleDeactivateAccount = async () => {
    const doubleCheck = confirm(
      'Are you absolutely sure you want to deactivate your Volo customer account?\n\nThis will soft-delete your profile, cancel active requests, and log you out immediately.'
    );
    if (!doubleCheck) return;
    setDeactivating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/customer/profile', { method: 'DELETE' });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to deactivate account.');
      await fetch('/api/auth/logout', { method: 'POST' });
      alert('Your customer account has been deactivated. Redirecting...');
      router.push('/customer/login');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during account deactivation.');
      setDeactivating(false);
    }
  };

  const preferences = [
    { icon: MessageSquare, label: 'SMS Notifications', desc: 'Receive OTP codes and en route alerts via SMS text.', value: smsNotif, onChange: setSmsNotif },
    { icon: Mail, label: 'Email Invoices', desc: 'Receive billing receipts directly in your email inbox.', value: emailNotif, onChange: setEmailNotif },
    { icon: Zap, label: 'Real-time Push Alerts', desc: 'Enable browser notifications for worker live tracking changes.', value: pushNotif, onChange: setPushNotif },
  ];

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
            Configure system preferences, digital alert channels, and manage your account privacy configurations.
          </p>
        </div>
      </div>

      {/* 2. DUAL-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
        
        {/* LEFT COLUMN: PREFERENCES FORM */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 select-none">
            <Bell className="h-4 w-4 text-[#124E66]" />
            <h3 className="text-[10px] uppercase font-black text-slate-450 tracking-widest font-mono">Notification Channels</h3>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-5">
            {preferences.map(({ icon: Icon, label, desc, value, onChange }, i) => (
              <div key={label} className={`flex items-center justify-between gap-4 select-none ${i > 0 ? 'border-t border-slate-100 pt-5' : ''}`}>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-[#124E66]" />
                    {label}
                  </span>
                  <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{desc}</p>
                </div>
                <Toggle value={value} onChange={onChange} />
              </div>
            ))}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl flex items-center gap-2 text-emerald-600 text-xs font-bold font-mono">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {successMsg}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-[#124E66] hover:bg-[#206783] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><Save className="h-4 w-4" />Save Preferences</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: DANGER ZONE */}
        <div className="lg:col-span-5 bg-white border border-red-200 rounded-[24px] p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-red-100 pb-3 select-none">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            <h3 className="text-[10px] uppercase font-black text-red-500 tracking-widest font-mono">Danger Zone</h3>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              Deactivating your account will soft-delete your database profile status to inactive and sign you out instantly. Contact administrator support to reactivate.
            </p>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold font-mono">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleDeactivateAccount}
              disabled={deactivating}
              className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {deactivating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deactivating Account...
                </span>
              ) : 'Deactivate My Account'}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
