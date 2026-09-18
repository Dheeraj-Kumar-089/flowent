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
  const [existingSandboxId, setExistingSandboxId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'starting' | 'ready' | 'error'
  const [startSteps, setStartSteps] = useState([
    { id: 1, label: 'Allocating sandbox container pod', status: 'pending' },
    { id: 2, label: 'Configuring network routes & DNS', status: 'pending' },
    { id: 3, label: 'Unpacking React templates & configurations', status: 'pending' },
    { id: 4, label: 'Bootstrapping local developer agent', status: 'pending' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Layout & Resizing States
  const [leftWidth, setLeftWidth] = useState(340); // px
  const [middleWidth, setMiddleWidth] = useState(480); // px
  const [previewHeightPct, setPreviewHeightPct] = useState(55); // percent
  const [fullscreenPanel, setFullscreenPanel] = useState(null); // 'editor' | 'preview' | 'terminal' | null
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'files' | 'editor' | 'preview' | 'terminal'

  // Workspace file & editor states
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'files'
  const [filesList, setFilesList] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null); // { path, originalContent, currentContent }
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
  const [previewKey, setPreviewKey] = useState(0);

  // Refs
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const socketInstance = useRef(null);
  const fitAddonInstance = useRef(null);

  // Helper for agent URL
  const getAgentBaseUrl = (sId) => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const baseDomain = host.includes('localhost') ? 'localhost' : host;
    return `${protocol}//${sId}.agent.${baseDomain}`;
  };

  const getPreviewBaseUrl = (sId) => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    const baseDomain = host.includes('localhost') ? 'localhost' : host;
    return `${protocol}//${sId}.preview.${baseDomain}/`;
  };

  // Check auth session & discover existing active sandbox on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.loggedIn && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // Check if there is an active sandbox saved in localStorage
    const savedSandboxId = localStorage.getItem('flowent_active_sandbox');
    if (savedSandboxId) {
      // Probe agent list-files to verify if the container is still alive
      fetch(`${getAgentBaseUrl(savedSandboxId)}/list-files?t=${Date.now()}`)
        .then(res => {
          if (res.ok) {
            setExistingSandboxId(savedSandboxId);
          } else {
            localStorage.removeItem('flowent_active_sandbox');
            setExistingSandboxId(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('flowent_active_sandbox');
          setExistingSandboxId(null);
        });
    }
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

  // Fetch workspace file list
  const loadFilesList = async (sId) => {
    try {
      const response = await fetch(`${getAgentBaseUrl(sId)}/list-files?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        setFilesList(files);
        return files;
      }
    } catch (err) {
      console.error('Error fetching file list:', err);
    }
    return [];
  };

  // Open file in Editor
  const handleOpenFile = async (filepath, sId = sandboxId) => {
    const targetId = sId || sandboxId;
    if (!targetId) return;
    try {
      const response = await fetch(
        `${getAgentBaseUrl(targetId)}/read-files?files=${encodeURIComponent(filepath)}&t=${Date.now()}`
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
        setMobileTab('editor');
      }
    } catch (err) {
      console.error('Error reading file:', err);
    }
  };

  // When entering ready status, fetch files immediately and auto-select primary file
  useEffect(() => {
    if (status === 'ready' && sandboxId) {
      loadFilesList(sandboxId).then(files => {
        if (files && files.length > 0) {
          const target = files.includes('src/App.jsx') ? 'src/App.jsx' : files[0];
          handleOpenFile(target, sandboxId);
        }
      });
    }
  }, [status, sandboxId]);

  // Save changes to active file manually
  const handleSaveFile = useCallback(async () => {
    if (!selectedFile || isSaving || !sandboxId) return;
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
              content: '// Created via Flowent IDE'
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

      // Refresh files list and hot-reload preview
      const updatedFiles = await loadFilesList(sandboxId);
      setPreviewKey(prev => prev + 1);

      // If user had a file open, reload it; otherwise open src/App.jsx automatically
      if (selectedFile) {
        await handleOpenFile(selectedFile.path);
      } else if (updatedFiles.includes('src/App.jsx')) {
        await handleOpenFile('src/App.jsx');
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

  // Resume Existing Sandbox
  const handleResumeSandbox = async (targetId) => {
    setStatus('starting');
    setErrorMessage('');
    const id = targetId || existingSandboxId;
    setSandboxId(id);
    setPreviewUrl(getPreviewBaseUrl(id));
    localStorage.setItem('flowent_active_sandbox', id);

    // Load workspace files
    const files = await loadFilesList(id);
    if (files.includes('src/App.jsx')) {
      await handleOpenFile('src/App.jsx');
    }

    setStatus('ready');
  };

  // Launch New Sandbox Server
  const handleStartSandbox = async () => {
    // If there is an existing sandbox, tear it down first to guarantee 1 container per user
    if (existingSandboxId) {
      try {
        await fetch(`/api/sandbox/${existingSandboxId}`, { method: 'DELETE' });
      } catch (e) {}
    }

    setStatus('starting');
    setErrorMessage('');

    const stepsCopy = [
      { id: 1, label: 'Allocating sandbox container pod', status: 'starting' },
      { id: 2, label: 'Configuring network routes & DNS', status: 'pending' },
      { id: 3, label: 'Unpacking React templates & configurations', status: 'pending' },
      { id: 4, label: 'Bootstrapping local developer agent', status: 'pending' }
    ];
    setStartSteps(stepsCopy);

    try {
      const response = await fetch('/api/sandbox/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to start sandbox');
      }

      const data = await response.json();
      setSandboxId(data.sandboxId);
      setPreviewUrl(data.previewUrl);
      setExistingSandboxId(data.sandboxId);
      localStorage.setItem('flowent_active_sandbox', data.sandboxId);

      // Step 1 done
      stepsCopy[0].status = 'completed';
      stepsCopy[1].status = 'starting';
      setStartSteps([...stepsCopy]);

      // Step 2 done
      setTimeout(() => {
        stepsCopy[1].status = 'completed';
        stepsCopy[2].status = 'starting';
        setStartSteps([...stepsCopy]);
      }, 2000);

      // Step 3 done
      setTimeout(() => {
        stepsCopy[2].status = 'completed';
        stepsCopy[3].status = 'starting';
        setStartSteps([...stepsCopy]);
      }, 5000);

      // Step 4: Poll agent endpoint until 200 OK
      const agentUrl = `${getAgentBaseUrl(data.sandboxId)}/list-files`;
      let isReady = false;
      let initialFiles = [];
      let attempts = 0;
      const maxAttempts = 45; // 45 * 1.5s = ~68s total boot allowance

      while (!isReady && attempts < maxAttempts) {
        attempts++;
        try {
          const res = await fetch(`${agentUrl}?t=${Date.now()}`);
          if (res.ok) {
            const fileData = await res.json().catch(() => ({}));
            initialFiles = fileData.files || [];
            isReady = true;
            break;
          }
        } catch (e) {
          // Network / TLS handshake in progress while pod routes initialize
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      if (!isReady) {
        throw new Error('Sandbox agent took too long to boot up. Please check cluster health.');
      }

      stepsCopy[3].status = 'completed';
      setStartSteps([...stepsCopy]);

      setFilesList(initialFiles);
      if (initialFiles.includes('src/App.jsx')) {
        await handleOpenFile('src/App.jsx', data.sandboxId);
      } else if (initialFiles.length > 0) {
        await handleOpenFile(initialFiles[0], data.sandboxId);
      }

      setTimeout(() => {
        setStatus('ready');
      }, 500);

    } catch (err) {
      console.error('Sandbox start error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unknown error starting sandbox');
    }
  };

  // Keepalive interval
  useEffect(() => {
    if (status === 'ready' && sandboxId) {
      const interval = setInterval(() => {
        fetch(`/api/sandbox/keepalive/${sandboxId}`, { method: 'POST' }).catch(() => {});
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [status, sandboxId]);

  // WebSocket & xterm initialization
  useEffect(() => {
    if (status === 'ready' && sandboxId && terminalRef.current) {
      if (xtermInstance.current) {
        xtermInstance.current.dispose();
      }
      if (socketInstance.current) {
        socketInstance.current.disconnect();
      }

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
        theme: {
          background: '#07080a',
          foreground: '#eaecef',
          cursor: '#e09f3e',
          selectionBackground: 'rgba(224, 159, 62, 0.25)',
          black: '#0b0c0e',
          red: '#ef4444',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#60a5fa',
          magenta: '#a78bfa',
          cyan: '#14b8a6',
          white: '#eaecef'
        }
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
        term.write('\r\n\x1b[1;33m[Flowent Workspace Terminal Connected]\x1b[0m\r\n');
      });

      socket.on('terminal-output', (data) => {
        term.write(data);
      });

      socket.on('disconnect', () => {
        term.write('\r\n\x1b[1;31m[Flowent Terminal Disconnected]\x1b[0m\r\n');
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

  const handleDestroySandbox = async () => {
    if (sandboxId) {
      try {
        await fetch(`/api/sandbox/${sandboxId}`, { method: 'DELETE' });
      } catch (e) {}
    }
    localStorage.removeItem('flowent_active_sandbox');
    setSandboxId(null);
    setExistingSandboxId(null);
    setPreviewUrl(null);
    setStatus('idle');
    setFilesList([]);
    setSelectedFile(null);
  };

  const handleClearTerminal = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  // Horizontal splitter dragging
  const isDraggingH1 = useRef(false);
  const isDraggingH2 = useRef(false);
  const isDraggingV = useRef(false);

  const startDragH1 = () => {
    isDraggingH1.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const startDragH2 = () => {
    isDraggingH2.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const startDragV = () => {
    isDraggingV.current = true;
    document.body.style.cursor = 'row-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingH1.current) {
        setLeftWidth(Math.max(260, Math.min(500, e.clientX)));
      } else if (isDraggingH2.current) {
        setMiddleWidth(Math.max(300, Math.min(800, e.clientX - leftWidth)));
      } else if (isDraggingV.current) {
        const totalHeight = window.innerHeight - 44; // sub header
        const newPct = Math.max(25, Math.min(80, (e.clientY / totalHeight) * 100));
        setPreviewHeightPct(newPct);
        if (fitAddonInstance.current) {
          fitAddonInstance.current.fit();
        }
      }
    };

    const handleMouseUp = () => {
      isDraggingH1.current = false;
      isDraggingH2.current = false;
      isDraggingV.current = false;
      document.body.style.cursor = 'default';
      if (fitAddonInstance.current) {
        fitAddonInstance.current.fit();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [leftWidth]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0c0e] text-[#eaecef] overflow-hidden font-sans select-none">
      
      {/* 1. Landing view */}
      {status === 'idle' && (
        <LandingPage
          onStartSandbox={handleStartSandbox}
          onResumeSandbox={handleResumeSandbox}
          existingSandboxId={existingSandboxId}
          user={user}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      )}

      {/* 2. Loading / provisioning view */}
      {status === 'starting' && (
        <LaunchProgress steps={startSteps} />
      )}

      {/* 3. Error view */}
      {status === 'error' && (
        <div className="flex-grow flex flex-col justify-center items-center bg-[#0b0c0e] px-4">
          <div className="p-6 max-w-md w-full bg-[#14161c] border border-red-500/30 rounded-[5px] text-center space-y-4 shadow-xl">
            <div className="w-10 h-10 mx-auto rounded-[5px] bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-lg">
              ✕
            </div>
            <h2 className="text-base font-bold text-white">Workspace Launch Failed</h2>
            <p className="text-xs text-[#8a8f9d] font-mono">{errorMessage}</p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-1.5 bg-[#1a1d24] hover:bg-[#222630] text-white text-xs font-semibold rounded-[5px] cursor-pointer"
              >
                Back to Home
              </button>
              <button
                onClick={handleStartSandbox}
                className="px-4 py-1.5 bg-[#e09f3e] hover:bg-[#c98b30] text-black text-xs font-semibold rounded-[5px] cursor-pointer"
              >
                Retry Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Workspace IDE */}
      {status === 'ready' && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0b0c0e]">
          
          {/* Top IDE Header Bar */}
          <header className="h-11 px-3 bg-[#0e1015] border-b border-white/5 flex items-center justify-between shrink-0 select-none z-30">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[#e09f3e] rounded-[5px] flex items-center justify-center text-black font-bold">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4v10l8 4 8-4V7z" />
                  </svg>
                </div>
                <span className="font-bold text-xs tracking-tight text-white">flowent</span>
              </div>

              {/* Active container badge */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#14161c] border border-white/5 rounded-[5px] text-[11px] font-mono text-[#8a8f9d]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
                <span className="truncate max-w-[130px]">{sandboxId}</span>
              </div>
            </div>

            {/* Mobile View Switcher (Visible only on small screens) */}
            <div className="flex md:hidden items-center bg-[#14161c] p-0.5 rounded-[5px] border border-white/5 text-[10px] font-mono">
              <button
                onClick={() => setMobileTab('chat')}
                className={`px-2 py-1 rounded-[5px] ${mobileTab === 'chat' ? 'bg-[#e09f3e] text-black font-semibold' : 'text-[#8a8f9d]'}`}
              >
                AI
              </button>
              <button
                onClick={() => setMobileTab('files')}
                className={`px-2 py-1 rounded-[5px] ${mobileTab === 'files' ? 'bg-[#e09f3e] text-black font-semibold' : 'text-[#8a8f9d]'}`}
              >
                Files
              </button>
              <button
                onClick={() => setMobileTab('editor')}
                className={`px-2 py-1 rounded-[5px] ${mobileTab === 'editor' ? 'bg-[#e09f3e] text-black font-semibold' : 'text-[#8a8f9d]'}`}
              >
                Code
              </button>
              <button
                onClick={() => setMobileTab('preview')}
                className={`px-2 py-1 rounded-[5px] ${mobileTab === 'preview' ? 'bg-[#e09f3e] text-black font-semibold' : 'text-[#8a8f9d]'}`}
              >
                Preview
              </button>
              <button
                onClick={() => setMobileTab('terminal')}
                className={`px-2 py-1 rounded-[5px] ${mobileTab === 'terminal' ? 'bg-[#e09f3e] text-black font-semibold' : 'text-[#8a8f9d]'}`}
              >
                Term
              </button>
            </div>

            {/* Profile & Sandbox Management Dropdown */}
            <div className="relative flex items-center gap-2">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 px-2 py-1 bg-[#14161c] hover:bg-[#1a1d24] border border-white/10 rounded-[5px] text-xs text-white cursor-pointer transition-colors"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="User" className="w-5 h-5 rounded-[5px] object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-[5px] bg-[#e09f3e] text-black text-[10px] font-bold flex items-center justify-center">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline font-medium text-xs truncate max-w-[100px]">{user?.name || 'Workspace'}</span>
                <svg className="w-3 h-3 text-[#8a8f9d]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-10 w-56 bg-[#14161c] border border-white/10 rounded-[5px] shadow-2xl p-1.5 z-50 flex flex-col gap-1 font-mono text-xs">
                  <div className="px-2.5 py-1.5 border-b border-white/5 mb-1">
                    <p className="font-semibold text-white truncate">{user?.name || 'Developer'}</p>
                    <p className="text-[10px] text-[#8a8f9d] truncate">{user?.email || 'Active Session'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (confirm('Create a new workspace? This will terminate the current container.')) {
                        handleStartSandbox();
                      }
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 rounded-[5px] text-[#eaecef] hover:text-[#e09f3e] transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>➕</span>
                    <span>New Sandbox</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      if (confirm('Terminate this sandbox workspace?')) {
                        handleDestroySandbox();
                      }
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-red-500/10 rounded-[5px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>🗑️</span>
                    <span>Destroy Sandbox</span>
                  </button>

                  {user && (
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 border-t border-white/5 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors flex items-center gap-2 cursor-pointer mt-1"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Main 3-Column Resizable Body */}
          <div className="flex-1 flex overflow-hidden relative">

            {/* Left Column: AI Assistant & File Explorer */}
            <div
              style={{ width: `${leftWidth}px` }}
              className={`flex-shrink-0 flex flex-col border-r border-white/5 bg-[#0c0d11] overflow-hidden ${
                mobileTab === 'chat' || mobileTab === 'files' ? 'flex w-full absolute inset-0 z-20 md:static md:w-auto md:z-auto' : 'hidden md:flex'
              }`}
            >
              {/* Tab selector bar */}
              <div className="h-9 flex items-center px-2 bg-[#090a0d] border-b border-white/5 gap-1 shrink-0 select-none">
                <button
                  onClick={() => { setActiveTab('chat'); setMobileTab('chat'); }}
                  className={`flex-1 py-1 text-xs font-semibold rounded-[5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'chat'
                      ? 'bg-[#1a1d24] text-[#e09f3e] border border-white/10'
                      : 'text-[#8a8f9d] hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>AI Assistant</span>
                </button>

                <button
                  onClick={() => { setActiveTab('files'); setMobileTab('files'); }}
                  className={`flex-1 py-1 text-xs font-semibold rounded-[5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'files'
                      ? 'bg-[#1a1d24] text-[#e09f3e] border border-white/10'
                      : 'text-[#8a8f9d] hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Files ({filesList.length})</span>
                </button>
              </div>

              {/* Tab Content */}
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

            {/* Splitter 1: Left & Middle Drag Handle */}
            <div
              onMouseDown={startDragH1}
              className="hidden md:block w-1 bg-white/5 hover:bg-[#e09f3e]/40 transition-colors cursor-col-resize shrink-0 select-none z-10"
              title="Resize sidebar"
            />

            {/* Middle Column: Code Editor */}
            <div
              style={{ width: fullscreenPanel === 'editor' ? '100%' : `${middleWidth}px` }}
              className={`flex-1 flex flex-col border-r border-white/5 bg-[#101217] overflow-hidden ${
                fullscreenPanel === 'editor' ? 'absolute inset-0 z-40 bg-[#101217]' : ''
              } ${
                mobileTab === 'editor' ? 'flex w-full absolute inset-0 z-20 md:static md:w-auto md:z-auto' : 'hidden md:flex'
              }`}
            >
              {selectedFile ? (
                <Editor
                  file={selectedFile.path}
                  content={selectedFile.currentContent}
                  onChange={(val) => setSelectedFile(prev => ({ ...prev, currentContent: val }))}
                  onSave={handleSaveFile}
                  isSaving={isSaving}
                  isFullscreen={fullscreenPanel === 'editor'}
                  onToggleFullscreen={() => setFullscreenPanel(fullscreenPanel === 'editor' ? null : 'editor')}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#6b7280] font-mono text-xs p-6 text-center space-y-2">
                  <svg className="w-8 h-8 text-[#374151]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                  <p className="text-white font-medium">No file selected</p>
                  <p className="text-[#8a8f9d]">Pick a file from the explorer on the left or prompt AI to build components.</p>
                </div>
              )}
            </div>

            {/* Splitter 2: Middle & Right Drag Handle */}
            <div
              onMouseDown={startDragH2}
              className="hidden md:block w-1 bg-white/5 hover:bg-[#e09f3e]/40 transition-colors cursor-col-resize shrink-0 select-none z-10"
              title="Resize editor & preview"
            />

            {/* Right Column: Live Preview (Top) + Terminal (Bottom) */}
            <div
              className={`flex-1 flex flex-col overflow-hidden bg-[#07080a] ${
                mobileTab === 'preview' || mobileTab === 'terminal' ? 'flex w-full absolute inset-0 z-20 md:static md:w-auto md:z-auto' : 'hidden md:flex'
              }`}
            >
              {/* Preview Box */}
              <div
                style={{ height: fullscreenPanel === 'preview' ? '100%' : `${previewHeightPct}%` }}
                className={`flex flex-col border-b border-white/5 overflow-hidden bg-[#07080a] ${
                  fullscreenPanel === 'preview' ? 'absolute inset-0 z-40 bg-[#07080a]' : ''
                } ${
                  mobileTab === 'terminal' ? 'hidden md:flex' : 'flex'
                }`}
              >
                {/* Preview Header */}
                <div className="h-9 px-3 bg-[#090a0d] border-b border-white/5 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/80"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/80"></span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-[#8a8f9d] uppercase tracking-wider ml-1">
                      Live Preview
                    </span>
                  </div>

                  <div className="flex-1 max-w-[280px] bg-[#07080a] border border-white/5 px-2 py-0.5 rounded-[5px] text-[10px] font-mono text-[#8a8f9d] truncate mx-2 text-center">
                    {previewUrl}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewKey(prev => prev + 1)}
                      className="p-1 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors cursor-pointer"
                      title="Reload iframe"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                      </svg>
                    </button>

                    <button
                      onClick={() => setFullscreenPanel(fullscreenPanel === 'preview' ? null : 'preview')}
                      className="p-1 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors cursor-pointer"
                      title={fullscreenPanel === 'preview' ? "Exit Fullscreen" : "Fullscreen Preview"}
                    >
                      {fullscreenPanel === 'preview' ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0l5 0m-5 0l0 5m11 11l5 5m0 0l-5 0m5 0l0-5M9 15l-5 5m0 0l5 0m-5 0l0-5m11-11l5-5m0 0l-5 0m5 0l0 5" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      )}
                    </button>

                    {previewUrl && (
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 hover:bg-white/5 rounded-[5px] text-[#8a8f9d] hover:text-white transition-colors flex items-center cursor-pointer"
                        title="Open in new browser tab"
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
                      className="w-full h-full border-none bg-white rounded-[5px]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[#0b0c0e] flex items-center justify-center text-[#6b7280] text-xs font-mono">
                      Loading preview engine...
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Splitter: Preview & Terminal Drag Handle */}
              <div
                onMouseDown={startDragV}
                className="hidden md:block h-1 bg-white/5 hover:bg-[#e09f3e]/40 transition-colors cursor-row-resize shrink-0 select-none z-10"
                title="Resize preview & terminal"
              />

              {/* Terminal Box (Bottom) */}
              <div
                style={{ height: fullscreenPanel === 'terminal' ? '100%' : `${100 - previewHeightPct}%` }}
                className={`flex flex-col overflow-hidden ${
                  fullscreenPanel === 'terminal' ? 'absolute inset-0 z-40 bg-[#07080a]' : ''
                } ${
                  mobileTab === 'preview' ? 'hidden md:flex' : 'flex'
                }`}
              >
                <TerminalConsole
                  ref={terminalRef}
                  onClear={handleClearTerminal}
                  isFullscreen={fullscreenPanel === 'terminal'}
                  onToggleFullscreen={() => setFullscreenPanel(fullscreenPanel === 'terminal' ? null : 'terminal')}
                />
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default App;
