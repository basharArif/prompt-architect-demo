import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LibraryView from './components/LibraryView';
import EditorView from './components/EditorView';
import ExecutionView from './components/ExecutionView';
import CommandPalette from './components/CommandPalette';
import { ViewState, PromptTemplate } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('library');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation Handlers
  const handleSelectPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setCurrentView('execution');
    setIsCommandPaletteOpen(false);
  };

  const handleEditPrompt = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setCurrentView('editor');
    setIsCommandPaletteOpen(false);
  };

  const handleCreatePrompt = () => {
    setEditingPrompt(null);
    setCurrentView('editor');
  };

  const handleSaveComplete = () => {
    setEditingPrompt(null);
    setCurrentView('library');
  };

  return (
    <div className="flex flex-col-reverse md:flex-row w-full h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
          if (view === 'editor') handleCreatePrompt();
          else setCurrentView(view);
        }} 
      />
      
      <main className="flex-1 overflow-hidden relative h-full bg-black/50 backdrop-blur-sm">
        {currentView === 'library' && (
          <LibraryView 
            onSelectPrompt={handleSelectPrompt}
            onEditPrompt={handleEditPrompt}
            onRunPrompt={handleSelectPrompt}
          />
        )}

        {currentView === 'editor' && (
          <EditorView 
            initialPrompt={editingPrompt}
            onSave={handleSaveComplete}
            onCancel={() => setCurrentView('library')}
          />
        )}

        {currentView === 'execution' && (
          <ExecutionView 
            prompt={selectedPrompt}
            onBack={() => setCurrentView('library')}
          />
        )}
      </main>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelect={handleSelectPrompt}
      />
    </div>
  );
};

export default App;