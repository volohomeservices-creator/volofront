'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, User, MapPin, Sparkles, Briefcase, History, 
  CreditCard, Star, Settings, LogOut, Bell, Search, Wallet, Gift, ShieldCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import GoogleTranslate from '@/components/shared/GoogleTranslate';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: LayoutDashboard },
  { name: 'Services', href: '/customer/services', icon: Sparkles },
  { name: 'My Bookings', href: '/customer/bookings', icon: Briefcase },
  { name: 'Volo Wallet', href: '/customer/wallet', icon: Wallet },
  { name: 'Addresses', href: '/customer/addresses', icon: MapPin },
  { name: 'Profile', href: '/customer/profile', icon: User },
  { name: 'History', href: '/customer/booking-history', icon: History },
  { name: 'Invoices', href: '/customer/invoices', icon: CreditCard },
  { name: 'My Reviews', href: '/customer/reviews', icon: Star },
  { name: 'Settings', href: '/customer/settings', icon: Settings },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Fetch wallet balance
  const { data: walletData } = useSWR('/api/customer/wallet', fetcher);
  const walletBalance = walletData ? Number(walletData.balance) : 0;
  
  // Dropdown / Navigation states
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync sidebar collapse state from localStorage on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customer_sidebar_collapsed');
      if (stored) setSidebarCollapsed(stored === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('customer_sidebar_collapsed', String(nextVal));
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    async function fetchNotifications() {
      try {
        const res = await fetch('/api/customer/alerts');
        if (!res.ok) {
          if (res.status === 401) return; // ignore unauthorized gracefully
          throw new Error('Failed to fetch notifications');
        }
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (err) {
        // Ignore silent session errors to avoid console pollution
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleClearNotifications = async () => {
    try {
      const res = await fetch('/api/customer/alerts', { method: 'DELETE' });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    } finally {
      setNotifOpen(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/customer/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'customer') {
          const fallback = data.user?.role === 'admin' ? '/admin/dashboard' : '/worker/dashboard';
          router.push(fallback);
          return;
        }
        setUser(data.user);
        setLoading(false);
      } catch (err) {
        console.error('Error verifying customer layout auth:', err);
        router.push('/customer/login');
      }
    }
    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/customer/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/customer/services?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#D3D9D4]/25 flex flex-col items-center justify-center text-[#124E66]">
        <span className="h-10 w-10 border-4 border-[#124E66]/10 border-t-[#124E66] rounded-full animate-spin shadow-sm" />
        <p className="text-xs text-slate-650 mt-4 font-semibold tracking-wider uppercase animate-pulse">Checking authorization status...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D3D9D4]/20 text-slate-900 flex font-sans antialiased selection:bg-[#124E66]/10 selection:text-[#124E66]">
      <GoogleTranslate />
      
      {/* ================= 1. DESKTOP STICKY LEFT SIDEBAR ================= */}
      <aside className={`hidden lg:flex bg-white flex-col shrink-0 border-r border-slate-200 select-none relative transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        
        {/* Floating Collapse Toggle Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3.5 top-5 z-50 h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-md text-slate-500 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            <span className="font-display font-black text-lg tracking-tight !text-[#124E66] leading-none">VOLO</span>
            <span className="text-[8px] font-bold uppercase !text-slate-450 tracking-widest mt-0.5 leading-none font-mono">Client Portal</span>
          </div>
        </div>

        {/* Profile preview card */}
        <div className={`p-4 mt-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3 z-10 select-none transition-all duration-300 ${
          sidebarCollapsed ? 'mx-2 justify-center p-2.5' : 'mx-4'
        }`}>
          <div className="h-9 w-9 rounded-full bg-[#124E66]/10 flex items-center justify-center text-xs font-black uppercase !text-[#124E66] border border-slate-100 shrink-0">
            {user?.full_name?.charAt(0) || 'C'}
          </div>
          <div className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            <p className="text-xs font-black !text-slate-900 truncate leading-tight">{user?.full_name || 'Customer'}</p>
            <p className="text-[8px] !text-slate-450 font-bold font-mono truncate mt-0.5">{user?.email || 'customer@volo.com'}</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className={`flex-1 py-6 pr-1 space-y-1.5 overflow-y-auto z-10 no-scrollbar ${
          sidebarCollapsed ? 'pl-0' : 'pr-3'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/customer/dashboard' && pathname.startsWith(item.href));
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
                    ? 'bg-[#124E66]/10 border-[#124E66] !text-[#124E66] font-black'
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
        <div className="p-4 border-t border-slate-100 z-10 shrink-0">
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
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ================= 2. MAIN CONTAINER ================= */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative overflow-x-hidden">
        
        {/* Sticky top headers */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/60 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.03)] select-none shrink-0">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            
            {/* Mobile Branding (only visible when sidebar is collapsed) */}
            <div className="flex lg:hidden items-center gap-3 shrink-0">
              <Image 
                src="/images/logo.jpeg" 
                alt="VOLO Logo" 
                width={32}
                height={32}
                priority
                className="h-8 w-8 rounded-lg object-contain border border-slate-100 shadow-sm" 
              />
              <div className="flex flex-col">
                <span className="font-display font-black text-md tracking-tight text-slate-900 leading-none">VOLO</span>
                <span className="text-[7px] font-bold uppercase text-slate-500 tracking-widest mt-0.5 leading-none font-mono">Portal</span>
              </div>
            </div>

            {/* Center search bar (takes space on desktop) */}
            <div className="hidden sm:flex flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-[#124E66] transition-colors" />
              <input
                type="text"
                placeholder="Search home repairs, cleaning, plumbing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchSubmit}
                className="w-full bg-slate-50 border border-slate-250 focus:border-[#124E66]/50 focus:ring-4 focus:ring-teal-500/5 rounded-full pl-11 pr-4 py-2.5 text-[13px] font-medium text-slate-900 placeholder-slate-400 outline-none transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]"
              />
            </div>

            {/* Right side status items */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              
              <LanguageSwitcher />

              {/* Wallet quick balance */}
              <Link
                href="/customer/wallet"
                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[#D3D9D4]/20 text-[#124E66] rounded-full hover:bg-[#D3D9D4]/40 transition-all text-xs font-bold cursor-pointer"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span className="font-mono text-[#124E66] hidden sm:inline">
                  ₹{walletBalance.toFixed(2)}
                </span>
              </Link>

              {/* Alerts bell drop popup */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setProfileMenuOpen(false);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-all relative cursor-pointer active:scale-95"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.some(n => !n.is_read) && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#124E66]" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-82 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 py-4 z-50 animate-fade-in-up">
                    <div className="px-4 pb-3 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">Notifications</span>
                      <button 
                        type="button" 
                        onClick={handleClearNotifications} 
                        className="text-[10px] font-black text-[#124E66] hover:underline cursor-pointer"
                      >
                        Dismiss All
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-3.5 hover:bg-slate-50 text-left cursor-pointer transition-colors" onClick={() => setNotifOpen(false)}>
                            <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-relaxed">{notif.body}</p>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 font-semibold font-mono">
                          No new notifications
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile profile drop popup menu */}
              <div className="relative lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(!profileMenuOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-100 border border-slate-200 rounded-full transition-all cursor-pointer active:scale-95"
                >
                  <div className="h-7 w-7 rounded-full bg-[#D3D9D4]/40 flex items-center justify-center text-[11px] font-black uppercase text-[#124E66]">
                    {user?.full_name?.charAt(0) || 'C'}
                  </div>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 py-3 z-50 animate-fade-in-up text-left select-none">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-900 truncate">{user?.full_name || 'Customer'}</p>
                      <p className="text-[10px] text-slate-500 font-bold truncate font-mono mt-0.5">{user?.email || 'customer@volo.com'}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/customer/dashboard" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-slate-400" /> Dashboard
                      </Link>
                      <Link href="/customer/services" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Sparkles className="h-4 w-4 text-slate-400" /> Book Services
                      </Link>
                      <Link href="/customer/bookings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Briefcase className="h-4 w-4 text-slate-400" /> Manage Bookings
                      </Link>
                      <Link href="/customer/addresses" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <MapPin className="h-4 w-4 text-slate-400" /> Addresses
                      </Link>
                      <Link href="/customer/wallet" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Wallet className="h-4 w-4 text-[#124E66]" /> Volo Wallet
                      </Link>
                      <Link href="/customer/rewards" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Gift className="h-4 w-4 text-yellow-500" /> Volo Rewards
                      </Link>
                      <Link href="/customer/prime" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Star className="h-4 w-4 text-amber-500" /> Volo Prime
                      </Link>
                      <Link href="/customer/settings" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                        <Settings className="h-4 w-4 text-slate-400" /> Account Settings
                      </Link>
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="h-4 w-4 text-red-400" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ================= PAGE CONTENTS ================= */}
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-12 animate-fade-in-up">
          {children}
        </main>

        {/* ================= MOBILE BOTTOM TAB NAVIGATION ================= */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-35 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-3 py-3 flex items-center justify-around select-none shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl shrink-0">
          <Link
            href="/customer/dashboard"
            className={`flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all ${
              pathname === '/customer/dashboard'
                ? 'text-[#124E66] scale-105 font-black bg-[#D3D9D4]/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Home</span>
          </Link>
          
          <Link
            href="/customer/bookings"
            className={`flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all ${
              pathname === '/customer/bookings' || pathname === '/customer/booking-history'
                ? 'text-[#124E66] scale-105 font-black bg-[#D3D9D4]/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Bookings</span>
          </Link>

          <Link
            href="/customer/bookings"
            className={`flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all ${
              pathname.includes('/customer/bookings/')
                ? 'text-[#124E66] scale-105 font-black bg-[#D3D9D4]/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Track</span>
          </Link>

          <Link
            href="/customer/wallet"
            className={`flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all ${
              pathname === '/customer/wallet'
                ? 'text-[#124E66] scale-105 font-black bg-[#D3D9D4]/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Wallet</span>
          </Link>

          <Link
            href="/customer/profile"
            className={`flex flex-col items-center gap-1.5 py-2 px-4 rounded-2xl transition-all ${
              pathname === '/customer/profile'
                ? 'text-[#124E66] scale-105 font-black bg-[#D3D9D4]/20'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">Profile</span>
          </Link>
        </nav>
      </div>

    </div>
  );
}
