import React from 'react';
import { Layers, PlusCircle, PlayCircle, Settings, Box } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const navItemClass = (view: ViewState) => 
    `p-3 mb-2 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center ${
      currentView === view 
        ? 'bg-indigo-550 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <div className="w-20 h-full bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 z-20">
      <div className="mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <Box className="text-white w-6 h-6" />
        </div>
      </div>

      <div className="flex-1 w-full px-3 flex flex-col items-center">
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
      </div>

      <div className="mb-4 text-slate-600">
        <Settings size={20} className="hover:text-slate-400 cursor-pointer transition-colors" />
      </div>
    </div>
  );
};

export default Sidebar;
