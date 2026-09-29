import { useState } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";

function Login({ onNavigate }) {
  const baseurl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${baseurl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onNavigate("home");
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,12,25,0.65)",
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div
        className="w-full text-center pt-10 pb-4"
        style={{ position: "relative", zIndex: 10 }}
      >
        <button
          onClick={() => onNavigate("landing")}
          className="inline-flex items-center gap-2 mb-2"
        >
          <SahaayLogo size={40} />
          <span className="text-2xl font-bold font-serif text-amber-300">
            Sahaay
          </span>
        </button>
        <h1 className="text-4xl font-bold text-white mt-2">
          Welcome to{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage: "linear-gradient(to right, #fbbf24, #fb7185)",
            }}
          >
            Sahaay
          </span>
        </h1>
        <p className="text-slate-400 text-sm mt-1" style={{ fontWeight: 300 }}>
          Your AI-powered mental wellness companion
        </p>
      </div>

      {/* Glass card */}
      <div
        className="glass-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "460px",
          margin: "1.5rem auto 2rem auto",
          padding: "2rem 2.25rem",
          boxSizing: "border-box",
        }}
      >
        {/* Tabs */}
        <div
          className="flex p-1 mb-6 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <button
            className="glass-tab glass-tab-active"
            style={{ flex: 1, minWidth: 0 }}
          >
            Login
          </button>
          <button
            className="glass-tab glass-tab-inactive"
            onClick={() => onNavigate("signup")}
            style={{ flex: 1, minWidth: 0 }}
          >
            Sign Up
          </button>
        </div>

        <h2 className="text-lg font-bold text-white mb-5">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              className="glass-input"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
              className="glass-input"
            />
          </div>
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-rose-300 text-sm"
              style={{
                background: "rgba(190,18,60,0.15)",
                border: "1px solid rgba(190,18,60,0.25)",
              }}
            >
              {error}
            </div>
          )}
          <div className="pt-1" style={{ width: "100%" }}>
            <button
              type="submit"
              style={{
                all: "unset",
                boxSizing: "border-box",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                padding: "0.55em 1.8em",
                border: "0.12em solid #fbbf24",
                borderRadius: "0.3em",
                background: "transparent",
                color: "#fbbf24",
                fontFamily: "Inter, sans-serif",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
                transition:
                  "background-color 250ms ease, color 250ms ease, transform 200ms ease, box-shadow 250ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fbbf24";
                e.currentTarget.style.color = "#0f172a";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#fbbf24";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span>Continue →</span>
            </button>
          </div>
        </form>

        <p className="text-center text-slate-500 text-sm mt-5">
          Don't have an account?{" "}
          <button
            onClick={() => onNavigate("signup")}
            className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
          >
            Create one
          </button>
        </p>
      </div>

      <p
        className="text-slate-600 text-xs mb-6"
        style={{ position: "relative", zIndex: 10 }}
      >
        Your conversations are private and secure 🔒
      </p>
    </div>
  );
}

export default Login;
