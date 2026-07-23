'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Rendering Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#D3D9D4] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-[#124E66]/10 p-8 rounded-[2.5rem] shadow-xl text-center space-y-6">
        <div className="h-16 w-16 bg-red-500/10 text-red-650 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Something went wrong</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            An unexpected error occurred during rendering. We have logged this event and are monitoring it.
          </p>
        </div>
        
        {error.message && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-mono text-slate-600 text-left max-h-24 overflow-y-auto break-all">
            {error.message}
          </div>
        )}

        <button
          type="button"
          onClick={() => reset()}
          className="w-full flex items-center justify-center gap-2 bg-[#124E66] hover:bg-[#124E66]/90 text-white rounded-full py-4 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        >
          <RotateCcw className="h-4.5 w-4.5" />
          Try Again
        </button>
      </div>
    </div>
  );
}
