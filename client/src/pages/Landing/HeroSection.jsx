const HeroSection = ({ onNavigate }) => (
  <section className="max-w-6xl mx-auto px-8 pt-20 pb-32 text-center">
    <h1 className="text-6xl md:text-8xl font-bold font-serif leading-tight mb-6">
      <span className="text-white">Someone who</span>
      <br />
      <span
        className="text-transparent bg-clip-text"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fcd34d, #fca5a5, #fcd34d)",
        }}
      >
        actually listens
      </span>
    </h1>

    <p
      className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed mb-12"
      style={{ fontWeight: 300 }}
    >
      Sahaay checks in with you in the morning, remembers your day, follows up
      on your meetings, and shows up again at night — like a friend who never
      forgets.
    </p>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
      <button
        onClick={() => onNavigate("signup")}
        className="Sahaay-btn Sahaay-btn-amber Sahaay-btn-xl"
      >
        <span>Start your journey →</span>
      </button>
      <button
        onClick={() => onNavigate("login")}
        className="Sahaay-btn Sahaay-btn-slate Sahaay-btn-xl"
      >
        <span>Already have an account</span>
      </button>
    </div>

    {/* 3 Portal Selection Quick Access */}
    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">
      <div
        onClick={() => onNavigate("login")}
        className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/30 hover:border-amber-400 hover:bg-slate-900/80 transition-all cursor-pointer backdrop-blur-md group"
      >
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
          👤
        </div>
        <h3 className="font-semibold text-white text-base mb-1 flex items-center justify-between">
          Victim Portal
          <span className="text-amber-400 text-xs">Login →</span>
        </h3>
        <p className="text-xs text-slate-400">
          Continuous empathetic AI check-ins, case stage-aware guidance & distress monitoring.
        </p>
      </div>

      <div
        onClick={() => onNavigate("counsellor_login")}
        className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/30 hover:border-cyan-400 hover:bg-slate-900/80 transition-all cursor-pointer backdrop-blur-md group"
      >
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
          🩺
        </div>
        <h3 className="font-semibold text-white text-base mb-1 flex items-center justify-between">
          Counsellor Portal
          <span className="text-cyan-400 text-xs">Login →</span>
        </h3>
        <p className="text-xs text-slate-400">
          Empanelled government clinics and doctors for high-distress case interventions.
        </p>
      </div>

      <div
        onClick={() => onNavigate("admin_login")}
        className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/30 hover:border-emerald-400 hover:bg-slate-900/80 transition-all cursor-pointer backdrop-blur-md group"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform">
          🏛️
        </div>
        <h3 className="font-semibold text-white text-base mb-1 flex items-center justify-between">
          Admin Portal
          <span className="text-emerald-400 text-xs">Login →</span>
        </h3>
        <p className="text-xs text-slate-400">
          Ministry of Health surveillance map, live district heatmaps & case escalation reports.
        </p>
      </div>
    </div>
  </section>
);

export default HeroSection;
