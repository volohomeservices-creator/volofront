'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Briefcase, User, Calendar, ShieldCheck, DollarSign, History, 
  Settings, LayoutDashboard, CreditCard, LogOut, Menu, X, Bell, 
  Wallet, MapPin, Search, ChevronDown, Zap, Shield, Users, IdCard,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import DigitalIdCardModal from '@/components/worker/DigitalIdCardModal';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import GoogleTranslate from '@/components/shared/GoogleTranslate';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  read?: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/worker/dashboard', icon: LayoutDashboard },
  { name: 'Job Requests', href: '/worker/jobs', icon: Briefcase },
  { name: 'Live Route', href: '/worker/location', icon: MapPin },
  { name: 'Duty Availability', href: '/worker/availability', icon: Calendar },
  { name: 'Wallet & Settlements', href: '/worker/settlements', icon: Wallet },
  { name: 'Job History', href: '/worker/job-history', icon: History },
  { name: 'My Incentives', href: '/worker/incentives', icon: DollarSign },
  { name: 'Partner Badges', href: '/worker/badges', icon: Zap },
  { name: 'My Profile', href: '/worker/profile', icon: User },
  { name: 'Refer & Earn', href: '/worker/referrals', icon: Users },
  { name: 'KYC Uploads', href: '/worker/kyc', icon: ShieldCheck },
  { name: 'System Settings', href: '/worker/settings', icon: Settings },
];

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // States
  const [loading, setLoading] = useState(true);
  const [kycApproved, setKycApproved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [workerStatus, setWorkerStatus] = useState<string>('OFFLINE');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // ID Card states
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [workerDetails, setWorkerDetails] = useState<any>(null);
  
  // UI States
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Refs for closing popovers on click outside
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Sync sidebar collapse state from localStorage on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('worker_sidebar_collapsed');
      if (stored) setSidebarCollapsed(stored === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('worker_sidebar_collapsed', String(nextVal));
    }
  };

  // Authentication & KYC check
  useEffect(() => {
    async function checkAuthAndKyc() {
      try {
        // 1. Verify Authentication & Role
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/worker/login');
          return;
        }
        const meData = await meRes.json();
        if (meData.user?.role !== 'worker') {
          const fallback = meData.user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
          router.push(fallback);
          return;
        }
        setUser(meData.user);

        // 2. Verify KYC Status
        const kycRes = await fetch('/api/worker/kyc');
        if (!kycRes.ok) {
          throw new Error('Failed to fetch KYC');
        }
        const kycData = await kycRes.json();
        const isApproved = kycData.kycState?.overall_status === 'APPROVED';
        setKycApproved(isApproved);
        setKycDocs(kycData.documents || []);

        const details = {
          id: meData.user.id,
          full_name: meData.user.full_name,
          phone: meData.user.phone,
          dob: kycData.bankDetails?.dob,
          worker_id_code: kycData.bankDetails?.worker_id_code,
          skills: []
        };
        setWorkerDetails(details);

        if (isApproved) {
          const profileRes = await fetch('/api/worker/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            details.skills = profileData.skills || [];
            setWorkerDetails({ ...details });
          }
        }

        // 3. Enforce KYC Redirect
        if (!isApproved) {
          if (pathname !== '/worker/kyc' && pathname !== '/worker/settings') {
            router.push('/worker/kyc');
            return;
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error verifying worker layout state:', err);
        router.push('/worker/login');
      }
    }

    checkAuthAndKyc();
  }, [pathname, router]);

  // Sync state & poll dashboard data (updates worker status, wallet balance, and notifications)
  useEffect(() => {
    if (!user || !kycApproved) return;

    let active = true;
    async function fetchDashboardData() {
      try {
        const res = await fetch('/api/worker/dashboard');
        if (!res.ok) return;
        const data = await res.json();
        if (active && data) {
          setWorkerStatus(data.currentStatus || 'OFFLINE');
          setWalletBalance(data.commissionWalletBalance || 0);
          setNotifications(data.recentNotifications || []);
        }
      } catch (err) {
        console.warn('Transient network drop or server rebuild during dashboard poll:', err);
      }
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, kycApproved]);

  // High-accuracy background GPS position watcher
  useEffect(() => {
    if (!user || !kycApproved) return;
    if (workerStatus === 'OFFLINE' || workerStatus === 'VACATION') return;

    let watchId: number | null = null;
    let lastUpdateEpoch = 0;

    const sendCoords = async (pos: GeolocationPosition) => {
      const now = Date.now();
      // Throttle GPS updates to once every 20 seconds
      if (now - lastUpdateEpoch < 20000) return;
      lastUpdateEpoch = now;

      try {
        await fetch('/api/worker/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed || 0,
            heading: pos.coords.heading || 0,
            deviceType: 'WEB',
          }),
        });
      } catch (err) {
        console.error('Failed to report live GPS coordinates:', err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendCoords(pos),
        (err) => console.warn('[GPS] Initial position watch failed:', {
          code: err?.code,
          message: err?.message || String(err)
        }),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => sendCoords(pos),
        (err) => console.error('[GPS] Location watch error:', {
          code: err?.code,
          message: err?.message || String(err)
        }),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 30000 }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, kycApproved, workerStatus]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/worker/login');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/worker/jobs?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/worker/jobs');
    }
  };

  const handleClearNotifications = async () => {
    try {
      const res = await fetch('/api/worker/alerts', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setNotificationsOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D3D9D4]/25 flex flex-col items-center justify-center text-[#124E66]">
        <span className="h-10 w-10 border-4 border-[#124E66]/10 border-t-[#124E66] rounded-full animate-spin shadow-sm" />
        <p className="text-xs text-slate-650 mt-4 font-semibold tracking-wider uppercase animate-pulse">Initializing VOLO Engine...</p>
      </div>
    );
  }

  const unreadCount = notifications.length;

  return (
    <div className="min-h-screen bg-[#D3D9D4]/20 text-slate-900 flex font-sans antialiased selection:bg-[#124E66]/10 selection:text-[#124E66] overflow-x-hidden">
      <GoogleTranslate />
      
      {/* ================= 1. DESKTOP STICKY LEFT SIDEBAR ================= */}
      <aside className={`hidden lg:flex bg-white flex-col shrink-0 border-r border-slate-200 select-none relative transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        
        {/* Floating Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-5 z-50 h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-md text-slate-550 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-[#124E66]" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-[#124E66]" />
          )}
        </button>

        {/* Branding header */}
        <div className={`h-16 flex items-center gap-3 px-4 border-b border-slate-100 z-10 shrink-0 ${
          sidebarCollapsed ? 'justify-center' : 'px-6'
        }`}>
          <Image 
            src="/images/logo.jpeg" 
            alt="VOLO Logo" 
            width={32}
            height={32}
            priority
            className="h-8 w-8 rounded-lg object-contain border border-slate-100 shadow-sm shrink-0" 
          />
          <div className={`flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            <span className="font-display font-black text-sm tracking-tight !text-[#124E66] leading-none">VOLO WORKER</span>
            <span className="text-[8px] font-bold uppercase !text-slate-450 tracking-widest mt-0.5 leading-none font-mono">Field Partner</span>
          </div>
        </div>

        {/* Profile preview card */}
        <div className={`p-4 mt-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 z-10 select-none transition-all duration-300 ${
          sidebarCollapsed ? 'mx-2 justify-center p-2.5' : 'mx-4'
        }`}>
          <div className="h-9 w-9 rounded-xl bg-[#124E66]/10 border border-[#124E66]/10 text-[#124E66] flex items-center justify-center text-xs font-black uppercase shrink-0 font-display">
            {user?.full_name?.charAt(0) || 'W'}
          </div>
          <div className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            <p className="text-xs font-black !text-slate-900 truncate leading-tight">{user?.full_name || 'Partner'}</p>
            <p className="text-[8px] !text-slate-450 font-bold font-mono truncate mt-0.5">{user?.phone || ''}</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className={`flex-1 py-6 pr-1 space-y-1.5 overflow-y-auto z-10 no-scrollbar ${
          sidebarCollapsed ? 'pl-0' : 'pr-3'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/worker/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center rounded-r-xl rounded-l-none text-xs font-bold transition-all group relative ${
                  sidebarCollapsed 
                    ? 'justify-center py-3.5 px-0 border-l-[3px]' 
                    : 'pl-6 pr-4 py-3 gap-3.5 border-l-[3px]'
                } ${
                  isActive
                    ? 'bg-[#124E66]/10 border-l-[#124E66] !text-[#124E66] font-black'
                    : 'border-transparent !text-[#124E66]/70 hover:bg-[#124E66]/5 hover:!text-[#124E66] hover:border-[#124E66]/30'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? '!text-[#124E66]' : '!text-[#124E66]/60 group-hover:!text-[#124E66]'}`} />
                <span className={`truncate transition-all duration-300 ${
                  sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar logout action */}
        <div className="p-4 border-t border-slate-150 z-10 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center rounded-xl text-xs font-bold !text-red-650 hover:bg-red-50 hover:!text-red-750 transition-all cursor-pointer text-left ${
              sidebarCollapsed ? 'justify-center py-3.5 px-0' : 'px-4 py-3 gap-3'
            }`}
          >
            <LogOut className="h-4 w-4 !text-red-400 group-hover:!text-red-600 shrink-0" />
            <span className={`transition-all duration-300 ${
              sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
            }`}>
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* ================= 2. MAIN LAYOUT CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm transition-all select-none">
          <div className="w-full px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Mobile-only logo */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <Image 
                src="/images/logo.jpeg" 
                alt="VOLO Logo" 
                width={32}
                height={32}
                priority
                className="h-8 w-8 rounded-lg object-contain border border-slate-200" 
              />
              <span className="font-display font-black text-sm tracking-tight !text-[#124E66]">VOLO WORKER</span>
            </div>

            {/* Desktop-only Search Bar */}
            <div className="hidden lg:block flex-1 max-w-md">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="h-4.5 w-4.5 !text-slate-400 group-focus-within:!text-[#124E66] transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search jobs by client name, ID, service..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-2xl py-2 pl-11 pr-4 text-xs font-semibold !text-slate-800 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-[#124E66]/5 shadow-inner animate-fade-in"
                />
              </form>
            </div>

            {/* Right actions: Language switcher, wallet, notifications */}
            <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
              <LanguageSwitcher />

              {/* Wallet Quick Widget */}
              <Link 
                href="/worker/settlements" 
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-[#124E66]/40 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 duration-200 active:scale-95 group"
              >
                <Wallet className="h-4 w-4 !text-[#124E66]" />
                <span className="text-xs font-extrabold !text-[#124E66] font-mono">₹{walletBalance.toLocaleString('en-IN')}</span>
              </Link>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all relative border ${
                    notificationsOpen 
                      ? 'bg-[#124E66]/10 border-[#124E66]/30 !text-[#124E66]' 
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                  } shadow-sm active:scale-95 cursor-pointer`}
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#EF4444] text-[8px] font-black text-white flex items-center justify-center shadow-sm">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-50 animate-fade-in-up">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Live Feeds</h4>
                      <span className="text-[9px] font-bold text-slate-550 font-mono">{notifications.length} alerts</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 no-scrollbar">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                            <div className="h-2 w-2 rounded-full bg-[#124E66] shrink-0 mt-1.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">{n.title}</p>
                              <p className="text-[10px] text-slate-550 leading-relaxed font-semibold">{n.body}</p>
                              <span className="text-[8px] text-slate-400 font-bold block mt-1">
                                {new Date(n.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-slate-450 text-xs font-bold flex flex-col items-center gap-2">
                          <ShieldCheck className="h-8 w-8 text-slate-300" />
                          No alerts in feed
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="text-[10px] text-[#124E66] hover:text-[#206783] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Clear / Close Panel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Digital ID Card quick trigger */}
              {kycApproved && (
                <button
                  type="button"
                  onClick={() => setShowIdCardModal(true)}
                  className="h-9 px-3.5 bg-[#124E66] hover:bg-[#206783] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all select-none cursor-pointer active:scale-95 shadow-sm hidden md:flex items-center gap-1.5"
                >
                  <IdCard className="h-4 w-4" />
                  ID Card
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 bg-transparent flex flex-col justify-start relative overflow-hidden select-none">
          <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-24 lg:pb-8 flex-1">
            {children}
          </div>
        </main>
      </div>

      {/* ================= 3. MOBILE STICKY BOTTOM NAVIGATION ================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 py-3 flex items-center justify-around select-none shadow-2xl">
        <Link
          href="/worker/dashboard"
          className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
            pathname === '/worker/dashboard'
              ? 'text-[#124E66] font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-wider uppercase">Home</span>
        </Link>

        <Link
          href="/worker/jobs"
          className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
            pathname === '/worker/jobs'
              ? 'text-[#124E66] font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-wider uppercase">Jobs</span>
        </Link>

        <Link
          href="/worker/location"
          className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
            pathname === '/worker/location'
              ? 'text-[#124E66] font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-wider uppercase">Track</span>
        </Link>

        <Link
          href="/worker/settlements"
          className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
            pathname === '/worker/settlements' || pathname === '/worker/wallet'
              ? 'text-[#124E66] font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-wider uppercase">Wallet</span>
        </Link>

        <Link
          href="/worker/profile"
          className={`flex flex-col items-center gap-1.5 py-1 px-3 rounded-xl transition-all ${
            pathname === '/worker/profile' || pathname === '/worker/settings'
              ? 'text-[#124E66] font-bold scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-wider uppercase">Profile</span>
        </Link>
      </nav>

      {kycApproved && (
        <DigitalIdCardModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          worker={workerDetails}
          photoUrl={
            kycDocs.find(d => d.document_type === 'PROFILE_PHOTO')?.signedUrl 
              || kycDocs.find(d => d.document_type === 'SELFIE_VERIFICATION')?.signedUrl
          }
        />
      )}

    </div>
  );
}
