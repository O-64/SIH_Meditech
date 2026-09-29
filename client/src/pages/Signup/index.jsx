import { useState } from "react";
import StepIndicator from "./StepIndicator";
import StepAccount from "./StepAccount";
import StepAbout from "./StepAbout";
import StepLocation from "./StepLocation";
import SahaayLogo from "../../components/shared/SahaayLogo";

function Signup({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    city: "",
    area: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const nextStep = (e) => {
    e.preventDefault();
    if (step === 0) {
      if (!form.name || !form.email || !form.password) {
        setError("Please fill in all fields");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }
    if (step === 1 && !form.age) {
      setError("Please enter your age");
      return;
    }
    setError("");
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.city) {
      setError("Please enter your city");
      return;
    }
    setLoading(true);
    setError("");
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(
        `${apiUrl}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, timezone, age: parseInt(form.age) }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onNavigate("questionnaire");
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 3;
  const progressPct = Math.round(((step + 1) / totalSteps) * 100);

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
        <div
          className="flex p-1 mb-5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <button
            className="glass-tab glass-tab-inactive"
            style={{ flex: 1, minWidth: 0 }}
            onClick={() => onNavigate("login")}
          >
            Login
          </button>
          <button
            className="glass-tab glass-tab-active"
            style={{ flex: 1, minWidth: 0 }}
          >
            Sign Up
          </button>
        </div>

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-500 text-xs">
            Step {step + 1} of {totalSteps}
          </span>
          <span className="text-slate-500 text-xs">{progressPct}%</span>
        </div>
        <div className="Sahaay-progress-bar mb-6">
          <div
            className="Sahaay-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {step === 0 && (
          <StepAccount
            form={form}
            error={error}
            onChange={handleChange}
            onNext={nextStep}
            onNavigate={onNavigate}
          />
        )}
        {step === 1 && (
          <StepAbout
            form={form}
            error={error}
            onChange={handleChange}
            onNext={nextStep}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepLocation
            form={form}
            error={error}
            loading={loading}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onBack={() => setStep(1)}
          />
        )}
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

export default Signup;
