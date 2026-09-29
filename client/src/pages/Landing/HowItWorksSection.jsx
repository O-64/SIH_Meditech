const steps = [
  {
    number: "01", side: "right", icon: "✍️",
    title: "Create your account",
    desc: "Sign up in under a minute. Tell Sahaay your name, timezone, and what you'd like support with.",
  },
  {
    number: "02", side: "left", icon: "🌅",
    title: "Get your morning check-in",
    desc: "Each morning, Sahaay reaches out first — asking how you're feeling and setting a positive intention for your day.",
  },
  {
    number: "03", side: "right", icon: "🔔",
    title: "Sahaay follows up on your life",
    desc: "Mention a stressful meeting? Sahaay remembers and checks back in so nothing you share ever falls through the cracks.",
  },
  {
    number: "04", side: "left", icon: "🌙",
    title: "Wind down every evening",
    desc: "At night Sahaay shows up with calm suggestions — a movie, playlist, or meal — tailored to how your day actually went.",
  },
  {
    number: "05", side: "right", icon: "📈",
    title: "Track your emotional growth",
    desc: "Over time, Sahaay builds a picture of your patterns, helping you understand yourself and grow with every conversation.",
  },
];

const HowItWorksSection = () => (
  <section className="relative z-10 pb-24" style={{ padding: "0 2rem 6rem" }}>
    <div className="text-center mb-12">
      <span style={{
        display: "inline-block", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "#fbbf24", background: "rgba(251,191,36,0.1)",
        border: "1px solid rgba(251,191,36,0.22)", borderRadius: "999px",
        padding: "0.25em 1em", marginBottom: "0.85rem",
      }}>
        How it works
      </span>
      <h2 className="text-3xl font-bold font-serif text-white mb-3">Your journey with Sahaay</h2>
      <p className="text-slate-400 text-sm max-w-md mx-auto" style={{ lineHeight: 1.65 }}>
        From your very first check-in to meaningful emotional growth — here's how Sahaay walks with you.
      </p>
    </div>

    <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{
        position: "absolute", left: "50%", top: 0, bottom: 0, width: "2px",
        transform: "translateX(-50%)",
        background: "linear-gradient(to bottom, rgba(251,191,36,0.7), rgba(251,113,133,0.5))",
        borderRadius: "999px",
      }} />

      {steps.map((step, i) => {
        const isRight = step.side === "right";
        return (
          <div key={step.number} style={{
            display: "flex", alignItems: "center",
            marginBottom: i < steps.length - 1 ? "1.5rem" : 0,
            position: "relative",
          }}>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", paddingRight: "1.5rem" }}>
              {!isRight && <Card step={step} align="right" />}
            </div>
            <div style={{
              flexShrink: 0, width: "2.2rem", height: "2.2rem", borderRadius: "50%",
              background: "linear-gradient(135deg, #fbbf24, #fb7185)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.65rem", fontWeight: 800, color: "#0f172a", zIndex: 2,
              boxShadow: "0 0 0 3px rgba(251,191,36,0.15), 0 0 12px rgba(251,191,36,0.28)",
              letterSpacing: "0.02em",
            }}>
              {step.number}
            </div>
            <div style={{ flex: 1, paddingLeft: "1.5rem" }}>
              {isRight && <Card step={step} align="left" />}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

const Card = ({ step, align }) => (
  <div style={{
    background: "rgba(10,15,35,0.48)", backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.9rem", padding: "0.9rem 1.1rem", width: "100%",
    boxShadow: "0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    position: "relative", overflow: "hidden",
  }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "1px",
      background: "linear-gradient(to right, #fbbf24, #fb7185)", opacity: 0.55,
    }} />
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.65rem",
      flexDirection: align === "right" ? "row-reverse" : "row",
    }}>
      <span style={{ fontSize: "1.2rem", flexShrink: 0, marginTop: "0.1rem" }}>{step.icon}</span>
      <div style={{ flex: 1 }}>
        <h3 className="font-serif" style={{
          fontSize: "0.92rem", fontWeight: 700, color: "#fff",
          marginBottom: "0.25rem", lineHeight: 1.3,
          textAlign: align === "right" ? "right" : "left",
        }}>
          {step.title}
        </h3>
        <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.82)", lineHeight: 1.6, textAlign: "justify" }}>
          {step.desc}
        </p>
      </div>
    </div>
  </div>
);

export default HowItWorksSection;