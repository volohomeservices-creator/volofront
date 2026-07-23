export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#D3D9D4] text-slate-800 font-sans py-24 px-6 sm:px-12">
      <div className="max-w-4xl mx-auto bg-white/50 backdrop-blur-xl border border-white/40 p-10 sm:p-16 rounded-[3rem] shadow-xl shadow-slate-950/[0.03]">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display mb-8">Privacy Policy</h1>
        <p className="text-slate-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            <p>At VOLO, we collect personal information such as your name, phone number, location, and payment details to provide and improve our on-demand services. We also collect usage data to enhance user experience.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p>Your data is strictly used to match you with verified service partners, process payments, ensure safety, and comply with legal requirements. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Security</h2>
            <p>All sensitive information, including authentication tokens and passwords, are encrypted using industry-standard protocols. We employ strict access controls to safeguard your data.</p>
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
