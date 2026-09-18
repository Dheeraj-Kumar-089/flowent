import { useState } from 'react';

// Helper for grouping files by directory structure
const groupFilesByDirectory = (filesList) => {
  const groups = {};
  filesList.forEach(file => {
    const parts = file.split('/');
    if (parts.length > 1) {
      const folder = parts.slice(0, -1).join('/');
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push({
        name: parts[parts.length - 1],
        path: file
      });
    } else {
      if (!groups['root']) groups['root'] = [];
      groups['root'].push({
        name: file,
        path: file
      });
    }
  });
  return groups;
};

export default function FileExplorer({
  filesList,
  selectedFilePath,
  onOpenFile,
  isCreatingFile,
  setIsCreatingFile,
  newFilePath,
  setNewFilePath,
  onCreateFileSubmit,
  onRefresh
}) {
  const groupedFiles = groupFilesByDirectory(filesList);
  
  // Track open/collapsed states of folders
  const [collapsedFolders, setCollapsedFolders] = useState({});

  const toggleFolder = (folderName) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  return (
    <aside className="flex-1 flex flex-col overflow-hidden bg-[#0c0d11]">
      {/* FileExplorer Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-white/5 bg-[#090a0d] shrink-0 select-none">
        <span className="font-mono text-[11px] font-semibold text-[#8a8f9d] uppercase tracking-wider">Workspace Files</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsCreatingFile(true)}
            className="p-1 text-[#8a8f9d] hover:text-white hover:bg-white/5 rounded-[5px] transition-colors cursor-pointer"
            title="Create new file"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            onClick={onRefresh}
            className="p-1 text-[#8a8f9d] hover:text-white hover:bg-white/5 rounded-[5px] transition-colors cursor-pointer"
            title="Refresh file tree"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* New File Inline Creator Form */}
      {isCreatingFile && (
        <form onSubmit={onCreateFileSubmit} className="p-2 border-b border-white/5 bg-[#12141a] flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. src/components/Card.jsx"
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            className="flex-1 px-2.5 py-1 text-xs bg-[#090a0d] border border-white/10 rounded-[5px] text-[#eaecef] placeholder-[#4b5563] outline-none font-mono focus:border-[#e09f3e]"
            autoFocus
          />
          <button
            type="submit"
            className="px-2.5 py-1 bg-[#e09f3e] text-black text-xs font-semibold rounded-[5px] cursor-pointer active:scale-95"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreatingFile(false);
              setNewFilePath('');
            }}
            className="px-2 py-1 text-xs text-[#8a8f9d] hover:text-white rounded-[5px] cursor-pointer"
          >
            ✕
          </button>
        </form>
      )}

      {/* File Tree List View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs select-none">
        {filesList.length === 0 ? (
          <div className="p-4 text-center text-[#6b7280] text-xs">
            No workspace files found.
          </div>
        ) : (
          <>
            {/* Non-root directory folders */}
            {Object.keys(groupedFiles)
              .filter(k => k !== 'root')
              .map(folder => (
                <div key={folder} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(folder)}
                    className="flex items-center gap-1.5 px-2 py-1 text-[#8a8f9d] hover:text-white hover:bg-white/5 rounded-[5px] cursor-pointer transition-colors"
                  >
                    <span className="text-[10px] text-[#6b7280]">
                      {collapsedFolders[folder] ? '▶' : '▼'}
                    </span>
                    <svg className="w-3.5 h-3.5 text-[#e09f3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="truncate">{folder}</span>
                  </div>

                  {!collapsedFolders[folder] && (
                    <div className="pl-4 space-y-0.5 border-l border-white/5 ml-3">
                      {groupedFiles[folder].map(item => (
                        <div
                          key={item.path}
                          onClick={() => onOpenFile(item.path)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                            selectedFilePath === item.path
                              ? 'bg-[#1e222c] text-[#e09f3e] font-medium border border-white/10'
                              : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

            {/* Root folder files */}
            {groupedFiles['root'] &&
              groupedFiles['root'].map(item => (
                <div
                  key={item.path}
                  onClick={() => onOpenFile(item.path)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer transition-colors ${
                    selectedFilePath === item.path
                      ? 'bg-[#1e222c] text-[#e09f3e] font-medium border border-white/10'
                      : 'text-[#9ca3af] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="w-3.5 h-3.5 text-[#6b7280]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
          </>
        )}
      </div>
    </aside>
  );
}
