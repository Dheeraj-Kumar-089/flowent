import { useEffect, useRef } from 'react';

export default function Editor({ file, content, onChange, onSave, isSaving }) {
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
    <div className="flex-1 flex flex-col h-full bg-[#1b1b1f] text-zinc-300">
      
      {/* Editor Tab Bar - Claude style header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#121214] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-brand-purple">
            description
          </span>
          <span className="text-zinc-300 font-mono text-xs font-semibold">{file}</span>
        </div>
        
        {/* Solid Save Button (no gradients) */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-3.5 py-1 bg-brand-purple hover:bg-[#685ad6] active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-xs font-semibold text-white transition-all cursor-pointer shadow-sm"
        >
          {isSaving ? 'Saving...' : 'Save File (Ctrl+S)'}
        </button>
      </div>

      {/* Editor Content Area - contrasting off-black Claude-style color */}
      <div className="flex-1 flex overflow-hidden font-mono text-[13px] relative bg-[#18181c]">
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="py-4 select-none text-right pr-4 pl-4 text-zinc-600 bg-[#121214] border-r border-white/5 min-w-[3.5rem] overflow-hidden"
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
          className="flex-1 p-4 bg-transparent text-[#e3e1e9] outline-none resize-none overflow-y-auto h-full border-none focus:ring-0 leading-6 font-mono selection:bg-brand-purple/20"
          spellCheck="false"
        />
      </div>
    </div>
  );
}
