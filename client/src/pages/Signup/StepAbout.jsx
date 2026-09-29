const StepAbout = ({ form, error, onChange, onNext, onBack }) => (
  <form onSubmit={onNext} className="space-y-4">
    <div className="text-center mb-5">
      <p className="text-4xl mb-3">👋</p>
      <h2 className="text-lg font-bold text-white">About You</h2>
      <p className="text-slate-400 text-sm mt-1" style={{ fontWeight: 300 }}>
        Nice to meet you,{" "}
        <span className="text-amber-300 font-semibold">{form.name}</span>! Tell
        me a bit about yourself.
      </p>
    </div>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        How old are you?
      </label>
      <input
        type="number"
        name="age"
        value={form.age}
        onChange={onChange}
        placeholder="Your age"
        min="5"
        max="120"
        required
        className="glass-input"
      />
    </div>
    {error && (
      <div
        className="rounded-xl px-4 py-3 text-rose-300 text-sm"
        style={{
          background: "rgba(190,18,60,0.15)",
          border: "1px solid rgba(190,18,60,0.25)",
        }}
      >
        {error}
      </div>
    )}
    <div className="flex gap-3 pt-1">
      <button
        type="button"
        onClick={onBack}
        className="Sahaay-btn Sahaay-btn-slate"
        style={{ flex: 1, justifyContent: "center" }}
      >
        <span>← Back</span>
      </button>
      <button
        type="submit"
        className="Sahaay-btn Sahaay-btn-amber"
        style={{ flex: 1, justifyContent: "center" }}
      >
        <span>Continue →</span>
      </button>
    </div>
  </form>
);

export default StepAbout;
