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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-black/80 border border-cyan-500/30 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-white/10 bg-white/5">
          <Search className="text-cyan-500" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg text-white px-4 py-4 placeholder-zinc-500 font-mono"
            placeholder="INITIATE_SEARCH_PROTOCOL..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-500 border border-zinc-800">ESC</span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {results.length === 0 ? (
             <div className="px-4 py-8 text-center text-zinc-500 font-mono text-xs">
               [NO_MATCHES_FOUND]
             </div>
          ) : (
            results.map((prompt, index) => (
              <div
                key={prompt.id}
                className={`px-4 py-3 mx-2 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                  index === selectedIndex 
                    ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                    : 'border-transparent text-zinc-400 hover:bg-white/5'
                }`}
                onClick={() => {
                  onSelect(prompt);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-md transition-colors ${index === selectedIndex ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-600'}`}>
                    <Command size={16} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate font-mono tracking-tight">{prompt.name}</span>
                    <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider ${index === selectedIndex ? 'text-cyan-300' : 'text-zinc-600'}`}>
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
                  <ArrowRight size={16} className="text-cyan-400 animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="bg-black/50 px-4 py-2 border-t border-white/5 text-[10px] text-zinc-600 flex justify-between font-mono uppercase">
           <span><strong>↑↓</strong> NAVIGATE</span>
           <span><strong>ENTER</strong> ENGAGE</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;