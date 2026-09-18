import { useEffect, useRef } from 'react';

export default function LandingPage({
  onStartSandbox,
  onResumeSandbox,
  existingSandboxId,
  user,
  onLogin,
  onLogout
}) {
  const canvasRef = useRef(null);

  // Subtle background starfield particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles = [];
    const maxParticles = 35;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = -Math.random() * 0.4 - 0.1;
        this.size = Math.random() * 1.2 + 0.5;
        this.alpha = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < 0) {
          this.reset();
          this.y = height;
        }
      }

      draw() {
        ctx.fillStyle = `rgba(224, 159, 62, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    let animId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-[#0b0c0e] text-[#eaecef] overflow-hidden font-sans select-none">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-40"></div>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Top Header Navbar */}
      <nav className="relative z-10 w-full flex justify-between items-center px-6 md:px-10 h-14 border-b border-white/5 bg-[#0e1015]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#e09f3e] rounded-[5px] flex items-center justify-center shadow-md shadow-[#e09f3e]/20 text-black">
            <svg className="w-4 h-4 font-bold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4v10l8 4 8-4V7z" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">flowent</span>
          <span className="font-mono text-[10px] bg-[#1a1d24] text-[#e09f3e] px-2 py-0.5 rounded-[5px] border border-[#e09f3e]/30 font-semibold uppercase tracking-wider">
            Cloud IDE
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5 bg-[#14161c] border border-white/10 px-3 py-1 rounded-[5px]">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-[5px] border border-white/20 object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-[5px] bg-[#e09f3e] text-black text-[11px] flex items-center justify-center font-bold">
                  {user.name?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-xs text-white font-medium max-w-[120px] truncate">{user.name}</span>
              <button
                onClick={onLogout}
                className="text-[11px] text-zinc-400 hover:text-red-400 font-medium transition-colors cursor-pointer ml-1"
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 bg-[#14161c] hover:bg-[#1d2028] text-white border border-white/10 px-3.5 py-1.5 text-xs font-medium rounded-[5px] active:scale-95 transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.3-4.3 1.3-3 0-5.5-2-6.4-4.8L1.9 16.5C3.7 20.4 7.5 23 12 23z"/>
              </svg>
              Sign In
            </button>
          )}

          {existingSandboxId ? (
            <button
              onClick={() => onResumeSandbox(existingSandboxId)}
              className="bg-[#10b981] hover:bg-[#059669] text-black font-semibold px-3.5 py-1.5 text-xs rounded-[5px] active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-black/60 animate-pulse"></span>
              Resume Workspace
            </button>
          ) : (
            <button
              onClick={onStartSandbox}
              className="bg-[#e09f3e] hover:bg-[#c98b30] text-black font-semibold px-3.5 py-1.5 text-xs rounded-[5px] active:scale-95 transition-all shadow-sm cursor-pointer"
            >
              Launch IDE
            </button>
          )}
        </div>
      </nav>

      {/* Center Landing Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl px-6 text-center animate-slide-up">
        <div className="glass-card rounded-[5px] p-8 md:p-12 w-full flex flex-col items-center border border-white/10 bg-[#12141a]/85">
          
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[5px] border border-white/10 bg-[#171922] text-[#8a8f9d] text-xs font-mono tracking-wide mb-6">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
            KUBERNETES RUNTIME ENGINE
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            Build software with AI in real-time.
          </h1>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-[#8a8f9d] max-w-xl mb-8 leading-relaxed font-normal">
            Isolated cloud workspaces with live preview, xterm console, and AI that codes directly into your file system.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mb-8 text-xs font-mono">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#171922] border border-white/5 rounded-[5px] text-[#eaecef] justify-center">
              <span className="w-1.5 h-1.5 rounded-[5px] bg-[#e09f3e]"></span>
              AI Agent Forge
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#171922] border border-white/5 rounded-[5px] text-[#eaecef] justify-center">
              <span className="w-1.5 h-1.5 rounded-[5px] bg-[#10b981]"></span>
              Live Hot-Reload
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#171922] border border-white/5 rounded-[5px] text-[#eaecef] justify-center">
              <span className="w-1.5 h-1.5 rounded-[5px] bg-[#60a5fa]"></span>
              Interactive Shell
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#171922] border border-white/5 rounded-[5px] text-[#eaecef] justify-center">
              <span className="w-1.5 h-1.5 rounded-[5px] bg-[#a78bfa]"></span>
              Vite Dev Sync
            </div>
          </div>

          {/* Primary Action Button */}
          {existingSandboxId ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => onResumeSandbox(existingSandboxId)}
                className="px-6 py-3.5 bg-[#10b981] hover:bg-[#059669] active:scale-98 text-black font-semibold rounded-[5px] text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Open Existing Workspace ({existingSandboxId.slice(0, 8)}...)
              </button>
              <button
                onClick={onStartSandbox}
                className="px-5 py-3.5 bg-[#171922] hover:bg-[#20232e] active:scale-98 text-white border border-white/10 font-medium rounded-[5px] text-sm transition-all cursor-pointer"
              >
                Create New Sandbox
              </button>
            </div>
          ) : user ? (
            <button
              onClick={onStartSandbox}
              className="px-7 py-3.5 bg-[#e09f3e] hover:bg-[#c98b30] active:scale-98 text-black font-semibold rounded-[5px] text-sm transition-all shadow-md cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Launch Sandbox Workspace
            </button>
          ) : (
            <button
              onClick={onLogin}
              className="px-7 py-3.5 bg-white hover:bg-zinc-200 active:scale-98 text-black font-semibold rounded-[5px] text-sm transition-all shadow-md cursor-pointer flex items-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.8-2.5 1.3-4.3 1.3-3 0-5.5-2-6.4-4.8L1.9 16.5C3.7 20.4 7.5 23 12 23z"/>
              </svg>
              Sign In with Google to Start
            </button>
          )}
        </div>
      </main>

      {/* Footer bar */}
      <footer className="relative z-10 w-full py-4 border-t border-white/5 bg-[#0e1015]/60 text-[11px] text-[#8a8f9d] flex flex-col md:flex-row justify-between items-center px-8 shrink-0 gap-2 font-mono">
        <span className="font-medium text-white">Flowent Cloud IDE</span>
        <div className="flex gap-4">
          <a className="hover:text-white transition-colors" href="#">Security</a>
          <a className="hover:text-white transition-colors" href="#">Docs</a>
          <a className="hover:text-white transition-colors" href="#">GitHub</a>
        </div>
        <span>© 2026 Flowent Workspace</span>
      </footer>
    </div>
  );
}
