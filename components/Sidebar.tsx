import React, { useRef } from 'react';
import { Layers, PlusCircle, PlayCircle, Settings, Box, Download, Upload, FileJson } from 'lucide-react';
import { ViewState } from '../types';
import { storageService } from '../services/storageService';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = React.useState(false);

  // Responsive classes: Glassmorphism base
  const containerClass = "w-full h-16 md:w-20 md:h-full bg-black/40 backdrop-blur-md border-t md:border-t-0 md:border-r border-white/10 flex md:flex-col flex-row items-center justify-around md:justify-start md:py-6 z-20 relative shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)]";
  
  const navItemClass = (view: ViewState) => 
    `p-3 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center relative group ${
      currentView === view 
        ? 'text-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] border border-cyan-500/30' 
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
    }`;

  const handleExport = () => {
    const data = storageService.getAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-architect-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowSettings(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm('This will overwrite your current library. Continue?')) {
            json.forEach(t => storageService.save(t));
            window.location.reload();
          }
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Failed to parse JSON.');
      }
    };
    reader.readAsText(file);
    setShowSettings(false);
  };

  return (
    <div className={containerClass}>
      {/* Logo - Holographic Gradient */}
      <div className="hidden md:block mb-8 group">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all duration-500">
          <Box className="text-white w-6 h-6" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 w-full md:px-3 flex md:flex-col flex-row items-center justify-evenly md:justify-start md:gap-4">
        <div 
          className={navItemClass('library')} 
          onClick={() => onChangeView('library')}
          title="Prompt Library"
        >
          <Layers size={24} />
          {currentView === 'library' && <div className="absolute inset-0 rounded-xl bg-cyan-400/10 animate-pulse-slow"></div>}
        </div>
        
        <div 
          className={navItemClass('editor')} 
          onClick={() => onChangeView('editor')}
          title="Create Prompt"
        >
          <PlusCircle size={24} />
          {currentView === 'editor' && <div className="absolute inset-0 rounded-xl bg-cyan-400/10 animate-pulse-slow"></div>}
        </div>

        <div 
          className={navItemClass('execution')} 
          onClick={() => onChangeView('execution')}
          title="Run Prompt"
        >
          <PlayCircle size={24} />
          {currentView === 'execution' && <div className="absolute inset-0 rounded-xl bg-cyan-400/10 animate-pulse-slow"></div>}
        </div>
        
        {/* Mobile Settings Trigger */}
        <div className="md:hidden">
             <div 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${showSettings ? 'text-cyan-400' : 'text-zinc-500'}`}
            >
              <Settings size={24} />
            </div>
        </div>
      </div>

      {/* Desktop Settings Trigger */}
      <div className="hidden md:block mb-4 relative">
        <div 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg cursor-pointer transition-all duration-300 ${showSettings ? 'text-cyan-400 bg-white/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Settings size={20} />
        </div>
      </div>
      
      {/* Settings Popover - Glass Style */}
      {showSettings && (
          <div className="absolute bottom-16 right-4 md:bottom-0 md:left-16 md:right-auto w-52 bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1 font-mono">
              Data Management
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-colors text-left group"
            >
              <Download size={14} className="group-hover:animate-bounce" /> Export JSON
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-zinc-400 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-lg transition-colors text-left group"
            >
              <Upload size={14} className="group-hover:animate-bounce" /> Import JSON
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              accept=".json"
            />
            <div className="mt-1 pt-2 border-t border-white/5 px-3 py-1 flex justify-between items-center">
              <span className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono">
                <FileJson size={10} /> v1.0.0
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Sidebar;