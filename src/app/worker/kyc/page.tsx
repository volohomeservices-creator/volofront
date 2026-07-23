'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { compressKycImage } from '@/lib/image-compression';
import { Upload, CheckCircle, XCircle, AlertCircle, FileText, User, Camera, ShieldCheck, Loader2, X } from 'lucide-react';

interface KYCState {
  worker_id: string;
  aadhaar_status: string;
  pan_status: string;
  selfie_status: string;
  overall_status: string;
  remarks: string | null;
  submitted_at: string | null;
}

interface DocumentInfo {
  id: string;
  document_type: string;
  file_url: string;
  file_size: number;
  status: string;
  uploaded_at: string;
}

interface BankDetails {
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
}

export default function WorkerKycPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [kycState, setKycState] = useState<KYCState | null>(null);
  
  // Bank and Personal details form state
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSavedMsg, setBankSavedMsg] = useState('');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Upload progress indicators
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selfie camera state references
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Fetch KYC details
  async function fetchKYCDetails() {
    try {
      const res = await fetch('/api/worker/kyc');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/worker/login');
          return;
        }
        throw new Error('Failed to retrieve KYC status.');
      }
      const data = await res.json();
      setDocuments(data.documents || []);
      setKycState(data.kycState);
      setCategories(data.categories || []);
      setSelectedSkills(data.skills || []);
      
      if (data.bankDetails) {
        setBankName(data.bankDetails.bank_account_name || '');
        setBankAccount(data.bankDetails.bank_account_number || '');
        setBankIfsc(data.bankDetails.bank_ifsc || '');
        setFullName(data.bankDetails.full_name || '');
        setDob(data.bankDetails.dob || '');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading profile records.');
    } finally {
      setLoading(false);
    }
  }

  // Fetch user profile on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/worker/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        router.push('/worker/login');
      }
    }

    loadUser();
  }, []);

  // Fetch KYC documents after user loads
  useEffect(() => {
    if (user) {
      fetchKYCDetails();
    }
  }, [user]);

  // Core upload execution
  const executeDocUpload = async (file: File, type: string) => {
    setErrorMsg('');
    setUploadingDoc(type);
    setCompressing(true);

    try {
      // 1. Client-side compression and conversion to WebP
      const compressedFile = await compressKycImage(file, type);
      setCompressing(false);

      // 2. Determine target path and bucket
      const bucketName = type === 'PROFILE_PHOTO' ? 'profile-images' : 'kyc-docs';
      const fileName = type === 'PROFILE_PHOTO' 
        ? 'profile.webp'
        : type === 'AADHAAR_FRONT' 
          ? 'aadhaar-front.webp'
          : type === 'AADHAAR_BACK'
            ? 'aadhaar-back.webp'
            : type === 'PAN_CARD'
              ? 'pan.webp'
              : 'selfie.webp';

      const uploadPath = `worker_${user.id}/${fileName}`;

      // 3. Upload file directly to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabaseClient.storage
        .from(bucketName)
        .upload(uploadPath, compressedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      // 4. Save metadata in worker_documents table via backend API
      const res = await fetch('/api/worker/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: type,
          file_url: uploadData.path,
          file_size: compressedFile.size,
          mime_type: 'image/webp'
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to register document.');
      }

      // Refresh UI checklists
      await fetchKYCDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed. Please try again.');
    } finally {
      setUploadingDoc(null);
      setCompressing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await executeDocUpload(file, type);
  };

  // Camera operations
  const startCamera = async () => {
    setCameraError('');
    setCameraLoading(true);
    setIsCameraOpen(true);
    try {
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Error playing video:", e));
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? 'Camera permission denied. Please enable camera access in your browser settings.' 
          : 'Failed to access camera. Make sure no other app is using it, or select a file instead.'
      );
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraError('');
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !cameraStream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Flip horizontally for natural mirror selfie view
    context.translate(width, 0);
    context.scale(-1, 1);

    context.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlob(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  const uploadSelfie = async () => {
    if (!capturedBlob) return;

    const selfieFile = new File([capturedBlob], 'selfie.jpg', { type: 'image/jpeg' });
    
    // Clear preview states and stop camera
    setCapturedImage(null);
    setCapturedBlob(null);
    stopCamera();
    
    await executeDocUpload(selfieFile, 'SELFIE_VERIFICATION');
  };

  // Save bank and personal settings
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setBankSaving(true);
    setBankSavedMsg('');

    try {
      const res = await fetch('/api/worker/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankDetails: {
            bank_account_name: bankName,
            bank_account_number: bankAccount,
            bank_ifsc: bankIfsc,
            full_name: fullName,
            dob: dob,
            skills: selectedSkills
          }
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save bank details.');
      }

      setBankSavedMsg('Personal and bank details saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Details update failed.');
    } finally {
      setBankSaving(false);
    }
  };

  const checklist = [
    { type: 'PROFILE_PHOTO', label: 'Profile Photo', icon: User, desc: 'Professional portrait. Max width 800px' },
    { type: 'AADHAAR_FRONT', label: 'Aadhaar Card Front', icon: FileText, desc: 'Address proof side. Max width 1200px' },
    { type: 'AADHAAR_BACK', label: 'Aadhaar Card Back', icon: FileText, desc: 'Barcode/UID details side. Max width 1200px' },
    { type: 'PAN_CARD', label: 'PAN Card', icon: FileText, desc: 'Permanent Account Number proof. Max width 1200px' },
    { type: 'SELFIE_VERIFICATION', label: 'Selfie Verification', icon: Camera, desc: 'Selfie holding photo ID. Max width 800px' }
  ];

  // Helper: check document status
  const getDocStatus = (type: string) => {
    const doc = documents.find(d => d.document_type === type);
    return doc ? doc.status : 'MISSING';
  };

  if (loading || !user || !kycState) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-[#124E66]">
        <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
        <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-wider animate-pulse font-mono">Loading verification profile...</p>
      </div>
    );
  }

  // Redirection guard if approved
  if (kycState.overall_status === 'APPROVED') {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto selection:bg-[#D3D9D4]/40 selection:text-[#124E66]">
        
        {/* Hero Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-[#748D92] rounded-[24px] p-6 text-white relative overflow-hidden shadow-sm animate-fade-in-up">
          <div className="absolute -right-20 -bottom-20 w-52 h-52 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <h1 className="text-xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="h-6 w-6 text-[#D1FAE5]" />
              KYC Verification Approved
            </h1>
            <p className="text-xs text-[#D1FAE5] font-medium max-w-xl">
              Your identity and account credentials have been successfully authenticated by the Volo operations team.
            </p>
          </div>
        </div>

        {/* 2-Column Dashboard Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
          
          {/* Left Column: Document Checklist & Bank Status */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Checklist Card */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2 font-mono">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                Verified Credentials Checklist
              </h2>
              
              <div className="divide-y divide-slate-100">
                {checklist.map((item) => {
                  const doc = documents.find(d => d.document_type === item.type);
                  return (
                    <div key={item.type} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{item.label}</h4>
                          <p className="text-[9px] text-slate-455 font-mono">
                            {doc?.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB • ` : ''}Verified Status
                          </p>
                        </div>
                      </div>
                      <span className="text-emerald-600 text-[9px] font-black uppercase tracking-wider bg-emerald-50 px-2.5 py-1 border border-emerald-150 rounded font-mono">
                        Approved
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification Metadata Card */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-5">
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-3 border-b border-slate-100 flex items-center gap-2 font-mono">
                <FileText className="h-4.5 w-4.5 text-[#124E66]" />
                Account Credentials
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] text-slate-400 block font-mono uppercase font-black">Verification Holder</span>
                  <span className="text-slate-800 font-bold mt-1 block">{fullName || user?.full_name || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] text-slate-400 block font-mono uppercase font-black">Date of Birth</span>
                  <span className="text-slate-800 font-bold mt-1 block font-mono">{dob || 'N/A'}</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] text-slate-400 block font-mono uppercase font-black">Authorized Services</span>
                  <span className="text-slate-800 font-bold mt-1 block truncate">
                    {selectedSkills.length > 0 ? selectedSkills.join(', ') : 'All Services'}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-150">
                  <span className="text-[9px] text-slate-400 block font-mono uppercase font-black">Verification Date</span>
                  <span className="text-slate-800 font-bold mt-1 block font-mono">
                    {kycState.submitted_at ? new Date(kycState.submitted_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Authorization Status & Entry */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm space-y-6 text-center">
            <div className="h-14 w-14 bg-emerald-50 border border-emerald-150 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="h-7 w-7" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">Account Authorized</h3>
              <p className="text-slate-550 text-xs leading-relaxed font-semibold">
                You are fully verified and authorized to accept live dispatches, track routes, manage settlements, and refer partners.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/worker/dashboard')}
              className="w-full bg-[#124E66] hover:bg-[#206783] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow shadow-[#124E66]/20 cursor-pointer active:scale-95 font-mono"
            >
              Go to Partner Dashboard
            </button>

            <div className="border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400 font-semibold select-none leading-relaxed">
              <p>Verified account credentials are encrypted and stored securely.</p>
              <p>For credentials updates, contact onboarding support at support@volohome.com</p>
            </div>
          </div>

        </div>

      </div>
    );
  }

  const uploadCount = documents.length;
  const progressPercent = Math.round((uploadCount / checklist.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-8 selection:bg-[#124E66]/30 selection:text-white">
      
      {/* Header Block */}
      <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl relative overflow-hidden select-none text-center">
        <div className="absolute top-0 right-0 h-40 w-40 bg-[#124E66]/10 blur-[65px] rounded-full pointer-events-none" />
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Onboarding KYC Verification
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-semibold">
          Submit your credentials to verify your profile and activate your technician account.
        </p>
      </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex items-start gap-3 text-red-400 text-xs">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-semibold block">Error occured</span>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

      {/* Admin Feedback Block if rejected */}
      {kycState.overall_status === 'REJECTED' && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-400 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-black block uppercase tracking-wider text-[9px] mb-1">Verification Update / Action Required</span>
            <p className="text-slate-300 font-semibold">
              Admin remarks: <span className="text-amber-300 font-bold">"{kycState.remarks || 'Document issues. Please check rejected uploads.'}"
              </span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1.5">Please re-upload rejected files below to re-submit.</p>
          </div>
        </div>
      )}

      {/* Overall Status Banner */}
      <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-black uppercase tracking-wider">KYC Status Check</span>
          <span className={`px-2.5 py-1 rounded-xl font-black uppercase text-[9px] tracking-wider ${
            kycState.overall_status === 'PENDING' && uploadCount === checklist.length
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
              : 'bg-[#124E66]/10 text-[#124E66] border border-[#124E66]/20'
          }`}>
            {kycState.overall_status === 'PENDING' && uploadCount === checklist.length
              ? 'Awaiting Admin Review'
              : 'Submission Required'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold text-slate-500">
            <span>Upload Checklist Progress</span>
            <span className="font-mono text-slate-300">{uploadCount} / {checklist.length} ({progressPercent}%)</span>
          </div>
          <div className="h-2 bg-[#070B14] rounded-full overflow-hidden border border-white/[0.04]">
            <div 
              className="h-full bg-gradient-to-r from-[#124E66] to-amber-400 transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Upload Checklist */}
      <div className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/[0.06] pb-3">
          Step 1: Document Uploads
        </h3>
        <div className="divide-y divide-white/[0.04]">
          {checklist.map((item) => {
            const status = getDocStatus(item.type);
            const Icon = item.icon;
            const isUploading = uploadingDoc === item.type;

            return (
              <div key={item.type} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#070B14] border border-white/[0.06] flex items-center justify-center text-[#124E66] shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{item.label}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {/* Status Badge */}
                  {status === 'APPROVED' && (
                    <span className="text-[#22C55E] text-[9px] font-black flex items-center gap-1 uppercase">
                      <CheckCircle className="h-3.5 w-3.5" /> Approved
                    </span>
                  )}
                  {status === 'PENDING' && (
                    <span className="text-[#F59E0B] text-[9px] font-black flex items-center gap-1 uppercase">
                      <CheckCircle className="h-3.5 w-3.5" /> Uploaded
                    </span>
                  )}
                  {status === 'REJECTED' && (
                    <span className="text-[#EF4444] text-[9px] font-black flex items-center gap-1 uppercase">
                      <XCircle className="h-3.5 w-3.5" /> Rejected
                    </span>
                  )}

                  {/* File Upload / Camera Buttons */}
                  {status !== 'APPROVED' && (
                    <div className="flex flex-wrap gap-2">
                      {item.type === 'SELFIE_VERIFICATION' && (
                        <button
                          type="button"
                          onClick={startCamera}
                          disabled={isUploading}
                          className="px-3 py-1.5 text-[10px] font-black rounded-xl border border-[#124E66] bg-[#124E66] hover:bg-[#206783] text-white flex items-center gap-1.5 transition-colors cursor-pointer select-none uppercase shadow-sm"
                        >
                          <Camera className="h-3 w-3 text-white" />
                          Take Selfie
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => document.getElementById(`file-input-${item.type}`)?.click()}
                        disabled={isUploading}
                        className="relative px-3 py-1.5 text-[10px] font-black rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5 transition-colors text-slate-700 disabled:opacity-50 disabled:pointer-events-none select-none uppercase shadow-sm hover:border-slate-300"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                            {compressing ? 'Compressing...' : 'Uploading...'}
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 text-slate-500" />
                            {status === 'MISSING' ? 'Select File' : 'Re-upload'}
                          </>
                        )}
                      </button>
                      <input
                        id={`file-input-${item.type}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleUpload(e, item.type)}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personal & Bank Details Block */}
      <form onSubmit={handleSaveBank} className="bg-[#0F172A] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/[0.06] pb-3">
          Step 2: Personal & Bank Account Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#124E66]/50 transition-colors font-semibold"
              required
            />
          </div>
          {/* Date of Birth */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#124E66]/50 transition-colors font-mono"
              required
            />
          </div>

          {/* Services Provided */}
          <div className="space-y-2 md:col-span-2 border-t border-white/[0.04] pt-3">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest block">
              Services You Provide
            </label>
            <p className="text-[10px] text-slate-500 font-semibold mb-2">
              Select the service category/categories you are skilled in. These will be automatically configured upon admin approval.
            </p>
            {categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {categories.map((cat) => {
                  let skillKeyword = cat.name;
                  if (cat.name.toLowerCase().includes('elect')) skillKeyword = 'electrician';
                  else if (cat.name.toLowerCase().includes('plumb')) skillKeyword = 'plumber';

                  const isChecked = selectedSkills.includes(skillKeyword) || selectedSkills.includes(cat.name);

                  const handleSkillToggle = (checked: boolean) => {
                    if (checked) {
                      setSelectedSkills((prev) => Array.from(new Set([...prev, skillKeyword, cat.name])));
                    } else {
                      setSelectedSkills((prev) =>
                        prev.filter((s) => s !== skillKeyword && s !== cat.name)
                      );
                    }
                  };

                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-[#124E66]/5 border-[#124E66] text-white shadow-md shadow-[#124E66]/5'
                          : 'bg-[#070B14] border-white/[0.08] hover:border-[#124E66]/30 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleSkillToggle(e.target.checked)}
                        className="h-4.5 w-4.5 rounded border-white/[0.08] bg-[#070B14] text-[#124E66] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#124E66]"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none">{cat.name}</span>
                        <span className="text-[9px] text-slate-500 font-semibold mt-1">
                          Apply as {skillKeyword === 'electrician' ? 'Electrician' : skillKeyword === 'plumber' ? 'Plumber' : 'Technician'}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-slate-900/50 border border-white/[0.04] text-slate-400 rounded-xl text-center text-xs font-semibold">
                No active service categories found.
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Account Holder Name</label>
            <input
              type="text"
              placeholder="Name as in passbook"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#124E66]/50 transition-colors font-semibold"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">IFSC Code</label>
            <input
              type="text"
              placeholder="e.g., SBIN0001234"
              value={bankIfsc}
              onChange={(e) => setBankIfsc(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#124E66]/50 transition-colors font-mono uppercase"
              required
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-widest">Bank Account Number</label>
            <input
              type="password"
              placeholder="Enter complete bank account number"
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              className="w-full bg-[#070B14] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#124E66]/50 transition-colors font-mono"
              required
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          {bankSavedMsg && (
            <span className="text-[11px] text-[#22C55E] font-bold">{bankSavedMsg}</span>
          )}
          <div className="flex-1" />
          <button
            type="submit"
            disabled={bankSaving}
            className="px-6 py-2.5 bg-[#124E66] hover:bg-[#206783] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#124E66]/20 active:scale-95"
          >
            {bankSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Details
          </button>
        </div>
      </form>

      {/* Bottom Submission Info */}
      <div className="text-center space-y-1 text-[10px] text-slate-600 font-semibold select-none pb-4">
        <p>Your details are encrypted and stored in private secure cloud storage buckets.</p>
        <p>Need help? Contact technician onboarding support at support@volohome.com</p>
      </div>

      {/* Selfie Camera Capture Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-[#070B14]/95 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0F172A] border border-white/[0.08] rounded-3xl overflow-hidden relative shadow-2xl p-6 space-y-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Selfie Verification</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Position your face inside the circle cutout</p>
              </div>
              <button
                type="button"
                onClick={stopCamera}
                className="h-8 w-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Camera Viewport */}
            <div className="relative aspect-square bg-[#070B14] border border-white/[0.04] rounded-2xl overflow-hidden flex items-center justify-center">
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-8 w-8 text-[#124E66] animate-spin" />
                  <p className="text-[10px] text-slate-500">Starting camera stream...</p>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                  <p className="text-xs text-slate-400 font-semibold leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      document.getElementById('file-input-SELFIE_VERIFICATION')?.click();
                    }}
                    className="px-4 py-2 bg-[#070B14] hover:bg-[#070B14]/80 border border-white/[0.08] text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Select Photo from Files
                  </button>
                </div>
              ) : capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured Selfie Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {/* Circle Overlay Cutout */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[70%] aspect-square rounded-full border-2 border-dashed border-[#124E66]/50 bg-[#070B14]/20 ring-[2000px] ring-[#070B14]/60" />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {!cameraError && !cameraLoading && (
              <div className="flex gap-3 w-full">
                {capturedImage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setCapturedImage(null); setCapturedBlob(null); }}
                      className="flex-1 py-3 bg-[#070B14] hover:bg-[#070B14]/80 border border-white/[0.08] text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer text-center uppercase tracking-wider font-extrabold"
                    >
                      🔄 Retake
                    </button>
                    <button
                      type="button"
                      onClick={uploadSelfie}
                      className="flex-1 py-3 bg-[#124E66] hover:bg-[#206783] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#124E66]/20"
                    >
                      Upload Selfie
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={captureSelfie}
                      disabled={!cameraStream}
                      className="flex-1 py-3 bg-[#124E66] hover:bg-[#206783] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#124E66]/20"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Selfie
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-5 py-3 bg-[#070B14] hover:bg-[#070B14]/80 border border-white/[0.08] text-slate-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
