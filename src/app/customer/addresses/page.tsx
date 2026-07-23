'use client';

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { 
  MapPin, Plus, Trash2, Loader2, Home, Briefcase, 
  Star, MapPinned, Navigation, CheckCircle, AlertCircle, ShieldCheck
} from 'lucide-react';
import GoogleMap from '@/components/GoogleMap';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function AddressesPage() {
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR('/api/customer/addresses', fetcher);
  
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('HOME');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const addresses = data?.addresses || [];

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser.');
      return;
    }

    setDetecting(true);
    setGpsStatus('Accessing GPS satellites...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        setGpsStatus('Resolving street address...');
        try {
          const res = await fetch(`/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const geocodeData = await res.json();
            if (geocodeData?.result?.formattedAddress) {
              setNewAddress(geocodeData.result.formattedAddress);
              setGpsStatus('Location imported successfully!');
            } else {
              setGpsStatus('Could not find detailed address. Please fill manually.');
            }
          } else {
            setGpsStatus('Reverse geocoding failed. Please write address manually.');
          }
        } catch (err) {
          console.error(err);
          setGpsStatus('Network error while checking coordinates.');
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error('GPS detection failed:', {
          code: error.code,
          message: error.message
        });
        setGpsStatus('Permission denied or GPS signal lost.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newLabel,
          address: newAddress,
          latitude: latitude || 12.9716, // fallback to Bangalore
          longitude: longitude || 77.5946,
          is_default: addresses.length === 0,
        })
      });
      if (res.ok) {
        setNewAddress('');
        setLatitude(null);
        setLongitude(null);
        setGpsStatus(null);
        mutate('/api/customer/addresses');
        mutate('/api/customer/dashboard'); // update profile completion
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add address');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) mutate('/api/customer/addresses');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/customer/addresses/${id}`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true })
      });
      if (res.ok) mutate('/api/customer/addresses');
    } catch (err) {
      console.error(err);
    }
  };

  const getLabelIcon = (label: string) => {
    if (label === 'HOME') return <Home className="h-4 w-4 shrink-0" />;
    if (label === 'WORK') return <Briefcase className="h-4 w-4 shrink-0" />;
    return <MapPinned className="h-4 w-4 shrink-0" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      
      {/* 1. HERO TITLE HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <MapPin className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Location Manager
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Save addresses for quicker checkouts and technicians assignments. Use dynamic GPS coordinates for accurate dispatch maps.
          </p>
        </div>
      </div>

      {/* 2. DUAL-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: LIST OF SAVED LOCATIONS */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono px-1">Saved Addresses ({addresses.length})</h2>
          
          {addresses.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-[24px] shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900">No saved addresses</h4>
                <p className="text-[10px] text-slate-500 font-medium">Use the panel on the right to import your location coordinates.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {addresses.map((addr: any) => (
                <div 
                  key={addr.id} 
                  className="bg-white border border-slate-200/80 rounded-[24px] p-5 shadow-sm relative group hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[#124E66]/10 text-[#124E66] flex items-center justify-center shrink-0 border border-slate-100">
                          {getLabelIcon(addr.label)}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-sm text-slate-900 uppercase tracking-wider">{addr.label}</h3>
                          <p className="text-xs text-slate-650 mt-1 leading-relaxed font-semibold">{addr.address}</p>
                        </div>
                      </div>

                      {addr.is_default ? (
                        <span className="bg-[#10B981]/15 text-[#10B981] px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-[#10B981]/25 font-mono flex items-center gap-1 shrink-0">
                          <CheckCircle className="h-3 w-3 fill-current text-white" /> Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[9px] font-black text-slate-450 hover:text-[#124E66] hover:bg-slate-50 border border-slate-200/60 rounded-full px-2.5 py-1 uppercase tracking-wider font-mono cursor-pointer transition-colors shrink-0"
                        >
                          Make Default
                        </button>
                      )}
                    </div>

                    {addr.latitude && addr.longitude && (
                      <div className="h-28 rounded-2xl overflow-hidden border border-slate-150 relative pointer-events-none bg-slate-50">
                        <GoogleMap
                          customerLat={addr.latitude}
                          customerLng={addr.longitude}
                          workerLat={null}
                          workerLng={null}
                          zoom={15}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end items-center mt-4 pt-3 border-t border-slate-100/80">
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="text-red-500 hover:text-red-750 hover:bg-red-50 p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider"
                      title="Delete Location"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ADD ADDRESS FORM */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono px-1">Add Location</h2>
          
          <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm space-y-5 animate-fade-in-up">
            
            {/* Autofetch Geolocation Button */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">Autofetch GPS Position</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#124E66] text-white hover:bg-[#206783] transition-colors rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm disabled:opacity-50"
              >
                {detecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 text-[#D3D9D4]" />
                )}
                {detecting ? 'Accessing Satellite Coordinates...' : 'Detect My Location'}
              </button>
              {gpsStatus && (
                <div className={`p-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-2 ${
                  gpsStatus.includes('successfully')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{gpsStatus}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleAddAddress} className="space-y-4">
              
              {/* Type Category Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">Location Type</label>
                <div className="flex gap-2">
                  {['HOME', 'WORK', 'OTHER'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewLabel(lbl)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        newLabel === lbl 
                          ? 'bg-[#124E66] border-[#124E66] text-white shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-550 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {getLabelIcon(lbl)}
                      <span>{lbl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Address Text Block */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">Full Address</label>
                <textarea
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street name, apartment, flat number, city..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl p-3 text-xs font-semibold text-slate-900 placeholder-slate-400 outline-none min-h-[110px] resize-none"
                  required
                />
              </div>

              {/* Dynamic Map Placement Verification */}
              {latitude && longitude && (
                <div className="space-y-2 animate-fade-in-up">
                  <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest font-mono">Live Coordinate Verification</label>
                  <div className="h-32 rounded-xl overflow-hidden border border-slate-200 relative pointer-events-none">
                    <GoogleMap
                      customerLat={latitude}
                      customerLng={longitude}
                      workerLat={null}
                      workerLng={null}
                      zoom={16}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !newAddress.trim()}
                className="w-full py-3 bg-[#748D92] text-white hover:bg-[#60777B] transition-colors rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Save Location
              </button>

            </form>
          </div>
        </div>

      </div>
      
    </div>
  );
}
