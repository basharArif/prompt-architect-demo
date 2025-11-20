import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, ArrowLeft, Terminal, Cpu, Copy, Check, Upload, FileText } from 'lucide-react';
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

  useEffect(() => {
    if (prompt) {
      const initialVars: Record<string, string> = {};
      prompt.variables.forEach(v => {
        initialVars[v.name] = v.defaultValue || '';
      });
      setVariableValues(initialVars);
      setResult(null);
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

  const handleRun = async () => {
    setIsExecuting(true);
    setResult(null);

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

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Left Panel: Inputs */}
      <div className="w-1/3 border-r border-slate-800 bg-slate-900 p-6 flex flex-col overflow-y-auto">
        <div className="mb-6">
          <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors text-sm">
            <ArrowLeft size={16} className="mr-1" /> Back to Library
          </button>
          <h2 className="text-xl font-bold text-white mb-1">{prompt.name}</h2>
          <p className="text-xs text-slate-400">{prompt.description}</p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-4">Variables</h3>
            <div className="space-y-4">
              {prompt.variables.map(v => (
                <div key={v.name}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm text-slate-300 font-mono">{`{{${v.name}}}`}</label>
                    <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Upload size={12} /> Import File
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(v.name, e.target.files[0])}
                      />
                    </label>
                  </div>
                  
                  <textarea 
                    value={variableValues[v.name] || ''}
                    onChange={(e) => setVariableValues({...variableValues, [v.name]: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none h-32 font-mono"
                    placeholder={`Enter content for ${v.name}...`}
                  />
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

      {/* Right Panel: Output */}
      <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
        <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
          <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
            <Cpu size={16} /> Output Console
          </span>
          {result && (
             <div className="flex items-center gap-4">
               <span className="text-xs text-slate-500">Latency: {result.metadata?.latency}ms</span>
               <button 
                 onClick={handleCopy}
                 className="text-slate-400 hover:text-white transition-colors"
                 title="Copy to clipboard"
               >
                 {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
               </button>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8">
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
             <div className="space-y-6 animate-in fade-in duration-500">
               {result.error && (
                 <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-200 rounded-lg">
                   <strong>Error:</strong> {result.error}
                 </div>
               )}

               {!result.error && (
                 <>
                   {result.metadata?.steps && result.metadata.steps.length > 0 && (
                     <div className="space-y-2 mb-6">
                       <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold">Reasoning Trace</h4>
                       {result.metadata.steps.map((step, idx) => (
                         <div key={idx} className="text-xs font-mono text-slate-500 border-l-2 border-slate-800 pl-3 py-1">
                           {step}
                         </div>
                       ))}
                     </div>
                   )}

                   <div>
                      <h4 className="text-xs uppercase tracking-wider text-emerald-500 font-bold mb-3">Final Response</h4>
                      <div className="prose prose-invert prose-slate max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-300">
                        {result.text}
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

export default ExecutionView;