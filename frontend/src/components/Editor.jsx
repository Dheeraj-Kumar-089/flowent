import { useEffect, useRef, useState } from 'react';

export default function Editor({ file, content, onChange, onSave, isSaving, isFullscreen, onToggleFullscreen }) {
  const lineCount = content.split('\n').length;
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Sync scroll of line numbers column with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard shortcut Ctrl+S (or Cmd+S)
  useEffect(() => {
    const handleKeySave = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeySave);
    return () => window.removeEventListener('keydown', handleKeySave);
  }, [onSave]);

  // Tab key handler to insert 2 spaces instead of tab focus out
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);
      
      // Keep cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101217] text-[#eaecef] overflow-hidden">
      
      {/* Editor Tab Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#0b0c0f] border-b border-white/5 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#e09f3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[#eaecef] font-mono text-xs font-medium">{file || 'untitled'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
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
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1 bg-[#e09f3e] hover:bg-[#c98b30] active:scale-95 disabled:bg-[#1f222a] disabled:text-[#6b7280] rounded-[5px] text-xs font-semibold text-black transition-all cursor-pointer shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save (Ctrl+S)'}
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 flex overflow-hidden font-mono text-[13px] relative bg-[#101217]">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="py-3 select-none text-right pr-3 pl-3 text-[#4b5563] bg-[#0b0c0f] border-r border-white/5 min-w-[3rem] overflow-hidden"
        >
          {Array.from({ length: Math.max(1, lineCount) }).map((_, idx) => (
            <div key={idx} className="h-6 font-mono text-xs leading-6 select-none">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Textarea Code Space */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          className="flex-1 p-3 bg-transparent text-[#e2e8f0] outline-none resize-none overflow-y-auto h-full border-none focus:ring-0 leading-6 font-mono selection:bg-[#e09f3e]/20"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
