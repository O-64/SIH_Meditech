import { useState } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";

export default function AdminLogin({ onNavigate }) {
  const [formData, setFormData] = useState({
    name: "Dr. A. Sharma (Director)",
    email: "admin.health@gov.in",
    password: "••••••••",
    department: "Ministry of Health & Family Welfare / MoSJE",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("admin_token", "demo_admin_jwt_token_14566");
      localStorage.setItem(
        "admin_user",
        JSON.stringify({
          name: formData.name,
          email: formData.email,
          department: formData.department,
          role: "Government Administrator",
        }),
      );
      setLoading(false);
      onNavigate("admin_dashboard");
    }, 600);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,12,25,0.75)",
          zIndex: 1,
        }}
      />

      <div
        className="w-full max-w-md text-center mb-6"
        style={{ position: "relative", zIndex: 10 }}
      >
        <button
          onClick={() => onNavigate("landing")}
          className="inline-flex items-center gap-2 mb-3 cursor-pointer"
        >
          <SahaayLogo size={42} />
          <span className="text-2xl font-bold font-serif text-amber-300">
            Sahaay
          </span>
        </button>
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
          🏛️ National Atrocity Distress Monitoring Authority
        </div>
        <h1 className="text-2xl font-bold text-white">Government & Admin Portal</h1>
        <p className="text-slate-400 text-xs mt-1">
          Surveillance Command Center for Ministry Officials & Legal Authorities
        </p>
      </div>

      <div
        className="glass-card w-full max-w-md p-8"
        style={{
          position: "relative",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "1.25rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Select Department
            </label>
            <select
              value={formData.department}
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/20 text-white text-sm outline-none cursor-pointer focus:border-amber-400"
            >
              <option value="Ministry of Health & Family Welfare / MoSJE">
                Ministry of Health & Family Welfare / MoSJE
              </option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Authorized National MHPSS & Atrocity Relief Division
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Official Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/20 text-white text-sm outline-none focus:border-amber-400"
              placeholder="e.g. Dr. A. Sharma"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Official Gov Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/20 text-white text-sm outline-none focus:border-amber-400"
              placeholder="official@gov.in"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Security Access Code / Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/20 text-white text-sm outline-none focus:border-amber-400"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl font-bold text-slate-950 transition-all shadow-lg cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            {loading ? "Authenticating Credentials..." : "Enter Admin Command Center →"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => onNavigate("landing")}
            className="text-amber-400 hover:underline cursor-pointer"
          >
            ← Back to Landing
          </button>
          <span>256-bit Encrypted Gov Portal</span>
        </div>
      </div>
    </div>
  );
}
