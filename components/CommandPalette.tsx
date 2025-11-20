import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, Hash, Zap } from 'lucide-react';
import { PromptTemplate } from '../types';
import { storageService } from '../services/storageService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: PromptTemplate) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PromptTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(storageService.getAll().slice(0, 5));
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query) {
      setResults(storageService.getAll().slice(0, 5));
    } else {
      // Sync search for speed in command palette, avoiding async embedding for UI snappiness
      // We use the non-embedding search here for "Quick Pick" speed (NFR-01)
      const all = storageService.getAll();
      const lowerQ = query.toLowerCase();
      const filtered = all.filter(p => 
        p.name.toLowerCase().includes(lowerQ) || 
        p.tags.some(t => t.includes(lowerQ))
      ).slice(0, 5);
      setResults(filtered);
    }
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search className="text-slate-400" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-white px-4 py-4 placeholder-slate-500"
            placeholder="Search prompts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">ESC</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 ? (
             <div className="px-4 py-8 text-center text-slate-500">
               No results found.
             </div>
          ) : (
            results.map((prompt, index) => (
              <div
                key={prompt.id}
                className={`px-4 py-3 mx-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                  index === selectedIndex ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
                onClick={() => {
                  onSelect(prompt);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-md ${index === selectedIndex ? 'bg-indigo-500' : 'bg-slate-800'}`}>
                    <Command size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{prompt.name}</span>
                    <div className={`flex items-center gap-2 text-xs ${index === selectedIndex ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {prompt.modelPreference && (
                        <span className="flex items-center gap-0.5"><Zap size={10} /> {prompt.modelPreference.mode}</span>
                      )}
                      {prompt.tags.slice(0, 2).map(t => (
                         <span key={t} className="flex items-center gap-0.5"><Hash size={10} /> {t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {index === selectedIndex && (
                  <ArrowRight size={16} className="animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
           <span><strong>↑↓</strong> to navigate</span>
           <span><strong>Enter</strong> to select</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;