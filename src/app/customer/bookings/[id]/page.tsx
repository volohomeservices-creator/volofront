'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { 
  ArrowLeft, Clock, MapPin, Phone, User, CheckCircle2, 
  HelpCircle, AlertCircle, Loader2, Sparkles, Receipt, Navigation
} from 'lucide-react';
import { supabaseClient } from '@/lib/supabase-client';
import dynamic from 'next/dynamic';

const GoogleMap = dynamic(() => import('@/components/GoogleMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-100 flex items-center justify-center"><span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-widest">Loading Map...</span></div>
});

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerBookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [liveLoc, setLiveLoc] = useState<{ latitude: number; longitude: number } | null>(null);

  // Poll booking status every 15 seconds for real-time OTP updates on 'ARRIVED'
  const { data, error, isLoading } = useSWR(`/api/customer/bookings/${id}`, fetcher, {
    refreshInterval: 15005
  });

  const worker = data?.booking?.workers;
  const status = data?.booking?.status;

  useEffect(() => {
    if (!worker || !status || !['WORKER_ASSIGNED', 'WORKER_ACCEPTED', 'ON_THE_WAY'].includes(status)) {
      setLiveLoc(null);
      return;
    }

    async function fetchInitialLocation() {
      try {
        const { data: initialLoc } = await supabaseClient
          .from('worker_live_locations_approx')
          .select('latitude, longitude')
          .eq('worker_id', worker.id)
          .maybeSingle();

        if (initialLoc) {
          setLiveLoc({
            latitude: Number(initialLoc.latitude),
            longitude: Number(initialLoc.longitude)
          });
        }
      } catch (err) {
        console.error('Failed to load initial location:', err);
      }
    }

    fetchInitialLocation();

    const channel = supabaseClient
      .channel(`live-tracking-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'worker_live_locations_approx',
          filter: `worker_id=eq.${worker.id}`
        },
        (payload: any) => {
          if (payload.new && payload.new.latitude && payload.new.longitude) {
            setLiveLoc({
              latitude: Number(payload.new.latitude),
              longitude: Number(payload.new.longitude)
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [worker, status, id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-450 mt-3 font-semibold uppercase tracking-wider animate-pulse font-mono">Loading booking details...</p>
      </div>
    );
  }

  if (error || !data || !data.booking) {
    return (
      <div className="bg-[#0F172A] border border-white/[0.08] p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-12 shadow-2xl">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-bold text-white">Failed to load Booking</h3>
        <p className="text-xs text-slate-400 leading-relaxed font-semibold">We couldn't retrieve the details for this booking request.</p>
        <button
          type="button"
          onClick={() => router.push('/customer/bookings')}
          className="px-5 py-2.5 bg-[#124E66] hover:bg-[#2e5e73] rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
        >
          Go Back
        </button>
      </div>
    );
  }

  const { booking, images, routeSnapshot } = data;
  const service = booking.service_items;

  const basePrice = Number(service?.base_price || 0);
  const serviceFee = basePrice * 0.10;
  const tax = basePrice * 0.05;
  const totalAmount = basePrice + serviceFee + tax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'PENDING_ASSIGNMENT': return 'Finding Technician';
      case 'WORKER_ASSIGNED':
      case 'WORKER_ACCEPTED': return 'Technician Assigned';
      case 'ON_THE_WAY': return 'Technician En Route';
      case 'ARRIVED': return 'Technician Arrived';
      case 'IN_PROGRESS': return 'Service In Progress';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return s;
    }
  };

  // Define steps for the timeline tracker
  const steps = [
    { label: 'Booking Placed', key: 'PENDING_ASSIGNMENT', isDone: true },
    { 
      label: 'Technician Assigned', 
      key: 'WORKER_ASSIGNED', 
      isDone: ['WORKER_ASSIGNED', 'WORKER_ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) 
    },
    { 
      label: 'Technician En Route', 
      key: 'ON_THE_WAY', 
      isDone: ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) 
    },
    { 
      label: 'Arrived at Site', 
      key: 'ARRIVED', 
      isDone: ['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) 
    },
    { 
      label: 'Job Started', 
      key: 'IN_PROGRESS', 
      isDone: ['IN_PROGRESS', 'COMPLETED'].includes(status) 
    },
    { 
      label: 'Completed', 
      key: 'COMPLETED', 
      isDone: status === 'COMPLETED' 
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center gap-3.5 select-none">
        <button
          onClick={() => router.push('/customer/dashboard')}
          className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="font-extrabold text-sm text-slate-900">Booking Details</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">ID: {booking.id.substring(0, 8)}</p>
        </div>
      </div>

      {/* Main Grid: Left tracking maps, Right checkout details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Map & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Technician Tracking Map Widget */}
          {['PENDING_ASSIGNMENT', 'WORKER_ASSIGNED', 'WORKER_ACCEPTED', 'ON_THE_WAY'].includes(status) ? (
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Live Tracking</span>
                {['WORKER_ACCEPTED', 'ON_THE_WAY'].includes(status) ? (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded bg-red-50 text-red-500 border border-red-200 animate-pulse font-mono">
                    Live coordinates
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded bg-[#D3D9D4]/20 text-[#124E66] border border-[#124E66]/20 font-mono">
                    Awaiting Journey
                  </span>
                )}
              </div>

              <div className="w-full h-72 relative rounded-2xl overflow-hidden border border-slate-200">
                <GoogleMap
                  workerLat={liveLoc?.latitude || null}
                  workerLng={liveLoc?.longitude || null}
                  customerLat={Number(booking.lat)}
                  customerLng={Number(booking.lng)}
                  workerName={worker?.users?.full_name || 'Technician'}
                />
              </div>

              {routeSnapshot && ['WORKER_ACCEPTED', 'ON_THE_WAY'].includes(status) && (
                <div className="grid grid-cols-2 gap-4 text-center border-t border-slate-100 pt-3.5 select-none font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Distance Remaining</span>
                    <p className="font-extrabold text-slate-900 text-sm">{routeSnapshot.distance_km} km</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Estimated Time (ETA)</span>
                    <p className="font-extrabold text-[#124E66] text-sm">{routeSnapshot.eta_minutes} mins</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Booking Status Card & Timeline */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-5">
            <div className="flex justify-between items-center select-none">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Current Status</span>
              <span className={`px-2.5 py-0.5 text-[8px] font-bold uppercase rounded border font-mono ${
                status === 'COMPLETED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                status === 'CANCELLED' ? 'bg-red-50 text-red-500 border-red-200' :
                status === 'ARRIVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 animate-pulse' :
                'bg-[#D3D9D4]/20 text-[#124E66] border-[#124E66]/20'
              }`}>
                {getStatusLabel(status)}
              </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-5 border-l border-slate-200 ml-3.5 py-1">
              {steps.map((step, index) => {
                const isActive = status === step.key || (status === 'WORKER_ACCEPTED' && step.key === 'WORKER_ASSIGNED');
                return (
                  <div key={index} className="relative">
                    <span className={`absolute -left-9 top-0.5 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      step.isDone 
                        ? 'bg-[#124E66] border-[#124E66] text-white shadow-md shadow-orange-500/20' 
                        : 'bg-white border-slate-200 text-slate-300'
                    }`}>
                      <CheckCircle2 className={`h-3.5 w-3.5 ${step.isDone ? 'opacity-100 text-white' : 'opacity-0'}`} />
                    </span>
                    <div className="pl-1.5">
                      <p className={`text-xs font-bold ${step.isDone ? 'text-slate-900' : 'text-slate-400'} ${isActive ? 'text-[#124E66] font-black' : ''}`}>
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: OTP, Technician, Service Description & Receipt */}
        <div className="space-y-6">
          
          {/* Prominent OTP Code Widget */}
          {status === 'ARRIVED' && booking.otp && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3.5 shadow-sm animate-pulse">
              <span className="px-2.5 py-1 text-[8px] font-bold uppercase rounded bg-red-100 text-red-600 border border-red-200 font-mono">
                Awaiting Verification
              </span>
              <h3 className="font-bold text-slate-900 text-xs">Verify Work Start OTP</h3>
              <div className="font-mono text-3xl font-black text-[#124E66] tracking-widest">{booking.otp}</div>
              <p className="text-[10px] text-red-700 font-semibold max-w-xs mx-auto leading-relaxed">
                Provide this 4-digit code to the technician once they arrive at your location to begin the service session.
              </p>
            </div>
          )}

          {/* Technician Details */}
          {worker && worker.users && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
              <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Technician Information</h3>
              
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#D3D9D4]/20 border border-[#124E66]/20 flex items-center justify-center font-bold text-slate-700 text-sm select-none">
                    {worker.users.full_name?.charAt(0) || 'T'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-900 truncate">{worker.users.full_name || 'Assigned Worker'}</h4>
                    <p className="text-[10px] text-slate-500 font-semibold font-mono mt-1">Ratings: ★ {Number(worker.rating || 5.0).toFixed(1)}</p>
                  </div>
                </div>

                <a
                  href={`tel:${worker.users.phone}`}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all cursor-pointer select-none"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Service Details & Address */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Service Information</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 select-none shrink-0 text-[#124E66]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Requested Item</span>
                  <p className="font-bold text-xs text-slate-900 leading-snug">{service?.name || 'Home Service Call'}</p>
                  {service?.description && (
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{service.description}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 select-none shrink-0 text-[#124E66]">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider font-mono">Service Address</span>
                  <p className="font-semibold text-xs text-slate-700 leading-relaxed select-all">{booking.address_line}</p>
                </div>
              </div>

              {booking.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider block font-mono">Customer Instructions</span>
                  <p className="text-[10px] text-slate-600 leading-relaxed font-semibold italic">"{booking.notes}"</p>
                </div>
              )}

              {/* Attached Images */}
              {images && images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">Attachments ({images.length})</span>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={img}
                        alt={`Attachment ${i + 1}`}
                        className="h-16 w-full object-cover rounded-xl border border-slate-200 shadow-sm hover:opacity-85 transition-opacity"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bill Receipt breakdown */}
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-4 select-none">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
              <Receipt className="h-4.5 w-4.5 text-[#124E66]" />
              <h3 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Pricing Receipt</h3>
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
              <div className="flex justify-between font-semibold text-slate-600 border-b border-slate-100 pb-2.5">
                <span>GST / SGST (5%)</span>
                <span className="font-mono">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 text-sm pt-1">
                <span>Estimated Total (COD)</span>
                <span className="text-[#124E66] font-mono">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
