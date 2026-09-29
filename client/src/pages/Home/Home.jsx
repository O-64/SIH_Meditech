import { useState, useEffect, useRef, useMemo } from "react";
import CBTModal from "../../components/shared/CbtModel";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Speech Recognition hook ───────────────────────────────────
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = (onFinalResult) => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const t = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        onFinalResult(t);
        setTranscript("");
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, transcript, startListening, stopListening, supported };
};

// ── TTS helper ────────────────────────────────────────────────
const speakText = (text) => {
  if (!("speechSynthesis" in window) || !text?.trim()) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.95;
  utt.pitch = 1.05;
  utt.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.name.includes("Samantha") ||
      v.name.includes("Google UK English Female") ||
      v.name.includes("Karen") ||
      v.lang === "en-GB",
  );
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
};

// ── Mood system ───────────────────────────────────────────────
const MOOD_SCORE = {
  happy: 90,
  calm: 75,
  okay: 55,
  neutral: 50,
  stressed: 38,
  anxious: 28,
  sad: 20,
  angry: 18,
  depressed: 8,
  suicidal: 2,
};
const MOOD_COLORS = {
  happy: {
    line: "#34d399",
    dot: "#34d399",
    label: "text-emerald-300",
    bg: "rgba(52,211,153,0.12)",
  },
  calm: {
    line: "#6ee7b7",
    dot: "#6ee7b7",
    label: "text-teal-300",
    bg: "rgba(110,231,183,0.12)",
  },
  okay: {
    line: "#93c5fd",
    dot: "#93c5fd",
    label: "text-blue-300",
    bg: "rgba(147,197,253,0.12)",
  },
  neutral: {
    line: "#94a3b8",
    dot: "#94a3b8",
    label: "text-slate-300",
    bg: "rgba(148,163,184,0.12)",
  },
  stressed: {
    line: "#fbbf24",
    dot: "#fbbf24",
    label: "text-amber-300",
    bg: "rgba(251,191,36,0.12)",
  },
  anxious: {
    line: "#fb923c",
    dot: "#fb923c",
    label: "text-orange-300",
    bg: "rgba(251,146,60,0.12)",
  },
  sad: {
    line: "#818cf8",
    dot: "#818cf8",
    label: "text-indigo-300",
    bg: "rgba(129,140,248,0.12)",
  },
  angry: {
    line: "#f87171",
    dot: "#f87171",
    label: "text-red-300",
    bg: "rgba(248,113,113,0.12)",
  },
  depressed: {
    line: "#a78bfa",
    dot: "#a78bfa",
    label: "text-violet-300",
    bg: "rgba(167,139,250,0.12)",
  },
  suicidal: {
    line: "#e879f9",
    dot: "#e879f9",
    label: "text-fuchsia-300",
    bg: "rgba(232,121,249,0.12)",
  },
};
const MOOD_EMOJIS = {
  happy: "😊",
  calm: "🌿",
  okay: "🙂",
  neutral: "😐",
  stressed: "😩",
  anxious: "😰",
  sad: "😢",
  angry: "😤",
  depressed: "😔",
  suicidal: "💜",
};

const normalizeMood = (label) => {
  const map = {
    happy: "happy",
    okay: "okay",
    anxious: "anxious",
    sad: "sad",
    stressed: "stressed",
    angry: "angry",
    depressed: "depressed",
    calm: "calm",
    neutral: "neutral",
  };
  return map[label] || "neutral";
};

