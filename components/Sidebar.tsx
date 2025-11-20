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

  // Responsive classes: Row on mobile, Column on Desktop
  const containerClass = "w-full h-16 md:w-20 md:h-full bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex md:flex-col flex-row items-center justify-around md:justify-start md:py-6 z-20 relative shrink-0";
  
  const navItemClass = (view: ViewState) => 
    `p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center ${
      currentView === view 
        ? 'bg-indigo-550 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
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
            window.location.reload(); // Reload to refresh state across app
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
      {/* Logo - Hidden on mobile to save space */}
      <div className="hidden md:block mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <Box className="text-white w-6 h-6" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 w-full md:px-3 flex md:flex-col flex-row items-center justify-evenly md:justify-start md:gap-2">
        <div 
          className={navItemClass('library')} 
          onClick={() => onChangeView('library')}
          title="Prompt Library"
        >
          <Layers size={24} />
        </div>
        
        <div 
          className={navItemClass('editor')} 
          onClick={() => onChangeView('editor')}
          title="Create Prompt"
        >
          <PlusCircle size={24} />
        </div>

        <div 
          className={navItemClass('execution')} 
          onClick={() => onChangeView('execution')}
          title="Run Prompt"
        >
          <PlayCircle size={24} />
        </div>
        
        {/* Mobile Settings Trigger (Shown in flow on mobile) */}
        <div className="md:hidden">
             <div 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${showSettings ? 'text-indigo-400' : 'text-slate-600'}`}
            >
              <Settings size={24} />
            </div>
        </div>
      </div>

      {/* Desktop Settings Trigger */}
      <div className="hidden md:block mb-4 relative">
        <div 
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg cursor-pointer transition-colors ${showSettings ? 'text-indigo-400 bg-slate-800' : 'text-slate-600 hover:text-slate-400'}`}
        >
          <Settings size={20} />
        </div>
      </div>
      
      {/* Settings Popover - Responsive Position */}
      {showSettings && (
          <div className="absolute bottom-16 right-4 md:bottom-0 md:left-14 md:right-auto w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800 mb-1">
              Data Management
            </div>
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
            >
              <Download size={14} /> Export JSON
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors text-left"
            >
              <Upload size={14} /> Import JSON
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              className="hidden" 
              accept=".json"
            />
            <div className="mt-1 pt-2 border-t border-slate-800 px-3 py-1">
              <span className="text-[10px] text-slate-600 flex items-center gap-1">
                <FileJson size={10} /> v1.0.0
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

export default Sidebar;