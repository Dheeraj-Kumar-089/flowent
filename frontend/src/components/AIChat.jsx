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
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0c0d11]">
      {/* Messages area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 relative z-10">
        {chatHistory.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="text-[9px] font-mono text-[#8a8f9d] uppercase tracking-wider px-1">
              {msg.sender === 'ai' ? 'assistant' : msg.sender}
            </div>
            
            <div
              className={`p-3 rounded-[5px] text-xs leading-relaxed max-w-[92%] whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-[#1f232d] text-[#eaecef] border border-white/10'
                  : msg.sender === 'system'
                  ? 'bg-red-950/20 text-red-300 border border-red-900/30 font-mono text-[11px]'
                  : 'bg-[#14161c] text-[#eaecef] border border-white/5'
              }`}
            >
              {msg.text}

              {/* Streaming execution logs (thinking process) */}
              {msg.logs && msg.logs.length > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5">
                  <div className="text-[10px] text-[#e09f3e] font-semibold font-mono mb-1 uppercase flex items-center gap-1.5 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e09f3e] animate-ping"></span>
                    Agent Execution Log
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-[#9ca3af] bg-[#090a0d] p-2 rounded-[5px] max-h-32 overflow-y-auto border border-white/5">
                    {msg.logs.map((log, lidx) => (
                      <div key={lidx} className="break-all border-l-2 border-[#e09f3e]/40 pl-2">
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

      {/* Input prompt area */}
      <div className="p-2.5 bg-[#090a0d] border-t border-white/5 shrink-0">
        <form onSubmit={onSend} className="relative flex flex-col gap-1.5">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask AI to build a component, game, or edit styles..."
            disabled={isGenerating}
            rows={2}
            className="w-full bg-[#14161c] text-xs text-[#eaecef] p-2.5 rounded-[5px] border border-white/10 outline-none resize-none placeholder-[#4b5563] focus:border-[#e09f3e] disabled:opacity-50 transition-colors font-sans"
          />

          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-[#6b7280] font-mono">
              Press Enter to send
            </span>

            <button
              type="submit"
              disabled={isGenerating || !promptText.trim()}
              className="px-3 py-1 bg-[#e09f3e] hover:bg-[#c98b30] active:scale-95 disabled:bg-[#1f222a] disabled:text-[#6b7280] text-black font-semibold text-xs rounded-[5px] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isGenerating ? (
                <>
                  <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin"></span>
                  <span>Writing...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
