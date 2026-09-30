import React, { useState, useEffect, useRef } from "react";

export default function CounsellorCallingModal({
  isOpen,
  onClose,
  assignedCounsellor,
  triggerReason = "Severe anxiety and acute trauma distress detected by Adaptive Engine.",
}) {
  // Call stages: "connecting_steps" (0-3) -> "ringing" -> "connected" -> "ended"
  const [connectionStep, setConnectionStep] = useState(0);
  const [callState, setCallState] = useState("connecting"); // "connecting" | "ringing" | "connected" | "ended"
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioWaves, setAudioWaves] = useState([35, 60, 45, 80, 55, 90, 40]);
  const [connectionProgress, setConnectionProgress] = useState(15);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);

  const counsellor = {
    name: assignedCounsellor?.name || "Dr. Radhika Sharma",
    title: assignedCounsellor?.specialization || "Empanelled Govt Trauma Psychiatrist",
    clinic: assignedCounsellor?.clinic_name || "National MHPSS Victim Support Network",
    license: assignedCounsellor?.license_number || "REG-GOV-MH7491",
    phone: assignedCounsellor?.phone || "14416",
  };

  const playBeep = (freq = 440, type = "sine", duration = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay restrictions silent catch
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCallState("connecting");
      setConnectionStep(0);
      setConnectionProgress(15);
      setCallDuration(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Stage 1: Connecting sequence animation
    setCallState("connecting");
    setConnectionStep(1);
    setConnectionProgress(35);
    playBeep(480, "sine", 0.25);

    const step2Timer = setTimeout(() => {
      setConnectionStep(2);
      setConnectionProgress(70);
      playBeep(540, "sine", 0.25);
    }, 1200);

    const step3Timer = setTimeout(() => {
      setConnectionStep(3);
      setConnectionProgress(92);
      setCallState("ringing");
      playBeep(440, "sine", 0.7);
    }, 2400);

    const ringInterval = setInterval(() => {
      if (callState === "ringing") {
        playBeep(440, "sine", 0.7);
      }
    }, 2200);

    const connectTimer = setTimeout(() => {
      clearInterval(ringInterval);
      setConnectionStep(4);
      setConnectionProgress(100);
      setCallState("connected");
      playBeep(680, "sine", 0.3);

      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }, 4200);

    return () => {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      clearTimeout(connectTimer);
      clearInterval(ringInterval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  // Audio wave visualizer simulation
  useEffect(() => {
    if (callState !== "connected") return;
    const waveInterval = setInterval(() => {
      setAudioWaves([
        Math.floor(20 + Math.random() * 65),
        Math.floor(35 + Math.random() * 60),
        Math.floor(15 + Math.random() * 75),
        Math.floor(40 + Math.random() * 55),
        Math.floor(25 + Math.random() * 70),
        Math.floor(50 + Math.random() * 45),
        Math.floor(20 + Math.random() * 60),
      ]);
    }, 140);
    return () => clearInterval(waveInterval);
  }, [callState]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(3, 7, 18, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300"
        style={{
          background: "linear-gradient(175deg, #0e172a 0%, #070d19 100%)",
          border:
            callState === "connected"
              ? "1px solid rgba(52, 211, 153, 0.4)"
              : "1px solid rgba(244, 63, 94, 0.45)",
          boxShadow:
            callState === "connected"
              ? "0 0 60px rgba(52, 211, 153, 0.25)"
              : "0 0 60px rgba(244, 63, 94, 0.25)",
        }}
      >
        {/* Top Emergency Status Header */}
        <div
          className="px-6 py-3.5 flex items-center justify-between text-xs font-semibold"
          style={{
            background:
              callState === "connected"
                ? "linear-gradient(90deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 95, 70, 0.2) 100%)"
                : "linear-gradient(90deg, rgba(239, 68, 68, 0.3) 0%, rgba(245, 158, 11, 0.25) 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                callState === "connected" ? "bg-emerald-400" : "bg-rose-500 animate-ping"
              }`}
            />
            <span
              className={`tracking-wide uppercase font-bold text-xs ${
                callState === "connected" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {callState === "connected"
                ? "● Secure Line Connected"
                : "🚨 Severe Case Escalation • Module 5"}
            </span>
          </div>
          <span className="text-[11px] text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Encrypted Priority Hotline
          </span>
        </div>

        {/* ── CINEMATIC CONNECTING ANIMATION STAGE ── */}
        <div className="px-6 pt-6 pb-7 text-center flex flex-col items-center">
          {/* Animated Connecting Radar Rings & Orbital Pulse */}
          <div className="relative my-4 w-44 h-44 flex items-center justify-center">
            {/* Outer expanding sonar wave 1 */}
            <div
              className={`absolute inset-0 rounded-full border ${
                callState === "connected"
                  ? "border-emerald-400/40 animate-ping"
                  : "border-rose-400/40 animate-ping"
              }`}
              style={{ animationDuration: "2.5s" }}
            />
            {/* Outer expanding sonar wave 2 */}
            <div
              className={`absolute -inset-4 rounded-full border ${
                callState === "connected"
                  ? "border-emerald-500/25 animate-pulse"
                  : "border-rose-500/25 animate-pulse"
              }`}
              style={{ animationDuration: "3s" }}
            />
            {/* Rotating satellite signal dot */}
            {callState !== "connected" && (
              <div
                className="absolute inset-0 rounded-full border border-dashed border-rose-500/40 animate-spin"
                style={{ animationDuration: "6s" }}
              />
            )}

            {/* Central Counsellor Avatar */}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-5xl shadow-2xl relative z-10 transition-all duration-500"
              style={{
                background:
                  callState === "connected"
                    ? "linear-gradient(135deg, #059669 0%, #0d9488 50%, #1e1b4b 100%)"
                    : "linear-gradient(135deg, #be123c 0%, #9f1239 50%, #1e1b4b 100%)",
                border:
                  callState === "connected" ? "3px solid #34d399" : "3px solid #f43f5e",
                boxShadow:
                  callState === "connected"
                    ? "0 0 35px rgba(52, 211, 153, 0.4)"
                    : "0 0 35px rgba(244, 63, 94, 0.4)",
              }}
            >
              🩺
              <div
                className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-slate-950 flex items-center justify-center text-white text-xs shadow-md ${
                  callState === "connected" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                }`}
              >
                {callState === "connected" ? "✓" : "⚡"}
              </div>
            </div>
          </div>

          {/* Counsellor Profile Info */}
          <h3 className="text-xl font-extrabold text-white mt-2 mb-0.5 tracking-tight">
            {counsellor.name}
          </h3>
          <p className="text-xs text-emerald-300 font-semibold">
            {counsellor.title}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {counsellor.clinic} • {counsellor.license}
          </p>

          {/* Animated Connecting Progress Bar */}
          <div className="w-full my-5">
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    callState === "connected"
                      ? "bg-emerald-400"
                      : "bg-rose-500 animate-ping"
                  }`}
                />
                {callState === "connecting" && "Routing to Trauma Counsellor..."}
                {callState === "ringing" && "Ringing Counsellor Hotline..."}
                {callState === "connected" && `Connected (${formatTime(callDuration)})`}
              </span>
              <span
                className={`font-bold ${
                  callState === "connected" ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {connectionProgress}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  callState === "connected"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400"
                }`}
                style={{ width: `${connectionProgress}%` }}
              />
            </div>
          </div>

          {/* 4-Step Animated Connection Pipeline Status Indicator */}
          <div className="w-full grid grid-cols-4 gap-2 mb-5 text-[10px] font-mono text-center">
            <div
              className={`p-2 rounded-xl border transition-all ${
                connectionStep >= 1
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-900/50 border-slate-800 text-slate-500"
              }`}
            >
              <div>{connectionStep >= 1 ? "✓" : "1"}</div>
              <div className="mt-0.5 font-sans truncate">Detected</div>
            </div>
            <div
              className={`p-2 rounded-xl border transition-all ${
                connectionStep >= 2
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-900/50 border-slate-800 text-slate-500"
              }`}
            >
              <div>{connectionStep >= 2 ? "✓" : "2"}</div>
              <div className="mt-0.5 font-sans truncate">Routing</div>
            </div>
            <div
              className={`p-2 rounded-xl border transition-all ${
                connectionStep >= 3
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 animate-pulse"
                  : "bg-slate-900/50 border-slate-800 text-slate-500"
              }`}
            >
              <div>{connectionStep >= 3 ? "✓" : "3"}</div>
              <div className="mt-0.5 font-sans truncate">Ringing</div>
            </div>
            <div
              className={`p-2 rounded-xl border transition-all ${
                connectionStep >= 4
                  ? "bg-emerald-500/30 border-emerald-400 text-emerald-200 font-bold"
                  : "bg-slate-900/50 border-slate-800 text-slate-500"
              }`}
            >
              <div>{connectionStep >= 4 ? "🟢" : "4"}</div>
              <div className="mt-0.5 font-sans truncate">Live Voice</div>
            </div>
          </div>

          {/* Live Audio Visualizer when Connected */}
          {callState === "connected" && (
            <div className="w-full mb-5 p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
              <div className="flex items-center justify-between text-[11px] mb-2 px-1">
                <span className="text-emerald-300 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  AUDIO FEED ACTIVE
                </span>
                <span className="text-slate-400 font-mono">
                  {formatTime(callDuration)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1.5 h-10 px-4">
                {audioWaves.map((height, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full bg-gradient-to-t from-emerald-500 via-teal-300 to-white transition-all duration-100"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Clinical Grounding Note */}
          <div
            className="w-full text-left p-3.5 rounded-2xl mb-6 text-xs leading-relaxed"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
              <span>⚠️</span>
              <span>Trigger Detected:</span>
            </div>
            <p className="text-slate-300 font-light text-[11.5px]">
              {triggerReason}
            </p>
            <p className="text-[10.5px] text-slate-400 mt-2 italic">
              "Stay on the line. You are not alone and help is active. Place your feet firmly on the floor and take slow, deep breaths."
            </p>
          </div>

          {/* Interactive Call Action Controls */}
          <div className="w-full flex items-center justify-center gap-4">
            {/* Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-base transition-all cursor-pointer"
              style={{
                background: isMuted ? "rgba(244, 63, 94, 0.2)" : "rgba(255, 255, 255, 0.06)",
                border: isMuted ? "1.5px solid #f43f5e" : "1px solid rgba(255, 255, 255, 0.15)",
                color: isMuted ? "#f43f5e" : "#cbd5e1",
              }}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? "🔇" : "🎙️"}
            </button>

            {/* End Call Button */}
            <button
              onClick={() => {
                setCallState("ended");
                setTimeout(onClose, 400);
              }}
              className="px-7 h-12 rounded-full flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all transform hover:scale-105 cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
              }}
            >
              <span className="text-lg">📞</span>
              <span className="text-xs tracking-wide uppercase">End Call</span>
            </button>

            {/* Speakerphone Button */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-base transition-all cursor-pointer"
              style={{
                background: isSpeakerOn ? "rgba(52, 211, 153, 0.2)" : "rgba(255, 255, 255, 0.06)",
                border: isSpeakerOn ? "1.5px solid #34d399" : "1px solid rgba(255, 255, 255, 0.15)",
                color: isSpeakerOn ? "#34d399" : "#cbd5e1",
              }}
              title={isSpeakerOn ? "Speakerphone Active" : "Earpiece Mode"}
            >
              {isSpeakerOn ? "🔊" : "🔈"}
            </button>
          </div>

          {/* Direct Emergency Line Fallback */}
          <div className="mt-5 pt-3 border-t border-slate-800/80 w-full flex items-center justify-between text-[11px] text-slate-400">
            <span>Tele-MANAS (Govt 24/7):</span>
            <a
              href={`tel:${counsellor.phone}`}
              className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>Dial {counsellor.phone}</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
