import React, { useState } from 'react';
import { Save, ArrowLeft, Sparkles, HelpCircle, Cpu, Zap, BrainCircuit } from 'lucide-react';
import { PromptTemplate, Variable, ModelMode } from '../types';
import { storageService } from '../services/storageService';
import { generateEmbedding } from '../services/geminiService';

const generateId = () => Math.random().toString(36).substring(2, 15);

interface EditorViewProps {
  initialPrompt?: PromptTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}

const EditorView: React.FC<EditorViewProps> = ({ initialPrompt, onSave, onCancel }) => {
  const [name, setName] = useState(initialPrompt?.name || '');
  const [description, setDescription] = useState(initialPrompt?.description || '');
  const [tags, setTags] = useState(initialPrompt?.tags.join(', ') || '');
  const [template, setTemplate] = useState(initialPrompt?.template || '');
  const [stepBack, setStepBack] = useState(initialPrompt?.algorithms.stepBack || false);
  const [cod, setCod] = useState(initialPrompt?.algorithms.chainOfDensity || false);
  const [modelMode, setModelMode] = useState<ModelMode>(initialPrompt?.modelPreference?.mode || 'fast');
  const [isSaving, setIsSaving] = useState(false);

  // Auto-extract variables
  const variables: Variable[] = React.useMemo(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...template.matchAll(regex)];
    const uniqueVars = new Set(matches.map(m => m[1].trim()));
    return Array.from(uniqueVars).map(v => ({
      name: v,
      type: 'text', 
      defaultValue: ''
    }));
  }, [template]);

  const handleSave = async () => {
    if (!name || !template) {
      alert("Name and Template are required.");
      return;
    }
    
    setIsSaving(true);

    // FR-03: Generate Vector Index on Save
    let embedding: number[] | undefined;
    if (process.env.API_KEY) {
      // Embed Name + Description + Tags
      const textToEmbed = `${name} ${description} ${tags}`;
      embedding = await generateEmbedding(textToEmbed);
    }

    const newPrompt: PromptTemplate = {
      id: initialPrompt?.id || generateId(),
      name,
      description,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      template,
      variables, // In a full app, we'd allow configuring types per var manually
      algorithms: {
        stepBack,
        chainOfDensity: cod
      },
      embedding,
      modelPreference: {
        mode: modelMode
      },
      lastModified: Date.now(),
      usageCount: initialPrompt?.usageCount || 0
    };

    storageService.save(newPrompt);
    setIsSaving(false);
    onSave();
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">
              {initialPrompt ? 'Edit Prompt' : 'New Prompt'}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {initialPrompt ? initialPrompt.id : 'Unsaved Draft'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          {isSaving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <Save size={18} />}
          {isSaving ? 'Indexing...' : 'Save Template'}
        </button>
      </div>

      <div className="p-8 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metadata */}
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Metadata</h3>
            
            <div>
              <label className="block text-sm text-slate-300 mb-1">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200"
                placeholder="e.g., React Component Generator"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200 h-24 resize-none"
                placeholder="What does this prompt do? (Used for vector search)"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Tags</label>
              <input 
                type="text" 
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200"
                placeholder="coding, react, frontend"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu size={14} /> Model & Strategy
            </h3>

            {/* Model Selection SRS 10 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fast', label: 'Fast', icon: Zap, desc: 'Flash 2.5' },
                { id: 'smart', label: 'Smart', icon: BrainCircuit, desc: 'Pro 3.0' },
                { id: 'reasoning', label: 'Reason', icon: Sparkles, desc: 'Thinking' },
              ].map(m => (
                <div 
                  key={m.id}
                  onClick={() => setModelMode(m.id as ModelMode)}
                  className={`cursor-pointer rounded-lg p-2 border text-center transition-all ${
                    modelMode === m.id 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  <m.icon size={16} className="mx-auto mb-1" />
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] opacity-60">{m.desc}</div>
                </div>
              ))}
            </div>
            
            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50 cursor-pointer hover:bg-slate-900 transition-colors">
              <input 
                type="checkbox" 
                checked={stepBack}
                onChange={e => { setStepBack(e.target.checked); if(e.target.checked) setCod(false); }}
                className="mt-1"
              />
              <div>
                <span className="block text-sm font-medium text-slate-200">Step-Back Prompting</span>
                <span className="text-xs text-slate-500">Abstracts details to principles. Best for complex reasoning.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50 cursor-pointer hover:bg-slate-900 transition-colors">
              <input 
                type="checkbox" 
                checked={cod}
                onChange={e => { setCod(e.target.checked); if(e.target.checked) setStepBack(false); }}
                className="mt-1"
              />
              <div>
                <span className="block text-sm font-medium text-slate-200">Chain of Density</span>
                <span className="text-xs text-slate-500">Iterative recursion. Best for dense summaries.</span>
              </div>
            </label>
          </div>

          <div className="pt-6 border-t border-slate-800">
             <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Detected Variables</h3>
             <div className="flex flex-wrap gap-2">
               {variables.length > 0 ? variables.map(v => (
                 <span key={v.name} className="px-2 py-1 bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs rounded font-mono">
                   {'{{' + v.name + '}}'}
                 </span>
               )) : (
                 <span className="text-slate-600 text-xs italic">Type {'{{variable_name}}'} in the template to create variables.</span>
               )}
             </div>
          </div>
        </div>

        {/* Right Column: Template Editor */}
        <div className="lg:col-span-2 flex flex-col h-full">
          <label className="block text-sm text-slate-300 mb-2 flex justify-between">
            <span>Prompt Template</span>
            <span className="flex items-center gap-1 text-xs text-slate-500"><HelpCircle size={12}/> Markdown Supported</span>
          </label>
          <div className="flex-1 relative">
            <textarea 
              value={template}
              onChange={e => setTemplate(e.target.value)}
              className="w-full h-[600px] bg-slate-900 border border-slate-700 rounded-xl p-6 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200 font-mono text-sm leading-relaxed resize-none"
              placeholder="You are an expert assistant. Help me with {{topic}}..."
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorView;