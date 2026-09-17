import { useEffect, useRef } from 'react';

export default function AIChat({
  chatHistory,
  promptText,
  setPromptText,
  onSend,
  isGenerating
}) {
  const chatBottomRef = useRef(null);

  // Auto-scroll to bottom of chat when new content arrives
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Mesh background effect layer */}
      <div className="absolute inset-0 mesh-gradient z-0 opacity-20 pointer-events-none"></div>

      {/* Messages area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 relative z-10">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[9px] font-mono text-on-surface-variant/60 uppercase tracking-widest px-1">
              {msg.sender === 'ai' ? 'assistant' : msg.sender}
            </div>
            
            <div
              className={`p-3.5 rounded-xl text-sm leading-relaxed max-w-[90%] whitespace-pre-wrap shadow-md ${
                msg.sender === 'user'
                  ? 'bg-zinc-800 text-white rounded-tr-none border border-white/5'
                  : msg.sender === 'system'
                  ? 'bg-red-950/20 text-red-300 border border-red-900/30 font-mono text-xs'
                  : 'bg-[#1e1f25] text-on-surface border border-white/5 rounded-tl-none'
              }`}
            >
              {msg.text}

              {/* Streaming execution logs (thinking process) */}
              {msg.logs && msg.logs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <div className="text-[10px] text-brand-purple font-bold font-mono mb-1.5 uppercase flex items-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-ping"></span>
                    Agent Activity
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-on-surface-variant bg-[#0d0e13]/60 p-2.5 rounded-lg max-h-36 overflow-y-auto border border-white/5">
                    {msg.logs.map((log, lidx) => (
                      <div key={lidx} className="break-all border-l-2 border-brand-purple/40 pl-2">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form area */}
      <form
        onSubmit={onSend}
        className="p-3 border-t border-white/10 bg-[#0d0e13]/80 backdrop-blur-xl relative z-10 shrink-0"
      >
        <div className="relative rounded-xl bg-[#09090b] border border-white/10 focus-within:border-brand-purple/40 focus-within:shadow-[0_0_15px_rgba(124,111,247,0.1)] transition-all">
          <textarea
            rows={2}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask AI to build a game, page, or style changes..."
            className="w-full bg-transparent border-none text-on-surface text-[13px] resize-none focus:ring-0 p-3 pb-12 outline-none"
          />
          
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
            {/* Solid Send Button (no gradients) */}
            <button
              type="submit"
              disabled={isGenerating || !promptText.trim()}
              className="bg-brand-purple hover:bg-[#685ad6] active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2 rounded-lg transition-all font-semibold flex items-center justify-center cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4 fill-current rotate-90" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 px-1 pt-2 text-[10px] text-brand-purple font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-ping"></span>
            <span>AI Agent is editing files...</span>
          </div>
        )}
      </form>
    </div>
  );
}
