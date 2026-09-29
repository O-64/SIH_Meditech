import { useState, useEffect } from "react";

// ── CBT Exercise Modal ────────────────────────────────────────
// Three exercises: breathing, thought record, 5-4-3-2-1 grounding
// Shown as a chat button → opens fullscreen modal

const exercises = [
  {
    id: "breathing",
    title: "Box Breathing",
    emoji: "🌬️",
    tagline: "Calm your nervous system in 2 minutes",
    color: {
      from: "#6366f1",
      to: "#8b5cf6",
      text: "#a78bfa",
      bg: "rgba(99,102,241,0.08)",
      border: "rgba(99,102,241,0.2)",
    },
    steps: [
      {
        label: "Breathe in",
        duration: 4,
        instruction: "Slowly breathe in through your nose",
        phase: "in",
      },
      {
        label: "Hold",
        duration: 4,
        instruction: "Hold your breath gently",
        phase: "hold",
      },
      {
        label: "Breathe out",
        duration: 4,
        instruction: "Slowly exhale through your mouth",
        phase: "out",
      },
      {
        label: "Hold",
        duration: 4,
        instruction: "Hold before the next breath",
        phase: "hold",
      },
    ],
    rounds: 4,
  },
  {
    id: "thought",
    title: "Thought Check",
    emoji: "🧠",
    tagline: "Gently challenge a difficult thought",
    color: {
      from: "#3b82f6",
      to: "#6366f1",
      text: "#93c5fd",
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.2)",
    },
    questions: [
      {
        q: "What's the thought that's been bothering you?",
        placeholder: "Write it out exactly as it sounds in your head...",
      },
      {
        q: "What's the evidence FOR this thought being true?",
        placeholder: "Be honest but specific — not just feelings...",
      },
      {
        q: "What's the evidence AGAINST it?",
        placeholder: "Even small things count...",
      },
      {
        q: "If a close friend had this thought, what would you tell them?",
        placeholder: "Talk to yourself the way you'd talk to them...",
      },
      {
        q: "What's a more balanced way to see this situation?",
        placeholder: "Not forced positivity — just more complete...",
      },
    ],
  },
  {
    id: "grounding",
    title: "5-4-3-2-1 Grounding",
    emoji: "🌿",
    tagline: "Bring yourself back to the present moment",
    color: {
      from: "#059669",
      to: "#0d9488",
      text: "#6ee7b7",
      bg: "rgba(5,150,105,0.08)",
      border: "rgba(5,150,105,0.2)",
    },
    senses: [
      {
        count: 5,
        sense: "see",
        icon: "👁️",
        prompt: "Look around. Name 5 things you can see right now.",
      },
      {
        count: 4,
        sense: "touch",
        icon: "✋",
        prompt:
          "Name 4 things you can physically feel — your clothes, the surface you're sitting on...",
      },
      {
        count: 3,
        sense: "hear",
        icon: "👂",
        prompt: "Close your eyes. Name 3 sounds you can hear.",
      },
      {
        count: 2,
        sense: "smell",
        icon: "👃",
        prompt: "Name 2 things you can smell, or 2 smells you like.",
      },
      {
        count: 1,
        sense: "taste",
        icon: "👅",
        prompt: "Name 1 thing you can taste right now.",
      },
    ],
  },
];

// ── Breathing Exercise ────────────────────────────────────────
const BreathingExercise = ({ exercise, onComplete }) => {
  const [round, setRound] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(exercise.steps[0].duration);
  const [done, setDone] = useState(false);

  const currentStep = exercise.steps[stepIndex];
  const progress = 1 - timeLeft / currentStep.duration;

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // advance
          const nextStep = (stepIndex + 1) % exercise.steps.length;
          if (nextStep === 0) {
            if (round >= exercise.rounds) {
              setDone(true);
              return 0;
            }
            setRound((r) => r + 1);
          }
          setStepIndex(nextStep);
          setTimeLeft(exercise.steps[nextStep].duration);
          return exercise.steps[nextStep].duration;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [stepIndex, round, done]);

  const circumference = 2 * Math.PI * 54;
  const phaseColors = { in: "#6366f1", hold: "#8b5cf6", out: "#3b82f6" };
  const circleColor = phaseColors[currentStep.phase] || "#6366f1";

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <p className="text-5xl mb-6">✨</p>
        <p className="text-white text-xl font-bold mb-3">
          That's it — well done
        </p>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Your nervous system just got a reset. Even 2 minutes of this makes a
          real difference.
        </p>
        <button
          onClick={onComplete}
          className="px-6 py-3 rounded-2xl text-sm font-semibold"
          style={{
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "#fff",
          }}
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-8">
        Round {round} of {exercise.rounds}
      </p>
      <div className="relative mb-8">
        <svg width="140" height="140">
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="6"
          />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke={circleColor}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{
              transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-white text-3xl font-bold">{timeLeft}</p>
        </div>
      </div>
      <p className="text-white text-xl font-semibold mb-2">
        {currentStep.label}
      </p>
      <p className="text-slate-400 text-sm text-center">
        {currentStep.instruction}
      </p>
    </div>
  );
};

