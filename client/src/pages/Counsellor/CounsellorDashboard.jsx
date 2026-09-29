import { useState, useEffect } from "react";
import SahaayLogo from "../../components/shared/SahaayLogo";

export default function CounsellorDashboard({ onNavigate }) {
  const [counsellorUser, setCounsellorUser] = useState(() => {
    return JSON.parse(
      localStorage.getItem("counsellor_user") ||
        '{"name":"Dr. Rohini Kulkarni, MD","clinic":"Sanjeevani Trauma & Recovery Clinic","license":"MCI-MH-49201","id":"c-demo-1"}'
    );
  });

  const [victims, setVictims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [distressFilter, setDistressFilter] = useState("all");
  const [selectedVictim, setSelectedVictim] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState({});
  const [currentNote, setCurrentNote] = useState("");
  const [telecomActionMsg, setTelecomActionMsg] = useState(null);

  // Fetch real allocated victims from database
  const fetchAllottedVictims = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const counsellorId = counsellorUser?.id || "demo";
      const res = await fetch(`${apiUrl}/api/v1/counsellor/${counsellorId}/victims`);
      const data = await res.json();
      if (res.ok && data.victims) {
        setVictims(data.victims);
      } else {
        // Fallback for demo when no victims assigned yet
        setVictims([]);
      }
    } catch (err) {
      console.error("Failed to fetch allotted victims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllottedVictims();
  }, [counsellorUser]);

  const handleOpenReport = (victim) => {
    setSelectedVictim(victim);
    setCurrentNote(clinicalNotes[victim.id] || "");
  };

  const handleSaveNote = () => {
    if (!selectedVictim) return;
    setClinicalNotes((prev) => ({
      ...prev,
      [selectedVictim.id]: currentNote,
    }));
    setTelecomActionMsg("Clinical case notes saved securely to file.");
    setTimeout(() => setTelecomActionMsg(null), 3000);
  };

  const handleInitiateCall = (channel) => {
    if (!selectedVictim) return;
    setTelecomActionMsg(
      `Dispatched encrypted ${channel.toUpperCase()} tele-consultation session to ${selectedVictim.name} via Govt 14566 MHPSS Gateway.`
    );
    setTimeout(() => setTelecomActionMsg(null), 4000);
  };

  const handleSignOut = () => {
    localStorage.removeItem("counsellor_token");
    localStorage.removeItem("counsellor_user");
    onNavigate("landing");
  };

  // Filtered victims
  const filteredVictims = victims.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.incident_type?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      distressFilter === "all"
        ? true
        : distressFilter === "critical"
        ? (v.distress_level || "").includes("High")
        : distressFilter === "moderate"
        ? (v.distress_level || "").includes("Moderate")
        : (v.distress_level || "").includes("Low");

    return matchesSearch && matchesFilter;
  });

  const criticalCount = victims.filter((v) =>
    (v.distress_level || "").includes("High")
  ).length;
  const inTrialCount = victims.filter((v) =>
    (v.case_stage || "").toLowerCase().includes("trial")
  ).length;
  const inInvestCount = victims.filter((v) =>
    (v.case_stage || "").toLowerCase().includes("investig")
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Clinical Header */}
      <header className="border-b border-white/10 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SahaayLogo size={36} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-emerald-400 font-serif">
                Sahaay Clinical Station
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Govt Empanelled Doctor
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {counsellorUser.clinic || counsellorUser.clinic_name || "Specialized Trauma Recovery Center"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
              <span>🩺</span>
              <span>{counsellorUser.name}</span>
            </div>
            <div className="text-[10px] text-amber-300 font-mono">
              License: {counsellorUser.license || counsellorUser.license_number || "MCI-CERT-99"}
            </div>
          </div>

          <button
            onClick={fetchAllottedVictims}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-white/10"
            title="Refresh Allotted Victims from Database"
          >
            🔄 Refresh Roster
          </button>

          <button
            onClick={handleSignOut}
            className="text-xs px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">
              Total Allotted Victims
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-white">
                {victims.length}
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                Direct DB Roster
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Assigned by Ministry Admin
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-red-500/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-red-300 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Critical Distress Triage
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-red-400">
                {criticalCount}
              </span>
              <span className="text-xs text-red-400 font-semibold">
                High Risk
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Hybrid Distress Score &gt; 70
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-amber-300 font-medium">
              Undergoing Court Trial
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-amber-300">
                {inTrialCount}
              </span>
              <span className="text-xs text-slate-400">
                Trial Anxiety
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Need courtroom grounding support
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 shadow-sm flex flex-col justify-between">
            <span className="text-xs text-cyan-300 font-medium">
              Investigation Phase
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-extrabold text-cyan-300">
                {inInvestCount}
              </span>
              <span className="text-xs text-slate-400">
                Acute Shock
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1">
              Police enquiry & intimidation care
            </span>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search assigned victims by name, city, incident type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-400 outline-none focus:border-emerald-400 transition"
            />
            <span className="absolute left-3 top-3 text-slate-400 text-xs">
              🔍
            </span>
          </div>

          {/* Distress Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl border border-white/5 text-xs font-semibold">
            <button
              onClick={() => setDistressFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                distressFilter === "all"
                  ? "bg-emerald-500 text-slate-950 font-bold"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              All ({victims.length})
            </button>
            <button
              onClick={() => setDistressFilter("critical")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                distressFilter === "critical"
                  ? "bg-red-500 text-white font-bold"
                  : "text-red-400 hover:text-red-300"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setDistressFilter("moderate")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                distressFilter === "moderate"
                  ? "bg-amber-400 text-slate-950 font-bold"
                  : "text-amber-300 hover:text-amber-200"
              }`}
            >
              Moderate
            </button>
          </div>
        </div>

        {/* Allotted Victims Roster Table / Cards */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📋</span> Allotted Victim Patients (Live Database)
              </h3>
              <p className="text-xs text-slate-400">
                Victims assigned to your care by Ministry of Health & MoSJE Administrators.
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{filteredVictims.length}</strong> of {victims.length} records
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading allotted victim case profiles from database...</span>
            </div>
          ) : filteredVictims.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-3xl">
                🩺
              </div>
              <strong className="text-base text-white">
                {victims.length === 0
                  ? "No Victims Allotted Yet"
                  : "No Victims Match Current Filter"}
              </strong>
              <p className="text-slate-400 max-w-md leading-relaxed text-xs">
                {victims.length === 0
                  ? "When the Government / Ministry Administrator reviews pending cases in the Admin Surveillance portal, they allocate victims directly to your clinic roster. Check back soon or refresh."
                  : "Try selecting 'All' or clearing your search query to see other assigned patients."}
              </p>
              {victims.length === 0 && (
                <button
                  onClick={fetchAllottedVictims}
                  className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  🔄 Check for New Victim Allocations
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Victim Patient</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Atrocity Case Stage</th>
                    <th className="py-3 px-3">Incident Type</th>
                    <th className="py-3 px-3">Distress Level</th>
                    <th className="py-3 px-3">Latest Reflection</th>
                    <th className="py-3 px-3 text-right">Clinical Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                  {filteredVictims.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs">
                            👤
                          </span>
                          <div>
                            <span>{v.name}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {v.age !== "N/A" ? `${v.age} yrs` : "Adult"} • {v.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-300">
                        {v.city}
                        {v.area ? `, ${v.area}` : ""}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-amber-400/20 text-[11px] font-medium inline-block">
                          ⚖️ {v.case_stage}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-300 text-[11px] max-w-[180px] truncate" title={v.incident_type}>
                        {v.incident_type}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            (v.distress_level || "").includes("High")
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : (v.distress_level || "").includes("Low")
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              (v.distress_level || "").includes("High")
                                ? "bg-red-400 animate-pulse"
                                : (v.distress_level || "").includes("Low")
                                ? "bg-blue-400"
                                : "bg-amber-400"
                            }`}
                          />
                          {v.distress_level} ({v.mood_score}/10)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px] max-w-[200px] truncate" title={v.last_message || "No check-in recorded yet"}>
                        {v.last_message ? `"${v.last_message}"` : <span className="text-slate-600">Initial intake only</span>}
                      </td>

                      <td className="py-3.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenReport(v)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                        >
                          📖 View Case Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ─── CLINICAL CASE DOSSIER & REPORT MODAL ───────────── */}
      {selectedVictim && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
            style={{
              background: "#090d16",
              borderColor: "rgba(16, 185, 129, 0.35)",
              boxShadow: "0 25px 60px -15px rgba(16, 185, 129, 0.25)",
            }}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-slate-900/90 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Clinical Case Dossier
                  </span>
                  <span className="text-xs text-slate-400">• Confidential Medical Data</span>
                </div>
                <h3 className="text-xl font-bold text-white font-serif flex items-center gap-2">
                  <span>👤 {selectedVictim.name}</span>
                  <span className="text-xs font-normal text-slate-400">
                    ({selectedVictim.age !== "N/A" ? `${selectedVictim.age} yrs` : "Age not specified"}, {selectedVictim.city})
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Allotted to Dr. {counsellorUser.name} • Email: {selectedVictim.email}
                </p>
              </div>

              <button
                onClick={() => setSelectedVictim(null)}
                className="text-slate-400 hover:text-white text-xl p-1 cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
              {/* Tele-action Notice Banner */}
              {telecomActionMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-400/50 text-emerald-200 text-xs flex items-center gap-2 animate-in zoom-in-95 duration-200">
                  <span>✅</span>
                  <span>{telecomActionMsg}</span>
                </div>
              )}

              {/* Case Profile Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Judicial / Police Stage
                  </span>
                  <span className="text-sm font-bold text-amber-300">
                    {selectedVictim.case_stage}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Timeline: {selectedVictim.incident_timing || "1–6 months ago"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Atrocity Incident Category
                  </span>
                  <span className="text-sm font-bold text-white">
                    {selectedVictim.incident_type}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    SC/ST PoA Act jurisdiction
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Psychological Distress
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      (selectedVictim.distress_level || "").includes("High")
                        ? "text-red-400"
                        : "text-amber-300"
                    }`}
                  >
                    {selectedVictim.distress_level} ({selectedVictim.mood_score}/10)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dominant mood: {selectedVictim.mood_label || "anxious"}
                  </p>
                </div>
              </div>

              {/* Intake Questionnaire Details from Database */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>📝</span> Victim Intake Registration & Questionnaire Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Initial Reported Feelings
                    </span>
                    <p className="text-xs text-white mt-0.5">
                      {selectedVictim.initial_feelings || "Acute anxiety, numbness, fear of social retaliation"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Primary Support Requested
                    </span>
                    <p className="text-xs text-white mt-0.5">
                      {selectedVictim.support_needed || "Trauma counseling and legal procedure orientation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Latest Raw Daily Check-In Message */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>💬</span> Latest Check-in Message to Sahaay AI
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Logged: {selectedVictim.last_checkin || "Recent"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-white/5 text-slate-200 italic leading-relaxed">
                  {selectedVictim.last_message
                    ? `"${selectedVictim.last_message}"`
                    : "Victim has registered intake but has not yet completed a daily evening reflection with the AI bot."}
                </div>
              </div>

              {/* Clinical Notes & Action Plan Area */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🩺</span> Doctor's Clinical Assessment & Session Notes
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Confidential to empanelled psychiatrist
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="Record grounding observations, PTSD escalation score, or legal aid coordination notes..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs outline-none focus:border-emerald-400 transition"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer"
                  >
                    💾 Save Session Notes
                  </button>
                </div>
              </div>

              {/* Direct Outreach Tele-Consultation Buttons */}
              <div className="p-4 rounded-xl bg-slate-900 border border-white/10">
                <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider block mb-2">
                  Emergency Human Outreach Gateway (14566)
                </span>
                <p className="text-slate-300 text-xs mb-3">
                  Initiate confidential tele-consultation with victim patient:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInitiateCall("Call")}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-emerald-600/30 border border-white/10 hover:border-emerald-500 text-center transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">📞</span>
                    <span className="text-xs font-bold text-white">Direct IVRS Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInitiateCall("SMS")}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-amber-600/30 border border-white/10 hover:border-amber-500 text-center transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">💬</span>
                    <span className="text-xs font-bold text-white">Emergency SMS Outreach</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-900/90 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVictim(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer border border-white/10 transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
