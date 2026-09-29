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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => onNavigate("login")}
            style={{
              background: "transparent",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: "12px",
              padding: "8px 18px",
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#e2e8f0";
            }}
          >
            Sign in
          </button>

          <button
            onClick={() => onNavigate("signup")}
            style={{
              background: "linear-gradient(135deg, #fbbf24, #fb7185)",
              border: "none",
              borderRadius: "12px",
              padding: "8px 18px",
              color: "#0f172a",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(251,191,36,0.35)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(251,191,36,0.5)";
              e.currentTarget.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 16px rgba(251,191,36,0.35)";
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            Get started
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
