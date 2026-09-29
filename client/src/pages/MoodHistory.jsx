import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const MOOD_CONFIG = {
  happy: {
    score: 9,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    label: "happy",
    emoji: "😊",
  },
  okay: {
    score: 6,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.15)",
    label: "okay",
    emoji: "😐",
  },
  anxious: {
    score: 4,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.15)",
    label: "anxious",
    emoji: "😰",
  },
  sad: {
    score: 3,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
    label: "sad",
    emoji: "😢",
  },
  stressed: {
    score: 4,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.15)",
    label: "stressed",
    emoji: "😤",
  },
  angry: {
    score: 2,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    label: "angry",
    emoji: "😠",
  },
};

const getMoodColor = (label) => MOOD_CONFIG[label]?.color || "#6366f1";
const getMoodEmoji = (label) => MOOD_CONFIG[label]?.emoji || "😐";

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const formatFullDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

export default function MoodHistory() {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API}/api/v1/mood-history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setCheckins(data.checkins || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>loading your journey...</p>
        </div>
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyWrap}>
          <span style={styles.emptyEmoji}>🌱</span>
          <p style={styles.emptyTitle}>Your mood history will appear here</p>
          <p style={styles.emptySubtitle}>
            Start chatting to track your feelings
          </p>
        </div>
      </div>
    );
  }

  // Build graph data — last 14 days max
  const graphData = checkins.slice(-14);
  const maxScore = 10;
  const graphHeight = 160;
  const graphWidth = Math.max(graphData.length * 56, 400);

  // Build SVG path
  const points = graphData.map((c, i) => {
    const x = (i / (graphData.length - 1 || 1)) * (graphWidth - 40) + 20;
    const y = graphHeight - (c.mood_score / maxScore) * graphHeight + 10;
    return { x, y, ...c };
  });

  const pathD =
    points.length > 1
      ? points.reduce((acc, p, i) => {
          if (i === 0) return `M ${p.x} ${p.y}`;
          const prev = points[i - 1];
          const cx1 = prev.x + (p.x - prev.x) * 0.5;
          const cy1 = prev.y;
          const cx2 = prev.x + (p.x - prev.x) * 0.5;
          const cy2 = p.y;
          return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`;
        }, "")
      : `M ${points[0]?.x} ${points[0]?.y}`;

  const areaD =
    pathD +
    ` L ${points[points.length - 1]?.x} ${graphHeight + 20} L ${points[0]?.x} ${graphHeight + 20} Z`;

  // Stats
  const avgScore = Math.round(
    checkins.reduce((a, c) => a + c.mood_score, 0) / checkins.length,
  );
  const bestDay = checkins.reduce((a, b) =>
    a.mood_score > b.mood_score ? a : b,
  );
  const streak = (() => {
    let s = 0;
    for (let i = checkins.length - 1; i >= 0; i--) {
      if (checkins[i].mood_score >= 5) s++;
      else break;
    }
    return s;
  })();

  const dominantMood = (() => {
    const counts = {};
    checkins.forEach((c) => {
      counts[c.mood_label] = (counts[c.mood_label] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "okay";
  })();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Mood History</h1>
          <p style={styles.subtitle}>A reflection of your emotional journey</p>
        </div>
        <div style={styles.entryCount}>
          {checkins.length} {checkins.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: "avg mood", value: `${avgScore}/10`, color: "#6366f1" },
          {
            label: "good days streak",
            value: `${streak} days`,
            color: "#10b981",
          },
          {
            label: "dominant feeling",
            value: `${getMoodEmoji(dominantMood)} ${dominantMood}`,
            color: getMoodColor(dominantMood),
          },
          {
            label: "best day",
            value: formatDate(bestDay.checkin_date),
            color: "#f59e0b",
          },
        ].map((stat) => (
          <div key={stat.label} style={styles.statCard}>
            <p style={{ ...styles.statValue, color: stat.color }}>
              {stat.value}
            </p>
            <p style={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div style={styles.graphCard}>
        <p style={styles.graphTitle}>mood over time</p>
        <div style={{ overflowX: "auto", paddingBottom: "8px" }}>
          <svg
            width={graphWidth}
            height={graphHeight + 40}
            style={{ display: "block", minWidth: "100%" }}
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[2, 4, 6, 8, 10].map((v) => {
              const y = graphHeight - (v / maxScore) * graphHeight + 10;
              return (
                <g key={v}>
                  <line
                    x1="0"
                    y1={y}
                    x2={graphWidth}
                    y2={y}
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                  />
                  <text
                    x="4"
                    y={y - 3}
                    fill="rgba(255,255,255,0.2)"
                    fontSize="9"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {points.length > 1 && <path d={areaD} fill="url(#areaGrad)" />}

            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() =>
                  setSelectedEntry(
                    checkins[checkins.length - graphData.length + i],
                  )
                }
              >
                {/* Hover glow */}
                {hoveredIdx === i && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="14"
                    fill={getMoodColor(p.mood_label)}
                    opacity="0.15"
                  />
                )}
                {/* Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hoveredIdx === i ? 7 : 5}
                  fill={getMoodColor(p.mood_label)}
                  stroke="#0c1220"
                  strokeWidth="2"
                  style={{ transition: "r 0.2s" }}
                />
                {/* Date label */}
                <text
                  x={p.x}
                  y={graphHeight + 30}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.3)"
                  fontSize="9"
                >
                  {formatDate(p.checkin_date)}
                </text>
                {/* Tooltip */}
                {hoveredIdx === i && (
                  <g>
                    <rect
                      x={p.x - 30}
                      y={p.y - 36}
                      width="60"
                      height="24"
                      rx="6"
                      fill="#1e293b"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />
                    <text
                      x={p.x}
                      y={p.y - 20}
                      textAnchor="middle"
                      fill="white"
                      fontSize="11"
                      fontWeight="600"
                    >
                      {getMoodEmoji(p.mood_label)} {p.mood_score}/10
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Entry detail modal */}
      {selectedEntry && (
        <div style={styles.modalOverlay} onClick={() => setSelectedEntry(null)}>
          <div
            style={{
              ...styles.modalCard,
              borderColor: getMoodColor(selectedEntry.mood_label) + "40",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "12px",
                  }}
                >
                  {formatFullDate(selectedEntry.checkin_date)}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "6px",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>
                    {getMoodEmoji(selectedEntry.mood_label)}
                  </span>
                  <span
                    style={{
                      color: getMoodColor(selectedEntry.mood_label),
                      fontSize: "18px",
                      fontWeight: "700",
                    }}
                  >
                    {selectedEntry.mood_label}
                  </span>
                  <span
                    style={{ color: "rgba(255,255,255,0.3)", fontSize: "14px" }}
                  >
                    · {selectedEntry.mood_score}/10
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            {selectedEntry.raw_message && (
              <div style={styles.rawMessage}>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "12px",
                    marginBottom: "8px",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  what you said
                </p>
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "14px",
                    lineHeight: "1.7",
                  }}
                >
                  {selectedEntry.raw_message}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entry list */}
      <div style={styles.listSection}>
        <p style={styles.listTitle}>all entries</p>
        <div style={styles.list}>
          {[...checkins].reverse().map((entry, i) => (
            <div
              key={entry.id || i}
              style={styles.entryRow}
              onClick={() => setSelectedEntry(entry)}
            >
              <div
                style={{
                  ...styles.moodDot,
                  background: getMoodColor(entry.mood_label),
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {getMoodEmoji(entry.mood_label)} {entry.mood_label}
                  </span>
                  <span
                    style={{
                      ...styles.scorePill,
                      background:
                        MOOD_CONFIG[entry.mood_label]?.bg ||
                        "rgba(99,102,241,0.15)",
                      color: getMoodColor(entry.mood_label),
                    }}
                  >
                    {entry.mood_score}/10
                  </span>
                </div>
                {entry.raw_message && (
                  <p style={styles.entryPreview}>
                    {entry.raw_message.slice(0, 80)}
                    {entry.raw_message.length > 80 ? "..." : ""}
                  </p>
                )}
              </div>
              <span style={styles.entryDate}>
                {formatDate(entry.checkin_date)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "32px 40px",
    maxWidth: "900px",
    margin: "0 auto",
    fontFamily: "Helvetica, Arial, sans-serif",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    gap: "16px",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "2px solid rgba(255,255,255,0.1)",
    borderTop: "2px solid #6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: { color: "rgba(255,255,255,0.3)", fontSize: "14px", margin: 0 },
  emptyWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    gap: "12px",
  },
  emptyEmoji: { fontSize: "48px" },
  emptyTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: "16px",
    margin: 0,
    fontWeight: "500",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.3)",
    fontSize: "14px",
    margin: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "28px",
  },
  title: { margin: 0, color: "#f1f5f9", fontSize: "22px", fontWeight: "700" },
  subtitle: {
    margin: "4px 0 0",
    color: "rgba(255,255,255,0.3)",
    fontSize: "13px",
  },
  entryCount: {
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.25)",
    color: "#a78bfa",
    fontSize: "12px",
    fontWeight: "600",
    padding: "6px 14px",
    borderRadius: "20px",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#0c1220",
    border: "1px solid #131c2e",
    borderRadius: "14px",
    padding: "16px",
    textAlign: "center",
  },
  statValue: { margin: 0, fontSize: "15px", fontWeight: "700" },
  statLabel: {
    margin: "4px 0 0",
    color: "rgba(255,255,255,0.3)",
    fontSize: "11px",
    letterSpacing: "0.5px",
  },
  graphCard: {
    background: "#0c1220",
    border: "1px solid #131c2e",
    borderRadius: "16px",
    padding: "24px",
    marginBottom: "20px",
  },
  graphTitle: {
    margin: "0 0 16px",
    color: "rgba(255,255,255,0.3)",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    background: "#0c1220",
    border: "1px solid",
    borderRadius: "20px",
    padding: "28px",
    width: "100%",
    maxWidth: "440px",
    margin: "20px",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "none",
    color: "rgba(255,255,255,0.4)",
    cursor: "pointer",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rawMessage: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "16px",
  },
  listSection: { marginTop: "8px" },
  listTitle: {
    margin: "0 0 12px",
    color: "rgba(255,255,255,0.3)",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "2px",
    textTransform: "uppercase",
  },
  list: { display: "flex", flexDirection: "column", gap: "2px" },
  entryRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "background 0.15s",
    background: "transparent",
  },
  moodDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  scorePill: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 8px",
    borderRadius: "20px",
    letterSpacing: "0.3px",
  },
  entryPreview: {
    margin: "3px 0 0",
    color: "rgba(255,255,255,0.3)",
    fontSize: "12px",
    lineHeight: "1.5",
  },
  entryDate: {
    color: "rgba(255,255,255,0.25)",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
};
