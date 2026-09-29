import { useState, useEffect, useRef, useMemo } from "react";

// ── Helpers ───────────────────────────────────────────────────
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
    };

  // Sort by date
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

  // Stability score: lower variance = higher score
  const scores = sorted.map((c) => c.mood_score * 10);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stabilityScore = Math.max(0, Math.round(100 - Math.sqrt(variance)));

  // This week progress (0-7)
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

  // Milestone markers on graph (index into last 14)
  const last14 = sorted.slice(-14);
  const milestones = [];
  last14.forEach((c, i) => {
    if (i === 0) return;
    const prev = last14[i - 1];
    const diff = c.mood_score - prev.mood_score;
    if (diff >= 3)
      milestones.push({ index: i, type: "rise", label: `+${diff * 10}%` });
  });
  // Mark best day
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

// ── Main Gamified Graph ───────────────────────────────────────
export const GamifiedMoodGraph = ({ dbCheckins }) => {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [animPct, setAnimPct] = useState(0);

  const W = 560,
    H = 200,
    PAD = { top: 24, right: 20, bottom: 30, left: 34 };

  const game = useMemo(() => computeGamification(dbCheckins), [dbCheckins]);

  // Entrance animation
  useEffect(() => {
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const pct = Math.min(1, (ts - start) / 1200);
      setAnimPct(pct < 1 ? pct : 1);
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

    // Animated draw: only draw up to animPct of the line
    const totalPts = points.length;
    const drawUpTo = Math.floor(animPct * (totalPts - 1));
    const frac = animPct * (totalPts - 1) - drawUpTo;

    // Build gradient
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
        ? xOf(drawUpTo) + (xOf(drawUpTo + 1 || drawUpTo) - xOf(drawUpTo)) * frac
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

    // Line
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
        // Star glow for best day
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

    // Y labels
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
        background: "rgba(8,12,25,0.7)",
        borderRadius: 24,
        padding: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(16px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "Inter, sans-serif",
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
          <h3
            style={{
              color: "#f1f5f9",
              fontWeight: 700,
              fontSize: 15,
              margin: 0,
            }}
          >
            Mood Journey
          </h3>
          <p style={{ color: "#475569", fontSize: 12, margin: "2px 0 0" }}>
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
          alignItems: "center",
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {[
          { mood: "happy", label: "Happy / Calm" },
          { mood: "okay", label: "Okay" },
          { mood: "anxious", label: "Anxious" },
          { mood: "sad", label: "Sad / Low" },
        ].map(({ mood, label }) => (
          <div
            key={mood}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: getMoodColor(mood).dot,
                boxShadow: `0 0 6px ${getMoodColor(mood).dot}`,
              }}
            />
            <span style={{ fontSize: 11, color: "#475569" }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>★</span>
          <span style={{ fontSize: 11, color: "#475569" }}>Best day</span>
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
              {7 - game.streak} more days for Week Warrior badge
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

// ── Demo ──────────────────────────────────────────────────────
const DEMO_CHECKINS = [
  { checkin_date: "2026-02-14", mood_label: "depressed", mood_score: 2 },
  { checkin_date: "2026-02-15", mood_label: "sad", mood_score: 3 },
  { checkin_date: "2026-02-16", mood_label: "anxious", mood_score: 4 },
  { checkin_date: "2026-02-17", mood_label: "stressed", mood_score: 5 },
  { checkin_date: "2026-02-18", mood_label: "neutral", mood_score: 5 },
  { checkin_date: "2026-02-19", mood_label: "okay", mood_score: 6 },
  { checkin_date: "2026-02-20", mood_label: "okay", mood_score: 7 },
  { checkin_date: "2026-02-21", mood_label: "calm", mood_score: 7 },
  { checkin_date: "2026-02-22", mood_label: "calm", mood_score: 8 },
  { checkin_date: "2026-02-23", mood_label: "happy", mood_score: 9 },
  { checkin_date: "2026-02-24", mood_label: "happy", mood_score: 8 },
  { checkin_date: "2026-02-25", mood_label: "calm", mood_score: 8 },
  { checkin_date: "2026-02-26", mood_label: "okay", mood_score: 7 },
  { checkin_date: "2026-02-27", mood_label: "happy", mood_score: 9 },
  { checkin_date: "2026-02-28", mood_label: "happy", mood_score: 9 },
];

export default function Demo() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 20% 50%, rgba(30,20,60,0.9), rgba(8,12,25,1))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 620 }}>
        <GamifiedMoodGraph dbCheckins={DEMO_CHECKINS} />
      </div>
    </div>
  );
}
