export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#D3D9D4] text-slate-800 font-sans py-24 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto bg-white/50 backdrop-blur-xl border border-white/40 p-10 sm:p-16 rounded-[3rem] shadow-xl shadow-slate-950/[0.03]">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display mb-8">Terms of Use</h1>
        <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using the VOLO platform, you agree to comply with these terms of use. If you do not agree, please do not use our services.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Service Usage</h2>
            <p>Users must provide accurate information when booking services. VOLO acts as a technology platform connecting customers with independent, verified service professionals.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Payments & Cancellations</h2>
            <p>All payments must be completed via the VOLO platform. Cancellations made after a professional has been dispatched may incur a nominal cancellation fee.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <a href="/" className="inline-block bg-[#124E66] hover:bg-[#0e3f52] text-white font-semibold text-xs px-6 py-3 rounded-full transition-all">
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}
