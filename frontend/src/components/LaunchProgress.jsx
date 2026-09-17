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
    <div className="flex-grow flex flex-col justify-center items-center bg-[#0d0e13] px-6 select-none relative">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-brand-purple/5 rounded-full blur-[80px] z-0"></div>

      <div className="relative z-10 w-full max-w-lg bg-[#1e1f25]/45 border border-white/10 p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
        
        {/* Glow Header */}
        <div className="space-y-3 text-center mb-8">
          <div className="relative w-10 h-10 mx-auto flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-brand-purple animate-spin">
              progress_activity
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Provisioning Workspace</h2>
          <p className="text-xs text-on-surface-variant">Allocating Kubernetes pod cluster & loading developer tools...</p>
        </div>

        {/* Animated Horizontal Progress Line */}
        <div className="w-full h-1 bg-[#121318] rounded-full overflow-hidden mb-8 border border-white/5">
          <div
            className="h-full bg-brand-purple shadow-[0_0_12px_#7c6ff7] transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Steps checklist */}
        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                step.status === 'completed'
                  ? 'bg-brand-purple/5 border-brand-purple/20 text-white'
                  : step.status === 'starting'
                  ? 'bg-[#1e1f25] border-brand-purple/40 text-brand-purple'
                  : 'bg-transparent border-white/5 text-on-surface-variant/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {step.status === 'completed' ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-purple text-white text-xs font-bold">
                    ✓
                  </span>
                ) : step.status === 'starting' ? (
                  <span className="w-5 h-5 rounded-full border-2 border-brand-purple/20 border-t-brand-purple animate-spin"></span>
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-white/10"></span>
                )}
                <span className="text-xs font-semibold tracking-wide">
                  {step.label}
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                step.status === 'completed'
                  ? 'text-brand-purple/80'
                  : step.status === 'starting'
                  ? 'text-brand-purple animate-pulse'
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
