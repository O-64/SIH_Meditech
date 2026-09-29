const ChatPreview = () => (
  <section className="max-w-2xl mx-auto px-8 pb-32" style={{ position: "relative", zIndex: 10 }}>
    <div style={{
      background: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "1.5rem", padding: "1.5rem", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
    }}>
      <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #fbbf24, #fb7185)" }}>
          🌙
        </div>
        <div>
          <p className="text-white font-medium text-sm">Sahaay</p>
          <p className="text-emerald-400 text-xs">● Online</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-slate-200 text-sm">Good morning Rahul ☀️ How are you feeling today?</p>
            <p className="text-slate-500 text-xs mt-1">8:00 AM</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs" style={{ background: "linear-gradient(135deg, #f59e0b, #f43f5e)" }}>
            <p className="text-white text-sm">Pretty anxious... have a big presentation at 2pm 😬</p>
            <p className="text-amber-100 text-xs mt-1 opacity-70">8:03 AM</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-slate-200 text-sm">
              That sounds nerve-wracking, but I know you've prepared for this. I'll check in with you after 2pm 💛
            </p>
            <p className="text-slate-500 text-xs mt-1">8:03 AM</p>
          </div>
        </div>
        <div className="flex justify-start" style={{ opacity: 0.55 }}>
          <div className="rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-slate-200 text-sm">Hey, your presentation was at 2pm — how did it go? 🤞</p>
            <p className="text-slate-500 text-xs mt-1">4:00 PM</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex-1 px-4 py-2.5 text-slate-500 text-sm rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          Type how you're feeling...
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-900 font-bold transition-all hover:scale-110" style={{ background: "linear-gradient(135deg, #fbbf24, #fb7185)" }}>
          →
        </button>
      </div>
    </div>
  </section>
);

export default ChatPreview;