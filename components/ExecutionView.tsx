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
  const [showThinking, setShowThinking] = useState(false); // SRS 7.2 Verbose Mode

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
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Terminal size={48} className="mb-4 opacity-50" />
        <p>Select a prompt from the library to execute.</p>
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
    setShowThinking(false); // Reset view

    let hydratedPrompt = prompt.template;
    Object.entries(variableValues).forEach(([key, value]) => {
      // Use explicit string replacement logic to avoid rendering object issues
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
      
      // Auto-expand thinking if we have steps
      if (res.metadata?.steps && res.metadata.steps.length > 0) {
        setShowThinking(true);
      }

      // FR-05: Increment Usage Count on success
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

  // Simple formatter to wrap code blocks
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const content = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
        const langMatch = part.match(/^```(\w+)/);
        const lang = langMatch ? langMatch[1] : 'Code';
        
        return (
          <div key={i} className="my-4 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
            <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800 flex justify-between items-center">
               <span className="text-xs font-mono text-indigo-400 lowercase">{lang}</span>
               <Copy size={12} className="text-slate-500 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(content)} />
            </div>
            <div className="p-4 overflow-x-auto">
              <code className="font-mono text-sm text-slate-200">{content}</code>
            </div>
          </div>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-slate-950 overflow-hidden">
      {/* Inputs Panel (Top on Mobile, Left on Desktop) */}
      <div className="w-full md:w-1/3 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900 p-4 md:p-6 flex flex-col overflow-y-auto shrink-0">
        <div className="mb-4 md:mb-6">
          <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors text-sm">
            <ArrowLeft size={16} className="mr-1" /> Back
          </button>
          <h2 className="text-xl font-bold text-white mb-1 truncate">{`{${prompt.name}}`}</h2>
          <p className="text-xs text-slate-400 line-clamp-2">{prompt.description}</p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">Variables</h3>
            <div className="space-y-4">
              {prompt.variables.map(v => (
                <div key={v.name}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm text-slate-300 font-mono truncate">{`{{${v.name}}}`}</label>
                    <div className="flex gap-2 shrink-0">
                        {v.type === 'text' && (
                          <>
                            <button onClick={() => handlePaste(v.name)} className="cursor-pointer text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors" title="Paste from Clipboard">
                                <Clipboard size={12} /> Paste
                            </button>
                            <label className="cursor-pointer text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                                <Upload size={12} /> Import
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
                        className="w-full bg-slate-950 border border-dashed border-slate-600 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none h-32 font-mono"
                        placeholder="Paste file content or click to upload..."
                      />
                      <div className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                         <label className="cursor-pointer p-1.5 bg-slate-800 rounded-md flex items-center gap-1 text-xs border border-slate-700 hover:border-indigo-500">
                            <FileText size={12} /> Select File
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
                       className="group relative w-full h-24 bg-slate-950 border border-dashed border-indigo-900/50 hover:border-indigo-500 hover:bg-indigo-900/10 rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all"
                     >
                        <div className="text-indigo-400 mb-1 group-hover:scale-110 transition-transform"><MousePointerClick size={24} /></div>
                        <span className="text-xs text-slate-400 font-medium group-hover:text-indigo-300">Click to Paste Selection</span>
                        {variableValues[v.name] && (
                           <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center rounded-lg">
                              <div className="text-center px-4">
                                 <Check size={20} className="mx-auto text-emerald-500 mb-1" />
                                 <p className="text-[10px] text-slate-400 line-clamp-2">{variableValues[v.name]}</p>
                              </div>
                           </div>
                        )}
                     </div>
                  ) : v.type === 'stdin' ? (
                    <textarea 
                      value={variableValues[v.name] || ''}
                      onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                      className="w-full bg-black border border-slate-700 rounded-lg p-3 text-sm text-green-400 font-mono focus:ring-1 focus:ring-green-500 outline-none h-32 shadow-inner"
                      placeholder={`> Paste stdin/logs for ${v.name}...`}
                    />
                  ) : (
                    <textarea 
                      value={variableValues[v.name] || ''}
                      onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none h-32 font-mono"
                      placeholder={`Enter content for ${v.name}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Configuration</h3>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
              <div className="flex justify-between">
                <span>Model Config</span>
                <span className="text-indigo-400 font-bold uppercase">{prompt.modelPreference?.mode || 'Fast'}</span>
              </div>
              <div className="flex justify-between">
                <span>Strategy</span>
                <span className={prompt.algorithms.stepBack || prompt.algorithms.chainOfDensity ? "text-emerald-400" : "text-slate-400"}>
                  {prompt.algorithms.stepBack ? 'Step-Back' : prompt.algorithms.chainOfDensity ? 'Chain of Density' : 'Direct'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <button 
            onClick={handleRun}
            disabled={isExecuting}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              isExecuting 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-lg shadow-indigo-900/20'
            }`}
          >
            {isExecuting ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Executing...
              </>
            ) : (
              <>
                <Play size={18} /> Run Prompt
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Panel (Bottom on Mobile, Right on Desktop) */}
      <div className="w-full md:flex-1 h-1/2 md:h-full bg-slate-950 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-900/50 shrink-0 sticky top-0">
          <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Cpu size={16} /> Output
          </span>
          {result && (
             <div className="flex items-center gap-4">
               <span className="text-xs text-slate-500 hidden md:inline">Latency: {result.metadata?.latency}ms</span>
               <button 
                 onClick={handleCopy}
                 className="text-slate-400 hover:text-white transition-colors"
                 title="Copy to clipboard"
               >
                 {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
               </button>
               <button 
                 onClick={handleDownload}
                 className="text-slate-400 hover:text-indigo-400 transition-colors"
                 title="Download Result"
               >
                 <Download size={18} />
               </button>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
           {isExecuting && !result && (
             <div className="flex flex-col items-center justify-center h-full opacity-50 animate-pulse">
               <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-slate-400 font-mono text-sm">Thinking...</p>
             </div>
           )}

           {!isExecuting && !result && (
             <div className="h-full flex flex-col items-center justify-center text-slate-600">
               <p>Ready to execute.</p>
             </div>
           )}

           {result && (
             <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0">
               {result.error && (
                 <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-200 rounded-lg">
                   <strong>Error:</strong> {result.error}
                 </div>
               )}

               {!result.error && (
                 <>
                   {result.metadata?.steps && result.metadata.steps.length > 0 && (
                     <div className="mb-6 bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
                       <button 
                        onClick={() => setShowThinking(!showThinking)}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-800 transition-colors"
                       >
                          <span className="text-xs uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                             <BrainCircuit size={14} /> Reasoning Trace
                             <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                               {result.metadata.steps.length} Steps
                             </span>
                          </span>
                          {showThinking ? <ChevronDown size={16} className="text-slate-500"/> : <ChevronRight size={16} className="text-slate-500"/>}
                       </button>
                       
                       {showThinking && (
                         <div className="p-4 pt-0 border-t border-slate-800/50 bg-slate-900/30">
                            <div className="space-y-3 mt-3">
                                {result.metadata.steps.map((step, idx) => (
                                  <div key={idx} className="text-xs font-mono text-slate-400 border-l-2 border-slate-700 pl-3 py-1">
                                    <div className="font-bold text-slate-500 mb-1">Step {idx + 1}</div>
                                    {step}
                                  </div>
                                ))}
                            </div>
                         </div>
                       )}
                     </div>
                   )}

                   <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} className="text-emerald-500" />
                        <h4 className="text-xs uppercase tracking-wider text-emerald-500 font-bold">Final Response</h4>
                      </div>
                      <div className="prose prose-invert prose-slate max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
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