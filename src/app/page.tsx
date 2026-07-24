'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ConfirmationResult } from 'firebase/auth';
import { sendOtp, verifyOtp, initializePhoneAuth, cleanupPhoneAuth } from '@/lib/firebase-client';
import { cleanupEnterpriseRecaptcha } from '@/lib/recaptcha-client';
import {
  Briefcase, User, Phone, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, ChevronRight, Loader2, Sparkles, Lock,
  Wrench, Zap, Snowflake, Hammer, Star, ChevronDown, ArrowRight,
  Award, Mail, MapPin, PhoneCall, Check, Play, Apple, X,
  Users, Search, Shield, ChevronLeft, CheckCircle, BookOpen, TrendingUp
} from 'lucide-react';

const PHONE_REGEX = /^\+91[6-9]\d{9}$/;

interface ServiceItem {
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  price: string;
  color: string;
  badge: string;
}

const PRESET_SERVICES: ServiceItem[] = [
  { name: 'Electrical Repair', desc: 'Fan installation, short circuit fixes, switchboard mounts', icon: Zap, price: '₹149', color: 'bg-[#124E66]/10 text-[#124E66] border-orange-150/60', badge: 'Popular' },
  { name: 'Plumbing Works', desc: 'Leakage repairs, tap fixes, pipe installations', icon: Wrench, price: '₹199', color: 'bg-blue-50 text-[#124E66] border-blue-150/60', badge: 'Best Rate' },
  { name: 'AC Service & Repair', desc: 'Filter cleaning, gas filling, complete diagnostics and repair', icon: Snowflake, price: '₹349', color: 'bg-teal-50 text-[#0D9488] border-teal-150/60', badge: 'Summer Peak' },
  { name: 'Carpentry & Fittings', desc: 'Door alignments, lock changes, modular furniture fixes', icon: Hammer, price: '₹199', color: 'bg-amber-50 text-[#B45309] border-amber-150/60', badge: 'Certified' },
  { name: 'Cleaning & Sanitization', desc: 'Bathroom deep clean, kitchen scrub, sofa vacuuming', icon: Sparkles, price: '₹299', color: 'bg-purple-50 text-[#7C3AED] border-purple-150/60', badge: 'Top Rated' },
  { name: 'Home Safety Systems', desc: 'Smart lock install, CCTV setups, video door bell configs', icon: Lock, price: '₹499', color: 'bg-emerald-50 text-[#059669] border-emerald-150/60', badge: 'Secure' }
];

const CITIES = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune'];
let cachedCatalog: any = null;

