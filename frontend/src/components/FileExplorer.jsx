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
    <aside className="flex-1 flex flex-col overflow-hidden bg-bg-base">
      {/* FileExplorer Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 bg-[#0d0e13]/60 shrink-0">
        <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Explorer</span>
        <button
          onClick={onRefresh}
          className="text-on-surface-variant hover:text-white transition-colors cursor-pointer"
          title="Refresh explorer file list"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Create New File button */}
        <div>
          {!isCreatingFile ? (
            <button
              onClick={() => setIsCreatingFile(true)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-white/10 hover:border-brand-purple/60 text-xs font-semibold text-on-surface-variant hover:text-brand-purple rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New File
            </button>
          ) : (
            <form onSubmit={onCreateFileSubmit} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="src/components/Card.jsx"
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#09090b] border border-white/10 rounded-lg text-xs text-zinc-200 outline-none focus:border-brand-purple/60 font-mono"
              />
              <button
                type="submit"
                className="px-3 bg-brand-purple hover:bg-[#6659e5] text-white text-xs font-semibold rounded-lg active:scale-95 cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFile(false)}
                className="px-2 bg-[#1e1f25] hover:bg-[#292a2f] text-on-surface-variant text-xs rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </form>
          )}
        </div>

        {/* Tree structure representation */}
        <div className="space-y-3 font-mono text-[12px] select-none">
          {Object.keys(groupedFiles).map((folder) => {
            const files = groupedFiles[folder];
            const isRoot = folder === 'root';
            const isCollapsed = collapsedFolders[folder];

            return (
              <div key={folder} className="space-y-1">
                {!isRoot && (
                  <div
                    onClick={() => toggleFolder(folder)}
                    className="flex items-center gap-1.5 py-1 text-on-surface hover:text-white cursor-pointer select-none"
                  >
                    <svg
                      className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <svg className="w-3.5 h-3.5 text-[#a882ff] fill-current" viewBox="0 0 24 24">
                      <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                    <span className="font-semibold">{folder}/</span>
                  </div>
                )}
                
                {(!isCollapsed || isRoot) && (
                  <div className={`${!isRoot ? 'pl-4 border-l border-white/5 ml-1.5 space-y-1' : 'space-y-1'}`}>
                    {files.map((file) => {
                      const isActive = selectedFilePath === file.path;
                      // Determine code symbol/icon based on file extension
                      let extensionIcon = (
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      );
                      if (file.path.endsWith('.css')) {
                        extensionIcon = (
                          <span className="material-symbols-outlined text-[15px] text-[#2dd4bf]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            css
                          </span>
                        );
                      } else if (file.path.endsWith('.jsx') || file.path.endsWith('.js')) {
                        extensionIcon = (
                          <span className="material-symbols-outlined text-[15px] text-[#44e2cd]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            code
                          </span>
                        );
                      } else if (file.path.endsWith('.html')) {
                        extensionIcon = (
                          <span className="material-symbols-outlined text-[15px] text-orange-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                            html
                          </span>
                        );
                      } else if (file.path.endsWith('.json')) {
                        extensionIcon = (
                          <span className="material-symbols-outlined text-[15px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                            description
                          </span>
                        );
                      }

                      return (
                        <button
                          key={file.path}
                          onClick={() => onOpenFile(file.path)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-brand-purple/10 text-brand-purple border-l-2 border-brand-purple font-semibold'
                              : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {extensionIcon}
                          <span className="truncate">{file.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
