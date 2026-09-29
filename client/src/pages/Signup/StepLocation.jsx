const StepLocation = ({ form, error, loading, onChange, onSubmit, onBack }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="text-center mb-5">
      <p className="text-4xl mb-3">📍</p>
      <h2 className="text-lg font-bold text-white">Your Location</h2>
      <p className="text-slate-400 text-sm mt-1" style={{ fontWeight: 300 }}>
        So I can suggest nearby places when you need a break.
      </p>
    </div>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        City
      </label>
      <input
        type="text"
        name="city"
        value={form.city}
        onChange={onChange}
        placeholder="e.g. Mumbai"
        required
        className="glass-input"
      />
    </div>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        Area / Neighbourhood{" "}
        <span className="text-slate-600 normal-case font-normal">
          (optional)
        </span>
      </label>
      <input
        type="text"
        name="area"
        value={form.area}
        onChange={onChange}
        placeholder="e.g. Andheri West"
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
        disabled={loading}
        className="Sahaay-btn Sahaay-btn-amber"
        style={{
          flex: 1,
          justifyContent: "center",
          opacity: loading ? 0.5 : 1,
        }}
      >
        <span>{loading ? "Creating..." : "Start my journey 🌙"}</span>
      </button>
    </div>
  </form>
);

export default StepLocation;
