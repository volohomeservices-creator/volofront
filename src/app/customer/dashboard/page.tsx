'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { 
  Sparkles, Calendar, Briefcase, History, CreditCard, 
  Star, ArrowRight, Loader2, AlertCircle, CheckCircle, Clock, 
  ChevronRight, Zap, Wrench, Snowflake, Hammer, Bug, Droplets,
  Paintbrush, Phone, MessageSquare, Plus, ChevronLeft, 
  ShieldCheck, Send, Share2, Flame, ShieldAlert, X, MapPin, Check, HelpCircle
} from 'lucide-react';
import GoogleMap from '@/components/GoogleMap';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to load dashboard data');
  }
  return res.json();
};

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('elect')) return Zap;
  if (n.includes('plumb')) return Wrench;
  if (n.includes('ac') || n.includes('cool') || n.includes('appliance')) return Snowflake;
  if (n.includes('carpenter') || n.includes('wood')) return Hammer;
  if (n.includes('clean') || n.includes('sanit')) return Sparkles;
  if (n.includes('paint')) return Paintbrush;
  if (n.includes('pest')) return Bug;
  if (n.includes('water') || n.includes('purif')) return Droplets;
  return Sparkles;
};

const getCategoryDesc = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('elect')) return 'Fan, lights, fuses';
  if (n.includes('plumb')) return 'Leaks, taps, pipe fixes';
  if (n.includes('ac')) return 'Deep clean & gas fill';
  if (n.includes('carpenter')) return 'Door locks & furniture';
  if (n.includes('clean')) return 'Kitchen & sofa wash';
  if (n.includes('paint')) return 'Wall touch-ups & consulting';
  return 'Expert care & installations';
};

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  
  // Dashboard SWR Data Fetching
  const { data, error, isLoading } = useSWR('/api/customer/dashboard', fetcher, {
    refreshInterval: 30000 // Poll every 30 seconds
  });

  // Wallet SWR Data Fetching
  const { data: walletData } = useSWR('/api/customer/wallet', fetcher);
  const walletBalance = walletData ? Number(walletData.balance) : 0;

  // Invoices SWR Data Fetching
  const { data: invoicesData } = useSWR('/api/customer/invoices', fetcher);
  const invoicesList = invoicesData?.invoices || [];

  // Services Catalog Fetching
  const { data: servicesData } = useSWR('/api/customer/services', fetcher);
  const categoriesList = servicesData?.categories || [];

  // Favorites Fetching
  const { data: favoritesData } = useSWR('/api/customer/favorites', fetcher);
  const favoritesList = favoritesData?.favorites || [];

  // UI Interactive States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [comingSoonCategory, setComingSoonCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'upcoming' | 'recent'>('all');
  
  // Modals & Popups States
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [supportWidgetOpen, setSupportWidgetOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot', text: string }>>([
    { sender: 'bot', text: 'Hi! Need help with your booking? I am your Volo Assistant.' }
  ]);
  
  // Reschedule & Cancel Target Bookings
  const [actionLoading, setActionLoading] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [bookingToReschedule, setBookingToReschedule] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [ratingBooking, setRatingBooking] = useState<any | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [showInvoicesCenter, setShowInvoicesCenter] = useState(false);

  // Live map animation coordinate state
  const [mapCarProgress, setMapCarProgress] = useState(0);
  const [greeting, setGreeting] = useState('Hello');

  // Trigger smooth car movement animation for active journey map
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good Morning ☀️');
    else if (hrs < 17) setGreeting('Good Afternoon 🌤️');
    else setGreeting('Good Evening 🌙');

    const interval = setInterval(() => {
      setMapCarProgress((prev) => (prev >= 100 ? 0 : prev + 2));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // API Call handlers
  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/customer/bookings/${bookingToCancel.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to cancel booking');
      }
      triggerToast('Booking cancelled successfully.');
      setBookingToCancel(null);
      mutate('/api/customer/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error cancelling booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleBooking = async () => {
    if (!bookingToReschedule || !rescheduleDate) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/customer/bookings/${bookingToReschedule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: new Date(rescheduleDate).toISOString() })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to reschedule booking');
      }
      triggerToast('Booking rescheduled successfully.');
      setBookingToReschedule(null);
      mutate('/api/customer/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error rescheduling booking');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingBooking) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: ratingBooking.id,
          rating: ratingStars,
          comment: ratingComment
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit rating');
      }
      triggerToast(`Thank you for rating ${ratingBooking.service_items?.name || 'the service'}!`);
      setRatingBooking(null);
      setRatingComment('');
      mutate('/api/customer/dashboard');
    } catch (err: any) {
      alert(err.message || 'Error submitting rating');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: msg }]);
    setChatInput('');

    // Simulated Bot Responses
    setTimeout(() => {
      let reply = 'I will get our support team to look into your booking right away.';
      if (msg.toLowerCase().includes('cancel')) {
        reply = 'You can cancel any upcoming bookings directly from your Dashboard list by clicking the "Cancel Booking" button.';
      } else if (msg.toLowerCase().includes('track') || msg.toLowerCase().includes('location')) {
        reply = 'If your technician is dispatched, you will see a live GPS map on your Dashboard. You can also click "Track Live" to see the full path.';
      } else if (msg.toLowerCase().includes('plumber') || msg.toLowerCase().includes('electrician')) {
        reply = 'We support quick dispatch of Plumbers and Electricians. Select their category at the top of your dashboard to book.';
      } else if (msg.toLowerCase().includes('emergency')) {
        reply = 'If you have a critical leakage or electrical hazard, click the red "EMERGENCY BOOK" button at the bottom of the dashboard.';
      }
      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
  };


  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-450 mt-3 font-bold tracking-wider uppercase animate-pulse">Fetching premium dashboard metrics...</p>
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="bg-[#0F172A] border border-white/[0.08] p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-12 shadow-2xl">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-display font-black text-white">Failed to load Dashboard</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
          {error?.message || data?.error || 'There was a problem retrieving your dashboard data. Please try refreshing.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-[#124E66] hover:bg-[#2e5e73] rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { profileCompletion, activeBookings, recentBookings, upcomingBookingsList, user, activePromos } = data;

  const referralCode = user?.full_name ? `VOLO_${user.full_name.replace(/\s+/g, '').substring(0, 4).toUpperCase()}99` : 'VOLO_REFER_99';
  const lastWorkerBooking = recentBookings?.find((b: any) => b.status === 'COMPLETED' && b.workers?.users?.full_name);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_ASSIGNMENT':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-[#D3D9D4]/20 text-[#124E66] border border-[#124E66]/20 tracking-wider">Pending</span>;
      case 'WORKER_ASSIGNED':
      case 'WORKER_ACCEPTED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-blue-50 text-blue-600 border border-blue-200 tracking-wider">Assigned</span>;
      case 'ON_THE_WAY':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] tracking-wider animate-pulse">En Route</span>;
      case 'ARRIVED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 tracking-wider">Arrived</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-teal-50 text-teal-600 border border-teal-200 tracking-wider">In Progress</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-slate-100 text-slate-500 border border-slate-200 tracking-wider">Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-red-50 text-red-500 border border-red-200 tracking-wider line-through">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 text-[9px] font-black uppercase rounded-full bg-slate-50 text-slate-600 border border-slate-200 tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none relative">
      
      {/* Toast Alert Popup */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#0F172A] border border-white/[0.08] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-fade-in-up">
          <CheckCircle className="h-4 w-4 text-[#5CBF2A]" />
          {toastMessage}
        </div>
      )}

      {/* Grid Layout: Main section and side columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Core Interactions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* ================= 1. DASHBOARD HERO ================= */}
          <div className="bg-[#124E66] rounded-[24px] p-6 sm:p-8 relative overflow-hidden shadow-sm animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-3.5">
                <h1 className="text-2xl sm:text-[32px] font-display font-black tracking-tight leading-none text-[#FAF6EE]">
                  Good Morning ☀️, {user?.full_name?.split(' ')[0] || 'Customer'} 👋
                </h1>
                <p className="text-[13px] text-[#FAF6EE]/80 max-w-sm font-semibold leading-relaxed">
                  Need household support today? Book vetted experts instantly with live journey tracking.
                </p>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0 select-none font-display">
                <button
                  type="button"
                  onClick={() => router.push('/customer/services')}
                  className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-[16px] transition-all cursor-pointer text-center text-[#FAF6EE]"
                >
                  <Plus className="h-5 w-5 mb-1.5 text-[#FAF6EE]" strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">Book Service</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeBookings && activeBookings.length > 0) {
                      router.push(`/customer/bookings/${activeBookings[0].id}`);
                    } else {
                      triggerToast("No active bookings currently en route.");
                    }
                  }}
                  className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-[16px] transition-all cursor-pointer text-center text-[#FAF6EE]"
                >
                  <MapPin className="h-5 w-5 mb-1.5 text-[#FAF6EE]" strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">Track Tech</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/customer/bookings')}
                  className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-[16px] transition-all cursor-pointer text-center text-[#FAF6EE]"
                >
                  <History className="h-5 w-5 mb-1.5 text-[#FAF6EE]" strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">History</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvoicesCenter(true)}
                  className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-[16px] transition-all cursor-pointer text-center text-[#FAF6EE]"
                >
                  <CreditCard className="h-5 w-5 mb-1.5 text-[#FAF6EE]" strokeWidth={2.5} />
                  <span className="text-[9px] font-black uppercase tracking-widest font-mono">Payments</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= DYNAMIC PROMO CODE BANNERS CAROUSEL ================= */}
          {activePromos && activePromos.length > 0 && (
            <div className="space-y-3">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest font-mono block px-1">Exclusive Offers</span>
              
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth select-none">
                {activePromos.map((promo: any) => (
                  <div 
                    key={promo.id}
                    style={{ minWidth: '320px', maxWidth: '380px' }}
                    className="flex-1 bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-[#FAF6EE] relative overflow-hidden shadow-sm shrink-0"
                  >
                    <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
                    <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                      <div className="space-y-1">
                        <span className="bg-white/20 text-[#FAF6EE] px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono">Special Promotion</span>
                        <h3 className="font-extrabold text-[15px] leading-tight mt-1 truncate text-[#FAF6EE]">
                          {promo.description || `Get ${promo.discount_value}${promo.discount_type === 'PERCENT' ? '% Off' : ' Flat Off'} on your order!`}
                        </h3>
                        <p className="text-[10px] text-[#FAF6EE]/80 font-medium">Use coupon code at checkout to claim your discount</p>
                      </div>
                      <div className="flex items-center justify-between bg-white/10 px-4 py-2 rounded-2xl border border-white/15">
                        <span className="text-xs font-black tracking-widest font-mono text-[#FAF6EE] select-all">{promo.code}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(promo.code);
                            triggerToast(`Promo code ${promo.code} copied!`);
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors text-[#FAF6EE] cursor-pointer"
                          title="Copy Code"
                        >
                          <Check className="h-4 w-4 text-[#FAF6EE]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= 2. SERVICE CATEGORIES ================= */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest font-mono">Service Categories</span>
              <button 
                type="button" 
                onClick={() => router.push('/customer/services')}
                className="text-[11px] font-black text-[#124E66] uppercase tracking-widest flex items-center gap-1 hover:underline cursor-pointer font-mono"
              >
                All Services <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>

            {/* Horizontal Category Cards Scroller */}
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth select-none">
              {categoriesList.map((cat: any) => {
                const Icon = getCategoryIcon(cat.name);
                const desc = getCategoryDesc(cat.name);
                const hasCustomImage = cat.icon_url && cat.icon_url.startsWith('http');

                return (
                  <div
                    key={cat.id}
                    onClick={() => {
                      router.push(`/customer/services?categoryId=${cat.id}`);
                    }}
                    className="flex-shrink-0 w-[140px] h-[175px] rounded-[24px] overflow-hidden relative cursor-pointer shadow-[0_4px_15px_-4px_rgba(0,0,0,0.1)] group"
                  >
                    {/* Background Image / Slate Gradient */}
                    {hasCustomImage ? (
                      <img 
                        src={cat.icon_url} 
                        alt={cat.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Icon className="h-10 w-10 opacity-20 text-white" strokeWidth={1.5} />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent z-10" />

                    {/* Category Title & Desc */}
                    <div className="absolute inset-0 z-20 p-4 flex flex-col justify-end text-left">
                      <h4 
                        className="font-display font-black text-[13px] leading-snug truncate capitalize"
                        style={{ color: '#ffffff' }}
                      >
                        {cat.name}
                      </h4>
                      <p 
                        className="text-[9px] mt-0.5 truncate font-semibold font-mono"
                        style={{ color: '#ffffff' }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= 3. ACTIVE BOOKING & LIVE JOURNEY CARD ================= */}
          {activeBookings && activeBookings.length > 0 ? (
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest px-1 font-mono">Active Tracking</span>
              
              {activeBookings.map((b: any) => {
                const progressWidth = b.status === 'ON_THE_WAY' ? '33%' : b.status === 'ARRIVED' ? '66%' : '100%';
                const etaDesc = b.status === 'ON_THE_WAY' ? 'Arriving in 12 mins' : b.status === 'ARRIVED' ? 'Arrived at your gate' : 'Work started';

                return (
                  <div key={b.id} className="bg-white border border-slate-200 hover:border-[#124E66]/30 rounded-[20px] overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] space-y-4 p-5 transition-all">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start pb-3.5 border-b border-slate-100">
                      <div className="space-y-1.5 min-w-0">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded bg-slate-100 text-slate-700 tracking-wider">Live dispatch</span>
                        <h3 className="font-display font-black text-[15px] text-slate-900 leading-snug truncate mt-1">{b.service_items?.name || 'Home Service'}</h3>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(b.status)}
                      </div>
                    </div>

                    {/* Google Map Integration */}
                    <div className="h-44 bg-slate-100 border border-slate-200 rounded-2xl relative overflow-hidden pointer-events-none">
                      <GoogleMap 
                        customerLat={b.lat ? Number(b.lat) : 12.9716} 
                        customerLng={b.lng ? Number(b.lng) : 77.5946} 
                        workerLat={
                          b.workers?.worker_live_locations_approx?.[0]?.latitude 
                            ? Number(b.workers.worker_live_locations_approx[0].latitude) 
                            : b.workers?.worker_live_locations_approx?.latitude
                            ? Number(b.workers.worker_live_locations_approx.latitude)
                            : null
                        }
                        workerLng={
                          b.workers?.worker_live_locations_approx?.[0]?.longitude 
                            ? Number(b.workers.worker_live_locations_approx[0].longitude) 
                            : b.workers?.worker_live_locations_approx?.longitude
                            ? Number(b.workers.worker_live_locations_approx.longitude)
                            : null
                        }
                        zoom={13} 
                        workerName={b.workers?.users?.full_name || 'Technician'}
                      />

                      {/* Map overlay tags */}
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-slate-700 border border-slate-200 shadow-sm font-mono z-10">
                        ETA: 12 mins • 1.4 km
                      </div>
                      <div className="absolute bottom-3 left-3 bg-white text-slate-800 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border border-slate-200 shadow-sm flex items-center gap-1.5 font-mono z-10">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        Technician en route
                      </div>
                    </div>

                    {/* Progress track timeline */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>{etaDesc}</span>
                        <span className="font-mono">{progressWidth} complete</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-[#10B981] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: progressWidth }} />
                      </div>
                    </div>

                    {/* Technician details */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-sm uppercase text-slate-600">
                          {b.workers?.users?.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-none">{b.workers?.users?.full_name || 'Assigned Professional'}</p>
                          <span className="text-[9px] font-bold uppercase text-[#10B981] tracking-wider mt-1 block font-mono">Volo Vetted Partner</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => triggerToast(`Dialing +91 98765 43210 for ${b.workers?.users?.full_name || 'technician'}...`)}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSupportWidgetOpen(true);
                            setChatMessages(prev => [...prev, { sender: 'bot', text: `Hi, connecting you with ${b.workers?.users?.full_name || 'your technician'}. Feel free to write details here.` }]);
                          }}
                          className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Chat"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : null}

          {/* ================= 4. DASHBOARD TAB FILTER ================= */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 px-1">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest font-mono">Bookings & Services</span>
              
              <div className="flex gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'all' ? 'bg-[#D3D9D4]/40 text-[#124E66] font-mono' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'active' ? 'bg-[#D3D9D4]/40 text-[#124E66] font-mono' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'upcoming' ? 'bg-[#D3D9D4]/40 text-[#124E66] font-mono' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('recent')}
                  className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'recent' ? 'bg-[#D3D9D4]/40 text-[#124E66] font-mono' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Recent
                </button>
              </div>
            </div>

            {/* List block */}
            <div className="space-y-4">
              
              {/* Upcoming Bookings cards */}
              {(activeTab === 'all' || activeTab === 'upcoming') && upcomingBookingsList && upcomingBookingsList.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1 block font-mono">Scheduled Upcoming</span>
                  {upcomingBookingsList.map((b: any) => (
                    <div key={b.id} className="bg-white border border-slate-200 rounded-[20px] p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between gap-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5">
                          <h4 className="font-display font-bold text-sm text-slate-900 leading-snug">{b.service_items?.name || 'Scheduled Service'}</h4>
                          <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-slate-500 font-semibold font-mono">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(b.scheduled_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {new Date(b.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {b.address_line}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(b.status)}
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3.5 border-t border-slate-100 select-none">
                        <button
                          type="button"
                          onClick={() => setBookingToCancel(b)}
                          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Cancel Booking
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBookingToReschedule(b);
                            setRescheduleDate(b.scheduled_at ? b.scheduled_at.substring(0,16) : '');
                          }}
                          className="px-3.5 py-2 bg-[#124E66]/10 hover:bg-[#124E66]/20 border border-[#124E66]/25 text-[#124E66] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          Reschedule
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Services completed jobs */}
              {(activeTab === 'all' || activeTab === 'recent') && recentBookings && recentBookings.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider px-1 block font-mono">Recent Completed / Cancelled</span>
                  <div className="bg-white border border-slate-200 rounded-[20px] overflow-hidden shadow-sm divide-y divide-slate-100">
                    {recentBookings.filter((b: any) => b.status === 'COMPLETED' || b.status === 'CANCELLED').map((b: any) => (
                      <div key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="font-display font-bold text-xs text-slate-900 truncate leading-none">{b.service_items?.name || 'Home Maintenance'}</h4>
                          <span className="text-[10px] text-slate-500 block font-bold leading-none font-mono">
                            {new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {b.address_line}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {getStatusBadge(b.status)}

                          {b.status === 'COMPLETED' && (
                            <div className="flex items-center gap-2 select-none">
                              <button
                                type="button"
                                onClick={() => setRatingBooking(b)}
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-amber-500 hover:text-amber-600 transition-colors cursor-pointer"
                                title="Rate Service"
                              >
                                <Star className="h-4 w-4 fill-amber-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => triggerToast(`Rebooking ${b.service_items?.name}...`)}
                                className="px-3.5 py-2 bg-[#124E66] hover:bg-[#2e5e73] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-orange-500/20"
                              >
                                Rebook
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No items fallback */}
              {activeTab === 'active' && activeBookings.length === 0 && (
                <p className="text-[11px] text-slate-400 italic font-semibold text-center py-8 font-mono">No active bookings scheduled currently.</p>
              )}
            </div>
          </div>

          {/* ================= 5. AI SMART RECOMMENDATIONS ================= */}
          {categoriesList && categoriesList.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-[24px] p-5 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/40 blur-2xl rounded-full" />
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="h-12 w-12 rounded-[16px] bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 shadow-sm">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest leading-none block font-mono">AI Recommendation Engine</span>
                  <h4 className="font-display font-black text-slate-900 text-base leading-snug">{categoriesList[0]?.name || 'Home Maintenance'} Recommended</h4>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Based on your home profile, we recommend checking out our top-rated {categoriesList[0]?.name?.toLowerCase() || 'maintenance'} professionals to keep everything running smoothly.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push(`/customer/services?categoryId=${categoriesList[0]?.id}`)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20 mt-1"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar Widgets */}
        <div className="space-y-6">
          
          {/* ================= 8. EMERGENCY SERVICE DISPATCH ================= */}
          <div className="bg-[#FFF1F2] border border-red-100 rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] space-y-4 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2.5 text-slate-900">
              <Flame className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
              <h3 className="font-display font-black text-[15px] tracking-tight leading-none">Volo Emergency Help</h3>
            </div>
            
            <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
              Critical pipeline burst or major power failure? Confirm emergency dispatch of the nearest technician in 15 mins.
            </p>

            <button
              type="button"
              onClick={() => setEmergencyModalOpen(true)}
              className="w-full py-3.5 bg-white text-red-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-sm border border-red-200 cursor-pointer hover:bg-red-50"
            >
              Emergency Book (15 Min Dispatch)
            </button>
          </div>

          {/* ================= 8.5 VOLO WALLET WIDGET ================= */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-950 rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(99,102,241,0.15)] space-y-4 text-white animate-fade-in-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-400" />
                <h3 className="font-display font-black text-[13px] uppercase tracking-wider font-mono !text-white">Volo Wallet</h3>
              </div>
              <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 !text-white/80 border border-white/5 tracking-wider font-mono">Live Balance</span>
            </div>

            <div className="space-y-1">
              <p className="text-3xl font-black font-sans !text-white">₹{walletBalance.toLocaleString('en-IN')}</p>
              <p className="text-[10px] !text-white/70 font-semibold leading-relaxed">Use Volo Wallet for quick service booking checkouts and hassle-free instant refunds.</p>
            </div>

            <button
              type="button"
              onClick={async () => {
                const amountStr = window.prompt("Enter top up amount (₹):", "1000");
                if (!amountStr) return;
                const amount = parseFloat(amountStr);
                if (isNaN(amount) || amount <= 0) {
                  alert("Please enter a valid amount.");
                  return;
                }
                try {
                  setActionLoading(true);
                  const res = await fetch('/api/customer/wallet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount })
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to top up wallet');
                  }
                  triggerToast(`Successfully topped up ₹${amount}!`);
                  mutate('/api/customer/wallet');
                } catch (err: any) {
                  alert(err.message || 'Error topping up wallet');
                } finally {
                  setActionLoading(false);
                }
              }}
              className="w-full py-3 bg-white text-indigo-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer border border-transparent font-mono font-bold"
            >
              Add Funds
            </button>
          </div>

          {/* ================= 9. PROFILE COMPLETION CHECKLIST ================= */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] space-y-5 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest font-mono">Profile Completeness</span>
              <span className="text-xs font-black text-slate-900 font-mono">{profileCompletion}%</span>
            </div>

            {/* Checklist items */}
            <div className="space-y-3.5 text-[11px] font-semibold text-slate-600 select-none">
              <div className="flex items-center gap-3">
                <Check className="h-4 w-4 text-[#10B981] stroke-[3]" />
                <span className="line-through text-slate-400">Phone Verified</span>
              </div>
              <div className="flex items-center gap-3">
                {profileCompletion >= 50 ? (
                  <Check className="h-4 w-4 text-[#10B981] stroke-[3]" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
                <span className={profileCompletion >= 50 ? 'line-through text-slate-400' : 'text-slate-700'}>Default Address Added</span>
              </div>
              <div className="flex items-center gap-3">
                {data?.user?.email ? (
                  <Check className="h-4 w-4 text-[#10B981] stroke-[3]" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
                <span className={data?.user?.email ? 'line-through text-slate-400' : 'text-slate-700'}>Email Address Linked</span>
              </div>
              <div className="flex items-center gap-3">
                {data?.user?.avatar_url ? (
                  <Check className="h-4 w-4 text-[#10B981] stroke-[3]" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                )}
                <span className={data?.user?.avatar_url ? 'line-through text-slate-400' : 'text-slate-700'}>Profile Avatar Uploaded</span>
              </div>
            </div>

            {/* Checklist progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
              <div className="bg-[#10B981] h-full rounded-full transition-all duration-1000" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>

          {/* ================= 11. REFERRAL SHARE CARD ================= */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Share2 className="h-4 w-4 text-[#124E66]" strokeWidth={2.5} />
              <h4 className="font-display font-black text-sm">Share Referral Program</h4>
            </div>
            
            <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
              Earn 500 reward points on your next booking when your friends sign up and complete their first task.
            </p>

            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-3 justify-between mt-2">
              <span className="text-[11px] font-black text-slate-900 font-mono tracking-wider">{referralCode}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(referralCode);
                  triggerToast('Referral code copied to clipboard!');
                }}
                className="text-[10px] font-black text-[#124E66] uppercase tracking-wider hover:underline cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          {/* ================= 12. PREVIOUS TECHNICIAN REBOOK ================= */}
          {lastWorkerBooking && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-3 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Rebook Technician</span>
                <button 
                  type="button" 
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await fetch('/api/customer/favorites', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ worker_id: lastWorkerBooking.workers.id, action: 'ADD' })
                      });
                      mutate('/api/customer/favorites');
                      triggerToast(`Added ${lastWorkerBooking.workers.users.full_name} to favorites!`);
                    } catch (err) {}
                  }}
                  className="text-[10px] font-black text-[#124E66] uppercase tracking-wider hover:underline"
                >
                  Favorite
                </button>
              </div>
              
              <div className="flex items-center justify-between gap-3 p-2.5 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-200 cursor-pointer" onClick={() => triggerToast(`Assigning ${lastWorkerBooking.workers.users.full_name} to your task booking...`)}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-sm text-slate-600 font-mono border border-slate-200">
                    {lastWorkerBooking.workers.users.full_name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-900 leading-none">{lastWorkerBooking.workers.users.full_name}</h5>
                    <span className="text-[10px] font-bold text-slate-500 mt-1 block font-mono">{lastWorkerBooking.service_items?.name || 'Home Maintenance'} • ⭐ 4.9</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          )}

          {/* ================= 13. MY DREAM TEAM (FAVORITES) ================= */}
          {favoritesList && favoritesList.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-3 animate-fade-in-up" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-[#124E66] fill-[#124E66]" />
                <span className="text-[11px] font-bold uppercase text-slate-600 tracking-wider font-mono">My Dream Team</span>
              </div>
              
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                {favoritesList.map((fav: any) => (
                  <div key={fav.id} className="flex-shrink-0 w-[104px] bg-slate-50 border border-slate-200 rounded-[20px] p-4 flex flex-col items-center justify-center gap-2.5 cursor-pointer hover:bg-slate-100 transition-colors relative" onClick={() => triggerToast(`Requesting ${fav.workers.users.full_name} for your next booking...`)}>
                    
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await fetch('/api/customer/favorites', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ worker_id: fav.worker_id, action: 'REMOVE' })
                          });
                          mutate('/api/customer/favorites');
                        } catch (err) {}
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-slate-200"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center font-black text-sm text-slate-600 uppercase mt-1 border border-slate-300">
                      {fav.workers.users.full_name.charAt(0)}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-900 truncate w-[80px]">{fav.workers.users.full_name.split(' ')[0]}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate w-[80px]">{fav.workers.service_categories?.name || 'Expert'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ================= INVOICE CENTER MODAL ================= */}
      {showInvoicesCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-display font-black text-slate-900">Digital Invoice Center</h3>
              <button onClick={() => setShowInvoicesCenter(false)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"><X className="h-4 w-4 text-slate-500" /></button>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
              {invoicesList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8 font-mono">No invoices available yet.</p>
              ) : (
                invoicesList.map((inv: any) => (
                  <div key={inv.id} className="py-3.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{inv.service_items?.name || 'Service'} <span className="text-slate-500">(#{inv.id.substring(0, 8).toUpperCase()})</span></p>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">
                        Date: {new Date(inv.created_at).toLocaleDateString()} • Amount: ₹{Number(inv.total_amount || inv.amount || 0).toFixed(0)}
                      </span>
                    </div>
                    <button
                      onClick={() => triggerToast(`Downloading invoice for ${inv.service_items?.name || 'service'}...`)}
                      className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 text-[10px] font-black uppercase rounded-[10px] transition-colors cursor-pointer font-mono"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= COMING SOON MODAL ================= */}
      {comingSoonCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-4 text-center animate-fade-in-up">
            <div className="h-12 w-12 rounded-2xl bg-[#D3D9D4]/20 border border-[#124E66]/20 flex items-center justify-center mx-auto text-[#124E66]">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="font-display font-black text-slate-900 text-base">{comingSoonCategory} is arriving soon!</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold max-w-xs mx-auto">
              Our team is vetting and certifying top professional partners in your city. Be the first to know when we launch!
            </p>
            <div className="flex gap-2.5 pt-2 select-none">
              <button
                type="button"
                onClick={() => setComingSoonCategory(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerToast(`We will notify you when ${comingSoonCategory} is live!`);
                  setComingSoonCategory(null);
                }}
                className="flex-1 py-2.5 bg-[#124E66] hover:bg-[#2e5e73] text-white text-xs font-black uppercase rounded-xl cursor-pointer"
              >
                Notify Me
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CANCEL CONFIRM MODAL ================= */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="font-display font-black text-slate-900 text-base">Cancel Booking?</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to cancel your upcoming service booking? This action is reversible.
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-[10px] text-red-600 font-bold leading-normal font-mono select-none">
              ⚠️ Prior Notice: You can only cancel this service within 2 minutes of booking.
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESCHEDULE MODAL ================= */}
      {bookingToReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-4">
            <h3 className="font-display font-black text-slate-900 text-base">Reschedule Booking</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Select New Date & Time</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-[#124E66]"
              />
              <span className="text-[8px] text-[#124E66] font-semibold font-mono leading-relaxed block pl-1">
                * Reschedule Notice: Bookings can only be rescheduled or cancelled within 2 minutes of the initial booking creation.
              </span>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBookingToReschedule(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleBooking}
                disabled={actionLoading || !rescheduleDate}
                className="flex-1 py-2.5 bg-[#124E66] hover:bg-[#2e5e73] text-white text-xs font-black uppercase rounded-xl cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save New Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RATING SERVICE MODAL ================= */}
      {ratingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
          <form onSubmit={handleSubmitRating} className="w-full max-w-sm bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-4">
            <h3 className="font-display font-black text-slate-900 text-base">Rate Completed Service</h3>
            
            {/* Rating Stars Selection */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingStars(star)}
                  className="focus:outline-none cursor-pointer"
                >
                  <Star className={`h-8 w-8 ${star <= ratingStars ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Share feedback</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Describe your service partner's professionalism and skill..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#124E66] resize-none leading-relaxed"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRatingBooking(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-[#124E66] hover:bg-[#2e5e73] text-white text-xs font-black uppercase rounded-xl cursor-pointer shadow-sm"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= EMERGENCY MODAL ================= */}
      {emergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm select-none">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-500">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="font-display font-black text-slate-900 text-base">Confirm Emergency Dispatch?</h3>
            <p className="text-xs text-red-600 font-medium leading-relaxed max-w-xs mx-auto">
              Our support team will call you back within 1 min to coordinate arrival. Dispatching closest available plumber/electrician immediately.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEmergencyModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerToast('Emergency dispatch confirmed! Volo support is calling...');
                  setEmergencyModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase rounded-xl cursor-pointer shadow-sm"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ================= FLOATING CHAT WIDGET ================= */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none">
        
        {/* Chat Window Panel */}
        {supportWidgetOpen && (
          <div className="w-80 bg-white border border-slate-200 rounded-[24px] shadow-xl flex flex-col overflow-hidden animate-fade-in-up font-sans">
            
            {/* Window header */}
            <div className="bg-[#124E66] p-4 text-white flex justify-between items-center border-b border-[#124E66]/20">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                <h4 className="text-xs font-black uppercase tracking-wider font-mono">Volo Assistant</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setSupportWidgetOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body messages area */}
            <div className="h-60 overflow-y-auto p-4 space-y-3.5 bg-slate-50">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[11px] font-semibold leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#124E66] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input form */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 flex gap-2 bg-white">
              <input
                type="text"
                placeholder="Ask support chatbot..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-semibold text-slate-900 outline-none focus:border-[#124E66]"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 bg-[#124E66] hover:bg-[#2e5e73] disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>

          </div>
        )}

        {/* Float action trigger button */}
        <button
          type="button"
          onClick={() => setSupportWidgetOpen(!supportWidgetOpen)}
          className="h-12 w-12 rounded-full bg-[#124E66] hover:bg-[#2e5e73] border border-white/[0.08] text-white flex items-center justify-center shadow-lg shadow-orange-500/20 cursor-pointer transition-all hover-scale"
          title="Customer Support Assistant"
        >
          {supportWidgetOpen ? <X className="h-5 w-5 animate-rotate-glow" /> : <HelpCircle className="h-5 w-5 animate-pulse-slow" />}
        </button>
      </div>

    </div>
  );
}