// ── Thought Record Exercise ───────────────────────────────────
const ThoughtExercise = ({ exercise, onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(
    Array(exercise.questions.length).fill(""),
  );

  const current = exercise.questions[step];
  const isLast = step === exercise.questions.length - 1;

  return (
    <div className="flex flex-col h-full px-6 py-4">
      <div className="flex gap-1 mb-6">
        {exercise.questions.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{
              background: i <= step ? "#3b82f6" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
        Question {step + 1} of {exercise.questions.length}
      </p>
      <p className="text-white text-base font-semibold leading-relaxed mb-4">
        {current.q}
      </p>
      <textarea
        value={answers[step]}
        onChange={(e) => {
          const next = [...answers];
          next[step] = e.target.value;
          setAnswers(next);
        }}
        placeholder={current.placeholder}
        rows={5}
        className="flex-1 w-full rounded-2xl p-4 text-sm text-slate-300 placeholder-slate-600 resize-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          outline: "none",
        }}
      />
      <div className="flex gap-3 mt-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete() : setStep(step + 1))}
          disabled={!answers[step].trim()}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold"
          style={{
            background: answers[step].trim()
              ? "linear-gradient(135deg,#3b82f6,#6366f1)"
              : "rgba(255,255,255,0.05)",
            color: answers[step].trim() ? "#fff" : "#475569",
          }}
        >
          {isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
};

// ── Grounding Exercise ────────────────────────────────────────
const GroundingExercise = ({ exercise, onComplete }) => {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState(
    exercise.senses.map((s) => Array(s.count).fill("")),
  );

  const current = exercise.senses[step];
  const currentInputs = inputs[step];
  const allFilled = currentInputs.every((v) => v.trim());
  const isLast = step === exercise.senses.length - 1;

  return (
    <div className="flex flex-col h-full px-6 py-4">
      <div className="flex gap-1 mb-6">
        {exercise.senses.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{
              background: i <= step ? "#059669" : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{current.icon}</span>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">
          {current.count} things you can {current.sense}
        </p>
      </div>
      <p className="text-slate-400 text-sm leading-relaxed mb-5">
        {current.prompt}
      </p>
      <div className="flex flex-col gap-2 flex-1">
        {currentInputs.map((val, i) => (
          <input
            key={i}
            value={val}
            onChange={(e) => {
              const next = inputs.map((arr, si) =>
                si === step
                  ? arr.map((v, vi) => (vi === i ? e.target.value : v))
                  : arr,
              );
              setInputs(next);
            }}
            placeholder={`${i + 1}.`}
            className="w-full rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              outline: "none",
            }}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold text-slate-400"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Back
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete() : setStep(step + 1))}
          disabled={!allFilled}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold"
          style={{
            background: allFilled
              ? "linear-gradient(135deg,#059669,#0d9488)"
              : "rgba(255,255,255,0.05)",
            color: allFilled ? "#fff" : "#475569",
          }}
        >
          {isLast ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
};

// ── CBT Modal ─────────────────────────────────────────────────
export default function CBTModal({ onClose }) {
  const [selected, setSelected] = useState(null);
  const [completed, setCompleted] = useState(false);

  const handleComplete = () => setCompleted(true);

  if (completed) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          background: "rgba(6,9,15,0.95)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="w-full max-w-sm text-center px-8">
          <p className="text-5xl mb-6">💛</p>
          <p className="text-white text-xl font-bold mb-3">
            Really proud of you for doing that
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            These little exercises add up. Keep going back to the chat whenever
            you need.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 rounded-2xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg,#fbbf24,#fb7185)",
              color: "#0f172a",
            }}
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }

  if (selected) {
    const ex = exercises.find((e) => e.id === selected);
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{
          background: "rgba(6,9,15,0.98)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <button
            onClick={() => setSelected(null)}
            className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
          >
            ← back
          </button>
          <div className="flex items-center gap-2">
            <span>{ex.emoji}</span>
            <span className="text-white text-sm font-semibold">{ex.title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Exercise content */}
        <div className="flex-1 overflow-hidden">
          {ex.id === "breathing" && (
            <BreathingExercise exercise={ex} onComplete={handleComplete} />
          )}
          {ex.id === "thought" && (
            <ThoughtExercise exercise={ex} onComplete={handleComplete} />
          )}
          {ex.id === "grounding" && (
            <GroundingExercise exercise={ex} onComplete={handleComplete} />
          )}
        </div>
      </div>
    );
  }

  // Exercise picker
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(6,9,15,0.98)", backdropFilter: "blur(20px)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <p className="text-white font-semibold text-sm">a little exercise</p>
          <p className="text-slate-600 text-xs">pick one that feels right</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-600 hover:text-slate-300 transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-4">
        <p className="text-slate-500 text-sm leading-relaxed">
          These are short, evidence-based exercises. You don't have to do all of
          them — just try one.
        </p>
        {exercises.map((ex) => (
          <button
            key={ex.id}
            onClick={() => setSelected(ex.id)}
            className="w-full text-left rounded-2xl p-5 transition-all duration-200"
            style={{
              background: ex.color.bg,
              border: `1px solid ${ex.color.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ex.emoji}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{ex.title}</p>
                  <p
                    style={{ color: ex.color.text }}
                    className="text-xs mt-0.5"
                  >
                    {ex.tagline}
                  </p>
                </div>
              </div>
              <span className="text-slate-600 text-lg mt-1">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
