export default function LaunchProgress({ steps }) {
  // Calculate progress percentage based on step states
  let completedCount = 0;
  let activeIndex = -1;

  steps.forEach((step, idx) => {
    if (step.status === 'completed') {
      completedCount++;
    } else if (step.status === 'starting' && activeIndex === -1) {
      activeIndex = idx;
    }
  });

  let progressPct = completedCount * 25;
  if (activeIndex !== -1) {
    progressPct += 12.5; // Halfway through the current active step
  }

  return (
    <div className="flex-grow flex flex-col justify-center items-center bg-[#090a0d] px-6 select-none relative">
      {/* Background subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0"></div>

      <div className="relative z-10 w-full max-w-md bg-[#14161d] border border-white/10 p-7 rounded-[5px] shadow-2xl">
        
        {/* Spinner Header */}
        <div className="space-y-3 text-center mb-6">
          <div className="w-10 h-10 mx-auto flex items-center justify-center text-primary">
            <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Provisioning Workspace</h2>
          <p className="text-xs text-on-surface-variant">Allocating Kubernetes pod cluster & loading developer tools...</p>
        </div>

        {/* Animated Horizontal Progress Line */}
        <div className="w-full h-1 bg-[#090a0d] rounded-[5px] overflow-hidden mb-6 border border-white/5">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out rounded-[5px]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Steps checklist */}
        <div className="space-y-2.5">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-[5px] border transition-all ${
                step.status === 'completed'
                  ? 'bg-[#1a1d24] border-emerald-500/30 text-white'
                  : step.status === 'starting'
                  ? 'bg-[#1c1f28] border-primary/40 text-primary'
                  : 'bg-transparent border-white/5 text-on-surface-variant/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {step.status === 'completed' ? (
                  <span className="flex items-center justify-center w-4 h-4 rounded-[5px] bg-emerald-500 text-black text-[10px] font-bold">
                    ✓
                  </span>
                ) : step.status === 'starting' ? (
                  <span className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></span>
                ) : (
                  <span className="w-4 h-4 rounded-[5px] border border-white/10"></span>
                )}
                <span className="text-xs font-medium tracking-wide">
                  {step.label}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${
                step.status === 'completed'
                  ? 'text-emerald-400'
                  : step.status === 'starting'
                  ? 'text-primary animate-pulse'
                  : 'text-zinc-600'
              }`}>
                {step.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
