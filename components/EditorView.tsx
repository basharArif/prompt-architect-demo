import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Sparkles, HelpCircle, Cpu, Zap, BrainCircuit, Settings2, FileText, Type, Code, Eye, MousePointerClick, Terminal } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'design' | 'source'>('design');
  
  const [variableConfig, setVariableConfig] = useState<Record<string, { defaultValue: string, type: 'text' | 'file' | 'selection' | 'stdin' }>>({});

  useEffect(() => {
    if (initialPrompt?.variables) {
      const config: Record<string, { defaultValue: string, type: 'text' | 'file' | 'selection' | 'stdin' }> = {};
      initialPrompt.variables.forEach(v => {
        config[v.name] = { 
          defaultValue: v.defaultValue || '',
          type: v.type
        };
      });
      setVariableConfig(config);
    }
  }, [initialPrompt]);

  const variables: Variable[] = React.useMemo(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...template.matchAll(regex)];
    const uniqueVars = new Set(matches.map(m => m[1].trim()));
    
    return Array.from(uniqueVars).map(v => ({
      name: v,
      type: variableConfig[v]?.type || 'text', 
      defaultValue: variableConfig[v]?.defaultValue || ''
    }));
  }, [template, variableConfig]);

  const handleConfigChange = (name: string, key: 'defaultValue' | 'type', val: string) => {
    setVariableConfig(prev => ({
      ...prev,
      [name]: {
        ...prev[name] || { defaultValue: '', type: 'text' },
        [key]: val
      }
    }));
  };

  const handleSave = async () => {
    if (!name || !template) {
      alert("Name and Template are required.");
      return;
    }
    
    setIsSaving(true);

    let embedding: number[] | undefined;
    if (process.env.API_KEY) {
      const textToEmbed = `${name} ${description} ${tags}`;
      embedding = await generateEmbedding(textToEmbed);
    }

    const newPrompt: PromptTemplate = {
      id: initialPrompt?.id || generateId(),
      name,
      description,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      template,
      variables, 
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

  const generateSourceCode = () => {
    const frontmatter = [
      '---',
      `name: "${name}"`,
      `description: "${description}"`,
      `tags: [${tags.split(',').map(t => `"${t.trim()}"`).filter(Boolean).join(', ')}]`,
      `model_preference:`,
      `  mode: ${modelMode}`,
      `algorithms:`,
      `  step_back: ${stepBack}`,
      `  chain_of_density: ${cod}`,
      `variables:`,
      ...variables.map(v => 
        `  - name: ${v.name}\n    type: ${v.type}\n    default: "${v.defaultValue}"`
      ),
      '---'
    ].join('\n');

    return `${frontmatter}\n\n${template}`;
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto">
      {/* Control Panel Header */}
      <div className="p-4 md:p-6 border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="truncate">
            <h1 className="text-lg md:text-xl font-bold text-white truncate tracking-tight">
              {initialPrompt ? 'Edit Protocol' : 'Initialize Protocol'}
            </h1>
            <p className="text-xs text-cyan-500 font-mono mt-1 truncate flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span>
              ID: {initialPrompt ? initialPrompt.id : 'DRAFT_MODE'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-zinc-900/80 p-1 rounded-lg flex text-xs font-medium border border-white/5">
             <button 
                onClick={() => setViewMode('design')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all font-mono ${viewMode === 'design' ? 'bg-zinc-800 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Eye size={14} /> <span className="hidden sm:inline">GUI</span>
             </button>
             <button 
                onClick={() => setViewMode('source')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition-all font-mono ${viewMode === 'source' ? 'bg-zinc-800 text-white shadow-inner border border-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
             >
               <Code size={14} /> <span className="hidden sm:inline">YAML</span>
             </button>
          </div>

          <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 md:px-6 py-2 rounded-lg font-medium transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 text-sm md:text-base hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-400/50"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <Save size={18} />}
            {isSaving ? 'ENCODING...' : 'SAVE'}
          </button>
        </div>
      </div>

      {viewMode === 'design' ? (
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 pb-20 md:pb-8">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="space-y-4 p-5 bg-zinc-900/30 border border-white/5 rounded-xl backdrop-blur-sm">
              <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest flex items-center gap-2 font-mono mb-4">
                <Settings2 size={12} /> Meta_Data
              </h3>
              
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-mono uppercase">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-zinc-200 transition-all placeholder-zinc-600 font-sans"
                  placeholder="e.g., React Component Generator"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-mono uppercase">Description</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-zinc-200 h-24 resize-none transition-all placeholder-zinc-600"
                  placeholder="Define the purpose of this protocol..."
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-mono uppercase">Tags</label>
                <input 
                  type="text" 
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full bg-black/50 border border-zinc-800 rounded-lg px-3 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-zinc-200 transition-all placeholder-zinc-600"
                  placeholder="coding, react, frontend"
                />
              </div>
            </div>

            <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-xl backdrop-blur-sm space-y-4">
              <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2 font-mono">
                <Cpu size={12} /> Processing_Unit
              </h3>

              {/* Model Selection */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fast', label: 'FAST', icon: Zap, desc: 'Flash 2.5' },
                  { id: 'smart', label: 'SMART', icon: BrainCircuit, desc: 'Pro 3.0' },
                  { id: 'reasoning', label: 'LOGIC', icon: Sparkles, desc: 'Thinking' },
                ].map(m => (
                  <div 
                    key={m.id}
                    onClick={() => setModelMode(m.id as ModelMode)}
                    className={`cursor-pointer rounded-lg p-2 border text-center transition-all group relative overflow-hidden ${
                      modelMode === m.id 
                        ? 'bg-violet-500/10 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.2)]' 
                        : 'bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                    }`}
                  >
                    <m.icon size={16} className={`mx-auto mb-1 ${modelMode === m.id ? 'text-violet-400' : 'text-zinc-500'}`} />
                    <div className="text-[10px] font-bold font-mono">{m.label}</div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 mt-4">
                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${stepBack ? 'bg-orange-500/10 border-orange-500/40' : 'bg-black/40 border-zinc-800 hover:border-zinc-700'}`}>
                    <input 
                    type="checkbox" 
                    checked={stepBack}
                    onChange={e => { setStepBack(e.target.checked); if(e.target.checked) setCod(false); }}
                    className="mt-1 accent-orange-500"
                    />
                    <div>
                    <span className={`block text-xs font-bold uppercase tracking-wider ${stepBack ? 'text-orange-400' : 'text-zinc-400'}`}>Step-Back Abstraction</span>
                    <span className="text-[10px] text-zinc-500">High-level reasoning pass.</span>
                    </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${cod ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-black/40 border-zinc-800 hover:border-zinc-700'}`}>
                    <input 
                    type="checkbox" 
                    checked={cod}
                    onChange={e => { setCod(e.target.checked); if(e.target.checked) setStepBack(false); }}
                    className="mt-1 accent-emerald-500"
                    />
                    <div>
                    <span className={`block text-xs font-bold uppercase tracking-wider ${cod ? 'text-emerald-400' : 'text-zinc-400'}`}>Chain of Density</span>
                    <span className="text-[10px] text-zinc-500">Recursive refinement loop.</span>
                    </div>
                </label>
              </div>
            </div>

            <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-xl backdrop-blur-sm">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2 font-mono">
                <Settings2 size={12} /> Variables
              </h3>
              <div className="space-y-3">
                {variables.length > 0 ? variables.map(v => (
                  <div key={v.name} className="bg-black/40 p-3 rounded-lg border border-white/5 group hover:border-cyan-500/20 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[10px] rounded font-mono truncate max-w-full tracking-tight">
                          {v.name}
                        </span>
                      </div>
                      
                      <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar p-0.5 bg-black/40 rounded border border-white/5">
                        {[
                            { id: 'text', icon: Type, label: 'TXT' },
                            { id: 'file', icon: FileText, label: 'FILE' },
                            { id: 'selection', icon: MousePointerClick, label: 'SEL' },
                            { id: 'stdin', icon: Terminal, label: 'STD' }
                        ].map((type) => (
                            <button 
                            key={type.id}
                            onClick={() => handleConfigChange(v.name, 'type', type.id)}
                            className={`flex-1 min-w-[30px] flex items-center justify-center gap-1 py-1 rounded text-[9px] font-bold font-mono transition-all ${
                                v.type === type.id ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'
                            }`}
                            title={type.label}
                            >
                            <type.icon size={10} /> {type.label}
                            </button>
                        ))}
                      </div>

                      <input 
                        type="text" 
                        placeholder="Default value..."
                        className="w-full bg-transparent border-b border-zinc-800 py-1 text-xs text-zinc-300 focus:border-cyan-500 outline-none placeholder-zinc-600 font-mono"
                        value={v.defaultValue || ''}
                        onChange={(e) => handleConfigChange(v.name, 'defaultValue', e.target.value)}
                      />
                  </div>
                )) : (
                  <span className="text-zinc-600 text-xs italic font-mono">No variables detected.</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Template Editor */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <label className="block text-xs text-cyan-500 font-mono uppercase tracking-widest mb-2 flex justify-between items-end">
              <span>Template_Body</span>
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded-full"><HelpCircle size={10}/> Markdown Enabled</span>
            </label>
            <div className="flex-1 relative min-h-[400px] group">
              <div className="absolute inset-0 bg-cyan-500/5 blur-2xl rounded-full opacity-0 group-focus-within:opacity-20 transition-opacity pointer-events-none"></div>
              <textarea 
                value={template}
                onChange={e => setTemplate(e.target.value)}
                className="w-full h-full min-h-[400px] md:min-h-[600px] bg-[#08080a] border border-white/10 rounded-xl p-6 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none text-zinc-300 font-mono text-sm leading-relaxed resize-none shadow-inner transition-all placeholder-zinc-600"
                placeholder="// Define your prompt protocol here...&#10;User: {{input}}&#10;Assistant: ..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      ) : (
        // Source View
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 pb-20 md:pb-8">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-2">
             <p className="text-zinc-500 text-sm font-mono">
               <span className="text-cyan-500">&gt;</span> VIEWING_SOURCE_CODE
             </p>
             <button 
               onClick={() => navigator.clipboard.writeText(generateSourceCode())}
               className="text-xs flex items-center gap-1 text-cyan-400 hover:text-white font-mono uppercase tracking-wider bg-cyan-950/30 px-3 py-1 rounded border border-cyan-500/20 hover:border-cyan-500/50 transition-colors"
             >
               <FileText size={12} /> Copy Buffer
             </button>
           </div>
           <div className="flex-1 bg-[#08080a] rounded-xl border border-white/10 p-6 overflow-auto relative min-h-[400px] shadow-inner">
             <pre className="font-mono text-xs md:text-sm text-emerald-400 whitespace-pre-wrap leading-relaxed">
               {generateSourceCode()}
             </pre>
           </div>
        </div>
      )}
    </div>
  );
};

export default EditorView;