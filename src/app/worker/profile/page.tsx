'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { supabaseClient } from '@/lib/supabase-client';
import { compressKycImage } from '@/lib/image-compression';
import { 
  User, Mail, Phone, MapPin, Briefcase, Award, Languages, 
  FileText, Loader2, Save, Upload, CheckCircle2, AlertCircle, IdCard 
} from 'lucide-react';
import DigitalIdCardModal from '@/components/worker/DigitalIdCardModal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface ProfileFormValues {
  full_name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  skills: string;
  experience: number;
  languages: string;
  bio: string;
  dob: string;
}

export default function WorkerProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profileData, error, isLoading } = useSWR('/api/worker/profile', fetcher);
  const { data: kycData } = useSWR('/api/worker/kyc', fetcher);
  const { data: userData } = useSWR('/api/auth/me', fetcher);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const isKycApproved = kycData?.kycState?.overall_status === 'APPROVED';

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Avatar upload states
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

            setValue('address', data.display_name || road);
            setValue('city', cityVal);
            setValue('state', stateVal);
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

  const { register, handleSubmit, reset, setValue } = useForm<ProfileFormValues>({
    defaultValues: {
      full_name: '',
      email: '',
      address: '',
      city: 'Bangalore',
      state: 'Karnataka',
      skills: '',
      experience: 0,
      languages: '',
      bio: '',
      dob: ''
    }
  });

  // Load profile data into form once fetched
  useEffect(() => {
    if (profileData) {
      reset({
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        address: profileData.address || '',
        city: profileData.city || 'Bangalore',
        state: profileData.state || 'Karnataka',
        skills: (profileData.skills || []).join(', '),
        experience: profileData.experience || 0,
        languages: (profileData.languages || []).join(', '),
        bio: profileData.bio || '',
        dob: profileData.dob || ''
      });
      setAvatarUrl(profileData.avatar_url || null);
    }
  }, [profileData, reset]);

  // Handle avatar upload
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
      const uploadPath = `worker_${userId}/profile.webp`;
      const { data: uploadData, error: uploadErr } = await supabaseClient.storage
        .from('profile-images')
        .upload(uploadPath, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Avatar storage upload failed: ${uploadErr.message}`);
      }

      // 4. Update the avatar_url in the user's table via backend profile PATCH
      const patchRes = await fetch('/api/worker/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileData.full_name,
          email: profileData.email,
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          skills: profileData.skills,
          experience: profileData.experience,
          languages: profileData.languages,
          bio: profileData.bio,
          avatar_url: uploadData.path
        })
      });

      if (!patchRes.ok) {
        const patchErr = await patchRes.json();
        throw new Error(patchErr.error || 'Failed to update avatar metadata.');
      }

      // 5. Query signed URL or use public url to refresh state locally
      const { data: { publicUrl } } = supabaseClient.storage
        .from('profile-images')
        .getPublicUrl(uploadData.path);

      setAvatarUrl(publicUrl);
      setSuccessMsg('Avatar updated successfully.');
      
      // Mutate dashboard and profile caches
      mutate('/api/worker/profile');
      mutate('/api/worker/dashboard');
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

    // Parse comma-separated list of skills & languages
    const skillsArray = values.skills
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const languagesArray = values.languages
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    try {
      const res = await fetch('/api/worker/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: values.full_name,
          email: values.email,
          address: values.address,
          city: values.city,
          state: values.state,
          skills: skillsArray,
          experience: Number(values.experience || 0),
          languages: languagesArray,
          bio: values.bio,
          dob: values.dob
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save profile details.');
      }

      setSuccessMsg('Profile updated successfully.');
      mutate('/api/worker/profile');
      mutate('/api/worker/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#124E66]">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-wider animate-pulse font-mono">Loading profile details...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="bg-red-50 border border-red-150 p-8 rounded-[24px] text-center space-y-4 max-w-md mx-auto mt-12 shadow-sm animate-fade-in-up">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-black text-slate-800">Failed to load Profile</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-semibold">There was a problem loading your profile details. Please try refreshing.</p>
        <button
          type="button"
          onClick={() => mutate('/api/worker/profile')}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-2xl text-xs font-black text-white transition-colors cursor-pointer"
        >
          Try Again
        </button>
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
            <User className="h-5.5 w-5.5 text-[#D3D9D4]" />
            Partner Profile
          </h1>
          <p className="text-xs text-[#D3D9D4] font-medium max-w-xl">
            Provide bio, skills, and languages to attract better service allocations.
          </p>
        </div>
      </div>

      {/* 2. TWO-COLUMN SPLIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
        
        {/* LEFT COLUMN: AVATAR CARD & ID CARD TRIGGER */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center space-y-6">
            
            {/* Avatar Preview */}
            <div className="relative h-28 w-28 rounded-[24px] bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 group shadow-inner">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={!avatarUrl.startsWith('http')
                    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${avatarUrl}` 
                    : avatarUrl
                  } 
                  alt="Avatar" 
                  className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300" 
                />
              ) : (
                <User className="h-10 w-10 text-slate-350" />
              )}
              
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white/90 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-[#124E66] animate-spin" />
                </div>
              )}
            </div>

            {/* Partner Meta details */}
            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-800 leading-tight">{profileData.full_name || 'Field Partner'}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#124E66]/10 text-[#124E66] border border-[#124E66]/15 rounded-lg text-[9px] font-black uppercase tracking-wider font-mono">
                Field Partner
              </span>
              <p className="text-[10px] text-slate-450 font-bold font-mono pt-1">{profileData.phone || ''}</p>
            </div>

            {/* Photo upload and ID Card buttons */}
            <div className="w-full flex flex-col gap-2 font-mono">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-slate-700 select-none cursor-pointer shadow-sm"
              >
                <Upload className="h-4 w-4 text-slate-500" />
                Upload Photo
              </button>
              
              {isKycApproved && (
                <button
                  type="button"
                  onClick={() => setShowIdCardModal(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#124E66] hover:bg-[#206783] border border-[#124E66] px-4 py-2.5 rounded-xl text-xs font-black transition-all text-white select-none cursor-pointer shadow-sm"
                >
                  <IdCard className="h-4 w-4 text-white" />
                  Digital ID Card
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {compressing && (
              <p className="text-[9px] text-[#124E66] animate-pulse font-mono font-black uppercase tracking-wider">Compressing webp spec...</p>
            )}

            <p className="text-[9px] text-slate-400 font-semibold select-none leading-relaxed border-t border-slate-100 pt-4 w-full">
              Accepts PNG, JPG or WebP. scaled and converted on upload.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: MULTI-PANEL FORM CARDS */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Panel 1: Personal Information */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2 font-mono">
                <User className="h-4.5 w-4.5 text-[#124E66]" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Full Name</label>
                  <input
                    type="text"
                    {...register('full_name', { required: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 outline-none transition-all font-semibold"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono select-none">Contact Phone</label>
                  <input
                    type="text"
                    disabled
                    value={profileData.phone || ''}
                    className="w-full bg-slate-100/60 border border-slate-200/50 rounded-2xl px-4 py-2.5 text-xs text-slate-450 font-bold select-none outline-none cursor-not-allowed font-mono"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Email Address</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-855 placeholder-slate-400 outline-none transition-all font-semibold"
                    placeholder="Enter your email address"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Date of Birth</label>
                  <input
                    type="date"
                    {...register('dob')}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-855 outline-none transition-all font-semibold font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Professional Credentials */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2 font-mono">
                <Briefcase className="h-4.5 w-4.5 text-[#124E66]" />
                Professional Credentials
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Skills / Specialization</label>
                  <input
                    type="text"
                    {...register('skills')}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="e.g. Electrician, Fan Repairing"
                  />
                  <span className="text-[8px] text-slate-450 block font-mono pl-1">Separate with commas</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Experience (Years)</label>
                  <input
                    type="number"
                    {...register('experience', { min: 0, valueAsNumber: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Languages Spoken</label>
                  <input
                    type="text"
                    {...register('languages')}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="e.g. English, Hindi, Kannada"
                  />
                  <span className="text-[8px] text-slate-450 block font-mono pl-1">Separate with commas</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Service City / Location</label>
                  <input
                    type="text"
                    {...register('city', { required: true })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="e.g. Bangalore"
                  />
                </div>
              </div>

              {/* Geolocation Trigger */}
              <div className="pt-2 font-mono">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detecting}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 border border-[#124E66]/20 hover:border-[#124E66]/40 rounded-2xl text-xs font-black text-[#124E66] bg-[#124E66]/5 hover:bg-[#124E66]/10 transition-colors select-none cursor-pointer disabled:opacity-50"
                >
                  {detecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#124E66]" />
                      Detecting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 text-[#124E66]" />
                      Detect & Set Location coordinates
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Service Address & State</label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    {...register('address')}
                    className="col-span-2 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="Street details"
                  />
                  <input
                    type="text"
                    {...register('state', { required: true })}
                    className="col-span-1 w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-855 placeholder-slate-450 outline-none transition-all font-semibold"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-black uppercase text-slate-450 tracking-widest pl-1 font-mono">Partner Bio / Description</label>
                <textarea
                  rows={3}
                  {...register('bio')}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#124E66]/50 rounded-2xl px-4 py-2.5 text-xs text-slate-850 placeholder-slate-450 outline-none transition-all font-semibold resize-none leading-relaxed"
                  placeholder="Brief summary of your professional journey..."
                />
              </div>
            </div>

            {/* Error/Success Feedbacks */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-150 p-3.5 rounded-2xl flex items-center gap-2.5 text-red-650 text-xs font-bold font-mono">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-2xl flex items-center gap-2.5 text-emerald-650 text-xs font-bold font-mono">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
                {successMsg}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 font-mono">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#124E66] hover:bg-[#206783] text-white py-3.5 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow shadow-[#124E66]/20 select-none cursor-pointer disabled:opacity-40 active:scale-95"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Profile Changes
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

      {isKycApproved && (
        <DigitalIdCardModal
          isOpen={showIdCardModal}
          onClose={() => setShowIdCardModal(false)}
          worker={
            profileData && kycData
              ? {
                  id: userData?.user?.id || '',
                  full_name: profileData.full_name,
                  phone: profileData.phone,
                  dob: profileData.dob,
                  worker_id_code: profileData.worker_id_code,
                  skills: profileData.skills
                }
              : null
          }
          photoUrl={
            kycData?.documents?.find((d: any) => d.document_type === 'PROFILE_PHOTO')?.signedUrl 
              || kycData?.documents?.find((d: any) => d.document_type === 'SELFIE_VERIFICATION')?.signedUrl
          }
        />
      )}

    </div>
  );
}
