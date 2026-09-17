import { forwardRef } from 'react';

const TerminalConsole = forwardRef(({ onClear }, ref) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black relative">
      {/* Terminal Header */}
      <div className="h-9 bg-[#111] border-b border-white/5 flex items-center px-4 justify-between select-none shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-brand-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-on-surface-variant">
            Terminal Console
          </span>
        </div>
        
        {/* Solid Clear Button (no gradients) */}
        <button
          onClick={onClear}
          className="text-[10px] font-mono text-on-surface-variant hover:text-white font-semibold px-2 py-0.5 bg-[#1a1b21] border border-white/5 rounded hover:bg-[#292a2f] transition-all cursor-pointer shadow-sm active:scale-95"
        >
          Clear Console
        </button>
      </div>

      {/* XTerm Container */}
      <div className="flex-1 overflow-hidden relative bg-[#09090b]">
        <div ref={ref} className="w-full h-full" />
      </div>
    </div>
  );
});

TerminalConsole.displayName = 'TerminalConsole';

export default TerminalConsole;
