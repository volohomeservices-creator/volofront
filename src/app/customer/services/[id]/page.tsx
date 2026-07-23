'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabase-client';
import { compressKycImage } from '@/lib/image-compression';
import { 
  ArrowLeft, Clock, Sparkles, MapPin, Plus, Loader2, 
  AlertCircle, Receipt, Calendar, FileText, Upload, Image, 
  Trash2, CheckCircle2, Wallet, Tag 
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface AddressItem {
  id: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
}

export default function CustomerServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // 1. Fetch Service Details
  const { data: serviceData, error: serviceErr, isLoading: serviceLoading } = useSWR(`/api/customer/services/${id}`, fetcher);

  // 2. Fetch Saved Addresses
  const { data: addrData, isLoading: addrLoading } = useSWR('/api/customer/addresses', fetcher);

  // 3. Fetch Wallet details
  const { data: walletData, isLoading: walletLoading } = useSWR('/api/customer/wallet', fetcher);

  // Booking form states
  const [bookingType, setBookingType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [customAddress, setCustomAddress] = useState('');
  const [customCoords, setCustomCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Image attachments states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Checkout states
  const [paymentMode, setPaymentMode] = useState<'COD' | 'ONLINE' | 'WALLET'>('COD');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeApplied, setPromoCodeApplied] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  // General submission states
  const [booking, setBooking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto-select default address
  useEffect(() => {
    if (addrData?.addresses && addrData.addresses.length > 0) {
      const defaultAddr = addrData.addresses.find((a: AddressItem) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else {
        setSelectedAddressId(addrData.addresses[0].id);
      }
    }
  }, [addrData]);

  // Query browser location if custom address option is active
  useEffect(() => {
    if (selectedAddressId === 'CUSTOM' && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Custom address geolocation fetch failed:", {
            code: error.code,
            message: error.message
          });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, [selectedAddressId]);

  if (serviceLoading || addrLoading || walletLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-450 mt-3 font-semibold tracking-wider uppercase animate-pulse">Loading booking details...</p>
      </div>
    );
  }

  if (serviceErr || !serviceData || !serviceData.item) {
    return (
      <div className="bg-[#0F172A] border border-white/[0.08] p-6 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-12 shadow-2xl">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
        <h3 className="font-bold text-white">Service Not Found</h3>
        <p className="text-xs text-slate-450 leading-relaxed font-semibold">The requested service category could not be resolved.</p>
        <button
          type="button"
          onClick={() => router.push('/customer/services')}
          className="px-4 py-2 bg-[#124E66] hover:bg-[#2e5e73] rounded-xl text-xs font-semibold text-white transition-colors"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  const item = serviceData.item;
  const basePrice = Number(item.base_price);
  const serviceFee = basePrice * 0.10;
  const tax = basePrice * 0.05;
  const totalAmount = basePrice + serviceFee + tax;

  const walletBalance = walletData ? Number(walletData.balance) : 0;
  const discountAmount = promoCodeApplied ? Number(promoCodeApplied.discount_amount) : 0;
  const finalTotalAmount = Math.max(0, totalAmount - discountAmount);
  const isWalletInsufficient = paymentMode === 'WALLET' && walletBalance < finalTotalAmount;

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setPromoError('');
    setValidatingPromo(true);
    try {
      const res = await fetch('/api/customer/promo-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCodeInput.trim().toUpperCase(),
          order_amount: totalAmount
        })
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to validate promo code.');
      }
      setPromoCodeApplied(resData);
      setPromoCodeInput('');
      setErrorMsg('');
    } catch (err: any) {
      setPromoError(err.message || 'Invalid promo code.');
      setPromoCodeApplied(null);
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setPromoCodeApplied(null);
    setPromoError('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Upload compressed images to storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imagePaths.length + files.length > 3) {
      setErrorMsg('You can upload a maximum of 3 image attachments.');
      return;
    }

    setErrorMsg('');
    setCompressing(true);
    setUploading(true);

    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) throw new Error('Unauthorized session.');
      const meData = await meRes.json();
      const userId = meData.user.id;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 1. Compress image to WebP (max 250KB)
        const compressedFile = await compressKycImage(file, 'ATTACHMENT');

        // 2. Upload to Supabase 'booking-images' bucket
        const tempPath = `temp_${userId}/${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`;
        const { data: uploadData, error: uploadErr } = await supabaseClient.storage
          .from('booking-images')
          .upload(tempPath, compressedFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);

        // 3. Get Public URL for preview
        const { data: { publicUrl } } = supabaseClient.storage
          .from('booking-images')
          .getPublicUrl(uploadData.path);

        setImagePaths(prev => [...prev, uploadData.path]);
        setImagePreviews(prev => [...prev, publicUrl]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to process image attachment.');
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImagePaths(prev => prev.filter((_, idx) => idx !== index));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCustomCoords({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            {
              headers: { 'User-Agent': 'VoloHomeServices/1.0 (contact@volo.com)' }
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              setCustomAddress(data.display_name);
            } else {
              setCustomAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
          } else {
            setCustomAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
          setCustomAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message
        });
        setErrorMsg('Failed to detect your current position. Please enable location access.');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Handle booking form submission
  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let finalAddress = '';
    let lat = 12.9716;
    let lng = 77.5946;

    if (selectedAddressId === 'CUSTOM') {
      if (!customAddress) {
        setErrorMsg('Please specify custom address details.');
        return;
      }
      finalAddress = customAddress;
      if (customCoords) {
        lat = customCoords.lat;
        lng = customCoords.lng;
      } else {
        // Fallback to default coordinates instead of blocking the user from booking
        lat = 12.9716;
        lng = 77.5946;
      }
    } else {
      const selected = addrData?.addresses?.find((a: AddressItem) => a.id === selectedAddressId);
      if (!selected) {
        setErrorMsg('Please select a service delivery address.');
        return;
      }
      finalAddress = selected.address;
      lat = Number(selected.latitude);
      lng = Number(selected.longitude);
    }

    if (bookingType === 'SCHEDULED' && !scheduledAt) {
      setErrorMsg('Please select a future scheduled date & time.');
      return;
    }

    // Verify scheduled date is in the future
    if (bookingType === 'SCHEDULED' && scheduledAt) {
      const selectedTime = new Date(scheduledAt).getTime();
      const minTime = Date.now() + 10 * 60 * 1000; // at least 10 minutes from now
      if (selectedTime < minTime) {
        setErrorMsg('Scheduled booking time must be in the future (minimum 10 minutes from now).');
        return;
      }
    }

    if (isWalletInsufficient) {
      setErrorMsg('Insufficient wallet balance to proceed.');
      return;
    }

    setBooking(true);

    try {
      const res = await fetch('/api/customer/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_item_id: serviceData.item.id,
          address: finalAddress,
          latitude: lat,
          longitude: lng,
          scheduled_at: bookingType === 'SCHEDULED' ? new Date(scheduledAt).toISOString() : null,
          notes,
          payment_mode: paymentMode,
          promo_code: promoCodeApplied ? promoCodeApplied.code : undefined,
          images: imagePaths
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to place booking.');
      }

      setSuccessMsg('Booking registered successfully! Dispatching technician...');
      setTimeout(() => {
        router.push(`/customer/bookings/${resData.bookingId}`);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during booking.');
      setBooking(false);
    }
  };

  const hasAddresses = addrData?.addresses && addrData.addresses.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3.5 select-none">
        <button
          type="button"
          onClick={() => router.push('/customer/services')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="font-extrabold text-sm text-slate-900">Book Service</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Configure Request Details</p>
        </div>
      </div>

      {/* Split Grid */}
      <form onSubmit={handleBookService} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Booking Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1: Booking type selection */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 select-none font-mono">
              <Calendar className="h-4 w-4 text-[#124E66]" />
              1. Select Schedule Type
            </span>

            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 select-none">
              <button
                type="button"
                onClick={() => setBookingType('INSTANT')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  bookingType === 'INSTANT'
                    ? 'bg-white text-[#124E66] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Instant Booking
              </button>
              <button
                type="button"
                onClick={() => setBookingType('SCHEDULED')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  bookingType === 'SCHEDULED'
                    ? 'bg-white text-[#124E66] shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Schedule Future
              </button>
            </div>

            {bookingType === 'SCHEDULED' ? (
              <div className="space-y-1.5 pt-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold outline-none transition-all focus:ring-4 focus:ring-teal-500/5"
                  required
                />
                <span className="text-[8px] text-[#124E66] font-semibold font-mono leading-relaxed block pl-1">
                  * Notice: Scheduled bookings are assigned immediately to guarantee a technician ahead of time. Cancellation/rescheduling is only available within 2 minutes of booking.
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold italic pl-1">
                * Instant service dispatches the nearest available certified professional immediately. Average arrival: 30-45 mins. Cancellation is only available within 2 minutes of booking.
              </p>
            )}
          </div>

          {/* Step 2: Address details selection */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 select-none font-mono">
              <MapPin className="h-4 w-4 text-[#124E66]" />
              2. Choose Service Location Address
            </span>

            <div className="space-y-3">
              <div className="flex justify-between items-center pb-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Select Delivery Location</label>
                <Link
                  href="https://volo2.netlify.app/customer/addresses"
                  className="text-[9px] font-extrabold uppercase text-[#124E66] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Manage / Add Addresses ↗
                </Link>
              </div>
              <select
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-xl px-4 py-3.5 text-xs text-slate-900 font-semibold outline-none transition-all focus:ring-4 focus:ring-teal-500/5 cursor-pointer"
              >
                {hasAddresses && addrData.addresses.map((a: AddressItem) => (
                  <option key={a.id} value={a.id} className="bg-white text-slate-900">
                    {a.label} — {a.address.substring(0, 45)}...
                  </option>
                ))}
                <option value="CUSTOM" className="bg-white text-slate-900">Custom Address Details...</option>
              </select>

              {selectedAddressId === 'CUSTOM' && (
                <div className="space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Street Address Details</label>
                    <button
                      type="button"
                      onClick={handleDetectCurrentLocation}
                      disabled={detectingLocation}
                      className="text-[9px] font-extrabold uppercase text-[#124E66] hover:underline flex items-center gap-1 cursor-pointer select-none disabled:opacity-50"
                    >
                      {detectingLocation ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        '📍 Use Current Location'
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all resize-none leading-relaxed focus:ring-4 focus:ring-teal-500/5"
                    placeholder="Street details, door number, landmarks..."
                    required
                  />
                  <span className="text-[8px] text-[#124E66] font-semibold font-mono leading-relaxed block pl-1">
                    * Note: custom location uses your device's active GPS coordinates. Please allow location access.
                  </span>
                </div>
              )}

              {!hasAddresses && selectedAddressId !== 'CUSTOM' && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-amber-700 text-[10px] font-bold">
                  No saved address found. Please type custom address details.
                  <button
                    type="button"
                    onClick={() => setSelectedAddressId('CUSTOM')}
                    className="px-2.5 py-1 bg-[#124E66] hover:bg-[#206783] border border-[#124E66] rounded-lg uppercase tracking-wider text-[9px] font-extrabold cursor-pointer text-white shadow-sm"
                  >
                    Type Manual
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Attachments & Notes */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 select-none font-mono">
              <FileText className="h-4 w-4 text-[#124E66]" />
              3. Customer Notes & Attachments
            </span>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Special Instructions (Optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-semibold outline-none transition-all resize-none leading-relaxed focus:ring-4 focus:ring-teal-500/5"
                  placeholder="Describe specific issues, gates codes, or directions..."
                />
              </div>

              {/* Image Upload list */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center select-none">
                  <label className="text-[9px] font-bold uppercase text-slate-500 tracking-wider font-mono">Upload Job Photos (Max 3)</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || imagePaths.length >= 3}
                    className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#124E66] hover:underline disabled:text-slate-400 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Add Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {compressing && (
                  <p className="text-[9px] text-[#124E66] animate-pulse font-semibold font-mono">Compressing attachments to WebP...</p>
                )}

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative h-18 w-full rounded-xl overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview} alt="Attachment" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Select Payment Method */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 select-none font-mono">
              <Wallet className="h-4 w-4 text-[#124E66]" />
              4. Select Payment Method
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'COD', label: 'COD (Cash)', desc: 'Pay after service' },
                { id: 'ONLINE', label: 'Online Pay', desc: 'Card, NetBanking' },
                { id: 'WALLET', label: 'Volo Wallet', desc: `Balance: ₹${walletBalance.toFixed(0)}` }
              ].map((method) => {
                const isSelected = paymentMode === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setPaymentMode(method.id as any);
                      setErrorMsg('');
                    }}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer select-none h-20 relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#D3D9D4]/20/50 border-[#124E66] shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      isSelected ? 'text-[#124E66]' : 'text-slate-700'
                    }`}>
                      {method.label}
                    </span>
                    <span className={`text-[9px] leading-tight font-semibold mt-1 font-mono ${
                      isSelected ? 'text-[#124E66]/80' : 'text-slate-500'
                    }`}>
                      {method.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Wallet top-up warning */}
            {isWalletInsufficient && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-700 text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Insufficient balance in Volo Wallet (Short by ₹{(finalTotalAmount - walletBalance).toFixed(2)})</span>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/customer/wallet')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 border border-amber-500 rounded-lg uppercase tracking-wider text-[9px] font-extrabold cursor-pointer text-white shadow-sm"
                >
                  Top Up Wallet
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Service Details, Invoicing, and Submit Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Service Details Panel */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded bg-[#D3D9D4]/20 text-[#124E66] border border-[#124E66]/20 font-mono">
              {item.service_categories?.name || 'Home Maintenance'}
            </span>
            <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
            {item.description && (
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">{item.description}</p>
            )}
            
            <div className="flex flex-col gap-2 pt-3 font-semibold text-[10px] select-none text-slate-500 border-t border-slate-200 font-mono">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#124E66]" />
                Estimated Duration: {item.estimated_mins} mins
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#124E66]" />
                Vetted Expert Dispatched
              </span>
            </div>
          </div>

          {/* Promo / Discount Coupon */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2 select-none font-mono">
              <Tag className="h-4 w-4 text-[#124E66]" />
              Promo Coupon Code
            </span>

            {promoCodeApplied ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-600 font-mono border border-emerald-200">
                    {promoCodeApplied.code}
                  </span>
                  <p className="text-[10px] text-slate-600 font-semibold leading-relaxed mt-1">
                    {promoCodeApplied.description || 'Discount Applied Successfully!'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="px-2.5 py-1.5 bg-white hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-xl text-[9px] font-black text-slate-500 transition-colors uppercase tracking-wider font-mono cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ENTER COUPON CODE"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value);
                      setPromoError('');
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#124E66]/50 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none transition-all placeholder-slate-400 font-mono tracking-wider text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={validatingPromo || !promoCodeInput.trim()}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 disabled:bg-slate-100 disabled:text-slate-400 border border-slate-250 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono text-slate-800 shadow-sm"
                  >
                    {validatingPromo ? '...' : 'Apply'}
                  </button>
                </div>
                {promoError && (
                  <p className="text-[10px] text-red-500 font-bold font-mono pl-1">{promoError}</p>
                )}
              </div>
            )}
          </div>

          {/* Bill Receipt breakdown */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-3.5 select-none">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
              <Receipt className="h-4.5 w-4.5 text-[#124E66]" />
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider font-mono">Pricing Receipt</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Base Service Cost</span>
                <span className="font-mono">{formatCurrency(basePrice)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600">
                <span>Volo Dispatch Fee (10%)</span>
                <span className="font-mono">{formatCurrency(serviceFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-600 border-b border-slate-200 pb-2.5">
                <span>GST / SGST (5%)</span>
                <span className="font-mono">{formatCurrency(tax)}</span>
              </div>

              {promoCodeApplied && (
                <div className="flex justify-between font-bold text-emerald-500 border-b border-slate-200 pb-2.5 font-mono">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    Coupon Discount ({promoCodeApplied.code})
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-slate-900 text-sm pt-1">
                <span>Estimated Total ({paymentMode})</span>
                <span className="text-[#124E66] font-mono">{formatCurrency(finalTotalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-2xl flex items-center gap-2.5 text-red-400 text-xs font-bold leading-snug">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-center gap-2.5 text-emerald-400 text-xs font-bold leading-snug">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
              {successMsg}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={booking || uploading || isWalletInsufficient}
              className="w-full flex items-center justify-center gap-2 bg-[#124E66] hover:bg-[#2e5e73] disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer shadow-md active:scale-98"
            >
              {booking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Dispatching Technician...
                </>
              ) : isWalletInsufficient ? (
                'Insufficient Wallet Balance'
              ) : (
                `Confirm Booking (${paymentMode})`
              )}
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
