import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Hash, Clock, Edit3, Play, Trash2, Sparkles, X } from 'lucide-react';
import { PromptTemplate } from '../types';
import { storageService } from '../services/storageService';
import { generateEmbedding } from '../services/geminiService';

interface LibraryViewProps {
  onSelectPrompt: (prompt: PromptTemplate) => void;
  onEditPrompt: (prompt: PromptTemplate) => void;
  onRunPrompt: (prompt: PromptTemplate) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onSelectPrompt, onEditPrompt, onRunPrompt }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const loadPrompts = useCallback(() => {
    setPrompts(storageService.getAll());
  }, []);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchTerm) {
        setPrompts(storageService.getAll());
        return;
      }

      setIsSearching(true);
      let embedding: number[] | undefined;
      if (process.env.API_KEY) {
        embedding = await generateEmbedding(searchTerm);
      }
      
      const results = storageService.search(searchTerm, embedding);
      setPrompts(results);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      storageService.delete(id);
      loadPrompts();
    }
  };

  const uniqueTags = useMemo(() => {
    const allTags = new Set<string>();
    storageService.getAll().forEach(p => p.tags.forEach(t => allTags.add(t)));
    return Array.from(allTags).sort();
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    if (!selectedTag) return prompts;
    return prompts.filter(p => p.tags.includes(selectedTag));
  }, [prompts, selectedTag]);

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Header - Glass Effect */}
      <div className="p-4 md:p-8 pb-6 bg-black/20 backdrop-blur-sm sticky top-0 z-10 border-b border-white/5">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight font-sans">Prompt<span className="text-cyan-400">Architect</span></h1>
        <p className="text-zinc-400 mb-6 text-sm md:text-base font-light">Manage and organize your engineering prompts.</p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-2xl group">
            <Search className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-cyan-500 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search neural index..."
              className="w-full bg-zinc-900/50 border border-white/10 text-zinc-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 focus:bg-zinc-900 transition-all placeholder-zinc-600 font-mono text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-4 top-3.5 text-cyan-400 animate-pulse">
                <Sparkles size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Tag Filter Bar - Neon Pills */}
        {uniqueTags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar fade-in slide-in-from-left-2 animate-in duration-300">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2 shrink-0 font-mono">Signal Filter:</span>
            {uniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`flex items-center px-3 py-1 rounded-md text-xs border transition-all whitespace-nowrap shrink-0 font-mono ${
                  selectedTag === tag
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                <Hash size={10} className="mr-1.5 opacity-50" />
                {tag}
                {selectedTag === tag && <X size={10} className="ml-1.5 text-cyan-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredPrompts.map(prompt => (
            <div 
              key={prompt.id}
              className="group bg-[#0a0a0c]/80 border border-white/5 hover:border-cyan-500/30 rounded-xl p-5 transition-all duration-300 flex flex-col cursor-pointer relative overflow-hidden shadow-lg shadow-black/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.1)]"
              onClick={() => onSelectPrompt(prompt)}
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

              {/* Model Badge */}
              {prompt.modelPreference && prompt.modelPreference.mode !== 'fast' && (
                 <div className="absolute top-0 right-0">
                    <div className="text-[9px] uppercase font-bold font-mono text-cyan-300 bg-cyan-950/50 px-2 py-1 rounded-bl-lg border-l border-b border-cyan-500/20 backdrop-blur-sm">
                      {prompt.modelPreference.mode}
                    </div>
                 </div>
              )}

              <div className="flex justify-between items-start mb-3 pr-8 relative z-10">
                <h3 className="text-lg font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors tracking-tight">
                  {prompt.name}
                </h3>
              </div>
              
              <p className="text-zinc-400 text-sm mb-4 line-clamp-2 flex-grow font-light leading-relaxed">
                {prompt.description}
              </p>

              <div className="flex items-center gap-2 mb-4 flex-wrap relative z-10">
                {prompt.tags.map(tag => (
                  <span key={tag} className="flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:border-cyan-900/50 group-hover:text-cyan-200/70 transition-colors">
                    <Hash size={8} className="mr-1 opacity-50" /> {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-zinc-500 mt-auto relative z-10 font-mono">
                <div className="flex items-center gap-3">
                   {prompt.algorithms.stepBack && <span className="text-orange-400 flex items-center gap-1 font-bold drop-shadow-[0_0_5px_rgba(251,146,60,0.3)]" title="Step-Back Reasoning Active"><Sparkles size={10} /> BACK</span>}
                   {prompt.algorithms.chainOfDensity && <span className="text-emerald-400 flex items-center gap-1 font-bold drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]" title="Chain of Density Active"><Sparkles size={10} /> DENSE</span>}
                </div>
                <span className="flex items-center opacity-70">
                  <Clock size={10} className="mr-1" />
                  {new Date(prompt.lastModified).toLocaleDateString()}
                </span>
              </div>

              {/* Actions Overlay */}
              <div className="absolute bottom-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditPrompt(prompt); }}
                    className="p-2 bg-zinc-900 border border-zinc-700 hover:border-cyan-500 hover:text-cyan-400 rounded-lg text-zinc-400 transition-all shadow-lg"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(prompt.id, e)}
                    className="p-2 bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:text-red-400 rounded-lg text-zinc-400 transition-all shadow-lg"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRunPrompt(prompt); }}
                    className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all border border-cyan-400"
                    title="Run"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredPrompts.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center text-zinc-600 mt-20 font-mono text-sm">
            <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center mb-4 bg-zinc-900/50">
                <Search size={24} className="opacity-50" />
            </div>
            <p className="tracking-wider">NO_DATA_FOUND</p>
            {selectedTag && <button onClick={() => setSelectedTag(null)} className="text-cyan-500 text-xs mt-2 hover:underline">[CLEAR_FILTERS]</button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;