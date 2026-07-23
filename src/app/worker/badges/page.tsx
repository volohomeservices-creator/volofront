'use client';

import React from 'react';
import useSWR from 'swr';
import { ShieldCheck, Award, Zap, Star, Trophy, Target, Lock, Loader2 } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const EARNED_BADGES = [
  { 
    id: 1, name: 'Top Rated Pro', 
    icon: Star, color: '#D97706', // Dark amber/orange for readability
    date: 'Jun 10, 2026', 
    description: 'Maintained a 4.8+ rating over 50 completed jobs.',
    bg: '#FEF3C7', border: '#FDE68A'
  },
  { 
    id: 2, name: 'Lightning Fast', 
    icon: Zap, color: '#0284C7', // Dark sky blue
    date: 'May 22, 2026', 
    description: 'Responded to 95% of requests in under 3 minutes.',
    bg: '#E0F2FE', border: '#BAE6FD'
  },
  { 
    id: 3, name: 'Century Club', 
    icon: Trophy, color: '#059669', // Dark emerald
    date: 'Apr 15, 2026', 
    description: 'Successfully completed 100 service dispatches on VOLO.',
    bg: '#D1FAE5', border: '#A7F3D0'
  },
];

const UPCOMING_BADGES = [
  { 
    id: 4, name: 'Elite Professional', 
    icon: ShieldCheck, 
    progress: 75, 
    target: 'Maintain 95+ Score for 3 Months', 
    current: '2 months done'
  },
  { 
    id: 5, name: 'Veteran Partner', 
    icon: Award, 
    progress: 28, 
    target: 'Complete 500 Service Jobs', 
    current: '142 / 500'
  },
  { 
    id: 6, name: 'On Target', 
    icon: Target, 
    progress: 55, 
    target: 'Zero Cancellations for 30 Days', 
    current: '16 / 30 days'
  },
];

export default function WorkerBadgesPage() {
  const { data: dashboardData, isLoading } = useSWR('/api/worker/dashboard', fetcher);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#124E66]">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-wider animate-pulse font-mono">Loading achievements...</p>
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
            <Trophy className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Badges & Achievements
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Unlock prestige badges by delivering exceptional service and reaching partner milestones.
          </p>
        </div>
      </div>

      {/* 2. EARNED BADGES SECTION */}
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2 px-1 select-none">
          <Star className="h-4.5 w-4.5 text-[#124E66]" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Earned Badges</span>
          <span className="ml-auto text-[8px] font-black text-[#124E66] bg-[#124E66]/10 border border-[#124E66]/15 px-2.5 py-0.5 rounded uppercase font-mono">
            {EARNED_BADGES.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {EARNED_BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div 
                key={badge.id} 
                className="bg-white border border-slate-200/80 rounded-[24px] p-6 text-center relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-0.5 hover:border-[#124E66]/20 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at top right, ${badge.color}08, transparent 65%)` }}
                />
                
                <div className="relative z-10 flex flex-col items-center gap-4">
                  <div 
                    className="h-16 w-16 rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-110 duration-300"
                    style={{ backgroundColor: badge.bg, border: `1px solid ${badge.border}` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: badge.color }} />
                  </div>
                  
                  <div className="space-y-1.5">
                    <h3 className="font-black text-sm text-slate-800 leading-tight">{badge.name}</h3>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold">{badge.description}</p>
                  </div>
                  
                  <span 
                    className="text-[8px] font-black uppercase tracking-wider px-3 py-1 rounded border font-mono"
                    style={{ color: badge.color, backgroundColor: badge.bg, borderColor: badge.border }}
                  >
                    Earned {badge.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. UPCOMING ACHIEVEMENTS */}
      <div className="space-y-4 animate-fade-in-up">
        <div className="flex items-center gap-2 px-1 select-none">
          <Lock className="h-4.5 w-4.5 text-slate-450" />
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Next Achievements</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {UPCOMING_BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div 
                key={badge.id} 
                className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm group hover:border-[#124E66]/20 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-[16px] bg-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 grayscale opacity-50 group-hover:opacity-75 transition-opacity">
                    <Icon className="h-5.5 w-5.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-xs text-slate-800 leading-tight">{badge.name}</h3>
                    <p className="text-[10px] text-slate-450 mt-0.5 font-bold">{badge.target}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider">
                    <span className="text-slate-450">Progress</span>
                    <span className="text-slate-650">{badge.current}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/40">
                    <div 
                      className="h-full bg-gradient-to-r from-[#124E66]/80 to-[#124E66] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className="text-[9px] font-black text-[#124E66]">{badge.progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
