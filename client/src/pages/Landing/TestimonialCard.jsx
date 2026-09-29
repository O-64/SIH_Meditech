const TestimonialCard = ({ quote, name, mood }) => (
  <div className="bg-slate-800 bg-opacity-40 border border-slate-700 rounded-2xl p-6">
    <p className="text-slate-300 italic leading-relaxed mb-4 text-sm">"{quote}"</p>
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-400 flex items-center justify-center text-sm">
        {mood}
      </div>
      <span className="text-slate-400 text-sm">{name}</span>
    </div>
  </div>
);

export default TestimonialCard;