'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { supabaseClient } from '@/lib/supabase-client';
import { compressKycImage } from '@/lib/image-compression';
import { 
  User, Mail, Phone, MapPin, Loader2, Save, Upload, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ProfileFormValues {
  full_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profileData, error, isLoading } = useSWR('/api/customer/profile', fetcher);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Avatar states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const getPosition = (options: PositionOptions): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });
    };

    const processCoords = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { 'User-Agent': 'VoloHomeServices/1.0 (contact@volo.com)' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.address) {
            const road = data.address.road || data.address.suburb || data.address.neighbourhood || '';
            const cityVal = data.address.city || data.address.town || data.address.village || data.address.county || '';
            const stateVal = data.address.state || '';
            const postcodeVal = data.address.postcode || '';

            setValue('address', data.display_name || road);
            setValue('city', cityVal);
            setValue('state', stateVal);
            setValue('pincode', postcodeVal);
            setSuccessMsg('Location auto-detected successfully!');
          } else {
            setErrorMsg('Could not resolve address details.');
          }
        } else {
          setErrorMsg('Reverse geocoding service returned an error.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to reverse geocode address.');
      } finally {
        setDetecting(false);
      }
    };

    const runDetection = async () => {
      try {
        const pos = await getPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 });
        await processCoords(pos);
      } catch (highAccErr: any) {
        console.warn('High accuracy location detection failed or timed out. Retrying with low accuracy fallback...', highAccErr);
        try {
          const pos = await getPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 });
          await processCoords(pos);
        } catch (fallbackErr: any) {
          setErrorMsg(`Location detection failed: ${fallbackErr.message || String(fallbackErr)}`);
          setDetecting(false);
        }
      }
    };

    runDetection();
  };

  const { register, handleSubmit, reset, setValue, watch } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const watchedPincode = watch('pincode');

  useEffect(() => {
    async function lookupPinCode() {
      if (watchedPincode && watchedPincode.length === 6) {
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${watchedPincode}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data[0] && data[0].Status === 'Success') {
              const postOffice = data[0].PostOffice?.[0];
              if (postOffice) {
                const cityVal = postOffice.District;
                const stateVal = postOffice.State;
                if (cityVal) setValue('city', cityVal);
                if (stateVal) setValue('state', stateVal);
              }
            }
          }
        } catch (err) {
          console.error('Pincode API lookup failed:', err);
        }
      }
    }
    lookupPinCode();
  }, [watchedPincode, setValue]);

  useEffect(() => {
    if (profileData) {
      reset({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        pincode: profileData.pincode || ''
      });
      setAvatarUrl(profileData.avatar_url || null);
    }
  }, [profileData, reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileData) return;

    setErrorMsg('');
    setSuccessMsg('');
    setUploadingAvatar(true);
    setCompressing(true);

    try {
      // 1. Compress image to WebP profile photo spec
      const compressedFile = await compressKycImage(file, 'PROFILE_PHOTO');
      setCompressing(false);

      // 2. Fetch current user session to determine UUID
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) throw new Error('Unauthorized');
      const meData = await meRes.json();
      const userId = meData.user.id;

      // 3. Upload directly to Supabase storage 'profile-images' bucket
      const uploadPath = `customer_${userId}/profile.webp`;
      const { data: uploadData, error: uploadErr } = await supabaseClient.storage
        .from('profile-images')
        .upload(uploadPath, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Avatar storage upload failed: ${uploadErr.message}`);
      }

      // 4. Update the avatar_url in users table via PATCH
      const patchRes = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileData.full_name,
          email: profileData.email,
          address: profileData.address,
          avatar_url: uploadData.path
        })
      });

      if (!patchRes.ok) {
        throw new Error('Failed to update avatar metadata.');
      }

      // 5. Query public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('profile-images')
        .getPublicUrl(uploadData.path);

      setAvatarUrl(publicUrl);
      setSuccessMsg('Avatar updated successfully.');
      
      mutate('/api/customer/profile');
      mutate('/api/customer/dashboard');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Avatar upload failed.');
    } finally {
      setUploadingAvatar(false);
      setCompressing(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          address: values.address,
          city: values.city,
          state: values.state,
          pincode: values.pincode
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save profile.');
      }

      setSuccessMsg('Profile updated successfully.');
      mutate('/api/customer/profile');
      mutate('/api/customer/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-900">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-wider animate-pulse">Loading profile details...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="bg-white border border-slate-200 p-8 rounded-3xl text-center space-y-4 max-w-md mx-auto mt-12 shadow-sm">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-black text-slate-900">Failed to load Profile</h3>
        <p className="text-xs text-slate-600 leading-relaxed">There was a problem loading your profile details. Please try refreshing.</p>
        <button
          type="button"
          onClick={() => mutate('/api/customer/profile')}
          className="px-5 py-2.5 bg-[#EF4444] hover:bg-red-500 rounded-2xl text-xs font-black text-white transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
      
      {/* 1. HERO HEADER */}
      <div className="bg-gradient-to-r from-[#124E66] to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
        <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <User className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Account Management
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            View your registration details, edit your personal details, and configure your default address for dispatch map routing.
          </p>
        </div>
      </div>

      {/* 2. DUAL-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: AVATAR CARD & OVERVIEW */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm text-center space-y-5">
            <span className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono block">Profile Photo</span>
            
            {/* Avatar sphere */}
            <div className="relative h-32 w-32 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden mx-auto shadow-inner group">
              {avatarUrl ? (
                <img 
                  src={!avatarUrl.startsWith('http')
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${avatarUrl}` 
                    : avatarUrl
                  } 
                  alt="Avatar" 
                  className="h-full w-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                  }}
                />
              ) : (
                <User className="h-12 w-12 text-slate-400" />
              )}
              
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-[#124E66] animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-black text-base text-slate-900 truncate">
                {profileData.full_name || 'Customer'}
              </h3>
              <p className="text-[10px] font-bold text-slate-450 font-mono truncate">{profileData.email || 'No email set'}</p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#124E66]/10 text-[#124E66] rounded-full text-[10px] font-bold font-mono">
              <Phone className="h-3 w-3" />
              {profileData.phone || 'No phone'}
            </div>

            <div className="border-t border-slate-100 pt-5 space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 select-none cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                <Upload className="h-4 w-4 text-[#124E66]" />
                Change Avatar
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              {compressing && (
                <p className="text-[9px] text-[#124E66] animate-pulse font-semibold">Converting to optimized WebP format...</p>
              )}
              <p className="text-[9px] text-slate-450 leading-relaxed font-semibold">
                JPEG, PNG or WebP files are automatically compressed and formatted.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAIL FORM */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* SECTION 1: PERSONAL DETAILS */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono border-b border-slate-100 pb-2">Personal Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Full Name</label>
                    <input
                      type="text"
                      {...register('full_name', { required: true })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-semibold"
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Email Address</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-semibold"
                      placeholder="e.g. name@domain.com"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEFAULT DISPATCH LOCATION */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-450 tracking-widest font-mono">Default Service Address</h3>
                  
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detecting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#124E66]/20 hover:border-[#124E66]/30 rounded-xl text-[10px] font-black text-[#124E66] bg-[#D3D9D4]/20 hover:bg-[#D3D9D4]/40 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {detecting ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-[#124E66]" />
                        Autofetching GPS...
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3 text-[#124E66]" />
                        Auto-Detect Location
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Street Address Details</label>
                    <input
                      type="text"
                      {...register('address')}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-semibold"
                      placeholder="Apartment, house details..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">PIN Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      {...register('pincode', { pattern: /^\d{6}$/ })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 outline-none transition-all font-semibold font-mono"
                      placeholder="6-digit ZIP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">City</label>
                    <input
                      type="text"
                      {...register('city')}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 font-semibold outline-none transition-all"
                      placeholder="City name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">State</label>
                    <input
                      type="text"
                      {...register('state')}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-xl px-4 py-3 text-xs text-slate-900 font-semibold outline-none transition-all"
                      placeholder="State name"
                    />
                  </div>
                </div>
              </div>

              {/* FEEDBACK STATUS LOGS */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center gap-2.5 text-red-650 text-xs font-bold font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2.5 text-emerald-650 text-xs font-bold font-mono">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {successMsg}
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-[#748D92] text-white hover:bg-[#60777B] transition-all rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Profile...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Details
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
