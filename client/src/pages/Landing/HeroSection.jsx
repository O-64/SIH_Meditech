const HeroSection = ({ onNavigate }) => (
  <section className="max-w-6xl mx-auto px-8 pt-20 pb-32 text-center">
    <h1 className="text-6xl md:text-8xl font-bold font-serif leading-tight mb-6">
      <span className="text-white">Someone who</span>
      <br />
      <span
        className="text-transparent bg-clip-text"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fcd34d, #fca5a5, #fcd34d)",
        }}
      >
        actually listens
      </span>
    </h1>

    <p
      className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed mb-12"
      style={{ fontWeight: 300 }}
    >
      Sahaay checks in with you in the morning, remembers your day, follows up
      on your meetings, and shows up again at night — like a friend who never
      forgets.
    </p>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
      <button
        onClick={() => onNavigate("signup")}
        className="Sahaay-btn Sahaay-btn-amber Sahaay-btn-xl"
      >
        <span>Start your journey →</span>
      </button>
      <button
        onClick={() => onNavigate("login")}
        className="Sahaay-btn Sahaay-btn-slate Sahaay-btn-xl"
      >
        <span>Already have an account</span>
      </button>
    </div>
  </section>
);

export default HeroSection;
