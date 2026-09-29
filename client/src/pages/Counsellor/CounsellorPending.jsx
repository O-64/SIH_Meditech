import { useState, useEffect } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";

export default function CounsellorPending({ onNavigate }) {
  const [counsellor, setCounsellor] = useState(() => {
    return JSON.parse(
      localStorage.getItem("pending_counsellor") ||
        '{"name":"Dr. Applicant","clinic_name":"Trauma Care Clinic","license_number":"MCI-REQ-9921","email":"dr.verma@state-mhpss.gov.in"}'
    );
  });

  const [checking, setChecking] = useState(false);
  const [approvedAlert, setApprovedAlert] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Live polling: Check database every 3.5 seconds to see if Admin has approved this counsellor
  useEffect(() => {
    if (!counsellor?.email) return;

    const interval = setInterval(async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const res = await fetch(`${apiUrl}/api/v1/counsellor/status/${counsellor.email}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "approved") {
            clearInterval(interval);
            setApprovedAlert(true);
            // Save approved state
            localStorage.setItem(
              "counsellor_user",
              JSON.stringify({
                ...data.counsellor,
                clinic: data.counsellor.clinic_name,
                license: data.counsellor.license_number,
              })
            );
            localStorage.setItem("counsellor_token", "jwt_counsellor_" + Date.now());
            setTimeout(() => {
              onNavigate("landing");
            }, 3000);
          }
        }
      } catch (err) {
        console.warn("Status poll error:", err.message);
      }
      setPollCount((prev) => prev + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, [counsellor, onNavigate]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/v1/counsellor/status/${counsellor.email}`);
      const data = await res.json();
      if (res.ok && data.status === "approved") {
        setApprovedAlert(true);
        localStorage.setItem(
          "counsellor_user",
          JSON.stringify({
            ...data.counsellor,
            clinic: data.counsellor.clinic_name,
            license: data.counsellor.license_number,
          })
        );
        localStorage.setItem("counsellor_token", "jwt_counsellor_" + Date.now());
        setTimeout(() => {
          onNavigate("landing");
        }, 2500);
      }
    } catch (err) {
      console.error("Manual check error:", err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SahaayLogo size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-amber-300">Sahaay</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                ⏳ Empanelment Verification Pending
              </span>
            </div>
            <p className="text-xs text-slate-400">
              National Atrocity Distress Monitoring Authority • Ministry of Health & MoSJE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("landing")}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 flex flex-col gap-10">
        {/* APPROVAL CELEBRATION MODAL BANNER */}
        {approvedAlert && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 border-2 border-emerald-400 shadow-2xl text-center flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-4xl animate-bounce">
              🎉
            </div>
            <h2 className="text-2xl font-black text-white">
              Official Government Approval Granted!
            </h2>
            <p className="text-sm text-emerald-200 max-w-lg">
              Congratulations, <strong>{counsellor.name}</strong>. The Government Ministry Administrator has verified your medical credentials and assigned victims to your care roster.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg mt-2 animate-pulse">
              <span>Redirecting to Landing Page to Sign In...</span>
            </div>
          </div>
        )}

        {/* HERO STATUS SECTION */}
        <section className="text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Application Status: Under Active Review</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white font-serif tracking-tight leading-tight mb-4">
            Not Approved Yet
          </h1>

          <p className="text-slate-300 text-base max-w-2xl leading-relaxed mb-6">
            Your application for empanelment under <strong>{counsellor.clinic_name || "your clinic"}</strong> with license <strong>{counsellor.license_number}</strong> has been transmitted to authorized Ministry Administrators.
          </p>

          {/* Verification Card */}
          <div className="w-full max-w-xl p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl text-left flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Applicant Doctor:
              </div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>🩺</span>
                <span>{counsellor.name}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {counsellor.email} • License: <span className="font-mono text-amber-300">{counsellor.license_number}</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 w-full sm:w-auto">
              <button
                onClick={handleManualCheck}
                disabled={checking || approvedAlert}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <span>🔄</span>
                <span>{checking ? "Verifying..." : "Check Status"}</span>
              </button>
              <span className="text-[10px] text-slate-500">Auto-refreshing in real time...</span>
            </div>
          </div>
        </section>

        {/* SECTION: WHAT IS YOUR ROLE (BIG TEXT & ATTRACTIVE CARDS) */}
        <section className="pt-6 border-t border-white/10">
          <div className="text-center mb-10">
            <span className="text-xs uppercase font-bold tracking-widest text-cyan-400 block mb-2">
              National Clinical Mandate
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white font-serif">
              What Is Your Role as an Empanelled Sahaay Counsellor?
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-2 leading-relaxed">
              Atrocity survivors face severe trauma that criminal justice proceedings often overlook. Once approved, you act as the critical human anchor for allotted victims.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Card 1 */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-cyan-500/20 hover:border-cyan-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  🧠
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  1. Trauma-Informed Psychosocial Care
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Provide evidence-based grounding techniques, trauma de-escalation, and post-traumatic stress management for victims suffering caste humiliation, assault, and severe social boycott.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-[11px] text-cyan-300 font-semibold">
                Clinical Priority: Immediate Grounding & Stabilisation
              </div>
            </div>

            {/* Role Card 2 */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-amber-500/20 hover:border-amber-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  ⚖️
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  2. Case-Stage Conscious Monitoring
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Align interventions with the victim's legal journey: support through acute police enquiry delays during <em>Investigation</em>, anxiety during <em>Court Trials</em>, and long-term socio-economic healing during <em>Rehabilitation</em>.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-[11px] text-amber-300 font-semibold">
                Dynamic Alignment with Judicial Stage
              </div>
            </div>

            {/* Role Card 3 */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-rose-500/20 hover:border-rose-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  🚨
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  3. Critical Distress Triage Escalation
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  When SAHAYA's AI calculates a critical <strong>Hybrid Distress Score (Score &gt; 70)</strong> from daily reflections, you receive an immediate alert for rapid tele-consultation and SOS crisis management.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-[11px] text-rose-300 font-semibold">
                Rapid Emergency Outreach & Suicide Prevention
              </div>
            </div>

            {/* Role Card 4 */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/60 border border-emerald-500/20 hover:border-emerald-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  🛡️
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  4. Strict Human-in-the-Loop Governance
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The AI never makes clinical verdicts or diagnostic decisions. You hold the clinical authority to record session outcomes, verify legal aid referrals, and oversee medical compensation requests.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center text-[11px] text-emerald-300 font-semibold">
                Zero Autonomous Clinical Decisions
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
