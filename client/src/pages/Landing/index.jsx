import FloatingOrb from "../../components/shared/FloatingOrb";
import SahaayLogo from "../../components/shared/SahaayLogo";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import CTASection from "./CTASection";

function Landing({ onNavigate }) {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,12,25,0.62)",
          zIndex: 1,
        }}
      />

      <FloatingOrb className="w-96 h-96 bg-amber-500 top-0 -left-48" />
      <FloatingOrb className="w-80 h-80 bg-rose-500 top-32 right-0" />
      <FloatingOrb className="w-64 h-64 bg-indigo-500 bottom-64 left-1/3" />

      {/* Navbar */}
      <nav
        className="relative flex items-center justify-between px-8 py-6 max-w-6xl mx-auto"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <SahaayLogo size={36} />
          <span className="text-xl font-bold font-serif text-amber-300">
            Sahaay
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Option 1: Login as Victim */}
          <button
            onClick={() => onNavigate("login")}
            style={{
              background: "rgba(245, 158, 11, 0.12)",
              border: "1.5px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "12px",
              padding: "7px 14px",
              color: "#fde68a",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)";
              e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.7)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(245, 158, 11, 0.12)";
              e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>👤</span>
            <span>Login as Victim</span>
          </button>

          {/* Option 2: Login as Counsellor */}
          <button
            onClick={() => onNavigate("counsellor_login")}
            style={{
              background: "rgba(6, 182, 212, 0.12)",
              border: "1.5px solid rgba(6, 182, 212, 0.4)",
              borderRadius: "12px",
              padding: "7px 14px",
              color: "#a5f3fc",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(6, 182, 212, 0.25)";
              e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.7)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(6, 182, 212, 0.12)";
              e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>🩺</span>
            <span>Login as Counsellor</span>
          </button>

          {/* Option 3: Login as Admin */}
          <button
            onClick={() => onNavigate("admin_login")}
            style={{
              background: "rgba(16, 185, 129, 0.15)",
              border: "1.5px solid rgba(16, 185, 129, 0.45)",
              borderRadius: "12px",
              padding: "7px 14px",
              color: "#a7f3d0",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.28)";
              e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.8)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
              e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.45)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>🏛️</span>
            <span>Login as Admin</span>
          </button>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 10 }}>
        <HeroSection onNavigate={onNavigate} />
        <FeaturesSection onNavigate={onNavigate} />
        <HowItWorksSection onNavigate={onNavigate} />
        <CTASection onNavigate={onNavigate} />
        <footer className="text-center pb-12 text-slate-600 text-sm">
          <p>Made with 💛 at the hackathon · Sahaay 2024</p>
        </footer>
      </div>
    </div>
  );
}

export default Landing;