const getMoodColor = (mood) => MOOD_COLORS[mood] || MOOD_COLORS.neutral;
const getMoodScore = (mood) => MOOD_SCORE[mood] ?? 50;

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const friendlyDay = (dateStr) => {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const d = new Date(dateStr).toDateString();
  if (d === today) return "Today";
  if (d === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
};

const groupByDay = (items) => {
  const groups = {};
  items.forEach((m) => {
    const day = new Date(m.timestamp).toDateString();
    if (!groups[day]) groups[day] = [];
    groups[day].push(m);
  });
  return groups;
};

const dominantMood = (items) => {
  if (!items?.length) return "neutral";
  const counts = items.reduce((a, e) => {
    a[e.mood] = (a[e.mood] || 0) + 1;
    return a;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

// ── Mood Badge ────────────────────────────────────────────────
const MoodBadge = ({ mood }) => {
  const c = getMoodColor(mood);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.label}`}
      style={{ background: c.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {mood}
    </span>
  );
};

// ── Chat Bubble ───────────────────────────────────────────────
const ChatBubble = ({ msg, onOpenCBT }) => {
  const isUser = msg.role === "user";
  if (!msg.content && !msg.cbt && !msg.helpline) return null;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#fbbf24,#fb7185)" }}
        >
          🌙
        </div>
      )}
      <div
        className={`max-w-sm lg:max-w-lg flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
      >
        {msg.mood && isUser && (
          <div className="flex justify-end">
            <MoodBadge mood={msg.mood} />
          </div>
        )}
        <div
          className="px-4 py-3 text-sm leading-relaxed"
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg,#f59e0b,#f43f5e)",
                  color: "#fff",
                  borderRadius: "1rem 1rem 0.25rem 1rem",
                  whiteSpace: "pre-line",
                }
              : {
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e2e8f0",
                  borderRadius: "0.25rem 1rem 1rem 1rem",
                  backdropFilter: "blur(8px)",
                  whiteSpace: "pre-line",
                }
          }
        >
          {msg.content}
        </div>
        {msg.cbt && !isUser && (
          <button
            onClick={onOpenCBT}
            className="mt-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all"
            style={{
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.25)",
              color: "#a78bfa",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(99,102,241,0.12)";
            }}
          >
            <span>✨</span> try a short exercise
          </button>
        )}
        {msg.helpline && !isUser && (
          <div
            className="mt-2 rounded-2xl p-3 flex flex-col gap-2"
            style={{
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
          >
            <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">
              helplines
            </p>
            <div>
              <p className="text-white text-xs font-bold">iCall</p>
              <p className="text-slate-300 text-sm font-mono">9152987821</p>
              <p className="text-slate-600 text-xs">Mon–Sat, 8am–10pm</p>
            </div>
            <div>
              <p className="text-white text-xs font-bold">
                Vandrevala Foundation
              </p>
              <p className="text-slate-300 text-sm font-mono">1860-2662-345</p>
              <p className="text-slate-600 text-xs">
                24/7, free & confidential
              </p>
            </div>
          </div>
        )}
        <span className="text-slate-600 text-xs">
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
};

// ── Gamification Engine ───────────────────────────────────────
function computeGamification(checkins) {
  if (!checkins.length)
    return {
      streak: 0,
      longestStreak: 0,
      stabilityScore: 0,
      weekProgress: 0,
      level: 1,
      xp: 0,
      xpToNext: 100,
      badges: [],
      milestones: [],
      mean: 0,
    };

  const sorted = [...checkins].sort(
    (a, b) => new Date(a.checkin_date) - new Date(b.checkin_date),
  );

  // Current streak
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = new Date(sorted[i].checkin_date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today - d) / 86400000);
    if (diff === streak || diff === streak + 1) {
      streak++;
    } else break;
  }

  // Longest streak
  let longest = 1,
    cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].checkin_date);
    const curr = new Date(sorted[i].checkin_date);
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) {
      cur++;
      longest = Math.max(longest, cur);
    } else cur = 1;
  }

  // Stability score
  const scores = sorted.map((c) => c.mood_score * 10);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  // Week progress
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const weekCheckins = sorted.filter(
    (c) => new Date(c.checkin_date) >= weekAgo,
  );
  const weekProgress = Math.min(7, weekCheckins.length);

  // XP & level
  const xp = checkins.length * 10 + streak * 15 + stabilityScore / 2;
  const level = Math.floor(xp / 100) + 1;
  const xpToNext = 100 - (xp % 100);

  // Badges
  const badges = [];
  if (streak >= 3)
    badges.push({
      id: "streak3",
      icon: "🔥",
      label: "3-day streak",
      color: "#f97316",
    });
  if (streak >= 7)
    badges.push({
      id: "streak7",
      icon: "⚡",
      label: "Week warrior",
      color: "#eab308",
    });
  if (streak >= 14)
    badges.push({
      id: "streak14",
      icon: "💎",
      label: "2-week champion",
      color: "#06b6d4",
    });
  if (stabilityScore >= 70)
    badges.push({
      id: "stable",
      icon: "🌊",
      label: "Emotionally steady",
      color: "#6366f1",
    });
  if (checkins.length >= 10)
    badges.push({
      id: "10",
      icon: "🌱",
      label: "10 check-ins",
      color: "#22c55e",
    });
  if (checkins.length >= 30)
    badges.push({
      id: "30",
      icon: "🌳",
      label: "30 check-ins",
      color: "#16a34a",
    });
  if (mean >= 70)
    badges.push({
      id: "thriving",
      icon: "✨",
      label: "Thriving",
      color: "#a855f7",
    });

  // Milestones on graph
  const last14 = sorted.slice(-14);
  const milestones = [];
  last14.forEach((c, i) => {
    if (i === 0) return;
    const diff = c.mood_score - last14[i - 1].mood_score;
    if (diff >= 3)
      milestones.push({ index: i, type: "rise", label: `+${diff * 10}%` });
  });
  const bestIdx = last14.reduce(
    (best, c, i) => (c.mood_score > last14[best].mood_score ? i : best),
    0,
  );
  milestones.push({ index: bestIdx, type: "best", label: "best" });

  return {
    streak,
    longestStreak: longest,
    stabilityScore,
    weekProgress,
    level,
    xp: Math.floor(xp),
    xpToNext: Math.floor(xpToNext),
    badges,
    milestones,
    mean,
  };
}

// ── Weekly Ring ───────────────────────────────────────────────
const WeekRing = ({ progress }) => {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex gap-1.5 items-center">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background:
                i < progress
                  ? "linear-gradient(135deg,#fbbf24,#fb7185)"
                  : "rgba(255,255,255,0.06)",
              border:
                i < progress ? "none" : "1.5px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: i < progress ? "#0f172a" : "#475569",
              fontWeight: 700,
              boxShadow:
                i < progress ? "0 0 10px rgba(251,191,36,0.4)" : "none",
              transition: "all 0.3s",
            }}
          >
            {i < progress ? "✓" : d}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── XP Bar ────────────────────────────────────────────────────
const XPBar = ({ level, xp, xpToNext }) => {
  const pct = Math.round((1 - xpToNext / 100) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#6366f1,#a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          color: "#fff",
          boxShadow: "0 0 16px rgba(99,102,241,0.5)",
          flexShrink: 0,
        }}
      >
        {level}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 11, color: "#94a3b8" }}>Level {level}</span>
          <span style={{ fontSize: 11, color: "#475569" }}>
            {xp} XP • {xpToNext} to next
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              width: `${pct}%`,
              background: "linear-gradient(90deg,#6366f1,#a855f7)",
              boxShadow: "0 0 8px rgba(99,102,241,0.6)",
              transition: "width 1s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Streak Counter ────────────────────────────────────────────
