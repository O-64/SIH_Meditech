const signupSteps = ["Account", "About you", "Location"];

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {signupSteps.map((s, i) => (
      <div key={s} className="flex items-center gap-2">
        <div className={`flex items-center gap-2 ${i <= currentStep ? "text-amber-400" : "text-slate-600"}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
            i < currentStep
              ? "bg-amber-400 border-amber-400 text-slate-900"
              : i === currentStep
                ? "border-amber-400 text-amber-400"
                : "border-slate-600 text-slate-600"
          }`}>
            {i < currentStep ? "✓" : i + 1}
          </div>
          <span className="text-xs font-medium hidden sm:block">{s}</span>
        </div>
        {i < signupSteps.length - 1 && (
          <div className={`w-8 h-px ${i < currentStep ? "bg-amber-400" : "bg-slate-600"} transition-colors duration-300`} />
        )}
      </div>
    ))}
  </div>
);

export default StepIndicator;