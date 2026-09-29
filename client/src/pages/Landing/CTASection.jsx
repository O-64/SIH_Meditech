const CTASection = ({ onNavigate }) => (
  <section
    className="max-w-3xl mx-auto px-8 pb-32 text-center"
    style={{ position: "relative", zIndex: 10 }}
  >
    <div
      style={{
        background: "rgba(15,23,42,0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "1.5rem",
        padding: "4rem 2rem",
      }}
    >
      <p className="text-5xl mb-6">🌙</p>
      <h2 className="text-4xl font-bold font-serif text-white mb-4">
        You deserve someone in your corner
      </h2>
      <p className="text-slate-400 mb-8 leading-relaxed max-w-lg mx-auto">
        Start each day with a companion that remembers, checks in, and actually
        cares about how you're doing.
      </p>
      <button
        onClick={() => onNavigate("signup")}
        className="Sahaay-btn Sahaay-btn-amber Sahaay-btn-xl"
      >
        <span>Begin for free →</span>
      </button>
    </div>
  </section>
);

export default CTASection;