const StreakCounter = ({ streak, longest }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      background:
        streak >= 3 ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${streak >= 3 ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 16,
      padding: "10px 16px",
    }}
  >
    <span
      style={{
        fontSize: 28,
        filter: streak >= 3 ? "drop-shadow(0 0 8px #f97316)" : "none",
      }}
    >
      🔥
    </span>
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: streak >= 3 ? "#fb923c" : "#64748b",
          }}
        >
          {streak}
        </span>
        <span style={{ fontSize: 12, color: "#64748b" }}>day streak</span>
      </div>
      <span style={{ fontSize: 11, color: "#475569" }}>
        Best: {longest} days
      </span>
    </div>
  </div>
);

// ── Stability Gauge ───────────────────────────────────────────
const StabilityGauge = ({ score }) => {
  const color = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";
  const label = score >= 70 ? "Steady" : score >= 50 ? "Variable" : "Turbulent";
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "10px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          textShadow: `0 0 12px ${color}80`,
        }}
      >
        {score}
      </div>
      <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>
        stability
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          marginTop: 4,
          color,
          background: `${color}15`,
          borderRadius: 99,
          padding: "2px 8px",
          display: "inline-block",
        }}
      >
        {label}
      </div>
    </div>
  );
};

// ── Badge Strip ───────────────────────────────────────────────
const BadgeStrip = ({ badges }) => {
  if (!badges.length)
    return (
      <div style={{ fontSize: 12, color: "#334155", fontStyle: "italic" }}>
        🏆 Earn badges by checking in consistently
      </div>
    );
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {badges.map((b) => (
        <div
          key={b.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: `${b.color}15`,
            border: `1px solid ${b.color}40`,
            borderRadius: 99,
            padding: "4px 12px",
            fontSize: 12,
            color: b.color,
            fontWeight: 600,
            boxShadow: `0 0 8px ${b.color}20`,
          }}
        >
          <span>{b.icon}</span> {b.label}
        </div>
      ))}
    </div>
  );
};

