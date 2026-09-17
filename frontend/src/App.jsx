import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

// Import our modular components
import LandingPage from './components/LandingPage';
import LaunchProgress from './components/LaunchProgress';
import FileExplorer from './components/FileExplorer';
import Editor from './components/Editor';
import TerminalConsole from './components/TerminalConsole';
import AIChat from './components/AIChat';

function App() {
  const [user, setUser] = useState(null);
  const [sandboxId, setSandboxId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'starting' | 'ready' | 'error'
  const [startSteps, setStartSteps] = useState([
    { id: 1, label: 'Allocating sandbox container pod', status: 'pending' },
    { id: 2, label: 'Configuring network routes & DNS', status: 'pending' },
    { id: 3, label: 'Unpacking React templates & configurations', status: 'pending' },
    { id: 4, label: 'Bootstrapping local developer agent', status: 'pending' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');

  // Check auth session on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (e) {
      setUser(null);
    }
  };

  // Workspace layout states
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'files'
  const [filesList, setFilesList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null); // { path: string, originalContent: string, currentContent: string }
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');

  // AI assistant states
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: "Hello! I am your Sandbox AI Assistant. Let me know what you want to build inside this workspace, and I'll generate the components for you in real-time!",
      logs: []
    }
  ]);
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview reload key
  const [previewKey, setPreviewKey] = useState(0);

  // Refs for xterm and socket
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const socketInstance = useRef(null);
  const fitAddonInstance = useRef(null);

  // Helper to dynamically construct agent subdomain for cloud or local
  const getAgentBaseUrl = (sId) => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const baseDomain = host.includes('localhost') ? 'localhost' : host;
    return `${protocol}//${sId}.agent.${baseDomain}`;
  };

  // Fetch workspace file list
  const loadFilesList = async (sId) => {
    try {
      const response = await fetch(`${getAgentBaseUrl(sId)}/list-files`);
      if (response.ok) {
        const data = await response.json();
        setFilesList(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching file list:', err);
    }
  };

  // Open file in Editor
  const handleOpenFile = async (filepath) => {
    try {
      const response = await fetch(
        `${getAgentBaseUrl(sandboxId)}/read-files?files=${encodeURIComponent(filepath)}`
      );
      if (response.ok) {
        const data = await response.json();
        let content = '';
        if (data.files && Array.isArray(data.files)) {
          const matchKey = '/' + filepath.replace(/^\//, '');
          const match = data.files.find(obj => Object.keys(obj)[0] === matchKey || Object.keys(obj)[0] === filepath);
          if (match) {
            content = Object.values(match)[0];
          }
        }
        setSelectedFile({
          path: filepath,
          originalContent: content,
          currentContent: content
        });
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  // Save changes to active file manually
  const handleSaveFile = useCallback(async () => {
    if (!selectedFile || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${getAgentBaseUrl(sandboxId)}/update-files`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: [
            {
              file: selectedFile.path,
              content: selectedFile.currentContent
            }
          ]
        })
      });
      if (response.ok) {
        setSelectedFile(prev => ({
          ...prev,
          originalContent: prev.currentContent
        }));
        setPreviewKey(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error saving file:', err);
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, sandboxId, isSaving]);

  // Create new file
  const handleCreateFileSubmit = async (e) => {
    e.preventDefault();
    if (!newFilePath || !sandboxId) return;

    const normalizedPath = newFilePath.trim().replace(/^\//, '');
    try {
      const response = await fetch(`${getAgentBaseUrl(sandboxId)}/create-files`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: [
            {
              file: normalizedPath,
              content: '// Created newly via Flowent IDE'
            }
          ]
        })
      });

      if (response.ok) {
        setNewFilePath('');
        setIsCreatingFile(false);
        await loadFilesList(sandboxId);
        await handleOpenFile(normalizedPath);
        setActiveTab('files');
      }
    } catch (err) {
      console.error('Error creating file:', err);
    }
  };

  // Send message to AI agent (SSE stream)
  const handleSendPrompt = async (e) => {
    if (e) e.preventDefault();
    if (!promptText.trim() || isGenerating || !sandboxId) return;

    const userPrompt = promptText.trim();
    setPromptText('');
    setChatHistory(prev => [
      ...prev,
      { sender: 'user', text: userPrompt },
      { sender: 'ai', text: '', isStreaming: true, logs: [] }
    ]);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userPrompt,
          projectId: sandboxId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming from Agent Service');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            setChatHistory(prev => {
              const next = [...prev];
              const lastMsg = next[next.length - 1];
              if (lastMsg && lastMsg.sender === 'ai' && lastMsg.isStreaming) {
                if (
                  trimmedLine.startsWith('Reading files...') ||
                  trimmedLine.startsWith('Updating files...') ||
                  trimmedLine.startsWith('Listing files...') ||
                  trimmedLine.startsWith('Files listed successfully') ||
                  trimmedLine.startsWith('Files read successfully') ||
                  trimmedLine.startsWith('Files updated successfully')
                ) {
                  lastMsg.logs = [...(lastMsg.logs || []), trimmedLine];
                } else {
                  lastMsg.text += trimmedLine + '\n';
                }
              }
              return next;
            });
          }
        }
      }

      setChatHistory(prev => {
        const next = [...prev];
        const lastMsg = next[next.length - 1];
        if (lastMsg && lastMsg.sender === 'ai') {
          lastMsg.isStreaming = false;
        }
        return next;
      });

      await loadFilesList(sandboxId);
      setPreviewKey(prev => prev + 1);

      if (selectedFile) {
        await handleOpenFile(selectedFile.path);
      }
    } catch (err) {
      console.error('Error during AI execution:', err);
      setChatHistory(prev => [
        ...prev,
        { sender: 'system', text: `Error: ${err.message}` }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Launch Sandbox Server
  const handleStartSandbox = async () => {
    setStatus('starting');
    setErrorMessage('');

    const stepsCopy = [
      { id: 1, label: 'Allocating sandbox container pod', status: 'starting' },
      { id: 2, label: 'Configuring network routes & DNS', status: 'pending' },
      { id: 3, label: 'Unpacking React templates & configurations', status: 'pending' },
      { id: 4, label: 'Bootstrapping local developer agent', status: 'pending' }
    ];
    setStartSteps(stepsCopy);

    const updateStepStatus = (id, nextStatus) => {
      setStartSteps(prev => prev.map(s => s.id === id ? { ...s, status: nextStatus } : s));
    };

    try {
      const response = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Could not spin up sandbox in the cluster');
      }

      const data = await response.json();

      updateStepStatus(1, 'completed');
      updateStepStatus(2, 'starting');

      await new Promise(r => setTimeout(r, 1200));
      updateStepStatus(2, 'completed');
      updateStepStatus(3, 'starting');

      await new Promise(r => setTimeout(r, 1000));
      updateStepStatus(3, 'completed');
      updateStepStatus(4, 'starting');

      const agentCheckUrl = `${getAgentBaseUrl(data.sandboxId)}/`;
      let retries = 15;
      let agentReady = false;

      while (retries > 0 && !agentReady) {
        try {
          const check = await fetch(agentCheckUrl);
          if (check.ok) {
            agentReady = true;
            break;
          }
        } catch (e) {
          // agent not up yet
        }
        retries--;
        await new Promise(r => setTimeout(r, 1500));
      }

      updateStepStatus(4, 'completed');
      await new Promise(r => setTimeout(r, 500));

      setSandboxId(data.sandboxId);
      setPreviewUrl(data.previewUrl);
      setStatus('ready');

      await loadFilesList(data.sandboxId);
    } catch (err) {
      console.error('Error starting sandbox:', err);
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred while deploying your sandbox pod.');
    }
  };

  // Hook up XTerm and WebSockets when Sandbox is ready
  useEffect(() => {
    if (status === 'ready' && sandboxId && terminalRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        theme: {
          background: '#09090b',
          foreground: '#e4e4e7',
          cursor: '#a78bfa',
          selectionBackground: 'rgba(167, 139, 250, 0.3)',
          black: '#09090b',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          blue: '#3b82f6',
          magenta: '#a855f7',
          cyan: '#06b6d4',
          white: '#f4f4f5'
        },
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        lineHeight: 1.2
      });
      xtermInstance.current = term;

      const fitAddon = new FitAddon();
      fitAddonInstance.current = fitAddon;
      term.loadAddon(fitAddon);

      term.open(terminalRef.current);
      fitAddon.fit();

      const handleResize = () => {
        fitAddon.fit();
      };
      window.addEventListener('resize', handleResize);

      const socketUrl = getAgentBaseUrl(sandboxId);
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling']
      });
      socketInstance.current = socket;

      socket.on('connect', () => {
        term.write('\r\n\x1b[1;35m[Flowent Terminal] Secure Socket Connected.\x1b[0m\r\n');
      });

      socket.on('terminal-output', (data) => {
        term.write(data);
      });

      socket.on('disconnect', () => {
        term.write('\r\n\x1b[1;31m[Flowent Terminal] Connection Terminated.\x1b[0m\r\n');
      });

      term.onData((data) => {
        socket.emit('terminal-input', data);
      });

      setTimeout(() => fitAddon.fit(), 100);
      setTimeout(() => fitAddon.fit(), 1000);

      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        socket.disconnect();
      };
    }
  }, [status, sandboxId]);

  const handleDestroySandbox = () => {
    setSandboxId(null);
    setPreviewUrl(null);
    setStatus('idle');
    setFilesList([]);
    setSelectedFile(null);
    setChatHistory([
      {
        sender: 'ai',
        text: "Hello! I am your Sandbox AI Assistant. Let me know what you want to build inside this workspace, and I'll generate the components for you in real-time!",
        logs: []
      }
    ]);
  };

  const handleClearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-bg-base text-[#e3e1e9] overflow-hidden font-sans">
      
      {/* 1. IDLE STATE: Enhanced Landing Page with Auth */}
      {status === 'idle' && (
        <LandingPage
          onStartSandbox={handleStartSandbox}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

      {/* 2. STARTING STATE: Launch Progress Screen with Progress Line */}
      {status === 'starting' && (
        <LaunchProgress steps={startSteps} />
      )}

      {/* 3. ERROR STATE */}
      {status === 'error' && (
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-md p-8 bg-red-950/20 border border-red-500/20 rounded-2xl text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">!</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-red-200">Sandbox Allocation Failed</h2>
              <p className="text-sm text-zinc-400">{errorMessage || 'An error occurred during cluster configuration.'}</p>
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Return to Menu
            </button>
          </div>
        </div>
      )}

      {/* 4. READY STATE: Main IDE Workspace */}
      {status === 'ready' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header IDE Bar */}
          <header className="h-12 border-b border-white/5 bg-[#0d0e13] flex justify-between items-center px-4 shrink-0 select-none z-50">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-brand-purple rounded flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4v10l8 4 8-4V7z" />
                </svg>
              </div>
              <span className="font-extrabold text-base bg-clip-text text-transparent bg-gradient-to-r from-brand-purple to-brand-teal tracking-tight">
                flowent
              </span>
              <span className="font-mono text-[9px] bg-brand-purple/10 text-brand-purple px-2 py-0.5 rounded-full border border-brand-purple/20 font-bold uppercase tracking-wider">
                sandbox
              </span>
            </div>

            {/* Middle: Sandbox ID Badge */}
            <div className="flex items-center gap-2 bg-[#1a1b21]/60 border border-white/5 rounded px-3 py-1 font-mono text-[11px] text-on-surface-variant">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-teal shadow-[0_0_8px_#2dd4bf] animate-pulse"></div>
              <span>{sandboxId?.slice(0, 15)}...</span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewKey(prev => prev + 1)}
                className="p-1.5 bg-[#1a1b21] hover:bg-[#292a2f] border border-white/5 rounded text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                title="Reload live preview"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>

              <button
                onClick={handleDestroySandbox}
                className="px-3 py-1.5 text-xs bg-[#1a1b21] hover:bg-red-950/40 text-on-surface-variant hover:text-red-400 border border-white/5 hover:border-red-900/40 rounded-lg font-medium transition-colors cursor-pointer active:scale-95"
              >
                Destroy Sandbox
              </button>
            </div>
          </header>

          {/* IDE Panels Layout */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Panel: Explorer / AI assistant */}
            <div className="w-[360px] min-w-[360px] border-r border-white/5 bg-[#0d0e13]/60 flex flex-col overflow-hidden shrink-0">
              {/* Tab Selector */}
              <div className="h-11 border-b border-white/5 bg-bg-base flex select-none shrink-0">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'chat'
                      ? 'border-brand-purple text-brand-purple bg-[#1a1b21]/20'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  AI Assistant
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'files'
                      ? 'border-brand-purple text-brand-purple bg-[#1a1b21]/20'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  File Explorer
                </button>
              </div>

              {/* Tab Content Panels */}
              <div className="flex-1 flex flex-col overflow-hidden bg-bg-base/40">
                {activeTab === 'chat' ? (
                  <AIChat
                    chatHistory={chatHistory}
                    promptText={promptText}
                    setPromptText={setPromptText}
                    onSend={handleSendPrompt}
                    isGenerating={isGenerating}
                  />
                ) : (
                  <FileExplorer
                    filesList={filesList}
                    selectedFilePath={selectedFile?.path}
                    onOpenFile={handleOpenFile}
                    isCreatingFile={isCreatingFile}
                    setIsCreatingFile={setIsCreatingFile}
                    newFilePath={newFilePath}
                    setNewFilePath={setNewFilePath}
                    onCreateFileSubmit={handleCreateFileSubmit}
                    onRefresh={() => loadFilesList(sandboxId)}
                  />
                )}
              </div>
            </div>

            {/* Center Panel: Editor with contrasting Claude color */}
            <div className="flex-1 bg-[#18181c] border-r border-white/5 flex flex-col overflow-hidden min-w-0">
              {selectedFile ? (
                <Editor
                  file={selectedFile.path}
                  content={selectedFile.currentContent}
                  onChange={(val) =>
                    setSelectedFile(prev => ({ ...prev, currentContent: val }))
                  }
                  onSave={handleSaveFile}
                  isSaving={isSaving}
                />
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 select-none bg-[#18181c]">
                  <div className="w-12 h-12 rounded-xl bg-[#121318] border border-white/5 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-zinc-500 text-[24px]">
                      code
                    </span>
                  </div>
                  <h3 className="text-zinc-300 font-semibold text-sm mb-1">No file loaded</h3>
                  <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                    Select a file from the explorer on the left or prompt AI to build components to generate files.
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel: Split Preview & Terminal */}
            <div className="w-[500px] min-w-[500px] flex flex-col overflow-hidden bg-[#0d0e13]/60 shrink-0">
              
              {/* Top: Live Preview */}
              <div className="flex-1 flex flex-col overflow-hidden border-b border-white/5">
                
                {/* Browser chrome */}
                <div className="h-10 bg-[#16161a] border-b border-white/5 flex items-center px-4 justify-between select-none shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
                    <span className="text-[10px] font-bold text-on-surface-variant ml-2 font-mono uppercase tracking-wider">
                      Live Preview
                    </span>
                  </div>

                  <div className="flex-1 max-w-[240px] bg-[#09090b] border border-white/5 px-2.5 py-0.5 rounded text-[11px] font-mono text-zinc-500 truncate mx-4 text-center">
                    {previewUrl}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewKey(prev => prev + 1)}
                      className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-white transition-colors cursor-pointer"
                      title="Reload iframe preview"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                      </svg>
                    </button>
                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-white/5 rounded text-on-surface-variant hover:text-white transition-colors flex items-center cursor-pointer"
                        title="Open in new tab"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {/* Iframe Viewport */}
                <div className="flex-1 bg-white relative">
                  {previewUrl ? (
                    <iframe
                      key={previewKey}
                      src={previewUrl}
                      title="Sandbox Preview"
                      className="w-full h-full border-none bg-white"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#121214] flex items-center justify-center text-zinc-500 text-xs">
                      Loading preview engine...
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Terminal console */}
              <div className="h-[280px] min-h-[280px] shrink-0 flex flex-col overflow-hidden">
                <TerminalConsole ref={terminalRef} onClear={handleClearTerminal} />
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
