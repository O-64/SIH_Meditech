import { useState } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";

const INCIDENT_TYPES = [
  "Physical violence/assault",
  "Verbal abuse/threats",
  "Discrimination or social exclusion",
  "Property/economic harm",
  "Sexual violence/harassment",
  "Other / Prefer not to say",
];

const INCIDENT_TIMINGS = [
  "Within the last 7 days",
  "1 week – 1 month ago",
  "1–6 months ago",
  "More than 6 months ago",
  "Prefer not to say",
];

const CASE_STATUSES = [
  "I have not reported it yet",
  "Complaint has been filed",
  "Investigation is ongoing",
  "Case is in trial/court",
  "Case has been resolved",
  "I am currently seeking rehabilitation/support",
  "I am seeking compensation",
  "I don't know / Prefer not to say",
];

const SUPPORT_TYPES = [
  "Emotional/mental-health support",
  "Information about my case",
  "Legal/official support",
  "Rehabilitation support",
  "Compensation-related support",
  "I am not sure yet",
];

const FEELINGS = [
  "Calm / okay",
  "Slightly stressed",
  "Worried or anxious",
  "Very distressed",
  "I feel unsafe or unable to cope",
  "Prefer not to say",
];

export default function Questionnaire({ onNavigate }) {
  const [formData, setFormData] = useState({
    incident_type: "",
    incident_timing: "",
    case_status: "",
    support_needed: "",
    initial_feeling: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.incident_type ||
      !formData.incident_timing ||
      !formData.case_status ||
      !formData.support_needed ||
      !formData.initial_feeling
    ) {
      setError("Please answer all questions so we can personalize your support.");
      return;
    }

    setLoading(true);
    setError("");

    const token = localStorage.getItem("token");
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

    try {
      const res = await fetch(`${apiUrl}/api/v1/auth/questionnaire`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save questionnaire. Please try again.");
        return;
      }

      // Persist in localStorage for quick stage-aware UI reference
      localStorage.setItem("case_questionnaire", JSON.stringify(formData));
      localStorage.setItem("questionnaire_completed", "true");
      if (data.case_stage) {
        localStorage.setItem("case_stage", data.case_stage);
      }

      onNavigate("home");
    } catch {
      setError("Unable to connect to the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("questionnaire_completed", "skipped");
    onNavigate("home");
  };

  const selectStyle = {
    width: "100%",
    padding: "0.8rem 1rem",
    borderRadius: "0.75rem",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    color: "#ffffff",
    fontSize: "0.95rem",
    outline: "none",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pb-12"
      style={{ position: "relative" }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,12,25,0.72)",
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div
        className="w-full text-center pt-8 pb-3"
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
        <h1 className="text-3xl font-bold text-white mt-1">
          Initial Case Assessment
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-lg mx-auto px-4 font-light">
          Help our case-stage aware AI understand your current situation so we can adapt distress monitoring, check-in frequency, and guidance.
        </p>
      </div>

      {/* Questionnaire Form Card */}
      <div
        className="glass-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "600px",
          margin: "1rem auto 2rem auto",
          padding: "2rem 2.25rem",
          boxSizing: "border-box",
        }}
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-medium">
              Confidential & Consent-based
            </span>
          </div>
          <span className="text-slate-400 text-xs">5 Questions</span>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Question 1 */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              1. What type of incident are you seeking support for?
            </label>
            <select
              name="incident_type"
              value={formData.incident_type}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                -- Select incident type --
              </option>
              {INCIDENT_TYPES.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Question 2 */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              2. When did the incident happen?
            </label>
            <select
              name="incident_timing"
              value={formData.incident_timing}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                -- Select time period --
              </option>
              {INCIDENT_TIMINGS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Question 3 */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              3. What is the current status of your case?
            </label>
            <select
              name="case_status"
              value={formData.case_status}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                -- Select current case stage --
              </option>
              {CASE_STATUSES.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Question 4 */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              4. What kind of support are you currently looking for?
            </label>
            <select
              name="support_needed"
              value={formData.support_needed}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                -- Select support type --
              </option>
              {SUPPORT_TYPES.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Question 5 */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              5. How would you describe how you are feeling right now?
            </label>
            <select
              name="initial_feeling"
              value={formData.initial_feeling}
              onChange={handleChange}
              style={selectStyle}
              required
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                -- Select how you feel right now --
              </option>
              {FEELINGS.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl font-semibold text-slate-950 transition-all shadow-lg cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb7185 100%)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Saving your assessment..." : "Save Assessment & Continue"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full sm:w-auto py-3 px-5 rounded-xl text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 transition-all text-sm cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>

      <p
        className="text-slate-500 text-xs text-center px-4"
        style={{ position: "relative", zIndex: 10 }}
      >
        🔒 Human-in-the-loop protection: Your answers are protected and used solely to tailor emotional support & distress prevention.
      </p>
    </div>
  );
}
