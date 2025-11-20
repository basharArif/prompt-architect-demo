import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LibraryView from './components/LibraryView';
import EditorView from './components/EditorView';
import ExecutionView from './components/ExecutionView';
import { ViewState, PromptTemplate } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('library');
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplate | null>(null);

  // Navigation Handlers
  const handleSelectPrompt = (prompt: PromptTemplate) => {
    setSelectedPrompt(prompt);
    setCurrentView('execution');
  };

  const handleEditPrompt = (prompt: PromptTemplate) => {
    setEditingPrompt(prompt);
    setCurrentView('editor');
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
    <div className="flex w-full h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
          if (view === 'editor') handleCreatePrompt();
          else setCurrentView(view);
        }} 
      />
      
      <main className="flex-1 overflow-hidden relative">
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
    </div>
  );
};

export default App;