export default function HomeLandingPage() {
  // Navigation & UI States
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Bangalore');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [selectedFaqCategory, setSelectedFaqCategory] = useState('All');

  // Auth states
  const [selectedRole, setSelectedRole] = useState<'customer' | 'worker'>('customer');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [authStep, setAuthStep] = useState<'PHONE' | 'OTP' | 'SET_PIN' | 'ENTER_PIN'>('PHONE');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [inputPin, setInputPin] = useState('');
  const [pinSetup, setPinSetup] = useState('');
  const [pinLength, setPinLength] = useState<4 | 6>(4);
  const [redirectToUrl, setRedirectToUrl] = useState('');
  const [isPinSetupFocused, setIsPinSetupFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [activePromo, setActivePromo] = useState<any>(null);

  useEffect(() => {
    // 1. Pre-initialize and render reCAPTCHA immediately on mount
    console.log('[Phone Auth] Component Mounted. Pre-loading RecaptchaVerifier...');
    initializePhoneAuth().catch(err => console.error('Failed to pre-load auth:', err));

    // 2. React Strict Mode / Unmount Cleanup
    return () => {
      console.log('[Phone Auth] Cleaning verifier on unmount');
      cleanupPhoneAuth();
    };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authStep === 'OTP' && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authStep, resendCountdown]);

  useEffect(() => {
    async function loadServicesCatalog() {
      if (cachedCatalog) {
        setCategories(cachedCatalog.categories || []);
        setServices(cachedCatalog.items || []);
        setActivePromo(cachedCatalog.activePromo || null);
        setLoadingServices(false);

        // Silent background update to keep cache fresh
        try {
          const res = await fetch('/api/customer/services');
          if (res.ok) {
            const data = await res.json();
            cachedCatalog = data;
            setCategories(data.categories || []);
            setServices(data.items || []);
            setActivePromo(data.activePromo || null);
          }
        } catch (e) {
          console.error('[Observability] Background catalog refresh failed:', e);
        }
        return;
      }

      try {
        const res = await fetch('/api/customer/services');
        if (res.ok) {
          const data = await res.json();
          cachedCatalog = data;
          setCategories(data.categories || []);
          setServices(data.items || []);
          setActivePromo(data.activePromo || null);
        }
      } catch (err) {
        console.error('Failed to load dynamic service catalog:', err);
      } finally {
        setLoadingServices(false);
      }
    }
    loadServicesCatalog();
  }, []);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const pinSetupInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect closest location on mount using browser Geolocation API or IP lookup fallback
  useEffect(() => {
    async function detectLocation() {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = position.coords.latitude;
              const lon = position.coords.longitude;
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                headers: { 'User-Agent': 'VOLO-HomeServices-App' }
              });
              if (res.ok) {
                const data = await res.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state;
                if (city) {
                  setSelectedLocation(city);
                  return;
                }
              }
            } catch (e) {
              console.error('Reverse geocoding failed, trying IP lookup fallback...', e);
            }
            fetchIpLocation();
          },
          (error) => {
            console.log('GPS access declined/failed, trying IP lookup...');
            fetchIpLocation();
          },
          { enableHighAccuracy: false, timeout: 2500, maximumAge: 86400000 }
        );
      } else {
        fetchIpLocation();
      }
    }

    async function fetchIpLocation() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.city) {
            setSelectedLocation(data.city);
          }
        }
      } catch (err) {
        console.warn('[Location] IP lookup timed out or failed, defaulting to Bangalore.');
        setSelectedLocation('Bangalore');
      }
    }

    detectLocation();
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const clean10Digits = phoneNumber.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${clean10Digits}`;
    if (clean10Digits.length !== 10) {
      setAuthError('Enter a valid 10-digit Indian mobile number');
      setAuthLoading(false);
      return;
    }

    try {
      // 1. Pre-check if account exists & has a PIN set
      try {
        const preCheckRes = await fetch('/api/auth/pre-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(6000),
          body: JSON.stringify({ phone: formattedPhone })
        });

        if (preCheckRes.ok) {
          const preCheckData = await preCheckRes.json();
          if (preCheckData.authMethod === 'pin_required' && preCheckData.isRegistered) {
            // Existing member with PIN set -> Redirect directly to PIN login!
            setInputPin('');
            setAuthStep('ENTER_PIN');
            setAuthLoading(false);
            return;
          }
        }
      } catch (preCheckErr) {
        console.warn('[Pre-Check] Pre-check call failed/timed out, proceeding with OTP:', preCheckErr);
      }

      // 2. Send Firebase OTP for new user or account without PIN
      console.log("Sending OTP to:", formattedPhone);
      const result = await sendOtp(formattedPhone);
      confirmationResultRef.current = result;
      setAuthSuccess('Code sent successfully.');
      setResendCountdown(30);
      setAuthStep('OTP');
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-phone-number') {
        setAuthError('Enter a valid 10-digit Indian mobile number');
      } else if (firebaseError.code === 'auth/too-many-requests') {
        setAuthError('Too many attempts. Try again after 10 minutes.');
      } else if (firebaseError.code === 'auth/invalid-app-credential') {
        setAuthError('App credential verification failed (auth/invalid-app-credential). Please verify your Firebase authorized domains, API Key restrictions, or ensure the Blaze plan is active.');
      } else {
        setAuthError('Could not send verification code. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || authLoading) return;
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const clean10Digits = phoneNumber.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${clean10Digits}`;
    try {
      console.log("Resending OTP to:", formattedPhone);
      const result = await sendOtp(formattedPhone);
      confirmationResultRef.current = result;
      setAuthSuccess('New verification code sent successfully.');
      setResendCountdown(30);
    } catch (err: unknown) {
      console.error('Resend OTP error:', err);
      setAuthError('Failed to resend code. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    const clean10Digits = phoneNumber.replace(/\D/g, '').slice(-10);
    const formattedPhone = `+91${clean10Digits}`;

    try {
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          phone: formattedPhone,
          pin: inputPin
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setAuthError(data.error || 'Invalid PIN. Please check and try again.');
        return;
      }

      setAuthSuccess('Login successful! Redirecting...');
      const targetUrl = data.redirectTo || (selectedRole === 'worker' ? '/worker/dashboard' : '/customer/dashboard');
      window.location.replace(targetUrl);
    } catch (err: any) {
      setAuthError(err?.message || 'PIN verification failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    if (otpValue.length !== 6) {
      setAuthError('Enter a 6-digit confirmation code.');
      setAuthLoading(false);
      return;
    }

    try {
      if (!confirmationResultRef.current) {
        throw new Error('NO_CONFIRMATION_RESULT');
      }

      const idToken = await verifyOtp(confirmationResultRef.current, otpValue);

      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          idToken,
          role: selectedRole
        })
      });

      let data: any;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (jsonErr) {
        if (response.status === 503 || response.status === 502) {
          setAuthError('Backend service is temporarily restarting. Please wait a few seconds and try again.');
        } else {
          setAuthError('Server communication error. Please try again.');
        }
        return;
      }

      if (!response.ok) {
        const errCode = data?.error || 'FIREBASE_TOKEN_INVALID';
        mapServerErrors(errCode);
        return;
      }

      if (data.promptPinSetup) {
        setRedirectToUrl(data.redirectTo || (selectedRole === 'worker' ? '/worker/dashboard' : '/customer/dashboard'));
        setAuthStep('SET_PIN');
      } else {
        setAuthSuccess('Login successful! Redirecting...');
        window.location.replace(data.redirectTo || (selectedRole === 'worker' ? '/worker/dashboard' : '/customer/dashboard'));
      }
    } catch (err: unknown) {
      console.error(err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === 'auth/invalid-verification-code') {
        setAuthError('Incorrect OTP code.');
      } else if (firebaseError.code === 'auth/code-expired') {
        setAuthError('OTP expired. Request a new one.');
      } else {
        setAuthError((err as Error)?.message || 'Verification failed. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    if (pinSetup.length !== pinLength) {
      setAuthError(`Please enter exactly ${pinLength} digits`);
      setAuthLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinSetup })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.error || 'Failed to set PIN. Please try again.');
        setAuthLoading(false);
        return;
      }

      setAuthSuccess('PIN configured successfully! Redirecting...');
      window.location.replace(redirectToUrl || (selectedRole === 'worker' ? '/worker/dashboard' : '/customer/dashboard'));
    } catch (err) {
      console.error(err);
      setAuthError('Failed to set PIN. Please try again.');
      setAuthLoading(false);
    }
  };

  const mapServerErrors = (code: string) => {
    switch (code) {
      case 'INVALID_PHONE':
        setAuthError('Enter a valid 10-digit Indian mobile number');
        break;
      case 'ACCOUNT_BLOCKED':
        setAuthError('Account suspended. Contact support.');
        break;
      case 'INACTIVE_WORKER':
        setAuthError('Account inactive. Contact support.');
        break;
      case 'KYC_REJECTED':
        setAuthError('KYC status rejected. Support: help@volo.in');
        break;
      case 'UNAUTHORIZED_ROLE':
        setAuthError("You don't have access to this portal.");
        break;
      case 'FIREBASE_TOKEN_INVALID':
        setAuthError('Session expired. Please login again.');
        break;
      default:
        setAuthError('Authentication failed. Please retry.');
    }
  };

  const faqs = [
    { category: 'General', q: 'How do I book a service?', a: 'Select your preferred category, choose a standard hourly package or detail the issue, select a convenient time slot, verify with OTP, and confirm. A vetted expert will be assigned near you.' },
    { category: 'Safety & Trust', q: 'Are professionals verified?', a: 'Yes. Every service partner undergoes physical verification, PAN & Aadhaar validation, and trade skill certifications before they are authorized to take jobs.' },
    { category: 'Payments', q: 'How does payment work?', a: 'Payments are settled completely online cashlessly. You pay via cards, Net Banking, or UPI only after the job is completed and OTP validated.' },
    { category: 'Safety & Trust', q: 'Is service warranty available?', a: 'VOLO offers a comprehensive 30-day warranty on all repair services. If any issue arises from the completed work within 30 days, we fix it free of charge.' },
    { category: 'General', q: 'Can I track my technician?', a: 'Yes. Once assigned, you can view the technician\'s active location, chat instantly, and get real-time status updates via the client app portal.' }
  ];

  const testimonials = [
    {
      name: 'Rohan Sharma',
      role: 'Homeowner',
      rating: 5,
      text: 'Extremely professional AC servicing. The technician arrived within 30 minutes, wore protective gear, and cleaned up everything after the repair. Highly recommended!',
      location: 'Indiranagar, Bangalore'
    },
    {
      name: 'Priya Patel',
      role: 'Software Engineer',
      rating: 5,
      text: 'Booking a plumber on VOLO was incredibly easy. I chose a time slot, got matching rates, and the job started only after I shared the OTP. Very safe and convenient.',
      location: 'Koramangala, Bangalore'
    },
    {
      name: 'Vikram Singh',
      role: 'VOLO Service Partner',
      rating: 5,
      text: 'As a certified carpenter, VOLO has helped me double my monthly customer reach. Payouts are settled every Wednesday directly to my bank account. Excellent app interface.',
      location: 'Whitefield, Bangalore'
    }
  ];

  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('electric')) return Zap;
    if (n.includes('plumb')) return Wrench;
    if (n.includes('ac ') || n.includes('conditioner') || n.includes('air')) return Snowflake;
    if (n.includes('carpenter') || n.includes('wood')) return Hammer;
    if (n.includes('clean') || n.includes('wash')) return Sparkles;
    if (n.includes('safety') || n.includes('security') || n.includes('lock')) return Lock;
    return Sparkles;
  };

  const getServiceColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('electric')) return 'bg-[#124E66]/10 text-[#124E66] border-orange-150/60';
    if (n.includes('plumb')) return 'bg-blue-50 text-[#124E66] border-blue-150/60';
    if (n.includes('ac ') || n.includes('conditioner') || n.includes('air')) return 'bg-teal-50 text-[#0D9488] border-teal-150/60';
    if (n.includes('carpenter') || n.includes('wood')) return 'bg-amber-50 text-[#B45309] border-amber-150/60';
    if (n.includes('clean') || n.includes('wash')) return 'bg-purple-50 text-[#7C3AED] border-purple-150/60';
    if (n.includes('safety') || n.includes('security') || n.includes('lock')) return 'bg-emerald-50 text-[#059669] border-emerald-150/60';
    return 'bg-slate-50 text-slate-700 border-slate-200/60';
  };

  const getServiceBadge = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('electric')) return 'Popular';
    if (n.includes('plumb')) return 'Best Rate';
    if (n.includes('ac ') || n.includes('conditioner') || n.includes('air')) return 'Summer Peak';
    if (n.includes('carpenter') || n.includes('wood')) return 'Certified';
    if (n.includes('clean') || n.includes('wash')) return 'Top Rated';
    if (n.includes('safety') || n.includes('security') || n.includes('lock')) return 'Secure';
    return 'Verified';
  };

  const filteredCategories = searchQuery
    ? categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.items?.some((item: any) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : categories;


  return (
    <div className="min-h-screen bg-[#D3D9D4] text-slate-800 font-sans select-none overflow-x-hidden scroll-smooth flex flex-col">

      {/* ================= HEADER / NAVBAR ================= */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] sm:w-[calc(100%-4rem)] max-w-7xl bg-white/50 backdrop-blur-xl border border-white/40 px-6 py-3 sm:px-10 rounded-3xl shadow-xl shadow-slate-950/[0.03] flex justify-between items-center shrink-0">
        {/* Left: Branding */}
        <a href="#home" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <Image src="/images/logo.jpeg" alt="VOLO Logo" width={36} height={36} className="h-9 w-auto rounded-xl object-contain border border-slate-200/50 shadow-sm" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-slate-950 leading-none font-display">VOLO</span>
            <span className="text-[8px] font-bold uppercase text-[#124E66] tracking-wider mt-0.5 leading-none">Your Home, Our Care</span>
          </div>
        </a>

        {/* Center: Menu links */}
        <div className="hidden lg:flex items-center gap-8">
          <a href="#home" className="text-slate-600 hover:text-slate-950 transition-colors text-xs font-semibold">Home</a>
          <a href="#services" className="text-slate-600 hover:text-slate-950 transition-colors text-xs font-semibold">Services</a>
          <a href="#how-it-works" className="text-slate-600 hover:text-slate-950 transition-colors text-xs font-semibold">How It Works</a>
          <a href="#become-partner" className="text-slate-600 hover:text-slate-950 transition-colors text-xs font-semibold">Become Partner</a>
          <a href="#why-choose" className="text-slate-600 hover:text-slate-950 transition-colors text-xs font-semibold">About</a>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setSelectedRole('customer');
              setAuthStep('PHONE');
              setAuthError(null);
              setAuthSuccess(null);
              setShowLoginModal(true);
            }}
            className="text-slate-700 hover:text-slate-950 text-xs font-semibold px-2.5 py-1.5 transition-colors cursor-pointer"
            suppressHydrationWarning
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedRole('worker');
              setAuthStep('PHONE');
              setAuthError(null);
              setAuthSuccess(null);
              setShowLoginModal(true);
            }}
            className="hidden sm:inline-block border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-full transition-all active:scale-95 cursor-pointer"
            suppressHydrationWarning
          >
            Become Partner
          </button>

          <a
            href="#services"
            className="bg-[#124E66] hover:bg-[#0e3f52] text-white font-semibold text-xs px-5 py-2.5 rounded-full transition-all active:scale-95 inline-block cursor-pointer shadow-sm shadow-[#124E66]/5"
          >
            Book Now
          </a>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <section id="home" className="relative min-h-[85vh] pt-36 pb-16 sm:pt-44 sm:pb-24 px-6 sm:px-12 flex items-center overflow-hidden !bg-[#748D92] !text-white border-b border-[#124E66]/20">
        {/* Glow Accent Circles */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-[#124E66]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-green-505/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase !text-[#D3D9D4] tracking-wider">
              <Sparkles className="h-3.5 w-3.5 text-[#124E66] fill-[#124E66]" />
              Premium On-Demand Home Services
            </span>

            <h1 className="text-4.5xl sm:text-6xl lg:text-7xl font-extrabold !text-white leading-[1.08] tracking-tight font-display">
              Home services,<br />
              <span className="text-[#124E66]">on demand.</span>
            </h1>

            <p className="!text-slate-200 text-sm sm:text-base max-w-lg leading-relaxed font-sans">
              Book vetted, certified electricians, plumbers, AC technicians, cleaners, painters, and safety experts. Premium local service with transparent pricing and live ETA tracking.
            </p>

            {/* Location + Search Pill */}
            <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-[#124E66] focus-within:ring-4 focus-within:ring-[#124E66]/20 rounded-full p-2.5 shadow-lg shadow-slate-200/50 transition-all max-w-xl">
              {/* Location Selector (Automatically detected, no dropdown) */}
              <div className="flex items-center gap-1.5 px-4 text-xs font-semibold text-slate-700 border-r border-slate-200 h-6 shrink-0 select-none">
                <MapPin className="h-4 w-4 text-[#124E66]" />
                <span>{selectedLocation || 'Detecting...'}</span>
              </div>

              {/* Search Bar */}
              <div className="flex-1 flex items-center gap-2 pl-3">
                <Search className="h-4 w-4 text-slate-455 shrink-0" />
                <input
                  type="text"
                  aria-label="Search for services"
                  placeholder="Search for AC service, electrician, plumber..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 placeholder-slate-400 outline-none"
                  suppressHydrationWarning
                />
              </div>

              {/* Search CTA */}
              <a
                href="#services"
                className="bg-[#124E66] hover:bg-[#124E66] text-white font-semibold text-xs px-6 py-2.5 rounded-full transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
              >
                Search
              </a>
            </div>

            {/* Quick tags */}
            <div className="flex flex-wrap gap-2.5 pt-2 items-center">
              <span className="text-[10px] !text-slate-350 font-bold uppercase tracking-wider mr-1">Popular:</span>
              {['AC Repair', 'Electrical', 'Plumbing', 'Cleaning'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSearchQuery(cat === 'AC Repair' ? 'AC' : cat)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[11px] font-medium !text-slate-200 hover:!text-white transition-all cursor-pointer"
                  suppressHydrationWarning
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column (Aesthetic Media) */}
          <div className="lg:col-span-5 relative flex justify-center items-center h-[520px] lg:h-[580px] w-full mt-12 lg:mt-0 overflow-visible">

            {/* Depth Effects / Glow Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-[#124E66]/18 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-blue-450/15 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Background Card */}
            <div
              className="absolute left-1/2 top-1/2 w-full max-w-[520px] h-[420px] sm:h-[520px] rounded-[42px] border border-white/20 z-10"
              style={{
                background: 'radial-gradient(circle, rgba(255, 138, 0, 0.22) 0%, rgba(238, 246, 255, 0.8) 55%, rgba(255, 255, 255, 0.95) 100%)',
                boxShadow: '0 35px 90px rgba(15,23,42,0.12)',
                transform: 'translate(-50%, -50%) rotate(-3deg)'
              }}
            />

            {/* Worker Image - standing in front of the card, head and shoulders extending outside */}
            <img
              src="/images/volo man.png"
              alt="Premium VOLO Professional"
              className="absolute left-[53%] bottom-[25px] h-[520px] sm:h-[620px] w-auto object-contain z-20 origin-bottom select-none pointer-events-none animate-worker-entrance-new"
              style={{
                filter: 'drop-shadow(-18px 22px 24px rgba(15, 23, 42, 0.22))'
              }}
            />

            {/* Floating Glass Cards */}
            {/* Top Right: 100% Verified */}
            <div
              className="absolute -top-4 -right-4 sm:-right-8 z-30 rounded-[20px] px-4 py-3.5 flex items-center gap-3 hover:scale-105 transition-transform duration-300 select-none animate-float-1"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4.5 w-4.5 text-green-600" />
              </div>
              <div className="text-left">
                <h6 className="font-extrabold text-[11px] text-slate-900 leading-none">100% Verified</h6>
                <span className="text-[9px] text-slate-500 font-semibold leading-none mt-1 block">Certified Professional</span>
              </div>
            </div>

            {/* Top Left: Available Today */}
            <div
              className="absolute top-20 -left-4 sm:-left-12 z-30 rounded-[20px] px-4 py-3.5 flex items-center gap-3 hover:scale-105 transition-transform duration-300 select-none animate-float-2"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-[#124E66]/10 flex items-center justify-center shrink-0">
                <Zap className="h-4.5 w-4.5 text-[#124E66] fill-[#124E66]" />
              </div>
              <div className="text-left">
                <h6 className="font-extrabold text-[11px] text-slate-900 leading-none">Available Today</h6>
                <span className="text-[9px] text-slate-500 font-semibold leading-none mt-1 block">Fast Response</span>
              </div>
            </div>

            {/* Bottom Left: 4.9 Rating */}
            <div
              className="absolute bottom-16 -left-6 sm:-left-16 z-30 rounded-[20px] px-4 py-3.5 flex items-center gap-3 hover:scale-105 transition-transform duration-300 select-none animate-float-3"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                <Star className="h-4.5 w-4.5 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-left">
                <h6 className="font-extrabold text-[11px] text-slate-900 leading-none">4.9 Rating</h6>
                <span className="text-[9px] text-slate-500 font-semibold leading-none mt-1 block">25K+ Reviews</span>
              </div>
            </div>

            {/* Bottom Right: Live ETA */}
            <div
              className="absolute bottom-24 -right-4 sm:-right-12 z-30 rounded-[20px] px-4 py-3.5 flex items-center gap-3 hover:scale-105 transition-transform duration-300 select-none animate-float-4"
              style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
              }}
            >
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div className="text-left">
                <h6 className="font-extrabold text-[11px] text-slate-900 leading-none">Live ETA</h6>
                <span className="text-[9px] text-slate-500 font-semibold leading-none mt-1 block">15 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES SECTION ================= */}
      <section id="services" className="py-24 px-6 sm:px-12 !bg-[#D3D9D4] scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-16">
          {/* Section Headings */}
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider mb-3">
              On-Demand Services
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">Most Booked Services</h2>
            <p className="text-sm text-slate-505 mt-3 leading-relaxed">
              Select standard packages or detail custom requirements. Secure background-checked professionals with Aadhaar validation and satisfaction guarantees.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingServices ? (
              // Render 3 pulsing skeleton cards while loading
              Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="relative w-full h-[320px] rounded-[2rem] overflow-hidden bg-slate-800/80 border border-slate-700 p-6 flex flex-col justify-between"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                  <div className="relative z-20 flex flex-col justify-between h-full w-full">
                    <div>
                      <div className="w-16 h-5 bg-slate-700/80 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="w-1/2 h-6 bg-slate-700/80 rounded-lg animate-pulse" />
                        <div className="w-3/4 h-3 bg-slate-700/60 rounded-md animate-pulse" />
                        <div className="w-2/3 h-3 bg-slate-700/60 rounded-md animate-pulse" />
                      </div>
                      <div className="flex justify-end pt-3 border-t border-white/5">
                        <div className="w-24 h-9 bg-slate-700/80 rounded-xl animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((c) => {
                const Icon = getServiceIcon(c.name);
                const color = getServiceColor(c.name);
                const badge = getServiceBadge(c.name);
                const desc = c.items && c.items.length > 0 
                  ? c.items.map((i: any) => i.name).slice(0, 3).join(', ') 
                  : 'Professional home service package';
                const hasCustomImage = c.icon_url && c.icon_url.startsWith('http');

                return (
                  <div
                    key={c.id}
                    className="group relative w-full h-[320px] rounded-[2rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  >
                    {/* Background Image / Gradient */}
                    {hasCustomImage ? (
                      <img 
                        src={c.icon_url} 
                        alt={c.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                        <Icon className="h-16 w-16 opacity-15 text-white stroke-[1.2]" />
                      </div>
                    )}

                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent z-10" />

                    {/* Content Overlay */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 text-white text-left">
                      {/* Top part: Badge */}
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 bg-white/95 px-3 py-1 rounded-full shadow-xs">
                          {badge}
                        </span>
                      </div>

                      {/* Bottom part: Title, Desc, and CTA */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <h3 
                            className="font-extrabold text-xl font-display leading-tight capitalize"
                            style={{ color: '#ffffff' }}
                          >
                            {c.name}
                          </h3>
                          <p 
                            className="text-xs leading-relaxed font-normal line-clamp-2"
                            style={{ color: '#ffffff' }}
                          >
                            {desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-end pt-3 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole('customer');
                              setAuthStep('PHONE');
                              setAuthError(null);
                              setAuthSuccess(null);
                              setShowLoginModal(true);
                            }}
                            className="bg-[#124E66] hover:bg-[#0e3f52] text-white font-bold text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                            suppressHydrationWarning
                          >
                            Book Now
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-500 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100/80">
                No services or categories found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS SECTION ================= */}
      <section id="how-it-works" className="py-24 px-6 sm:px-12 !bg-[#D3D9D4] border-y border-[#D3D9D4]/25 scroll-mt-20">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="max-w-xl text-left">
            <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider mb-3">
              Booking Guide
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">How VOLO Works</h2>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Experience seamless, reliable booking and service dispatch in 4 simple steps.
            </p>
          </div>

          {/* Steps Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 z-10">

            {/* Desktop Dotted Connector Line */}
            <div className="hidden lg:block absolute top-[44px] left-[12%] right-[12%] h-0.5 border-t-2 border-dashed border-slate-200/80 -z-10" />

            {/* Step 1 */}
            <div className="group relative bg-white border border-slate-100 hover:border-[#124E66]/25 rounded-[2rem] p-8 pt-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                {/* Index Badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-[#124E66] bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Step 01
                  </span>
                  <div className="h-2 w-2 rounded-full bg-[#124E66] animate-pulse" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Choose Service</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Select standard repair packages or customize custom requirements inside our service catalog.
                </p>
              </div>

              {/* Graphical Mockup: Tiny search widget */}
              <div className="bg-[#D3D9D4] border border-slate-100 rounded-2xl p-4 space-y-2.5 transition-colors group-hover:bg-[#124E66]/5 group-hover:border-[#124E66]/10">
                <div className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-full px-2.5 py-1.5 shadow-xs">
                  <Search className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] text-slate-500 font-medium truncate">AC Repair & Service...</span>
                </div>
                <div className="flex gap-1.5 overflow-x-hidden">
                  <span className="text-[8px] bg-slate-200/50 text-slate-650 px-2 py-0.5 rounded-full font-bold">AC</span>
                  <span className="text-[8px] bg-[#124E66]/10 text-[#124E66] px-2 py-0.5 rounded-full font-bold">Plumber</span>
                  <span className="text-[8px] bg-slate-200/50 text-slate-650 px-2 py-0.5 rounded-full font-bold">Wiring</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative bg-white border border-slate-100 hover:border-[#124E66]/25 rounded-[2rem] p-8 pt-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                {/* Index Badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-[#124E66] bg-[#124E66]/5 border border-[#124E66]/15 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Step 02
                  </span>
                  <div className="h-2 w-2 rounded-full bg-[#124E66]" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Select Time Slot</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Pick immediate dispatch within 45 minutes, or reserve a preferred date/time slot.
                </p>
              </div>

              {/* Graphical Mockup: Schedule slots */}
              <div className="bg-[#D3D9D4] border border-slate-100 rounded-2xl p-4 space-y-2.5 transition-colors group-hover:bg-[#124E66]/5 group-hover:border-[#124E66]/10">
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-slate-100 rounded-lg p-1.5 text-center shadow-xs">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">Today</span>
                    <span className="text-[10px] text-slate-800 font-extrabold">04 Jul</span>
                  </div>
                  <div className="flex-1 bg-[#124E66] text-white rounded-lg p-1.5 text-center shadow-xs">
                    <span className="block text-[8px] text-blue-200 font-bold uppercase">Tomorrow</span>
                    <span className="text-[10px] font-extrabold">05 Jul</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-lg py-1 px-2.5 text-[9px] text-slate-700 font-bold text-center flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 text-[#124E66]" />
                  <span>02:30 PM - 04:00 PM</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative bg-white border border-slate-100 hover:border-[#124E66]/25 rounded-[2rem] p-8 pt-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                {/* Index Badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-[#124E66] bg-green-50/80 border border-green-100/50 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Step 03
                  </span>
                  <div className="h-2 w-2 rounded-full bg-[#124E66] animate-ping" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Expert Assigned</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Get assigned a vetted professional. View their rating, active route details, and map live ETA.
                </p>
              </div>

              {/* Graphical Mockup: Assigned expert */}
              <div className="bg-[#D3D9D4] border border-slate-100 rounded-2xl p-3.5 space-y-2 transition-colors group-hover:bg-[#124E66]/5 group-hover:border-[#124E66]/10">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-[10px] text-slate-750">
                    RK
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="block text-[9px] font-extrabold text-slate-800 truncate">Rajesh Kumar</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5 text-[#124E66] fill-[#124E66]" />
                      <span className="text-[8px] text-slate-550 font-bold">4.9 (120 jobs)</span>
                    </div>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg py-1 px-2 text-[8px] text-emerald-850 font-bold text-center flex items-center justify-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Technician is 1.2 km away</span>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="group relative bg-white border border-slate-100 hover:border-rose-500/25 rounded-[2rem] p-8 pt-10 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                {/* Index Badge */}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-extrabold text-rose-500 bg-rose-50/80 border border-rose-100/50 px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                    Step 04
                  </span>
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Job Completed</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Verify output and share a secure OTP. Settlement is done cashlessly via UPI or online cards.
                </p>
              </div>

              {/* Graphical Mockup: Job completed */}
              <div className="bg-[#D3D9D4] border border-slate-100 rounded-2xl p-4 space-y-2.5 transition-colors group-hover:bg-rose-50/5 group-hover:border-rose-100/10">
                <div className="flex items-center justify-center gap-1.5 bg-white border border-slate-100 rounded-lg p-1.5 shadow-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-[9px] text-slate-800 font-extrabold uppercase tracking-wide">OTP Verified</span>
                </div>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-[#124E66] fill-[#124E66]" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE VOLO ================= */}
      <section id="why-choose" className="py-28 px-6 sm:px-12 !bg-[#748D92] !text-white scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Column: Heading & Stats */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase !text-sky-300 tracking-wider">
                Safety & Trust
              </span>
              <h2 className="text-3.5xl sm:text-5xl font-extrabold !text-white tracking-tight leading-tight font-display">
                Why Choose VOLO
              </h2>
              <p className="text-sm !text-slate-200 leading-relaxed font-normal">
                India&apos;s highly reliable platform for verified home repairs, physical credentials checking, and transparent standard billing.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <span className="block text-3xl font-extrabold text-[#124E66] font-display">100%</span>
                <span className="block text-[10px] font-extrabold uppercase text-slate-350 tracking-wider">Vetted Pros</span>
                <span className="block text-[11px] !text-slate-300 leading-tight">PAN, Aadhaar & background checked</span>
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-extrabold !text-sky-400 font-display">45 Min</span>
                <span className="block text-[10px] font-extrabold uppercase text-slate-350 tracking-wider">Avg Arrival</span>
                <span className="block text-[11px] !text-slate-300 leading-tight">On-demand instant technician dispatch</span>
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-extrabold text-[#124E66] font-display">4.9★</span>
                <span className="block text-[10px] font-extrabold uppercase text-slate-350 tracking-wider">User Rating</span>
                <span className="block text-[11px] !text-slate-300 leading-tight">Voted by 25k+ happy customers</span>
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-extrabold text-rose-450 font-display">30 Days</span>
                <span className="block text-[10px] font-extrabold uppercase text-slate-350 tracking-wider">Warranty</span>
                <span className="block text-[11px] !text-slate-300 leading-tight">Full satisfaction work coverage</span>
              </div>
            </div>
          </div>

          {/* Right Column: 2x2 Glassmorphic Cards Grid */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">

            {/* Feature 1 */}
            <div className="group bg-white/50 backdrop-blur-md border border-white/70 hover:border-[#124E66]/25 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between space-y-8">
              <div className="space-y-4 text-left">
                <div className="h-10 w-10 rounded-xl bg-orange-100/60 flex items-center justify-center text-[#124E66] shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <Shield className="h-5 w-5" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Verified Pros</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Physical audits and identity credential checkups via PAN, Aadhaar, and trade testing.
                </p>
              </div>

              {/* Micro-detail indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/40 border border-white/60 py-1 px-3.5 rounded-full w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-[#124E66]" />
                Aadhaar & PAN Cleared
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white/50 backdrop-blur-md border border-white/70 hover:border-[#124E66]/25 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between space-y-8">
              <div className="space-y-4 text-left">
                <div className="h-10 w-10 rounded-xl bg-blue-100/60 flex items-center justify-center text-[#124E66] shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <MapPin className="h-5 w-5" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Live Tracking</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  On-demand GPS map updates showing the technician&apos;s exact location and ETA.
                </p>
              </div>

              {/* Micro-detail indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/40 border border-white/60 py-1 px-3.5 rounded-full w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-[#124E66] animate-ping" />
                Live Map Updates
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white/50 backdrop-blur-md border border-white/70 hover:border-[#124E66]/25 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between space-y-8">
              <div className="space-y-4 text-left">
                <div className="h-10 w-10 rounded-xl bg-green-100/60 flex items-center justify-center text-[#124E66] shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <Lock className="h-5 w-5" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Secure OTP Start</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Confirmation keys protect clients against billing mistakes and unauthorized completions.
                </p>
              </div>

              {/* Micro-detail indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/40 border border-white/60 py-1 px-3.5 rounded-full w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-[#124E66]" />
                Job Starts Only with OTP
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white/50 backdrop-blur-md border border-white/70 hover:border-amber-500/25 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col justify-between space-y-8">
              <div className="space-y-4 text-left">
                <div className="h-10 w-10 rounded-xl bg-amber-100/60 flex items-center justify-center text-amber-600 shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <Clock className="h-5 w-5" />
                </div>
                <h4 className="font-extrabold text-lg text-slate-900 font-display">Fixed Diagnostics</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-normal">
                  Transparent, standard hourly packages. Know exactly what you pay before work starts.
                </p>
              </div>

              {/* Micro-detail indicator */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white/40 border border-white/60 py-1 px-3.5 rounded-full w-fit">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Zero Hidden Charges
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= LIVE TRACKING SECTION ================= */}
      <section id="live-tracking" className="py-28 px-6 sm:px-12 !bg-white border-y border-slate-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Column: Heading & Features */}
          <div className="lg:col-span-6 space-y-8 text-left">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider">
                Platform Features
              </span>
              <h2 className="text-3.5xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight font-display">
                Live Job Tracking Dashboard
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-normal">
                No more guessing when your technician will arrive. Our clean, unified live dashboard gives you end-to-end status visibility:
              </p>
            </div>

            <ul className="space-y-5 text-slate-700 font-semibold text-xs">
              <li className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-[#124E66]/10 border border-[#124E66]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#124E66]" />
                </div>
                <div>
                  <span className="block text-slate-900 font-extrabold">Real-Time GPS Map</span>
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">Watch your assigned expert navigate to your doorstep live on our tracking map.</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-[#124E66]/10 border border-[#124E66]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#124E66]" />
                </div>
                <div>
                  <span className="block text-slate-900 font-extrabold">Live ETA Countdown</span>
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">Get accurate dynamic arrival updates and instant SMS alerts at every dispatcher stage.</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-[#124E66]/10 border border-[#124E66]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#124E66]" />
                </div>
                <div>
                  <span className="block text-slate-900 font-extrabold">Interactive Security OTP</span>
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">Provide secure verification codes to start and finalize jobs safely, preventing billing errors.</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="h-6 w-6 rounded-full bg-[#124E66]/10 border border-[#124E66]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3.5 w-3.5 text-[#124E66]" />
                </div>
                <div>
                  <span className="block text-slate-900 font-extrabold">Digital Smart Invoices</span>
                  <span className="block text-[11px] text-slate-500 font-normal mt-0.5">Download itemized receipts and tax invoices directly sent to your registered email.</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Right Column: Premium Glass Mobile Frame */}
          <div className="lg:col-span-6 flex justify-center items-center">
            <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-slate-950 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800 ring-12 ring-slate-900/5 hover:scale-[1.02] transition-transform duration-500 flex flex-col justify-between overflow-hidden">

              {/* Dynamic Island Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-slate-950 rounded-full ml-auto mr-3 border border-slate-850" />
              </div>

              {/* Glowing Phone Screen Content */}
              <div className="w-full h-full rounded-[2.2rem] bg-slate-50 overflow-hidden flex flex-col relative z-10 border border-slate-900">

                {/* Header Pane */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 pt-8 text-left flex justify-between items-center z-20">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px]">RK</div>
                    <div>
                      <h6 className="font-extrabold text-[11px] text-slate-900 leading-none">Ramesh Kumar</h6>
                      <span className="text-[8px] text-slate-400 mt-0.5 block">AC Repair Specialist</span>
                    </div>
                  </div>
                  <div className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[7px] font-extrabold uppercase tracking-wider animate-pulse font-sans">
                    En Route
                  </div>
                </div>

                {/* Map Visual with Routes */}
                <div className="flex-1 bg-slate-100 relative overflow-hidden">

                  {/* Grid Lines Map Mock */}
                  <svg className="absolute inset-0 w-full h-full opacity-65" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="40" x2="360" y2="40" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="120" x2="360" y2="120" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="0" y1="200" x2="360" y2="200" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="80" y1="0" x2="80" y2="300" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="180" y1="0" x2="180" y2="300" stroke="#cbd5e1" strokeWidth="1" />
                    <line x1="260" y1="0" x2="260" y2="300" stroke="#cbd5e1" strokeWidth="1" />

                    {/* Routing Path */}
                    <path d="M 80 180 L 180 180 L 180 80 L 260 80" fill="none" stroke="#124E66" strokeWidth="3" strokeDasharray="5 3" />
                  </svg>

                  {/* Pulsing User Location Beacon */}
                  <div className="absolute top-[80px] left-[260px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <span className="text-[7px] font-extrabold uppercase text-slate-500 bg-white/90 border border-slate-100 py-0.5 px-1.5 rounded shadow-xs mb-1">You</span>
                    <div className="h-4 w-4 bg-[#124E66] rounded-full border-2 border-white shadow-md flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-[#124E66] animate-ping opacity-75" />
                    </div>
                  </div>

                  {/* Pulsing Technician Icon Beacon */}
                  <div className="absolute top-[180px] left-[110px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                    <span className="text-[7px] font-extrabold uppercase text-[#124E66] bg-white/90 border border-[#124E66]/20 py-0.5 px-1.5 rounded shadow-xs mb-1">Ramesh</span>
                    <div className="h-4.5 w-4.5 bg-[#124E66] rounded-full border-2 border-white shadow-md flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-[#124E66] animate-ping opacity-75" />
                    </div>
                  </div>

                  {/* Map Overlapping Floating Glass Info Cards */}
                  <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-extrabold text-slate-800 shadow-md border border-white/60">
                    ETA: <span className="text-[#124E66]">12 Mins</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[8px] font-extrabold text-[#124E66] shadow-md border border-white/60">
                    Dist: 1.4 km
                  </div>

                </div>

                {/* Bottom slide-up tray */}
                <div className="bg-white border-t border-slate-100 p-5 space-y-4 text-left z-20">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] text-slate-400 uppercase font-extrabold tracking-wider">
                      <span>Active Booking ID</span>
                      <span>#VOLO-89023</span>
                    </div>
                    <h6 className="font-extrabold text-slate-900 text-xs truncate">AC Deep Cleaning Package</h6>
                  </div>

                  {/* Checklist steps */}
                  <div className="space-y-2.5 pt-3 border-t border-slate-100/80">
                    <div className="flex items-center gap-2 text-[#124E66]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="font-bold text-[9px]">Booking Confirmed</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#124E66]">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="font-bold text-[9px]">Ramesh Dispatched</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="h-4 w-4 shrink-0 text-slate-300" />
                      <span className="font-semibold text-[9px]">Job Verification OTP (On arrival)</span>
                    </div>
                  </div>

                  {/* Cost breakdown */}
                  <div className="bg-[#D3D9D4] p-3 rounded-xl flex justify-between items-center border border-slate-100 text-[9px] font-bold text-slate-500">
                    <span>Estimated Total:</span>
                    <span className="font-extrabold text-[#124E66] text-[10px]">₹349</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ================= BECOME A PARTNER SECTION ================= */}
      <section id="become-partner" className="py-24 px-6 sm:px-12 !bg-[#D3D9D4] scroll-mt-20">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-[#124E66] to-[#124E66] rounded-[2.5rem] p-8 sm:p-16 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-left">
              <span className="inline-flex items-center bg-white/10 border border-white/5 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider !text-white">
                Partnership
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display leading-tight !text-white">Earn more with VOLO</h2>
              <p className="text-sm !text-slate-300 leading-relaxed font-normal">
                Join our certified network of professionals. Get regular local assignments, flexible working schedules, transparent commissions, and settlements deposited straight to your bank account weekly.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('worker');
                  setAuthStep('PHONE');
                  setAuthError(null);
                  setAuthSuccess(null);
                  setShowLoginModal(true);
                }}
                className="bg-white hover:bg-[#124E66]/10 text-slate-950 hover:text-[#124E66] font-bold text-xs uppercase tracking-wider px-6 py-4 rounded-full transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-md"
                suppressHydrationWarning
              >
                Join As Professional
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Benefits checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left font-sans">

              {/* Flexible Working Hours */}
              <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-6 rounded-2.5xl flex gap-4 transition-all duration-350 hover:bg-white/[0.08] hover:-translate-y-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#124E66] shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-extrabold !text-white">Flexible Hours</span>
                  <span className="block text-[11px] !text-slate-300 font-medium">Set your own schedule anytime</span>
                </div>
              </div>

              {/* Weekly Payouts */}
              <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-6 rounded-2.5xl flex gap-4 transition-all duration-350 hover:bg-white/[0.08] hover:-translate-y-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#124E66] shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-extrabold !text-white">Weekly Payouts</span>
                  <span className="block text-[11px] !text-slate-300 font-medium">Immediate bank settlements</span>
                </div>
              </div>

              {/* Regular Customer Flows */}
              <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-6 rounded-2.5xl flex gap-4 transition-all duration-350 hover:bg-white/[0.08] hover:-translate-y-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#124E66] shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-extrabold !text-white">Consistent Flow</span>
                  <span className="block text-[11px] !text-slate-300 font-medium">Regular local service jobs</span>
                </div>
              </div>

              {/* Skill Training Guides */}
              <div className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 p-6 rounded-2.5xl flex gap-4 transition-all duration-350 hover:bg-white/[0.08] hover:-translate-y-1">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#124E66] shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <span className="block text-sm font-extrabold !text-white">Skill Guides</span>
                  <span className="block text-[11px] !text-slate-300 font-medium">Free workshops & certificates</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ================= STATISTICS SECTION ================= */}
      <section className="py-24 px-6 sm:px-12 !bg-[#124E66] text-white select-none border-t border-[#124E66]/20 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-[#124E66]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative z-10">

          {/* Stat 1 */}
          <div className="space-y-4 p-6 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md flex flex-col items-center justify-between min-h-[140px] transition-all hover:border-[#124E66]/30 hover:bg-white/15">
            <div className="h-10 w-10 rounded-full bg-[#124E66]/20 border border-[#124E66]/30 flex items-center justify-center text-[#124E66]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-[#124E66] font-display">2,500+</span>
              <span className="block text-[9px] !text-slate-200 font-extrabold uppercase tracking-widest">Services Completed</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="space-y-4 p-6 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md flex flex-col items-center justify-between min-h-[140px] transition-all hover:border-emerald-500/30 hover:bg-white/15">
            <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Users className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-emerald-300 font-display">1,800+</span>
              <span className="block text-[9px] !text-slate-200 font-extrabold uppercase tracking-widest">Happy Customers</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="space-y-4 p-6 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md flex flex-col items-center justify-between min-h-[140px] transition-all hover:border-sky-500/30 hover:bg-white/15">
            <div className="h-10 w-10 rounded-full bg-sky-500/25 border border-sky-500/30 flex items-center justify-center text-sky-300">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-sky-300 font-display">150+</span>
              <span className="block text-[9px] !text-slate-200 font-extrabold uppercase tracking-widest">Professionals</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="space-y-4 p-6 bg-white/10 border border-white/20 rounded-3xl backdrop-blur-md flex flex-col items-center justify-between min-h-[140px] transition-all hover:border-amber-500/30 hover:bg-white/15">
            <div className="h-10 w-10 rounded-full bg-amber-500/25 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Star className="h-5 w-5 fill-amber-305 text-amber-305" />
            </div>
            <div className="space-y-1 text-center">
              <span className="block text-3xl sm:text-4xl font-extrabold text-amber-305 font-display">4.9★</span>
              <span className="block text-[9px] !text-slate-200 font-extrabold uppercase tracking-widest">Average Rating</span>
            </div>
          </div>

        </div>
      </section>

      {/* ================= TESTIMONIALS SECTION ================= */}
      <section id="testimonials" className="py-28 px-6 sm:px-12 !bg-[#D3D9D4] scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Column: Heading & Review Summary Stats */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider">
                Client Feedback
              </span>
              <h2 className="text-3.5xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight font-display">
                Loved by thousands
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-normal">
                Read genuine reviews from homeowners and certified technicians who use the VOLO platform daily.
              </p>
            </div>

            {/* Google-style rating breakdown box */}
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-5">
              <div className="flex items-center gap-4">
                <span className="text-5xl font-extrabold text-slate-900 font-display">4.9</span>
                <div>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Based on 25k+ Reviews</span>
                </div>
              </div>

              {/* Progress bars */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                  <span className="w-10">5 Star</span>
                  <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="w-[94%] h-full bg-[#124E66]" />
                  </div>
                  <span className="w-8 text-right">94%</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                  <span className="w-10">4 Star</span>
                  <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="w-[5%] h-full bg-amber-500" />
                  </div>
                  <span className="w-8 text-right">5%</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                  <span className="w-10">3 Star</span>
                  <div className="flex-1 h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div className="w-[1%] h-full bg-slate-300" />
                  </div>
                  <span className="w-8 text-right">1%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Carousel Review Card Deck */}
          <div className="lg:col-span-7 space-y-6">
            {/* Carousel card */}
            <div className="relative bg-[#D3D9D4] border border-slate-100/80 rounded-[2rem] p-8 md:p-10 shadow-sm space-y-8 flex flex-col justify-between min-h-[260px] transition-colors hover:border-slate-200 overflow-hidden">

              {/* Giant quote sign watermark */}
              <div className="absolute -top-6 -right-6 text-slate-200/20 font-serif text-[12rem] leading-none pointer-events-none select-none">
                &ldquo;
              </div>

              <div className="space-y-4 text-left relative z-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: testimonials[currentTestimonial].rating }).map((_, idx) => (
                      <Star key={idx} className="h-4.5 w-4.5 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">Verified User</span>
                </div>
                <p className="text-sm md:text-[15px] text-slate-650 italic leading-relaxed font-normal font-sans pt-2">
                  &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                </p>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-200/60 text-[11px] relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px]">
                    {testimonials[currentTestimonial].name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="text-left">
                    <h6 className="font-extrabold text-slate-900 leading-none">{testimonials[currentTestimonial].name}</h6>
                    <span className="text-[9px] text-slate-400 mt-1 block">{testimonials[currentTestimonial].role}</span>
                  </div>
                </div>
                <span className="font-semibold text-slate-500">{testimonials[currentTestimonial].location}</span>
              </div>
            </div>

            {/* Slider controls */}
            <div className="flex justify-center items-center gap-4 pt-4 select-none">
              <button
                type="button"
                onClick={() => setCurrentTestimonial(prev => (prev === 0 ? testimonials.length - 1 : prev - 1))}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white hover:border-[#124E66] hover:text-[#124E66] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                suppressHydrationWarning
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition-all cursor-pointer ${currentTestimonial === idx ? 'bg-[#124E66] w-6' : 'bg-slate-300'}`}
                  suppressHydrationWarning
                />
              ))}
              <button
                type="button"
                onClick={() => setCurrentTestimonial(prev => (prev === testimonials.length - 1 ? 0 : prev + 1))}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white hover:border-[#124E66] hover:text-[#124E66] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                suppressHydrationWarning
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ================= APP DOWNLOAD SECTION ================= */}
      <section className="py-28 px-6 sm:px-12 !bg-[#D3D9D4] border-y border-[#D3D9D4]/25 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* Left Column: Premium Realistic Phone Mockup */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[310px] aspect-[9/18.5] bg-slate-950 rounded-[3rem] p-3 shadow-2xl border-4 border-slate-800 ring-12 ring-slate-900/5 hover:scale-[1.02] transition-transform duration-500 overflow-hidden">

              {/* Phone Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-900 rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-slate-950 rounded-full ml-auto mr-3 border border-slate-850" />
              </div>

              {/* Inside App Mock screen content */}
              <div className="w-full h-full rounded-[2.2rem] bg-slate-50 overflow-hidden flex flex-col relative z-10 border border-slate-900 select-none">

                {/* App Navbar Mock */}
                <div className="bg-white border-b border-slate-100 p-4 pt-8 flex justify-between items-center z-20">
                  <div className="flex items-center gap-2">
                    <img src="/images/logo.jpeg" alt="VOLO" className="h-6 w-6 rounded-lg object-contain border border-slate-100" />
                    <span className="font-extrabold text-[10px] text-slate-950 font-display uppercase tracking-wide">VOLO</span>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-[#124E66] animate-pulse" />
                </div>

                {/* Main App Content Area */}
                <div className="flex-1 p-3.5 space-y-4 overflow-y-hidden text-left bg-[#D3D9D4]">

                  {/* Category Pills Mock */}
                  <div className="space-y-1.5">
                    <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider block">Popular Categories</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white border border-slate-100 p-2 rounded-xl text-center space-y-1 shadow-xs">
                        <div className="h-6 w-6 rounded-lg bg-[#124E66]/10 text-[#124E66] flex items-center justify-center mx-auto"><Zap className="h-3.5 w-3.5" /></div>
                        <span className="block text-[7px] font-extrabold text-slate-800">Electric</span>
                      </div>
                      <div className="bg-white border border-slate-100 p-2 rounded-xl text-center space-y-1 shadow-xs">
                        <div className="h-6 w-6 rounded-lg bg-blue-50 text-[#124E66] flex items-center justify-center mx-auto"><Wrench className="h-3.5 w-3.5" /></div>
                        <span className="block text-[7px] font-extrabold text-slate-800">Plumbing</span>
                      </div>
                      <div className="bg-white border border-slate-100 p-2 rounded-xl text-center space-y-1 shadow-xs">
                        <div className="h-6 w-6 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center mx-auto"><Snowflake className="h-3.5 w-3.5" /></div>
                        <span className="block text-[7px] font-extrabold text-slate-800">AC Fixes</span>
                      </div>
                    </div>
                  </div>

                  {/* Promotion Banner Card */}
                  <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-2xl p-3.5 text-white relative overflow-hidden shadow-sm">
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div className="space-y-1 relative z-10">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-[6px] font-bold uppercase tracking-wider">Discount Code</span>
                      <h6 className="font-extrabold text-[11px] leading-tight mt-1">
                        {activePromo ? activePromo.description || `Get ${activePromo.discount_value}${activePromo.discount_type === 'PERCENT' ? '% Off' : ' Flat Off'} Your Order` : 'Get 30% OFF Your First Home Repair'}
                      </h6>
                      <span className="block text-[6.5px] text-[#D3D9D4] font-medium">
                        Use code {activePromo ? activePromo.code : 'FIRST30'} at checkout
                      </span>
                    </div>
                  </div>

                  {/* Active Booking Tracker Widget */}
                  <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <div>
                        <span className="block text-[7px] font-extrabold uppercase text-slate-400">En Route</span>
                        <h6 className="font-extrabold text-[9px] text-slate-900 mt-0.5">AC Filter Cleaning</h6>
                      </div>
                      <span className="text-[7.5px] font-extrabold text-[#124E66] bg-blue-50 px-2 py-0.5 rounded-full">ETA 12 Min</span>
                    </div>

                    {/* Live Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[6px] font-bold text-slate-450">
                        <span>Technician Rajesh K.</span>
                        <span>1.4 km away</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[75%] h-full bg-[#124E66]" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom App Navigation Mock */}
                <div className="bg-white border-t border-slate-100 px-4 py-2.5 flex justify-around items-center z-20">
                  <Star className="h-4 w-4 text-[#124E66] fill-[#124E66]" />
                  <Briefcase className="h-4 w-4 text-slate-300" />
                  <User className="h-4 w-4 text-slate-300" />
                </div>

              </div>

            </div>
          </div>

          {/* Right Column: Premium Download Content */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider">
                Mobile App
              </span>
              <h2 className="text-3.5xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight font-display">
                VOLO Mobile App
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-normal">
                Book services on the go, track your technician in real-time, store payment histories, view digital invoices, and access 24/7 help desk support instantly. Download the VOLO App on iOS and Android today.
              </p>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <span className="block text-xs font-extrabold text-slate-900">Real-Time Dispatch</span>
                <span className="block text-[11px] text-slate-550 leading-relaxed">Map dispatch, ETA details & notifications.</span>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-extrabold text-slate-900">Direct Chat Support</span>
                <span className="block text-[11px] text-slate-550 leading-relaxed">Quick helpdesk support for reservations.</span>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-extrabold text-slate-900">Secure Payments</span>
                <span className="block text-[11px] text-slate-550 leading-relaxed">100% cashless UPI & card settlements.</span>
              </div>
            </div>

            {/* App Store / Google Play Buttons */}
            <div className="flex flex-wrap gap-4 select-none pt-4">
              {/* Google Play Button */}
              <a
                href="#home"
                className="bg-slate-950 hover:bg-slate-900 text-white flex items-center gap-3.5 px-6 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer border border-slate-800 active:scale-[0.98]"
              >
                <Play className="h-6 w-6 text-[#124E66] fill-[#124E66]" />
                <div className="text-left leading-none font-sans">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Get it on</span>
                  <h6 className="font-extrabold text-sm tracking-tight mt-0.5">Google Play</h6>
                </div>
              </a>

              {/* App Store Button */}
              <a
                href="#home"
                className="bg-slate-950 hover:bg-slate-900 text-white flex items-center gap-3.5 px-6 py-3.5 rounded-2xl transition-all shadow-md hover:shadow-xl hover:scale-[1.01] cursor-pointer border border-slate-800 active:scale-[0.98]"
              >
                <Apple className="h-6 w-6 text-white fill-white" />
                <div className="text-left leading-none font-sans">
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Download on the</span>
                  <h6 className="font-extrabold text-sm tracking-tight mt-0.5">App Store</h6>
                </div>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-28 px-6 sm:px-12 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto space-y-12">

          {/* Header */}
          <div className="text-center space-y-3 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 bg-[#124E66]/5 border border-[#124E66]/10 px-3.5 py-1 rounded-full text-[10px] font-extrabold uppercase text-[#124E66] tracking-wider">
              Support Center
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-500 leading-relaxed font-normal">
              Find instant answers to common booking, verification, safety, and cashless billing queries.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-3 select-none">
            {['All', 'General', 'Safety & Trust', 'Payments'].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedFaqCategory(category);
                  setActiveFaq(null);
                }}
                className={`px-5 py-2.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer active:scale-95 ${selectedFaqCategory === category
                  ? 'bg-[#124E66] border-[#124E66] text-white shadow-md'
                  : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:border-[#124E66]/30 hover:text-[#124E66]'
                  }`}
                suppressHydrationWarning
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-4 font-sans max-w-3xl mx-auto">
            {(() => {
              const filteredFaqs = selectedFaqCategory === 'All' ? faqs : faqs.filter(f => f.category === selectedFaqCategory);
              return filteredFaqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className={`border overflow-hidden transition-all duration-350 rounded-2xl ${isOpen
                      ? 'bg-gradient-to-r from-orange-50/15 to-transparent border-[#124E66]/25 shadow-md shadow-orange-500/5'
                      : 'bg-[#D3D9D4] border-slate-100 hover:border-slate-200'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer transition-all duration-300"
                      suppressHydrationWarning
                    >
                      <span className={`font-extrabold text-xs sm:text-sm transition-colors duration-300 ${isOpen ? 'text-[#124E66]' : 'text-slate-800'}`}>
                        {faq.q}
                      </span>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-[#124E66]/10 text-[#124E66]' : 'bg-slate-200/50 text-slate-400'
                        }`}>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''}`} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-xs text-slate-500 leading-relaxed border-t border-[#124E66]/10 pt-4 font-normal">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer id="footer" className="!bg-[#748D92] !text-slate-300 py-24 px-6 sm:px-12 !border-t !border-white/10 scroll-mt-20 relative overflow-hidden select-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12">

            {/* Branding Column */}
            <div className="col-span-2 space-y-6">
              <a href="#home" className="flex items-center gap-3 select-none hover:opacity-90 transition-opacity">
                <img src="/images/logo.jpeg" alt="VOLO Logo" className="h-8.5 w-auto rounded-xl object-contain border border-slate-800 shadow-md" />
                <span className="font-extrabold text-xl tracking-wider !text-white font-display">VOLO</span>
              </a>
              <p className="text-xs !text-slate-300 max-w-xs leading-relaxed font-normal">
                Premium vetted home care services delivered directly to your doorstep. Standardized hourly diagnostic pricing, GPS location tracking, and cashless verify OTP validation.
              </p>

              {/* Circular Frosted Social Icons */}
              <div className="flex gap-3 pt-2">
                <a href="#footer" className="h-9 w-9 rounded-full bg-white/5 border border-white/10 hover:border-[#124E66]/30 flex items-center justify-center text-slate-400 hover:text-[#124E66] transition-colors">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
                  </svg>
                </a>
                <a href="#footer" className="h-9 w-9 rounded-full bg-white/5 border border-white/10 hover:border-[#124E66]/30 flex items-center justify-center text-slate-400 hover:text-[#124E66] transition-colors">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="#footer" className="h-9 w-9 rounded-full bg-white/5 border border-white/10 hover:border-[#124E66]/30 flex items-center justify-center text-slate-400 hover:text-[#124E66] transition-colors">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
                <a href="#footer" className="h-9 w-9 rounded-full bg-white/5 border border-white/10 hover:border-[#124E66]/30 flex items-center justify-center text-slate-400 hover:text-[#124E66] transition-colors">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Services Links Column */}
            <div className="space-y-4 text-left">
              <h5 className="font-extrabold !text-white text-xs uppercase tracking-wider">Services</h5>
              <ul className="space-y-3 text-xs font-semibold !text-slate-400 font-normal">
                <li><a href="#services" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Electrical Repairs</a></li>
                <li><a href="#services" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Plumbing Fittings</a></li>
                <li><a href="#services" className="!text-slate-300 hover:!text-[#124E66] transition-colors">AC Repair & Maintenance</a></li>
                <li><a href="#services" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Cleaning & Sanitization</a></li>
              </ul>
            </div>

            {/* Company Links Column */}
            <div className="space-y-4 text-left">
              <h5 className="font-extrabold !text-white text-xs uppercase tracking-wider">Company</h5>
              <ul className="space-y-3 text-xs font-semibold !text-slate-400 font-normal">
                <li><a href="#why-choose" className="!text-slate-300 hover:!text-[#124E66] transition-colors">About Us</a></li>
                <li><a href="#become-partner" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Become a Partner</a></li>
                <li><a href="#home" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Press & Media</a></li>
                <li><a href="#home" className="!text-slate-300 hover:!text-[#124E66] transition-colors">Careers</a></li>
              </ul>
            </div>

            {/* Contact Details Column */}
            <div className="space-y-4 text-left col-span-2 md:col-span-1">
              <h5 className="font-extrabold !text-white text-xs uppercase tracking-wider">Support & Help</h5>
              <ul className="space-y-3.5 text-xs font-semibold !text-slate-400 font-normal">
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-[#124E66] shrink-0" />
                  <a href="mailto:help@volo.in" className="!text-slate-300 hover:!text-[#124E66] transition-colors">help@volo.in</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <PhoneCall className="h-4 w-4 text-[#124E66] shrink-0" />
                  <a href="tel:+918049002345" className="!text-slate-300 hover:!text-[#124E66] transition-colors">+91 80 4900 2345</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-[#124E66] shrink-0" />
                  <span className="!text-slate-300">Bangalore, KA, India</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom copyright & guidelines */}
          <div className="pt-8 !border-t !border-white/10 text-[10px] !text-slate-350 font-bold select-none flex flex-col sm:flex-row justify-between items-center gap-4 font-sans">
            <span>© {new Date().getFullYear()} VOLO On-Demand Services. All Rights Reserved.</span>
            <div className="flex gap-4 font-normal !text-slate-350">
              <a href="/privacy" className="hover:!text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:!text-white transition-colors">Terms of Use</a>
              <a href="#footer" className="hover:!text-white transition-colors">Trust & Safety Guidelines</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= LOGIN & REGISTRATION MODAL ================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm transition-all duration-300">
          {/* Warm Sand Liquid Glass Premium Modal */}
          <div className="w-full max-w-sm bg-gradient-to-b from-[#D3D9D4]/85 to-[#124E66]/90 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-10 text-slate-950 relative shadow-2xl overflow-hidden select-none animate-fade-in-up font-sans">

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowLoginModal(false);
                setAuthError(null);
                setAuthSuccess(null);
              }}
              className="absolute top-6 right-6 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
              suppressHydrationWarning
            >
              <X className="h-5 w-5" />
            </button>

            {/* Portal Switching Top Bar */}
            {authStep !== 'SET_PIN' && (
              <div className="flex justify-between items-center w-full mb-8 pt-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-900 bg-black/5 px-3 py-1 rounded-full border border-black/10">
                  {selectedRole === 'customer' ? 'Customer Portal' : 'Partner Portal'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(selectedRole === 'customer' ? 'worker' : 'customer');
                    setAuthStep('PHONE');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-[9px] font-extrabold uppercase tracking-wider text-slate-900 hover:text-slate-950 underline decoration-slate-900/30 decoration-2 underline-offset-4 cursor-pointer"
                  suppressHydrationWarning
                >
                  Switch to {selectedRole === 'customer' ? 'Partner' : 'Customer'}
                </button>
              </div>
            )}

            {/* Left-Aligned Bold Headline */}
            <div className="text-left space-y-2 mb-8">
              <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
                Log into<br />your account
              </h2>
            </div>

            {/* Error alerts logs */}
            {authError && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-start gap-2.5 mb-8 shadow-sm">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
                <span className="text-left leading-relaxed break-words">{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-start gap-2.5 mb-8 shadow-sm">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 mt-0.5" />
                <span className="text-left leading-relaxed break-words">{authSuccess}</span>
              </div>
            )}

            {/* Form layout */}
            {authStep === 'PHONE' && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="border-b border-slate-950/20 focus-within:border-slate-950 transition-colors py-1 flex items-center">
                  <span className="text-slate-800 font-semibold text-sm mr-2 select-none">+91</span>
                  <input
                    type="tel"
                    aria-label="Mobile Phone Number"
                    placeholder="Mobile Phone Number"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full !bg-transparent !border-none py-2.5 text-sm outline-none text-slate-950 placeholder-slate-600 font-semibold tracking-wide"
                    required
                    suppressHydrationWarning
                  />
                </div>

                {/* Remember me toggle */}
                <div className="flex items-center gap-2.5 py-1 text-left">
                  <label className="relative flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                      suppressHydrationWarning
                    />
                    <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${rememberMe
                      ? 'bg-slate-950 border-slate-950 text-white'
                      : 'border-slate-800/40 bg-transparent'
                      }`}>
                      {rememberMe && <Check className="h-3 w-3 stroke-[3] text-white" />}
                    </div>
                    <span className="ml-2.5 text-xs text-slate-800 font-medium font-sans">Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || phoneNumber.length < 10}
                  className="w-full bg-[#D3D9D4]/90 hover:bg-[#D3D9D4] disabled:bg-slate-300 text-slate-955 font-bold rounded-full py-4 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  suppressHydrationWarning
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-950" />
                  ) : (
                    'Log In'
                  )}
                </button>
              </form>
            )}

            {authStep === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="border-b border-slate-950/20 focus-within:border-slate-950 transition-colors py-1 text-center">
                  <input
                    type="text"
                    aria-label="6-Digit OTP Code"
                    maxLength={6}
                    placeholder="6-Digit OTP Code"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full !bg-transparent !border-none py-2.5 text-center tracking-[0.5em] text-sm outline-none text-slate-950 placeholder-slate-600 font-bold font-mono"
                    required
                    suppressHydrationWarning
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-800 font-medium px-1">
                  <span>Didn&apos;t receive code?</span>
                  {resendCountdown > 0 ? (
                    <span className="text-slate-600 font-semibold select-none">
                      Resend in {resendCountdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={authLoading}
                      className="text-slate-950 font-bold underline hover:text-black cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading || otpValue.length !== 6}
                  className="w-full bg-[#D3D9D4]/90 hover:bg-[#D3D9D4] disabled:bg-slate-300 text-slate-955 font-bold rounded-full py-4 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  suppressHydrationWarning
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-950" />
                  ) : (
                    'Verify & Log In'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('PHONE');
                    setOtpValue('');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="w-full bg-white/30 hover:bg-white/45 text-slate-900 border border-white/30 font-bold rounded-full py-3.5 text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  suppressHydrationWarning
                >
                  Change Phone Number
                </button>
              </form>
            )}

            {authStep === 'ENTER_PIN' && (
              <form onSubmit={handlePinLogin} className="space-y-6">
                <p className="text-xs text-slate-900 max-w-xs mx-auto leading-relaxed text-center font-medium">
                  Welcome back! Enter your security PIN to log in.
                </p>

                <div className="border-b border-slate-950/20 focus-within:border-slate-950 transition-colors py-1 text-center">
                  <input
                    type="password"
                    aria-label="Security PIN"
                    maxLength={6}
                    placeholder="Enter Security PIN"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full !bg-transparent !border-none py-2.5 text-center tracking-[0.5em] text-sm outline-none text-slate-950 placeholder-slate-600 font-bold font-mono"
                    required
                    suppressHydrationWarning
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading || inputPin.length < 4}
                  className="w-full bg-[#D3D9D4]/90 hover:bg-[#D3D9D4] disabled:bg-slate-300 text-slate-955 font-bold rounded-full py-4 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  suppressHydrationWarning
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-950" />
                  ) : (
                    'Log In with PIN'
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setAuthError(null);
                    setAuthSuccess(null);
                    setAuthLoading(true);
                    try {
                      const clean10Digits = phoneNumber.replace(/\D/g, '').slice(-10);
                      const formattedPhone = `+91${clean10Digits}`;
                      const result = await sendOtp(formattedPhone);
                      confirmationResultRef.current = result;
                      setAuthSuccess('Code sent successfully.');
                      setResendCountdown(30);
                      setAuthStep('OTP');
                    } catch (e) {
                      setAuthError('Could not send OTP. Try again.');
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  className="w-full bg-white/30 hover:bg-white/45 text-slate-900 border border-white/30 font-bold rounded-full py-3.5 text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  suppressHydrationWarning
                >
                  Log In with OTP Instead
                </button>
              </form>
            )}

            {authStep === 'SET_PIN' && (
              <form onSubmit={handleSetPin} className="space-y-6">
                <p className="text-xs text-slate-900 max-w-xs mx-auto leading-relaxed text-center font-medium">
                  Create a secure {pinLength}-digit PIN to log in next time on recognized devices.
                </p>

                {/* PIN length selector */}
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setPinLength(4); setPinSetup(p => p.slice(0, 4)); }}
                    className={`flex-1 max-w-[100px] py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${pinLength === 4
                      ? 'bg-slate-950 border-slate-950 text-white font-extrabold shadow-sm'
                      : 'bg-black/5 border-slate-950/10 text-slate-800 hover:border-slate-950/30 hover:text-slate-950'
                      }`}
                    suppressHydrationWarning
                  >
                    4 Digit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPinLength(6)}
                    className={`flex-1 max-w-[100px] py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${pinLength === 6
                      ? 'bg-slate-950 border-slate-950 text-white font-extrabold shadow-sm'
                      : 'bg-black/5 border-slate-950/10 text-slate-800 hover:border-slate-950/30 hover:text-slate-950'
                      }`}
                    suppressHydrationWarning
                  >
                    6 Digit
                  </button>
                </div>

                <div className="relative flex justify-center py-2">
                  <input
                    ref={pinSetupInputRef}
                    type="text"
                    aria-label="Secure PIN setup"
                    pattern="\d*"
                    inputMode="numeric"
                    maxLength={pinLength}
                    value={pinSetup}
                    onChange={(e) => setPinSetup(e.target.value.replace(/\D/g, '').slice(0, pinLength))}
                    onFocus={() => setIsPinSetupFocused(true)}
                    onBlur={() => setIsPinSetupFocused(false)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                    autoFocus
                    suppressHydrationWarning
                  />
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: pinLength }).map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-11 h-13 rounded-2xl border flex items-center justify-center text-xl font-bold transition-all duration-200
                          ${isPinSetupFocused && pinSetup.length === idx
                            ? 'border-slate-950 ring-4 ring-slate-950/10 scale-105 bg-black/5'
                            : pinSetup[idx]
                              ? 'border-slate-950/80 bg-black/10 text-slate-950'
                              : 'border-slate-950/20 bg-black/5 text-slate-950/40'
                          }`}
                      >
                        {pinSetup[idx] ? '•' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading || pinSetup.length !== pinLength}
                  className="w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-800 text-white font-bold rounded-full py-4 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-[0.98]"
                  suppressHydrationWarning
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    `Set ${pinLength}-Digit PIN`
                  )}
                </button>
              </form>
            )}

            {/* Bottom Register Prompt */}
            {authStep !== 'SET_PIN' && (
              <div className="text-center pt-8">
                <span className="text-[11px] text-slate-800 font-medium font-sans">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(selectedRole === 'customer' ? 'worker' : 'customer');
                      setAuthStep('PHONE');
                    }}
                    className="underline text-slate-950 font-bold hover:text-slate-850"
                    suppressHydrationWarning
                  >
                    Sign Up
                  </button>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permanent invisible container for reCAPTCHA validation */}
      <div id="recaptcha-container-home-light" className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none"></div>

    </div>
  );
}
