import React, { useState, useEffect, useRef, useMemo } from "react";

// Helper to build smooth quadratic bezier SVG paths
function buildSvgCurve(points) {
  if (!points || points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x},${points[i].y} ${xc},${yc}`;
  }
  d += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

// ── Chart 1: Mood Line Chart (LLM Based - Pure Responsive SVG) ──
function MoodLineChart({ data, hoveredPoint, setHoveredPoint }) {
  const chartData = useMemo(() => {
    if (data && data.length >= 2) return data;
    return [
      { date: "Day 1", mood_level: 35, mood_score: 3.5, mood_label: "stressed" },
      { date: "Day 2", mood_level: 45, mood_score: 4.5, mood_label: "anxious" },
      { date: "Day 3", mood_level: 55, mood_score: 5.5, mood_label: "okay" },
      { date: "Day 4", mood_level: 40, mood_score: 4.0, mood_label: "stressed" },
      { date: "Today", mood_level: 65, mood_score: 6.5, mood_label: "calm" },
    ];
  }, [data]);

  const W = 520;
  const H = 160;
  const padX = 45;
  const padY = 25;
  const bottomY = 135;

  const stepX = (W - padX * 2) / (chartData.length - 1 || 1);
  const points = chartData.map((d, i) => {
    const x = padX + i * stepX;
    const score = Math.max(0, Math.min(100, d.mood_level ?? (d.mood_score ? d.mood_score * 10 : 50)));
    const y = padY + (bottomY - padY) * (1 - score / 100);
    return { x, y, score, ...d };
  });

  const curvePath = buildSvgCurve(points);
  const areaPath = curvePath
    ? `${curvePath} L ${points[points.length - 1].x},${bottomY} L ${points[0].x},${bottomY} Z`
    : "";

  const avgScore = Math.round(
    points.reduce((acc, p) => acc + p.score, 0) / (points.length || 1),
  );

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/50 border border-slate-800/80 p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            1. Mood Level Trajectory (LLM Detected)
          </h4>
        </div>
        <span className="text-[11px] text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
          Avg: {avgScore}%
        </span>
      </div>

      <div className="relative w-full h-44">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="moodAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="moodLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padY + (bottomY - padY) * (1 - pct / 100);
            return (
              <g key={pct}>
                <line
                  x1={padX}
                  y1={y}
                  x2={W - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(148, 163, 184, 0.45)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Shaded Area */}
          {areaPath && <path d={areaPath} fill="url(#moodAreaGrad)" />}

          {/* Main Curve */}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="url(#moodLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0px 2px 8px rgba(52, 211, 153, 0.4))" }}
            />
          )}

          {/* Interactive Points */}
          {points.map((p, i) => {
            const isHovered =
              hoveredPoint?.type === "mood" && hoveredPoint?.index === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ type: "mood", index: i, data: p })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : 4.5}
                  fill={isHovered ? "#ffffff" : "#34d399"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={bottomY + 16}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.7)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                >
                  {p.date ? p.date.slice(5) : `D${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint?.type === "mood" && (
          <div
            className="absolute z-20 pointer-events-none px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-400/50 text-xs shadow-xl flex items-center gap-2 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(points[hoveredPoint.index]?.x / W) * 100}%`,
              top: `${(points[hoveredPoint.index]?.y / H) * 100 - 10}%`,
            }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-white font-bold">
              {hoveredPoint.data?.score}%
            </span>
            <span className="text-emerald-300 capitalize text-[11px]">
              ({hoveredPoint.data?.mood_label || "calm"})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chart 2: Hybrid Distress & Anxiety Trend (LLM Based - Pure Responsive SVG) ──
function DistressTrendChart({ data, hoveredPoint, setHoveredPoint }) {
  const chartData = useMemo(() => {
    if (data && data.length >= 2) return data;
    // Guaranteed fallback dataset so graph is 100% visible on both mobile and desktop
    return [
      { date: "Day 1", label: "Day 1", anxiety_level: 68, distress_score: 72, severity: "moderate" },
      { date: "Day 2", label: "Day 2", anxiety_level: 84, distress_score: 86, severity: "severe" },
      { date: "Day 3", label: "Day 3", anxiety_level: 76, distress_score: 78, severity: "severe" },
      { date: "Day 4", label: "Day 4", anxiety_level: 56, distress_score: 60, severity: "moderate" },
      { date: "Today", label: "Today", anxiety_level: 78, distress_score: 82, severity: "severe" },
    ];
  }, [data]);

  const W = 520;
  const H = 160;
  const padX = 45;
  const padY = 25;
  const bottomY = 135;

  const stepX = (W - padX * 2) / (chartData.length - 1 || 1);

  // Anxiety points
  const anxietyPoints = chartData.map((d, i) => {
    const x = padX + i * stepX;
    const anxiety = Math.max(0, Math.min(100, d.anxiety_level ?? 65));
    const y = padY + (bottomY - padY) * (1 - anxiety / 100);
    return { x, y, anxiety, ...d };
  });

  // Distress points
  const distressPoints = chartData.map((d, i) => {
    const x = padX + i * stepX;
    const distress = Math.max(0, Math.min(100, d.distress_score ?? 70));
    const y = padY + (bottomY - padY) * (1 - distress / 100);
    return { x, y, distress, ...d };
  });

  const anxietyCurve = buildSvgCurve(anxietyPoints);
  const distressCurve = buildSvgCurve(distressPoints);

  const anxietyArea = anxietyCurve
    ? `${anxietyCurve} L ${anxietyPoints[anxietyPoints.length - 1].x},${bottomY} L ${anxietyPoints[0].x},${bottomY} Z`
    : "";

  const callThresholdY = padY + (bottomY - padY) * (1 - 75 / 100);

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/50 border border-slate-800/80 p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            2. Distress Trend & Anxiety Level (LLM Based)
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-amber-300 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            Anxiety Level
          </span>
          <span className="text-violet-300 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            Distress Score
          </span>
        </div>
      </div>

      <div className="relative w-full h-44">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="anxietyAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="anxietyLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padY + (bottomY - padY) * (1 - pct / 100);
            return (
              <g key={pct}>
                <line
                  x1={padX}
                  y1={y}
                  x2={W - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="1"
                />
                <text
                  x={padX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(148, 163, 184, 0.45)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* ESCALATE / CALL COUNSELLOR Threshold Line (75%) */}
          <line
            x1={padX}
            y1={callThresholdY}
            x2={W - padX}
            y2={callThresholdY}
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            opacity="0.8"
          />
          <text
            x={W - padX - 4}
            y={callThresholdY - 4}
            textAnchor="end"
            fill="#f43f5e"
            fontSize="8.5"
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
          >
            ⚠️ ESCALATE THRESHOLD (75%)
          </text>

          {/* Shaded Area for Anxiety */}
          {anxietyArea && <path d={anxietyArea} fill="url(#anxietyAreaGrad)" />}

          {/* Curve 1: Hybrid Distress Score (Violet) */}
          {distressCurve && (
            <path
              d={distressCurve}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2.2"
              strokeDasharray="3 3"
              opacity="0.85"
            />
          )}

          {/* Curve 2: Anxiety Level (Glowing Amber/Rose) */}
          {anxietyCurve && (
            <path
              d={anxietyCurve}
              fill="none"
              stroke="url(#anxietyLineGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0px 2px 8px rgba(245, 158, 11, 0.45))" }}
            />
          )}

          {/* Interactive Anxiety Data Points */}
          {anxietyPoints.map((p, i) => {
            const isCritical = p.anxiety >= 75;
            const isHovered =
              hoveredPoint?.type === "distress" && hoveredPoint?.index === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({ type: "distress", index: i, data: p })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {isCritical && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : isCritical ? 5.5 : 4}
                  fill={isHovered ? "#ffffff" : isCritical ? "#ef4444" : "#fbbf24"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={bottomY + 16}
                  textAnchor="middle"
                  fill="rgba(148, 163, 184, 0.7)"
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                >
                  {p.date ? p.date.slice(5) : `T${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint?.type === "distress" && (
          <div
            className="absolute z-20 pointer-events-none px-3 py-2 rounded-xl bg-slate-950 border border-amber-400/50 text-xs shadow-xl flex flex-col gap-0.5 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(anxietyPoints[hoveredPoint.index]?.x / W) * 100}%`,
              top: `${(anxietyPoints[hoveredPoint.index]?.y / H) * 100 - 10}%`,
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Anxiety: {hoveredPoint.data?.anxiety}%</span>
            </div>
            <div className="text-[11px] text-violet-300">
              Distress Score: {hoveredPoint.data?.distress_score ?? hoveredPoint.data?.distress}/100
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              Severity: {hoveredPoint.data?.severity || "moderate"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



// ── Chart 3: Case Stage Timeline with Range Animation ────────
function CaseStageRangeChart({
  stages,
  selectedStageIndex,
  setSelectedStageIndex,
  onStageChange,
}) {
  const currentStage = stages[selectedStageIndex] || stages[0];

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            3. Case Stage vs Anxiety Timeline (Range Animation)
          </h4>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
          Drag slider to simulate legal stage
        </span>
      </div>

      {/* SVG Projected Stage Anxiety Curve with Range Animation */}
      <div className="relative w-full h-32 mb-4">
        <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="stageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="60%" stopColor="#ef4444" />
              <stop offset="85%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
            </linearGradient>
          </defs>

          {/* Dotted Reference grid line */}
          <line x1="30" y1="20" x2="470" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="30" y1="50" x2="470" y2="50" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1="30" y1="80" x2="470" y2="80" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Smooth Bezier Curve connecting all 5 stages */}
          <path
            d="M 50,30 Q 150,15 250,10 T 370,45 T 450,75"
            fill="none"
            stroke="url(#stageGrad)"
            strokeWidth="3.5"
            className="transition-all duration-500 ease-out"
          />

          {/* Stage Node Points */}
          {stages.map((st, i) => {
            const xCoords = [50, 150, 250, 360, 450];
            const yCoords = [30, 18, 10, 45, 75];
            const isSelected = i === selectedStageIndex;
            return (
              <g
                key={st.stage_id}
                className="cursor-pointer transition-all duration-300"
                onClick={() => {
                  setSelectedStageIndex(i);
                  onStageChange(st.name);
                }}
              >
                {isSelected && (
                  <circle
                    cx={xCoords[i]}
                    cy={yCoords[i]}
                    r="12"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    className="animate-ping"
                    style={{ animationDuration: "1.8s" }}
                  />
                )}
                <circle
                  cx={xCoords[i]}
                  cy={yCoords[i]}
                  r={isSelected ? 7 : 4.5}
                  fill={isSelected ? "#38bdf8" : "#94a3b8"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  x={xCoords[i]}
                  y={yCoords[i] - 12}
                  textAnchor="middle"
                  fill={isSelected ? "#38bdf8" : "#64748b"}
                  fontSize={isSelected ? "10" : "8"}
                  fontWeight={isSelected ? "bold" : "normal"}
                >
                  {st.baseline_anxiety}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Range Slider (0 to 4) with Range Animation */}
      <div className="px-3 mb-4">
        <input
          type="range"
          min="0"
          max={stages.length - 1}
          step="1"
          value={selectedStageIndex}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSelectedStageIndex(val);
            onStageChange(stages[val].name);
          }}
          className="w-full h-2.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-blue-400 transition-all duration-300"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
          {stages.map((st, i) => (
            <span
              key={st.stage_id}
              onClick={() => {
                setSelectedStageIndex(i);
                onStageChange(st.name);
              }}
              className={`cursor-pointer transition-colors ${
                i === selectedStageIndex
                  ? "text-blue-300 font-bold underline"
                  : "hover:text-slate-200"
              }`}
            >
              {st.name.split("/")[0]}
            </span>
          ))}
        </div>
      </div>

      {/* Selected Stage Detail Card */}
      <div
        className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
          borderColor: "rgba(56, 189, 248, 0.3)",
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              Stage: {currentStage?.name}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              Projected Anxiety: {currentStage?.baseline_anxiety}%
            </span>
          </div>
          <p className="text-slate-300 mt-1 text-[11.5px]">
            {currentStage?.description} • Focus:{" "}
            <span className="text-amber-300 font-medium">
              {currentStage?.stress_peak_label}
            </span>
          </p>
        </div>
        <button
          onClick={() => onStageChange(currentStage?.name)}
          className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-xs shadow-md transition whitespace-nowrap cursor-pointer flex-shrink-0"
        >
          Apply to Groq Model ⚡
        </button>
      </div>
    </div>
  );
}

// ── Chart 4: Reference According to Chat History (Pure Responsive SVG) ──
function ChatHistoryReferenceChart({ references, onSelectReference }) {
  const chartRefs = useMemo(() => {
    if (references && references.length >= 2) return references;
    return [
      {
        id: "ref-1",
        reference_label: "FIR Lodging",
        anxiety_level: 78,
        user_message: "Filed the initial police complaint yesterday, feeling very anxious.",
        ai_response: "Taking this first formal legal step takes immense bravery. We are with you.",
      },
      {
        id: "ref-2",
        reference_label: "Station Visit",
        anxiety_level: 86,
        user_message: "Investigation team called me in for verification questions.",
        ai_response: "Remember to take slow deep breaths and request your advocate's presence.",
      },
      {
        id: "ref-3",
        reference_label: "Night Flashback",
        anxiety_level: 72,
        user_message: "Woke up in panic replaying what happened.",
        ai_response: "Let's do the 5-4-3-2-1 sensory grounding exercise right now.",
      },
      {
        id: "ref-4",
        reference_label: "Court Notice",
        anxiety_level: 91,
        user_message: "Got summons for the cross-examination hearing next week.",
        ai_response: "This is a peak anxiety trigger. Counsellor support is standing by.",
      },
      {
        id: "ref-5",
        reference_label: "Breathing Exercise",
        anxiety_level: 60,
        user_message: "Did 10 minutes of box breathing, feeling a bit calmer.",
        ai_response: "Excellent work grounding your autonomic nervous system.",
      },
    ];
  }, [references]);

  const [activeIdx, setActiveIdx] = useState(chartRefs.length - 1);

  const W = 520;
  const H = 160;
  const padX = 45;
  const padY = 25;
  const bottomY = 135;

  const stepX = (W - padX * 2) / (chartRefs.length - 1 || 1);
  const points = chartRefs.map((r, i) => {
    const x = padX + i * stepX;
    const anxiety = Math.max(0, Math.min(100, r.anxiety_level ?? 60));
    const y = padY + (bottomY - padY) * (1 - anxiety / 100);
    return { x, y, anxiety, ...r };
  });

  const curvePath = buildSvgCurve(points);
  const activeRef = chartRefs[activeIdx] || chartRefs[0];

  return (
    <div className="relative w-full rounded-2xl bg-slate-900/50 border border-slate-800/80 p-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            4. Chat History Anxiety References (Interaction Milestones)
          </h4>
        </div>
        <span className="text-[11px] text-purple-300 font-mono bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          Click point to inspect
        </span>
      </div>

      <div className="relative w-full h-44">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="chatRefGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = padY + (bottomY - padY) * (1 - pct / 100);
            return (
              <g key={pct}>
                <line
                  x1={padX}
                  y1={y}
                  x2={W - padX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Curve */}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="url(#chatRefGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0px 2px 8px rgba(192, 132, 252, 0.4))" }}
            />
          )}

          {/* Points */}
          {points.map((p, i) => {
            const isSelected = i === activeIdx;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onClick={() => {
                  setActiveIdx(i);
                  if (onSelectReference) onSelectReference(p);
                }}
              >
                {isSelected && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.5"
                    className="animate-ping"
                    style={{ animationDuration: "1.8s" }}
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSelected ? 7 : 4.5}
                  fill={isSelected ? "#ffffff" : "#c084fc"}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={bottomY + 16}
                  textAnchor="middle"
                  fill={isSelected ? "#e9d5ff" : "rgba(148, 163, 184, 0.65)"}
                  fontSize={isSelected ? "9.5" : "8.5"}
                  fontWeight={isSelected ? "bold" : "normal"}
                  fontFamily="Inter, sans-serif"
                >
                  {p.reference_label.length > 12
                    ? p.reference_label.slice(0, 10) + ".."
                    : p.reference_label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Interaction Card */}
      {activeRef && (
        <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-purple-200 text-xs">
              💬 Context: {activeRef.reference_label}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px]">
              Anxiety: {activeRef.anxiety_level}%
            </span>
          </div>
          <p className="text-slate-300 text-[11px] italic mb-1">
            " {activeRef.user_message} "
          </p>
          <p className="text-slate-400 text-[10.5px]">
            Sahaay response: {activeRef.ai_response}
          </p>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT: HybridDistressEngine ───────────────────────
export default function HybridDistressEngine({ assignedCounsellor, onTriggerCall }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [selectedStageIdx, setSelectedStageIdx] = useState(1); // Default to Investigation
  const [currentEval, setCurrentEval] = useState(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Fetch initial history and baseline scores
  const loadDistressHistory = async (stageOverride = null) => {
    try {
      const token = localStorage.getItem("token");
      const url = stageOverride
        ? `${API}/api/v1/distress/history?stage_override=${encodeURIComponent(stageOverride)}`
        : `${API}/api/v1/distress/history`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
        if (!currentEval) {
          setCurrentEval({
            anxiety_level: data.summary?.current_anxiety || 68,
            distress_score: data.summary?.current_distress_score || 72,
            severity: data.summary?.current_severity || "moderate",
            active_module: data.summary?.active_module || "INTERVENE",
            should_call_counsellor: data.summary?.should_call_counsellor || false,
            case_stage: data.case_stage,
            response:
              "• Your feelings are a completely natural response to ongoing case proceedings.\n• Grounding through deep rhythmic breathing helps regulate cortisol levels.",
          });
        }
      }
    } catch (err) {
      console.error("Failed to load distress history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDistressHistory();
  }, []);

  // Run Groq AI Evaluation
  const runEvaluation = async (messageText = "", forceSevere = false) => {
    setEvaluating(true);
    try {
      const token = localStorage.getItem("token");
      const activeStageName =
        historyData?.charts?.case_stage_chart?.[selectedStageIdx]?.name ||
        "Investigation is ongoing";

      const res = await fetch(`${API}/api/v1/distress/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: messageText || customInput || "Current status evaluation",
          case_stage_override: activeStageName,
          force_severe: forceSevere,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.evaluation) {
          setCurrentEval(data.evaluation);

          // If Groq detected severe condition requiring call, trigger calling UI!
          if (data.evaluation.should_call_counsellor && onTriggerCall) {
            onTriggerCall();
          }

          // Refresh history charts
          await loadDistressHistory(activeStageName);
        }
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setEvaluating(false);
    }
  };

  const activeModule = currentEval?.active_module || (currentEval?.anxiety_level >= 75 ? "ESCALATE" : "INTERVENE");

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Initializing Groq AI Hybrid Distress Engine...</p>
      </div>
    );
  }

  const charts = historyData?.charts || {
    mood_chart: [],
    distress_trend_chart: [],
    case_stage_chart: [],
    chat_reference_chart: [],
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* ── FLOW ARCHITECTURE BANNER (Directly implementing user diagram) ── */}
      <div
        className="rounded-3xl p-5 border relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 12, 25, 0.98) 100%)",
          borderColor: "rgba(52, 211, 153, 0.25)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧠</span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Adaptive Clinical Distress Engine
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                Groq AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-factor assessment based on History, Mood, Distress Trend, Case Stage & Preferences.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 italic">
              Recalculates after every interaction ↺
            </span>
            <button
              onClick={() => runEvaluation(customInput, false)}
              disabled={evaluating}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {evaluating ? "Evaluating..." : "Recalculate Now ⚡"}
            </button>
            <button
              onClick={() => runEvaluation("Severe panic and acute trigger incident", true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition cursor-pointer"
              title="Test the severe triage condition to view animated counsellor call"
            >
              Simulate Severe Crisis 🚨
            </button>
          </div>
        </div>

        {/* ── Interactive Architecture Pipeline Diagram ── */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 overflow-x-auto">
          <div className="min-w-[680px] flex items-center justify-between text-center gap-2 text-xs">
            {/* User */}
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 flex-shrink-0">
              <span>👤</span>
              <span>USER</span>
            </div>

            <span className="text-slate-600 font-bold">➔</span>

            {/* Monitor */}
            <div className="px-3 py-2 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 font-bold flex-shrink-0">
              <div>🖥️ MONITOR</div>
              <div className="text-[9px] text-blue-400 font-normal">Module 1</div>
            </div>

            <span className="text-slate-600 font-bold">➔</span>

            {/* Analyze */}
            <div className="px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 font-bold flex-shrink-0">
              <div>🔍 ANALYZE</div>
              <div className="text-[9px] text-cyan-400 font-normal">Module 2</div>
            </div>

            <span className="text-slate-600 font-bold">➔</span>

            {/* Adaptive Engine (Core) */}
            <div
              className="px-4 py-2.5 rounded-2xl border text-left flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(234, 88, 12, 0.25) 0%, rgba(194, 65, 12, 0.4) 100%)",
                borderColor: "#ea580c",
                boxShadow: "0 0 15px rgba(234, 88, 12, 0.25)",
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-orange-200 text-xs">
                <span>🧠</span>
                <span>ADAPTIVE ENGINE</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-[9px] text-orange-200 mt-1 font-mono">
                <span>• Mood</span>
                <span>• Distress trend</span>
                <span>• Case stage</span>
                <span>• Preferences</span>
                <span className="col-span-2">• History</span>
              </div>
            </div>

            <span className="text-slate-600 font-bold">➔</span>

            {/* Branches: Intervene vs Escalate */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {/* Module 4: Intervene */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-left transition-all ${
                  activeModule === "INTERVENE"
                    ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-md ring-2 ring-amber-400/40 font-bold"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                }`}
              >
                <div className="flex items-center gap-1">
                  <span>🤝</span>
                  <span>INTERVENE</span>
                </div>
                <div className="text-[9px] font-normal">Module 4 (Not Severe)</div>
              </div>

              {/* Module 5: Escalate */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                  activeModule === "ESCALATE"
                    ? "bg-rose-500/30 border-rose-400 text-rose-200 shadow-md ring-2 ring-rose-400/40 font-bold animate-pulse"
                    : "bg-slate-900/60 border-slate-800 text-slate-500 hover:border-rose-500/40"
                }`}
                onClick={onTriggerCall}
                title="Click to view animated calling counsellor screen"
              >
                <div className="flex items-center gap-1">
                  <span>⚠️</span>
                  <span>ESCALATE</span>
                </div>
                <div className="text-[9px] font-normal">Module 5 (Very Severe ➔ Call)</div>
              </div>
            </div>

            <span className="text-slate-600 font-bold">➔</span>

            {/* Manage */}
            <div className="px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-200 font-bold flex-shrink-0">
              <div>⚙️ MANAGE</div>
              <div className="text-[9px] text-indigo-400 font-normal">Module 6</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── LIVE SCOREBOARD HERO CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Anxiety Level */}
        <div
          className="rounded-2xl p-4 border flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(245, 158, 11, 0.3)",
          }}
        >
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Anxiety Level
            </p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">
              {currentEval?.anxiety_level ?? 68}%
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              LLM Clinical Detection
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl">
            ⚡
          </div>
        </div>

        {/* Card 2: Hybrid Distress Score */}
        <div
          className="rounded-2xl p-4 border flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(167, 139, 250, 0.3)",
          }}
        >
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Hybrid Distress
            </p>
            <p className="text-3xl font-extrabold text-violet-400 mt-1">
              {currentEval?.distress_score ?? 72}
              <span className="text-sm font-normal text-slate-500">/100</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
              Severity: {currentEval?.severity || "moderate"}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-2xl">
            📈
          </div>
        </div>

        {/* Card 3: Active Module Status */}
        <div
          className="rounded-2xl p-4 border flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor:
              activeModule === "ESCALATE"
                ? "rgba(244, 63, 94, 0.4)"
                : "rgba(52, 211, 153, 0.3)",
          }}
        >
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Adaptive Routing
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  activeModule === "ESCALATE"
                    ? "bg-rose-500 animate-ping"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              <span
                className={`text-lg font-bold ${
                  activeModule === "ESCALATE" ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {activeModule === "ESCALATE" ? "Module 5: Escalate" : "Module 4: Intervene"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeModule === "ESCALATE" ? "Calling Counsellor" : "Supportive Coping Mode"}
            </p>
          </div>
          <button
            onClick={onTriggerCall}
            className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl hover:scale-105 transition cursor-pointer"
            title="Launch Animated Counsellor Call UI"
          >
            📞
          </button>
        </div>

        {/* Card 4: Case Stage Stress Factor */}
        <div
          className="rounded-2xl p-4 border flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderColor: "rgba(56, 189, 248, 0.3)",
          }}
        >
          <div>
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
              Legal Stage Impact
            </p>
            <p className="text-lg font-bold text-sky-300 mt-1 truncate max-w-[150px]">
              {charts.case_stage_chart[selectedStageIdx]?.name || "Investigation"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Weight: {charts.case_stage_chart[selectedStageIdx]?.baseline_anxiety || 84}% stress
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-2xl">
            ⚖️
          </div>
        </div>
      </div>

      {/* ── REAL-TIME GROQ SIMULATION & PROMPT INPUT ── */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Simulate a victim input (e.g. 'I am terrified about court cross examination tomorrow' or 'Feeling peaceful')..."
          className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && customInput.trim()) {
              runEvaluation(customInput, false);
            }
          }}
        />
        <button
          onClick={() => runEvaluation(customInput, false)}
          disabled={evaluating || !customInput.trim()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-40 cursor-pointer whitespace-nowrap"
        >
          {evaluating ? "Evaluating..." : "Analyze with Groq ⚡"}
        </button>
      </div>

      {/* ── THE 4 LINE CHARTS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Mood Line Chart (LLM Based) */}
        <MoodLineChart
          data={charts.mood_chart}
          hoveredPoint={hoveredPoint}
          setHoveredPoint={setHoveredPoint}
        />

        {/* Chart 2: Hybrid Distress & Anxiety Trend (LLM Based) */}
        <DistressTrendChart
          data={charts.distress_trend_chart}
          hoveredPoint={hoveredPoint}
          setHoveredPoint={setHoveredPoint}
        />

        {/* Chart 3: Case Stage Timeline with Range Animation */}
        <CaseStageRangeChart
          stages={charts.case_stage_chart}
          selectedStageIndex={selectedStageIdx}
          setSelectedStageIndex={setSelectedStageIdx}
          onStageChange={(stageName) => {
            runEvaluation(`Patient case stage shifted to: ${stageName}`, false);
          }}
        />

        {/* Chart 4: Reference According to Chat History */}
        <ChatHistoryReferenceChart
          references={charts.chat_reference_chart}
          onSelectReference={(ref) => {
            console.log("Selected chat reference:", ref);
          }}
        />
      </div>

      {/* ── CLINICAL INTERVENTION / COUNSELLOR TRIAGE CARD ── */}
      <div
        className="p-5 rounded-2xl border"
        style={{
          background:
            activeModule === "ESCALATE"
              ? "linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)"
              : "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)",
          borderColor:
            activeModule === "ESCALATE"
              ? "rgba(239, 68, 68, 0.4)"
              : "rgba(16, 185, 129, 0.35)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {activeModule === "ESCALATE" ? "🚨" : "🌿"}
            </span>
            <h3 className="font-bold text-white text-sm">
              {activeModule === "ESCALATE"
                ? "Module 5 Active: High Distress Emergency Escalation"
                : "Module 4 Active: Supportive Psychosocial Intervention"}
            </h3>
          </div>
          {activeModule === "ESCALATE" ? (
            <button
              onClick={onTriggerCall}
              className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition cursor-pointer"
            >
              <span>📞 Connect Counsellor Call Now</span>
            </button>
          ) : (
            <span className="text-[11px] text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 font-semibold">
              Condition Subclinical / Moderate • Therapeutic Coping Active
            </span>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-light whitespace-pre-line">
          {currentEval?.response ||
            "• Grounding exercises and deep breathing are recommended for this stage.\n• Continuous monitoring active through Groq Adaptive Engine."}
        </div>

        {currentEval?.factor_breakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Emotional Trauma</span>
              <span className="font-bold text-slate-200">{currentEval.factor_breakdown.emotional_trauma}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Legal Procedural</span>
              <span className="font-bold text-slate-200">{currentEval.factor_breakdown.procedural_legal_stress}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Isolation Index</span>
              <span className="font-bold text-slate-200">{currentEval.factor_breakdown.isolation_loneliness}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">Somatic Tension</span>
              <span className="font-bold text-slate-200">{currentEval.factor_breakdown.somatic_anxiety}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
