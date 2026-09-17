import { useEffect, useRef } from 'react';

export default function LandingPage({ onStartSandbox }) {
  const canvasRef = useRef(null);

  // Background particle system animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles = [];
    const maxParticles = 40;

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
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = -Math.random() * 0.5 - 0.1;
        this.size = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.4 + 0.1;
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
        ctx.fillStyle = `rgba(198, 192, 255, ${this.alpha})`;
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
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-bg-base text-on-surface overflow-hidden font-sans select-none">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-grid-pattern z-0 opacity-70"></div>
      <div className="absolute inset-0 radial-glow z-0"></div>
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Top Header Navbar */}
      <nav className="relative z-10 w-full flex justify-between items-center px-8 md:px-12 h-16 border-b border-white/5 bg-bg-base/60 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-purple rounded flex items-center justify-center shadow-lg shadow-brand-purple/20">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4v10l8 4 8-4V7z" />
            </svg>
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">flowent</span>
          <span className="font-mono text-[9px] bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full border border-brand-purple/20 font-bold uppercase tracking-wider">
            IDE v1.0
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-on-surface-variant font-medium">
          <a className="hover:text-white transition-colors py-1" href="#features">Features</a>
          <a className="hover:text-white transition-colors py-1" href="#sandbox">Sandbox</a>
          <a className="hover:text-white transition-colors py-1" href="#docs">Docs</a>
        </div>
        <button
          onClick={onStartSandbox}
          className="bg-brand-purple hover:bg-[#685ad6] text-white px-4 py-2 text-xs font-semibold rounded-lg active:scale-95 transition-all shadow-md shadow-brand-purple/10 cursor-pointer"
        >
          Launch IDE
        </button>
      </nav>

      {/* Center Landing Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl px-6 text-center animate-slide-up">
        <div className="glass-card rounded-2xl p-8 md:p-12 w-full flex flex-col items-center border border-white/10 bg-[#1e1f25]/40">
          
          {/* Glowing badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-purple/25 bg-brand-purple/5 text-brand-purple text-xs font-semibold font-mono tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse"></span>
            ISOLATED K8S RUNTIME ACTIVE
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Build with AI, instantly.
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-on-surface-variant max-w-2xl mb-8 leading-relaxed">
            Spin up a containerized React sandbox environment in seconds. Chat with AI to write code, review logs, preview live, and take control using a terminal.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-10 text-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b21]/60 border border-white/5 rounded-lg text-on-surface font-medium justify-center">
              <span className="w-2 h-2 rounded-full bg-brand-purple"></span>
              AI Agent Forge
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b21]/60 border border-white/5 rounded-lg text-on-surface font-medium justify-center">
              <span className="w-2 h-2 rounded-full bg-brand-teal"></span>
              Live Iframe Hot-reload
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b21]/60 border border-white/5 rounded-lg text-on-surface font-medium justify-center">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              Interactive xterm Shell
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#1a1b21]/60 border border-white/5 rounded-lg text-on-surface font-medium justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Vite Dev Sync
            </div>
          </div>

          {/* Primary Action Button - STRICTLY SOLID, NO GRADIENTS */}
          <button
            onClick={onStartSandbox}
            className="px-8 py-4 bg-[#7c6ff7] hover:bg-[#6659e5] active:scale-98 text-white font-bold rounded-lg text-base transition-all shadow-lg shadow-brand-purple/20 cursor-pointer flex items-center gap-2"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Start Sandbox Environment
          </button>
        </div>
      </main>

      {/* Footer bar */}
      <footer className="relative z-10 w-full py-6 border-t border-white/5 bg-[#0d0e13]/60 text-xs text-on-surface-variant flex flex-col md:flex-row justify-between items-center px-8 shrink-0 gap-3">
        <span className="font-semibold text-white">Flowent AI Sandbox</span>
        <div className="flex gap-6">
          <a className="hover:text-white transition-colors" href="#">Security</a>
          <a className="hover:text-white transition-colors" href="#">Documentation</a>
          <a className="hover:text-white transition-colors" href="#">GitHub</a>
        </div>
        <span>© 2026 Flowent Inc. Built for the modern builder.</span>
      </footer>
    </div>
  );
}
