import { forwardRef } from 'react';

const TerminalConsole = forwardRef(({ onClear, isFullscreen, onToggleFullscreen }, ref) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#07080a] text-[#eaecef] overflow-hidden">
      {/* Terminal Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#090a0d] border-b border-white/5 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[#8a8f9d] font-mono text-xs font-semibold uppercase tracking-wider">Terminal Console</span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Terminal"}
            >
              {isFullscreen ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 11l5 5m0 0l-5 0m5 0l0-5M9 15l-5 5m0 0l5 0m-5 0l0-5m11-11l5-5m0 0l-5 0m5 0l0 5" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}

          <button
            onClick={onClear}
            className="text-[10px] text-[#8a8f9d] hover:text-white px-2 py-0.5 hover:bg-white/5 rounded-[5px] border border-white/5 transition-colors cursor-pointer font-mono"
            title="Clear terminal output"
          >
            Clear Console
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div
        ref={ref}
        className="flex-1 w-full h-full p-2 bg-[#07080a] overflow-hidden select-text"
      />
    </div>
  );
});

TerminalConsole.displayName = 'TerminalConsole';

export default TerminalConsole;
