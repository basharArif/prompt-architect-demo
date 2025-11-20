import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, ArrowLeft, Terminal, Cpu, Copy, Check, Upload, FileText, Code, Clipboard, ChevronDown, ChevronRight, Sparkles, MousePointerClick, Download } from 'lucide-react';
import { PromptTemplate, ExecutionResult } from '../types';
import { executeStandardPrompt, executeStepBackPrompt, executeChainOfDensity } from '../services/geminiService';
import { storageService } from '../services/storageService';

interface ExecutionViewProps {
  prompt: PromptTemplate | null;
  onBack: () => void;
}

const ExecutionView: React.FC<ExecutionViewProps> = ({ prompt, onBack }) => {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  useEffect(() => {
    if (prompt) {
      const initialVars: Record<string, string> = {};
      prompt.variables.forEach(v => {
        initialVars[v.name] = v.defaultValue || '';
      });
      setVariableValues(initialVars);
      setResult(null);
      setShowThinking(false);
    }
  }, [prompt]);

  if (!prompt) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono">
        <Terminal size={48} className="mb-4 opacity-20" />
        <p className="uppercase tracking-widest text-xs">Awaiting_Input_Signal...</p>
      </div>
    );
  }

  const handleFileUpload = async (varName: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setVariableValues(prev => ({ ...prev, [varName]: text }));
    };
    reader.readAsText(file);
  };

  const handlePaste = async (varName: string) => {
    try {
      const text = await navigator.clipboard.readText();
      setVariableValues(prev => ({ ...prev, [varName]: text }));
    } catch (err) {
      console.error('Failed to read clipboard');
    }
  };

  const handleRun = async () => {
    setIsExecuting(true);
    setResult(null);
    setShowThinking(false);

    let hydratedPrompt = prompt.template;
    Object.entries(variableValues).forEach(([key, value]) => {
      hydratedPrompt = hydratedPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    try {
      let res: ExecutionResult;
      const mode = prompt.modelPreference?.mode || 'fast';
      
      if (prompt.algorithms.stepBack) {
        res = await executeStepBackPrompt(hydratedPrompt, mode);
      } else if (prompt.algorithms.chainOfDensity) {
        res = await executeChainOfDensity(hydratedPrompt, mode);
      } else {
        res = await executeStandardPrompt(hydratedPrompt, mode);
      }
      
      setResult(res);
      
      if (res.metadata?.steps && res.metadata.steps.length > 0) {
        setShowThinking(true);
      }

      if (!res.error) {
        storageService.incrementUsage(prompt.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.name.replace(/\s+/g, '_').toLowerCase()}_result.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const content = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
        const langMatch = part.match(/^```(\w+)/);
        const lang = langMatch ? langMatch[1] : 'Plain';
        
        return (
          <div key={i} className="my-4 rounded-lg overflow-hidden bg-[#0a0a0c] border border-zinc-800 shadow-inner">
            <div className="bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 flex justify-between items-center">
               <span className="text-[10px] font-mono text-emerald-400 uppercase">{lang}</span>
               <Copy size={12} className="text-zinc-500 cursor-pointer hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(content)} />
            </div>
            <div className="p-4 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <code className="font-mono text-sm text-zinc-300">{content}</code>
            </div>
          </div>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-transparent overflow-hidden">
      {/* Inputs Panel */}
      <div className="w-full md:w-1/3 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/10 bg-[#08080a]/95 p-4 md:p-6 flex flex-col overflow-y-auto shrink-0 relative z-10 backdrop-blur-xl">
        <div className="mb-4 md:mb-6">
          <button onClick={onBack} className="flex items-center text-zinc-500 hover:text-white mb-4 transition-colors text-xs font-mono uppercase tracking-wider">
            <ArrowLeft size={12} className="mr-1" /> Return_Library
          </button>
          <h2 className="text-xl font-bold text-white mb-1 truncate font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">{`> ${prompt.name}`}</h2>
          <p className="text-xs text-zinc-400 line-clamp-2">{prompt.description}</p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-4 border-b border-zinc-800 pb-1">Input_Parameters</h3>
            <div className="space-y-4">
              {prompt.variables.map(v => (
                <div key={v.name}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs text-zinc-300 font-mono truncate">{`$${v.name}`}</label>
                    <div className="flex gap-2 shrink-0">
                        {v.type === 'text' && (
                          <>
                            <button onClick={() => handlePaste(v.name)} className="cursor-pointer text-[10px] text-zinc-500 hover:text-cyan-400 flex items-center gap-1 transition-colors" title="Paste from Clipboard">
                                <Clipboard size={10} /> PASTE
                            </button>
                            <label className="cursor-pointer text-[10px] text-zinc-500 hover:text-cyan-400 flex items-center gap-1 transition-colors">
                                <Upload size={10} /> LOAD
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(v.name, e.target.files[0])}
                                />
                            </label>
                          </>
                        )}
                    </div>
                  </div>
                  
                  {v.type === 'file' ? (
                    <div className="relative group">
                       <textarea 
                        value={variableValues[v.name] || ''}
                        onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                        className="w-full bg-black/50 border border-zinc-800 border-dashed rounded-lg p-3 text-xs text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none h-32 font-mono placeholder-zinc-700"
                        placeholder="[NO_FILE_DATA]"
                      />
                      <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                         <label className="cursor-pointer p-1.5 bg-zinc-900 rounded-md flex items-center gap-1 text-[10px] border border-zinc-700 hover:border-cyan-500 hover:text-cyan-400">
                            <FileText size={10} /> SELECT
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => e.target.files?.[0] && handleFileUpload(v.name, e.target.files[0])}
                            />
                         </label>
                      </div>
                    </div>
                  ) : v.type === 'selection' ? (
                     <div 
                       onClick={() => handlePaste(v.name)}
                       className="group relative w-full h-24 bg-black/50 border border-dashed border-zinc-800 hover:border-cyan-500 hover:bg-cyan-950/10 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all"
                     >
                        <div className="text-zinc-600 group-hover:text-cyan-400 mb-1 group-hover:scale-110 transition-transform group-hover:drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]"><MousePointerClick size={24} /></div>
                        <span className="text-[10px] text-zinc-600 font-bold group-hover:text-cyan-300 tracking-wider">PASTE_SELECTION</span>
                        {variableValues[v.name] && (
                           <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center rounded-lg border border-emerald-500/30">
                              <div className="text-center px-4">
                                 <Check size={20} className="mx-auto text-emerald-500 mb-1" />
                                 <p className="text-[10px] text-emerald-400 line-clamp-2 font-mono">{variableValues[v.name]}</p>
                              </div>
                           </div>
                        )}
                     </div>
                  ) : v.type === 'stdin' ? (
                    <textarea 
                      value={variableValues[v.name] || ''}
                      onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                      className="w-full bg-[#050505] border border-zinc-800 rounded-lg p-3 text-xs text-green-500 font-mono focus:border-green-500/50 outline-none h-32 shadow-inner selection:bg-green-900/50"
                      placeholder={`> _`}
                    />
                  ) : (
                    <textarea 
                      value={variableValues[v.name] || ''}
                      onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                      className="w-full bg-black/50 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none h-32 font-mono placeholder-zinc-600 transition-all"
                      placeholder={`Enter ${v.name}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-black/30 rounded-lg border border-white/5 backdrop-blur-sm">
            <h3 className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold mb-2">System_Config</h3>
            <div className="flex flex-col gap-2 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>MODEL_CORE</span>
                <span className="text-cyan-400 font-bold uppercase">{prompt.modelPreference?.mode || 'Fast'}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>STRATEGY</span>
                <span className={prompt.algorithms.stepBack || prompt.algorithms.chainOfDensity ? "text-emerald-400" : "text-zinc-600"}>
                  {prompt.algorithms.stepBack ? 'STEP_BACK' : prompt.algorithms.chainOfDensity ? 'DENSITY_CHAIN' : 'DIRECT'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button 
            onClick={handleRun}
            disabled={isExecuting}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all uppercase tracking-wider text-sm relative overflow-hidden group ${
              isExecuting 
                ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.2)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> PROCESSING...
              </>
            ) : (
              <>
                <Play size={16} className="group-hover:text-white transition-colors" /> EXECUTE_PROTOCOL
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Panel */}
      <div className="w-full md:flex-1 h-1/2 md:h-full bg-black/80 flex flex-col overflow-hidden relative">
        {/* Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%] opacity-20"></div>

        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-black/60 shrink-0 sticky top-0 backdrop-blur-md z-10">
          <span className="text-xs font-bold text-zinc-500 flex items-center gap-2 font-mono uppercase tracking-widest">
            <Cpu size={14} /> System_Output
          </span>
          {result && (
             <div className="flex items-center gap-4">
               <span className="text-[10px] text-zinc-600 font-mono hidden md:inline">LATENCY: {result.metadata?.latency}ms</span>
               <button 
                 onClick={handleCopy}
                 className="text-zinc-500 hover:text-cyan-400 transition-colors"
                 title="Copy Buffer"
               >
                 {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
               </button>
               <button 
                 onClick={handleDownload}
                 className="text-zinc-500 hover:text-cyan-400 transition-colors"
                 title="Download Log"
               >
                 <Download size={16} />
               </button>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
           {isExecuting && !result && (
             <div className="flex flex-col items-center justify-center h-full">
               <div className="w-16 h-16 border-2 border-cyan-900 border-t-cyan-500 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]"></div>
               <p className="text-cyan-500 font-mono text-xs animate-pulse">NEURAL_PROCESSING...</p>
             </div>
           )}

           {!isExecuting && !result && (
             <div className="h-full flex flex-col items-center justify-center text-zinc-800">
                <div className="w-24 h-24 border border-zinc-900 rounded-full flex items-center justify-center mb-4">
                    <div className="w-2 h-2 bg-zinc-800 rounded-full animate-ping"></div>
                </div>
               <p className="font-mono text-xs tracking-widest opacity-70 text-zinc-600">SYSTEM_IDLE</p>
             </div>
           )}

           {result && (
             <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0 relative z-10">
               {result.error && (
                 <div className="p-4 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg font-mono text-xs">
                   <strong>[ERROR_CRITICAL]:</strong> {result.error}
                 </div>
               )}

               {!result.error && (
                 <>
                   {result.metadata?.steps && result.metadata.steps.length > 0 && (
                     <div className="mb-6 bg-zinc-900/30 rounded-lg border border-zinc-800 overflow-hidden">
                       <button 
                        onClick={() => setShowThinking(!showThinking)}
                        className="w-full flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors group"
                       >
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-2 font-mono group-hover:text-cyan-400 transition-colors">
                             <BrainCircuit size={12} /> Execution_Trace
                             <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                               {result.metadata.steps.length} OPS
                             </span>
                          </span>
                          {showThinking ? <ChevronDown size={14} className="text-zinc-500"/> : <ChevronRight size={14} className="text-zinc-500"/>}
                       </button>
                       
                       {showThinking && (
                         <div className="p-4 pt-0 border-t border-zinc-800/50 bg-black/20">
                            <div className="space-y-3 mt-3">
                                {result.metadata.steps.map((step, idx) => (
                                  <div key={idx} className="text-xs font-mono text-zinc-400 border-l border-zinc-800 pl-3 py-1">
                                    <div className="font-bold text-zinc-600 mb-1 uppercase tracking-wider">Op_Seq_{idx + 1}</div>
                                    {step}
                                  </div>
                                ))}
                            </div>
                         </div>
                       )}
                     </div>
                   )}

                   <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-900/30">
                        <Sparkles size={12} className="text-emerald-400" />
                        <h4 className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold font-mono shadow-emerald-500/20">Final_Output_Stream</h4>
                      </div>
                      <div className="prose prose-invert prose-zinc max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-300 selection:bg-emerald-900/50 selection:text-emerald-100">
                        {renderFormattedText(result.text)}
                      </div>
                   </div>
                 </>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

function BrainCircuit({ size, className }: { size: number, className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 3 2.5 2.5 0 0 0 0 2.92 2.5 2.5 0 0 0 1.32 3 2.5 2.5 0 0 0 1.98 3 2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 5.28 0 2.5 2.5 0 0 0 4.96.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-3 2.5 2.5 0 0 0 0-2.92 2.5 2.5 0 0 0-1.32-3 2.5 2.5 0 0 0-1.98-3 2.5 2.5 0 0 0-4.96.46 2.5 2.5 0 0 0-5.28 0"/>
            <path d="M12 12h.01"/>
        </svg>
    );
}

export default ExecutionView;