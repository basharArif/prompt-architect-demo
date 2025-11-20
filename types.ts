export interface Variable {
  name: string;
  type: 'text' | 'selection' | 'file' | 'stdin';
  defaultValue?: string;
}

export interface PromptAlgorithms {
  chainOfDensity: boolean;
  stepBack: boolean;
}

export type ModelMode = 'fast' | 'smart' | 'reasoning';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  template: string; 
  variables: Variable[];
  algorithms: PromptAlgorithms;
  lastModified: number;
  // FR-05: Hybrid Ranking (Usage Frequency)
  usageCount: number; 
  // FR-03: Vector Indexing
  embedding?: number[]; 
  // SRS 10: Model Preferences
  modelPreference?: {
    mode: ModelMode;
  };
}

export interface ExecutionResult {
  text: string;
  metadata?: {
    model: string;
    latency: number;
    steps?: string[]; 
  };
  error?: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export type ViewState = 'library' | 'editor' | 'execution';