import { useEffect, useRef, useState, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';

// Helper to determine Prism language grammar from file extension
const getLanguageForFile = (filepath) => {
  if (!filepath) return 'javascript';
  const ext = filepath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jsx':
      return 'jsx';
    case 'tsx':
      return 'tsx';
    case 'ts':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'html':
    case 'htm':
    case 'svg':
      return 'html';
    case 'sh':
    case 'bash':
    case 'dockerfile':
      return 'bash';
    default:
      return 'javascript';
  }
};

export default function Editor({ file, content, onChange, onSave, isSaving, isFullscreen, onToggleFullscreen }) {
  const lineCount = (content || '').split('\n').length;
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const codeDisplayRef = useRef(null);

  const lang = useMemo(() => getLanguageForFile(file), [file]);

  // Syntax highlighted HTML via Prism
  const highlightedHtml = useMemo(() => {
    try {
      const grammar = Prism.languages[lang] || Prism.languages.javascript;
      return Prism.highlight(content || '', grammar, lang);
    } catch (e) {
      return (content || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [content, lang]);

  // Sync scrolling of line numbers, syntax highlight pre, and editable textarea
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = scrollTop;
      if (codeDisplayRef.current) {
        codeDisplayRef.current.scrollTop = scrollTop;
        codeDisplayRef.current.scrollLeft = scrollLeft;
      }
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

  // Tab key handler to insert 2 spaces
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      onChange(newContent);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0e12] text-[#eaecef] overflow-hidden">
      
      {/* Editor Tab Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#090a0d] border-b border-white/5 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e09f3e]"></span>
          <span className="text-[#eaecef] font-mono text-xs font-semibold tracking-tight">{file || 'untitled'}</span>
          <span className="text-[10px] font-mono uppercase bg-[#181b23] text-[#8a8f9d] px-1.5 py-0.5 rounded-[5px] border border-white/5">
            {lang}
          </span>
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

      {/* Editor Content Area with Prism Syntax Highlighting */}
      <div className="flex-1 flex overflow-hidden font-mono text-[13px] relative bg-[#0d0e12]">
        
        {/* Line Numbers Column */}
        <div
          ref={lineNumbersRef}
          className="py-3 select-none text-right pr-3 pl-3 text-[#4b5563] bg-[#090a0d] border-r border-white/5 min-w-[3.2rem] overflow-hidden"
        >
          {Array.from({ length: Math.max(1, lineCount) }).map((_, idx) => (
            <div key={idx} className="h-6 font-mono text-xs leading-6 select-none">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Editor Code Container */}
        <div className="relative flex-1 h-full overflow-hidden">
          
          {/* Syntax Highlighted Colorful Code Layer (Behind) */}
          <pre
            ref={codeDisplayRef}
            aria-hidden="true"
            className="absolute inset-0 m-0 p-3 pointer-events-none overflow-hidden whitespace-pre font-mono text-[13px] leading-6 bg-transparent text-[#eaecef]"
            style={{ tabSize: 2 }}
          >
            <code
              className={`language-${lang}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml + '<br />' }}
            />
          </pre>

          {/* Interactive Editable Transparent Textarea Layer (Foreground) */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white outline-none resize-none font-mono text-[13px] leading-6 whitespace-pre overflow-auto border-none focus:ring-0 selection:bg-[#e09f3e]/30 z-10"
            style={{ tabSize: 2 }}
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>

      </div>
    </div>
  );
}