// ── Gamified Mood Graph ───────────────────────────────────────
const GamifiedMoodGraph = ({ dbCheckins }) => {
  const canvasRef = useRef(null);
  const [animPct, setAnimPct] = useState(0);
  const W = 560,
    H = 200,
    PAD = { top: 24, right: 20, bottom: 30, left: 34 };

  const game = useMemo(() => computeGamification(dbCheckins), [dbCheckins]);

  // Entrance animation
  useEffect(() => {
    setAnimPct(0);
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const pct = Math.min(1, (ts - start) / 1200);
      setAnimPct(pct);
      if (pct < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [dbCheckins]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = PAD.top + ((H - PAD.top - PAD.bottom) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
    }

    const points = dbCheckins.slice(-14).map((c) => ({
      day: c.checkin_date,
      score: c.mood_score * 10,
      mood: normalizeMood(c.mood_label),
    }));

    if (points.length < 2) {
      ctx.fillStyle = "rgba(148,163,184,0.3)";
      ctx.font = "13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add more check-ins to see your mood curve", W / 2, H / 2);
      return;
    }

    const gW = W - PAD.left - PAD.right,
      gH = H - PAD.top - PAD.bottom;
    const xOf = (i) => PAD.left + (i / (points.length - 1)) * gW;
    const yOf = (score) => PAD.top + (1 - score / 100) * gH;

    const drawUpTo = Math.floor(animPct * (points.length - 1));
    const frac = animPct * (points.length - 1) - drawUpTo;

    const grad = ctx.createLinearGradient(PAD.left, 0, W - PAD.right, 0);
    points.forEach((p, i) =>
      grad.addColorStop(i / (points.length - 1), getMoodColor(p.mood).line),
    );

    // Area fill (animated)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].score));
    for (let i = 0; i < Math.min(drawUpTo + 1, points.length - 1); i++) {
      const p0 = points[Math.max(i - 1, 0)],
        p1 = points[i];
      const p2 = points[i + 1],
        p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = xOf(i) + (xOf(i + 1) - xOf(Math.max(i - 1, 0))) / 6;
      const cp1y = yOf(p1.score) + (yOf(p2.score) - yOf(p0.score)) / 6;
      const cp2x =
        xOf(i + 1) - (xOf(Math.min(i + 2, points.length - 1)) - xOf(i)) / 6;
      const cp2y = yOf(p2.score) - (yOf(p3.score) - yOf(p1.score)) / 6;
      if (i === drawUpTo && frac < 1) {
        const ex = xOf(i) + (xOf(i + 1) - xOf(i)) * frac;
        const ey = yOf(p1.score) + (yOf(p2.score) - yOf(p1.score)) * frac;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
      } else {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xOf(i + 1), yOf(p2.score));
      }
    }
    const lastX =
      animPct < 1
        ? xOf(drawUpTo) +
          (xOf(Math.min(drawUpTo + 1, points.length - 1)) - xOf(drawUpTo)) *
            frac
        : xOf(points.length - 1);
    ctx.lineTo(lastX, H - PAD.bottom);
    ctx.lineTo(xOf(0), H - PAD.bottom);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, PAD.top, 0, H - PAD.bottom);
    areaGrad.addColorStop(0, "rgba(99,102,241,0.18)");
    areaGrad.addColorStop(1, "rgba(99,102,241,0)");
    ctx.fillStyle = areaGrad;
    ctx.fill();
    ctx.restore();

    // Line (animated)
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(99,102,241,0.3)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(points[0].score));
    for (let i = 0; i < Math.min(drawUpTo + 1, points.length - 1); i++) {
      const p0 = points[Math.max(i - 1, 0)],
        p1 = points[i];
      const p2 = points[i + 1],
        p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = xOf(i) + (xOf(i + 1) - xOf(Math.max(i - 1, 0))) / 6;
      const cp1y = yOf(p1.score) + (yOf(p2.score) - yOf(p0.score)) / 6;
      const cp2x =
        xOf(i + 1) - (xOf(Math.min(i + 2, points.length - 1)) - xOf(i)) / 6;
      const cp2y = yOf(p2.score) - (yOf(p3.score) - yOf(p1.score)) / 6;
      if (i === drawUpTo && frac < 1) {
        const ex = xOf(i) + (xOf(i + 1) - xOf(i)) * frac;
        const ey = yOf(p1.score) + (yOf(p2.score) - yOf(p1.score)) * frac;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
      } else {
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xOf(i + 1), yOf(p2.score));
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots + milestone markers
    points.forEach((p, i) => {
      if (i > drawUpTo + 1) return;
      const x = xOf(i),
        y = yOf(p.score),
        color = getMoodColor(p.mood).dot;
      const isBest = game.milestones.some(
        (m) => m.index === i && m.type === "best",
      );
      const isRise = game.milestones.some(
        (m) => m.index === i && m.type === "rise",
      );

      if (isBest) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.2)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fbbf24";
        ctx.font = "bold 9px Inter";
        ctx.textAlign = "center";
        ctx.fillText("★ best", x, y - 12);
      } else if (isRise) {
        const rise = game.milestones.find(
          (m) => m.index === i && m.type === "rise",
        );
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#34d399";
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#34d399";
        ctx.font = "bold 9px Inter";
        ctx.textAlign = "center";
        ctx.fillText("↑ " + rise.label, x, y - 11);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = "rgba(148,163,184,0.45)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(friendlyDay(p.day).split(",")[0], x, H - 5);
    });

    [
      ["😊", 90],
      ["—", 50],
      ["💜", 10],
    ].forEach(([t, s]) => {
      ctx.fillStyle = "rgba(100,116,139,0.5)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(t, 2, yOf(s) + 4);
    });
  }, [dbCheckins, animPct, game]);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(12px)",
        borderRadius: 20,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
            Mood Journey
          </p>
          <p style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>
            Last 14 days
          </p>
        </div>
        <StabilityGauge score={game.stabilityScore} />
      </div>

      {/* XP Bar */}
      <XPBar level={game.level} xp={game.xp} xpToNext={game.xpToNext} />

      {/* Streak + Week Ring */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          flexWrap: "wrap",
        }}
      >
        <StreakCounter streak={game.streak} longest={game.longestStreak} />
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "10px 16px",
            minWidth: 180,
          }}
        >
          <p style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
            THIS WEEK
          </p>
          <WeekRing progress={game.weekProgress} />
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          borderRadius: 16,
          padding: "16px 8px 8px",
          border: "1px solid rgba(255,255,255,0.05)",
          overflowX: "auto",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", maxWidth: "100%" }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { mood: "happy", label: "Happy / Calm" },
          { mood: "okay", label: "Okay" },
          { mood: "anxious", label: "Anxious / Stressed" },
          { mood: "sad", label: "Sad / Low" },
        ].map(({ mood, label }) => (
          <div key={mood} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: getMoodColor(mood).dot,
                boxShadow: `0 0 6px ${getMoodColor(mood).dot}`,
              }}
            />
            <span className="text-slate-600 text-xs">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 11 }}>★</span>
          <span className="text-slate-600 text-xs">Best day</span>
        </div>
      </div>

      {/* Badges */}
      <div>
        <p
          style={{
            fontSize: 11,
            color: "#334155",
            fontWeight: 600,
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          BADGES EARNED
        </p>
        <BadgeStrip badges={game.badges} />
      </div>

      {/* Next goal nudge */}
      {game.streak < 7 && (
        <div
          style={{
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.15)",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🎯</span>
          <div>
            <p
              style={{
                fontSize: 12,
                color: "#fbbf24",
                fontWeight: 600,
                margin: 0,
              }}
            >
              {7 - game.streak} more day{7 - game.streak !== 1 ? "s" : ""} for
              Week Warrior badge
            </p>
            <p style={{ fontSize: 11, color: "#78716c", margin: "2px 0 0" }}>
              Check in daily to keep your streak alive
            </p>
          </div>
        </div>
      )}
      {game.streak >= 7 && game.stabilityScore < 70 && (
        <div
          style={{
            background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 14,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>🌊</span>
          <div>
            <p
              style={{
                fontSize: 12,
                color: "#818cf8",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Stability score: {game.stabilityScore}/100
            </p>
            <p style={{ fontSize: 11, color: "#475569", margin: "2px 0 0" }}>
              Try a CBT exercise to build emotional steadiness
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sidebar ───────────────────────────────────────────────────
const Sidebar = ({
  user,
  allMessages,
  activeView,
  setActiveView,
  onResetChat,
  onOpenDayChat,
}) => {
  const dayGroups = groupByDay(allMessages);
  const dayKeys = Object.keys(dayGroups).sort(
    (a, b) => new Date(b) - new Date(a),
  );
  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full"
      style={{
        background: "rgba(8,12,25,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🌙</span>
          <span className="text-base font-bold font-serif text-amber-300">
            Sahaay
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-slate-900"
            style={{ background: "linear-gradient(135deg,#fbbf24,#fb7185)" }}
          >
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="text-white text-sm font-medium">
              {user?.name || "You"}
            </p>
            <p className="text-slate-600 text-xs">
              {[user?.city, user?.area].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
      </div>
      <div
        className="px-3 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {[
          { id: "chat", icon: "💬", label: "Chat with Sahaay" },
          { id: "history", icon: "📅", label: "Mood History" },
        ].map(({ id, icon, label }) => (
          <button
            key={id}
            onClick={() => {
              setActiveView(id);
              if (id === "chat") onResetChat();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-1"
            style={
              activeView === id
                ? {
                    background: "rgba(251,191,36,0.1)",
                    color: "#fbbf24",
                    border: "1px solid rgba(251,191,36,0.2)",
                  }
                : {
                    background: "transparent",
                    color: "#475569",
                    border: "1px solid transparent",
                  }
            }
            onMouseEnter={(e) => {
              if (activeView !== id) {
                e.currentTarget.style.color = "#e2e8f0";
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeView !== id) {
                e.currentTarget.style.color = "#475569";
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-slate-700 text-xs font-medium uppercase tracking-wider mb-2 px-1">
          Sessions
        </p>
        {dayKeys.length === 0 ? (
          <p className="text-slate-700 text-sm text-center mt-8">
            No sessions yet 🌱
          </p>
        ) : (
          <div className="space-y-1">
            {dayKeys.map((day) => {
              const msgs = dayGroups[day],
                userMsgs = msgs.filter((m) => m.role === "user"),
                mood = dominantMood(userMsgs);
              return (
                <button
                  key={day}
                  onClick={() => {
                    onOpenDayChat(day, msgs);
                    setActiveView("chat");
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{ border: "1px solid transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-slate-500 text-xs font-medium">
                      {friendlyDay(day)}
                    </span>
                    <span className="text-sm">{MOOD_EMOJIS[mood] || "😐"}</span>
                  </div>
                  <p className="text-slate-700 text-xs">
                    {userMsgs.length} message{userMsgs.length !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

// ── Input Bar ─────────────────────────────────────────────────
const InputBar = ({ onSend, isTyping, lastAiText, speakTrigger }) => {
  const [text, setText] = useState("");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const { isListening, transcript, startListening, stopListening, supported } =
    useSpeechRecognition();

  useEffect(() => {
    if (speakTrigger && isSpeakerOn && lastAiText) speakText(lastAiText);
  }, [speakTrigger]);

  const handleSpeaker = () => {
    setIsSpeakerOn((prev) => {
      if (prev) window.speechSynthesis?.cancel();
      return !prev;
    });
  };

  const handleMic = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening((finalText) => {
      if (finalText.trim()) onSend(finalText.trim());
    });
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="flex-shrink-0"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(8,12,25,0.7)",
        backdropFilter: "blur(12px)",
      }}
    >
      {isListening && transcript && (
        <div
          className="mx-4 mt-3 px-4 py-2 rounded-xl text-sm"
          style={{
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.2)",
            color: "#fbbf24",
          }}
        >
          🎤 {transcript}
        </div>
      )}
      <div className="p-4 flex items-end gap-3">
        {supported ? (
          <button
            onClick={handleMic}
            title={isListening ? "Stop" : "Speak your message"}
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              border: isListening
                ? "1.5px solid #f43f5e"
                : "1.5px solid rgba(255,255,255,0.1)",
              background: isListening
                ? "rgba(244,63,94,0.15)"
                : "rgba(255,255,255,0.04)",
              color: isListening ? "#f43f5e" : "#64748b",
              fontSize: "18px",
              cursor: "pointer",
              transition: "all 0.2s",
              animation: isListening
                ? "mic-pulse 1.2s ease-in-out infinite"
                : "none",
            }}
          >
            {isListening ? "⏹" : "🎤"}
          </button>
        ) : (
          <button
            disabled
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              border: "1.5px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.02)",
              color: "#334155",
              fontSize: "18px",
              cursor: "not-allowed",
            }}
          >
            🎤
          </button>
        )}
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              isListening ? "Listening… speak now" : "Share how you're feeling…"
            }
            rows={1}
            className="glass-input"
            style={{ resize: "none", minHeight: "44px", maxHeight: "120px" }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
        </div>
        <button
          onClick={handleSpeaker}
          title={isSpeakerOn ? "Mute Sahaay's voice" : "Enable Sahaay's voice"}
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            border: isSpeakerOn
              ? "1.5px solid #93c5fd"
              : "1.5px solid rgba(255,255,255,0.1)",
            background: isSpeakerOn
              ? "rgba(147,197,253,0.12)"
              : "rgba(255,255,255,0.04)",
            color: isSpeakerOn ? "#93c5fd" : "#64748b",
            fontSize: "18px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {isSpeakerOn ? "🔊" : "🔇"}
        </button>
        <button
          onClick={handleSend}
          disabled={!text.trim() || isTyping}
          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 transition-all"
          style={{
            background: "linear-gradient(135deg,#fbbf24,#fb7185)",
            color: "#0f172a",
            opacity: !text.trim() || isTyping ? 0.35 : 1,
          }}
          onMouseEnter={(e) => {
            if (text.trim() && !isTyping) {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(251,191,36,0.4)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          →
        </button>
      </div>
      <style>{`@keyframes mic-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.5); } 50% { box-shadow: 0 0 0 8px rgba(244,63,94,0); } }`}</style>
    </div>
  );
};

// ── Mood History View ─────────────────────────────────────────
const MoodHistoryView = () => {
  const [dbCheckins, setDbCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCheckin, setSelectedCheckin] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API}/api/v1/mood-history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setDbCheckins(data.checkins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">loading your journey...</p>
        </div>
      </div>
    );
  }

  if (selectedCheckin) {
    const mood = normalizeMood(selectedCheckin.mood_label);
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => setSelectedCheckin(null)}
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: "#64748b" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          ← Back to all days
        </button>
        <h2 className="text-2xl font-bold font-serif text-white mb-1">
          {friendlyDay(selectedCheckin.checkin_date)}
        </h2>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{MOOD_EMOJIS[mood] || "😐"}</span>
          <MoodBadge mood={mood} />
          <span className="text-slate-500 text-sm">
            {selectedCheckin.mood_score}/10
          </span>
        </div>
        {selectedCheckin.raw_message && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
              what you said
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {selectedCheckin.raw_message}
            </p>
          </div>
        )}
      </div>
    );
  }

  const avg = dbCheckins.length
    ? Math.round(
        dbCheckins.reduce((a, c) => a + c.mood_score, 0) / dbCheckins.length,
      )
    : 0;
  const best = dbCheckins.length
    ? dbCheckins.reduce((a, b) => (a.mood_score > b.mood_score ? a : b))
    : null;
  const dominantLabel = dbCheckins.length
    ? Object.entries(
        dbCheckins.reduce((a, c) => {
          a[c.mood_label] = (a[c.mood_label] || 0) + 1;
          return a;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-2xl font-bold font-serif text-white mb-1">
        Mood History
      </h2>
      <p className="text-slate-500 text-sm mb-6" style={{ fontWeight: 300 }}>
        A reflection of your emotional journey
      </p>

      {dbCheckins.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "avg mood", value: `${avg}/10`, color: "#6366f1" },
              {
                label: "dominant feeling",
                value: `${MOOD_EMOJIS[normalizeMood(dominantLabel)] || "😐"} ${dominantLabel}`,
                color: getMoodColor(normalizeMood(dominantLabel)).dot,
              },
              {
                label: "best day",
                value: best ? friendlyDay(best.checkin_date) : "—",
                color: "#f59e0b",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <p
                  className="font-bold text-base mb-1"
                  style={{ color: s.color }}
                >
                  {s.value}
                </p>
                <p className="text-slate-600 text-xs">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ✅ Gamified Graph replaces old MoodLineGraph */}
          <div className="mb-6">
            <GamifiedMoodGraph dbCheckins={dbCheckins} />
          </div>

          {/* Entry list */}
          <p className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-3">
            all entries
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...dbCheckins].reverse().map((checkin) => {
              const mood = normalizeMood(checkin.mood_label);
              const c = getMoodColor(mood);
              return (
                <button
                  key={checkin.id}
                  onClick={() => setSelectedCheckin(checkin)}
                  className="text-left rounded-2xl p-4 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = `${c.dot}50`;
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {friendlyDay(checkin.checkin_date)}
                      </p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {checkin.mood_score}/10
                      </p>
                    </div>
                    <span className="text-2xl">
                      {MOOD_EMOJIS[mood] || "😐"}
                    </span>
                  </div>
                  <MoodBadge mood={mood} />
                  {checkin.raw_message && (
                    <p className="text-slate-700 text-xs mt-2 truncate">
                      {checkin.raw_message.slice(0, 60)}
                      {checkin.raw_message.length > 60 ? "..." : ""}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {dbCheckins.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🌱</p>
          <p className="text-slate-400">Your mood history will appear here</p>
          <p
            className="text-slate-600 text-sm mt-2"
            style={{ fontWeight: 300 }}
          >
            Start chatting to track your feelings
          </p>
        </div>
      )}
    </div>
  );
};

// ── Main Home ─────────────────────────────────────────────────
export default function Home({ onNavigate }) {
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  const [allMessages, setAllMessages] = useState([]);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeView, setActiveView] = useState("chat");
  const [chatOpen, setChatOpen] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());
  const [cbtOpen, setCbtOpen] = useState(false);
  const [checkinDate, setCheckinDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [lastAiText, setLastAiText] = useState("");
  const [speakTrigger, setSpeakTrigger] = useState(0);
  const [assignedCounsellor, setAssignedCounsellor] = useState(null);

  const bottomRef = useRef(null);
  const deepLinkHandled = useRef(false);
  const lastSeenRef = useRef(null);

  useEffect(() => {
    const fetchMyCounsellor = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch(`${API}/api/v1/auth/my-counsellor`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.counsellor) {
            setAssignedCounsellor(data.counsellor);
          }
        }
      } catch (err) {
        // silent
      }
    };
    fetchMyCounsellor();
  }, []);

  const triggerSpeak = (text) => {
    setLastAiText(text);
    setSpeakTrigger((n) => n + 1);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      const p = window.location.search;
      if (p) sessionStorage.setItem("pendingDeepLink", p);
      onNavigate("landing");
      return;
    }
    if (deepLinkHandled.current) return;

    const rawParams =
      window.location.search || sessionStorage.getItem("pendingDeepLink") || "";
    sessionStorage.removeItem("pendingDeepLink");
    const params = new URLSearchParams(rawParams);
    const replyCheckinId = params.get("reply");
    const replyType = params.get("type");
    if (!replyCheckinId || !replyType) return;

    deepLinkHandled.current = true;
    window.history.replaceState({}, "", "/home");

    (async () => {
      try {
        const res = await fetch(
          `${API}/api/v1/chat/context?checkin_id=${replyCheckinId}&type=${replyType}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        const content =
          data.message ||
          `${getGreeting()}, ${user?.name?.split(" ")[0] || "there"} 🌙 How are you feeling right now?`;
        const contextMsg = {
          id: Date.now(),
          role: "assistant",
          timestamp: Date.now(),
          content,
        };
        lastSeenRef.current = new Date().toISOString();
        setChatOpen(true);
        setActiveView("chat");
        setMessages([contextMsg]);
        setAllMessages((prev) => [...prev, contextMsg]);
        triggerSpeak(content);
      } catch {
        const content = `${getGreeting()}, ${user?.name?.split(" ")[0] || "there"} 🌙 How are you feeling right now?`;
        const welcome = {
          id: Date.now(),
          role: "assistant",
          timestamp: Date.now(),
          content,
        };
        lastSeenRef.current = new Date().toISOString();
        setChatOpen(true);
        setMessages([welcome]);
        setAllMessages((prev) => [...prev, welcome]);
        triggerSpeak(content);
      }
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const pollRef = useRef(null);
  pollRef.current = async () => {
    const token = localStorage.getItem("token");
    try {
      const params = new URLSearchParams({ date: checkinDate });
      if (lastSeenRef.current) params.append("last_seen", lastSeenRef.current);
      const res = await fetch(`${API}/api/v1/chat/poll?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.newMessages?.length) {
        const newMsgs = data.newMessages
          .filter((m) => m.message?.trim())
          .map((m) => ({
            id: m.id,
            role: m.role,
            content: m.message,
            timestamp: new Date(m.created_at).getTime(),
            message_type: m.message_type,
          }));
        if (newMsgs.length) {
          lastSeenRef.current = new Date(
            newMsgs[newMsgs.length - 1].timestamp + 1,
          ).toISOString();
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            return [...prev, ...newMsgs.filter((m) => !ids.has(m.id))];
          });
          triggerSpeak(newMsgs[newMsgs.length - 1].content);
        }
      }
    } catch (e) {
      console.error("Poll error:", e);
    }
  };

  useEffect(() => {
    if (!chatOpen) return;
    const id = setInterval(() => pollRef.current?.(), 4000);
    return () => clearInterval(id);
  }, [chatOpen]);

  const openChat = () => {
    lastSeenRef.current = new Date().toISOString();
    const content = `${greeting}, ${user?.name?.split(" ")[0] || "there"} 🌙 How are you feeling right now?`;
    const welcome = {
      id: Date.now(),
      role: "assistant",
      timestamp: Date.now(),
      content,
    };
    setChatOpen(true);
    setMessages([welcome]);
    setAllMessages((prev) => [...prev, welcome]);
    triggerSpeak(content);
  };

  const openDayChat = (_day, msgs) => {
    setChatOpen(true);
    setMessages(msgs);
  };

  const handleSend = async (text) => {
    const token = localStorage.getItem("token");
    const userMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      mood: "neutral",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAllMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    try {
      const res = await fetch(`${API}/api/v1/morning-checkin?fast=true`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = {
          id: Date.now() + 1,
          role: "assistant",
          content: data.error || "Something went wrong 😔",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, err]);
        setAllMessages((prev) => [...prev, err]);
        return;
      }
      const mood = data.mood?.mood_label || "neutral";
      if (data.checkin_date) setCheckinDate(data.checkin_date);
      lastSeenRef.current = new Date().toISOString();
      const moodUpdater = (prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, mood } : m));
      setMessages(moodUpdater);
      setAllMessages(moodUpdater);
      setHistory((prev) => [
        { id: Date.now(), mood, preview: text, timestamp: Date.now() },
        ...prev,
      ]);
      if (data.reply) {
        const aiMsg = {
          id: data.checkin_id + "_" + Date.now(),
          role: "assistant",
          content: data.reply,
          timestamp: Date.now(),
          cbt: data.cbt_triggered || false,
          helpline: data.self_harm_detected || false,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setAllMessages((prev) => [...prev, aiMsg]);
        triggerSpeak(data.reply);
      }
    } catch {
      const err = {
        id: Date.now() + 1,
        role: "assistant",
        content: "I couldn't connect 😔 Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, err]);
      setAllMessages((prev) => [...prev, err]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    onNavigate("landing");
  };

  const totalCheckins = history.length;
  const weekCheckins = history.filter(
    (e) => Date.now() - e.timestamp < 7 * 86_400_000,
  ).length;
  const topMood = totalCheckins
    ? Object.entries(
        history.reduce((a, e) => {
          a[e.mood] = (a[e.mood] || 0) + 1;
          return a;
        }, {}),
      ).sort((a, b) => b[1] - a[1])[0][0]
    : "—";

  return (
    <>
      {cbtOpen && <CBTModal onClose={() => setCbtOpen(false)} />}
      <div
        className="h-screen flex overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(30,20,60,0.9) 0%, rgba(8,12,25,1) 70%)",
        }}
      >
        <Sidebar
          user={user}
          allMessages={allMessages}
          activeView={activeView}
          setActiveView={setActiveView}
          onResetChat={() => setChatOpen(false)}
          onOpenDayChat={openDayChat}
        />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <header
            className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(8,12,25,0.6)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="flex items-center gap-3">
              {chatOpen && activeView === "chat" && (
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 rounded-xl transition-all text-slate-600"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#e2e8f0";
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ←
                </button>
              )}
              <div>
                <h1 className="text-white font-semibold font-serif text-sm">
                  {activeView === "history"
                    ? "Mood History"
                    : chatOpen
                      ? "Chat with Sahaay"
                      : "Dashboard"}
                </h1>
                <p className="text-slate-600 text-xs">
                  {activeView === "history"
                    ? `${totalCheckins} entries`
                    : chatOpen
                      ? "Your companion is here 🌙"
                      : `Welcome back, ${user?.name?.split(" ")[0] || "there"}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {history.length > 0 && (
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="text-xs text-slate-500">Today:</span>
                  <span>{MOOD_EMOJIS[history[0]?.mood] || "😐"}</span>
                  <MoodBadge mood={history[0]?.mood} />
                </div>
              )}
              <button
                onClick={handleLogout}
                className="Sahaay-btn Sahaay-btn-red Sahaay-btn-sm"
              >
                <span>Sign out</span>
              </button>
            </div>
          </header>

          {/* Empanelled Government Counsellor Banner at Top of AI Bot & Dashboard */}
          {assignedCounsellor && (
            <div
              className="mx-6 mt-3 px-4 py-2.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs flex-shrink-0 animate-in slide-in-from-top duration-300"
              style={{
                background: "linear-gradient(135deg, rgba(6, 78, 59, 0.55) 0%, rgba(15, 23, 42, 0.85) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.15)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-base flex-shrink-0">
                  🩺
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">
                      Allotted Doctor: {assignedCounsellor.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Empanelled Govt Counsellor
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {assignedCounsellor.clinic_name || "MHPSS Trauma Care"} • Specialization: {assignedCounsellor.specialization || "Clinical Psychiatrist"}
                  </p>
                </div>
              </div>

              {assignedCounsellor.phone && (
                <a
                  href={`tel:${assignedCounsellor.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap cursor-pointer"
                  title="Direct emergency line to assigned counsellor"
                >
                  <span>📞 Call:</span>
                  <span>{assignedCounsellor.phone}</span>
                </a>
              )}
            </div>
          )}

          {activeView === "history" ? (
            <MoodHistoryView />
          ) : !chatOpen ? (
            <div className="flex-1 overflow-y-auto px-6 py-10">
              <div className="max-w-xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold font-serif text-white mb-2">
                    {greeting},{" "}
                    <span
                      className="text-transparent bg-clip-text"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right,#fbbf24,#fb7185)",
                      }}
                    >
                      {user?.name?.split(" ")[0] || "there"}
                    </span>{" "}
                    🌙
                  </h2>
                  <p className="text-slate-500" style={{ fontWeight: 300 }}>
                    How are you doing today? Sahaay is here whenever you're
                    ready.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-8">
                  {[
                    { label: "Check-ins", value: totalCheckins, icon: "💬" },
                    { label: "This week", value: weekCheckins, icon: "📅" },
                    { label: "Top mood", value: topMood, icon: "✨" },
                  ].map(({ label, value, icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl p-4 text-center"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <p className="text-xl mb-1">{icon}</p>
                      <p className="text-white font-bold text-lg">{value}</p>
                      <p className="text-slate-600 text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center mb-8">
                  <button
                    onClick={openChat}
                    className="Sahaay-btn Sahaay-btn-amber Sahaay-btn-xl"
                  >
                    <span>🌙 Talk to Sahaay →</span>
                  </button>
                </div>
                {history.length > 0 ? (
                  <div>
                    <p className="text-slate-600 text-xs font-medium uppercase tracking-wider mb-3">
                      Recent check-ins
                    </p>
                    <div className="space-y-2">
                      {history.slice(0, 4).map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-xl px-4 py-3 flex items-center gap-3"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          <span className="text-lg">
                            {MOOD_EMOJIS[entry.mood] || "😐"}
                          </span>
                          <p
                            className="text-slate-400 text-sm flex-1 truncate"
                            style={{ fontWeight: 300 }}
                          >
                            {entry.preview}
                          </p>
                          <MoodBadge mood={entry.mood} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-center py-10 rounded-2xl"
                    style={{ border: "1px dashed rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-4xl mb-3">🌱</p>
                    <p
                      className="text-slate-500 text-sm"
                      style={{ fontWeight: 300 }}
                    >
                      Your mood history will appear here after your first
                      check-in
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {messages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    msg={msg}
                    onOpenCBT={() => setCbtOpen(true)}
                  />
                ))}
                {isTyping && (
                  <div className="flex justify-start mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm mr-2 flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg,#fbbf24,#fb7185)",
                      }}
                    >
                      🌙
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      <div className="flex gap-1 items-center h-4">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-2 h-2 rounded-full animate-bounce"
                            style={{
                              background: "#64748b",
                              animationDelay: `${d}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              <InputBar
                onSend={handleSend}
                isTyping={isTyping}
                lastAiText={lastAiText}
                speakTrigger={speakTrigger}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
}
