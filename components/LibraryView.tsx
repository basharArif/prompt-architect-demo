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

  // Hybrid Search Debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchTerm) {
        setPrompts(storageService.getAll());
        return;
      }

      setIsSearching(true);
      let embedding: number[] | undefined;
      
      // Only generate embedding if API key exists (FR-04)
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

  // Extract unique tags
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
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="p-4 md:p-8 pb-6 bg-slate-950 sticky top-0 z-10 border-b border-slate-900/50">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Prompt Library</h1>
        <p className="text-slate-400 mb-6 text-sm md:text-base">Manage and organize your engineering prompts.</p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
            <input 
              type="text"
              placeholder="Search..."
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-4 top-3.5 text-indigo-400 animate-pulse">
                <Sparkles size={20} />
              </div>
            )}
          </div>
        </div>

        {/* Tag Filter Bar */}
        {uniqueTags.length > 0 && (
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar fade-in slide-in-from-left-2 animate-in duration-300">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 shrink-0">Filters:</span>
            {uniqueTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`flex items-center px-3 py-1.5 rounded-full text-xs border transition-all whitespace-nowrap shrink-0 ${
                  selectedTag === tag
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <Hash size={10} className="mr-1.5" />
                {tag}
                {selectedTag === tag && <X size={10} className="ml-1.5" />}
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
              className="group bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded-2xl p-5 transition-all duration-200 flex flex-col cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md hover:shadow-indigo-900/10 active:scale-[0.99]"
              onClick={() => onSelectPrompt(prompt)}
            >
              {/* Model Badge */}
              {prompt.modelPreference && prompt.modelPreference.mode !== 'fast' && (
                 <div className="absolute top-0 right-0 p-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 bg-indigo-900/40 px-2 py-1 rounded-bl-lg border-l border-b border-indigo-500/20">
                      {prompt.modelPreference.mode}
                    </span>
                 </div>
              )}

              <div className="flex justify-between items-start mb-3 pr-8">
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                  {prompt.name}
                </h3>
              </div>
              
              <p className="text-slate-400 text-sm mb-4 line-clamp-2 flex-grow">
                {prompt.description}
              </p>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {prompt.tags.map(tag => (
                  <span key={tag} className="flex items-center text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    <Hash size={10} className="mr-1" /> {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-500 mt-auto">
                <div className="flex items-center gap-2">
                   {prompt.algorithms.stepBack && <span className="text-orange-400 flex items-center gap-1 font-bold" title="Step-Back Reasoning Active"><Sparkles size={10} /> Step-Back</span>}
                   {prompt.algorithms.chainOfDensity && <span className="text-emerald-400 flex items-center gap-1 font-bold" title="Chain of Density Active"><Sparkles size={10} /> CoD</span>}
                </div>
                <span className="flex items-center">
                  <Clock size={12} className="mr-1" />
                  {new Date(prompt.lastModified).toLocaleDateString()}
                </span>
              </div>

              {/* Actions Overlay - Always visible on mobile/touch, hover on desktop */}
              <div className="absolute bottom-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 p-1.5 rounded-lg backdrop-blur-sm border border-slate-700 shadow-xl">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditPrompt(prompt); }}
                    className="p-2 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(prompt.id, e)}
                    className="p-2 hover:bg-red-900/50 rounded-md text-slate-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRunPrompt(prompt); }}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-white shadow-lg transition-colors"
                    title="Run"
                  >
                    <Play size={16} />
                  </button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredPrompts.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center text-slate-500 mt-20">
            <Search size={48} className="opacity-20 mb-4" />
            <p>No prompts found.</p>
            {selectedTag && <button onClick={() => setSelectedTag(null)} className="text-indigo-400 text-sm mt-2 hover:underline">Clear Filters</button>}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;