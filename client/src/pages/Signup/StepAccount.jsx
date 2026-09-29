const StepAccount = ({ form, error, onChange, onNext, onNavigate }) => (
  <form onSubmit={onNext} className="space-y-4">
    <h2 className="text-lg font-bold text-white mb-4">Basic Credentials</h2>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        Full Name
      </label>
      <input
        type="text"
        name="name"
        value={form.name}
        onChange={onChange}
        placeholder="Enter your name"
        required
        className="glass-input"
      />
    </div>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        Email Address
      </label>
      <input
        type="email"
        name="email"
        value={form.email}
        onChange={onChange}
        placeholder="Enter your email"
        required
        className="glass-input"
      />
    </div>
    <div>
      <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">
        Password
      </label>
      <input
        type="password"
        name="password"
        value={form.password}
        onChange={onChange}
        placeholder="Create a password"
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
    <div className="pt-1">
      <button
        type="submit"
        className="Sahaay-btn Sahaay-btn-amber Sahaay-btn-block"
        style={{
          justifyContent: "center",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span>Continue →</span>
      </button>
    </div>
    <p className="text-center text-slate-500 text-sm pt-1">
      Already have an account?{" "}
      <button
        type="button"
        onClick={() => onNavigate("login")}
        className="text-amber-400 hover:text-amber-300 font-semibold transition-colors"
      >
        Sign in
      </button>
    </p>
  </form>
);

export default StepAccount;
