import { GoogleGenAI, GenerateContentResponse, EmbedContentResponse } from "@google/genai";
import { ExecutionResult, ModelMode } from "../types";

const EMBEDDING_MODEL = 'text-embedding-004';

// SRS 7.1: Token Bucket Implementation with Local Persistence
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRatePerSecond: number;
  private readonly storageKey: string;

  constructor(maxTokens: number, refillRatePerSecond: number, storageKey: string) {
    this.maxTokens = maxTokens;
    this.refillRatePerSecond = refillRatePerSecond;
    this.storageKey = `pa_ratelimit_${storageKey}`;

    // Load state
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      this.tokens = parsed.tokens;
      this.lastRefill = parsed.lastRefill;
    } else {
      this.tokens = maxTokens;
      this.lastRefill = Date.now();
    }
  }

  private saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify({
      tokens: this.tokens,
      lastRefill: this.lastRefill
    }));
  }

  async consume(cost: number = 1): Promise<boolean> {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      this.saveState();
      return true;
    }
    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + (elapsed * this.refillRatePerSecond));
      this.lastRefill = now;
      this.saveState();
    }
  }
}

// Rate Limiters for Free Tier (Approximations)
// RPM = Requests Per Minute. 
// Flash: 15 RPM
const flashLimiter = new TokenBucket(15, 15 / 60, 'flash'); 
// Pro: 2 RPM
const proLimiter = new TokenBucket(2, 2 / 60, 'pro'); 

const getClient = () => {
    if (!process.env.API_KEY) {
        console.warn("Missing API KEY in environment variables.");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to select model based on mode
const getModelConfig = (mode: ModelMode = 'fast') => {
  switch (mode) {
    case 'smart':
      return { model: 'gemini-3-pro-preview', limiter: proLimiter };
    case 'reasoning':
      // Using Thinking Budget
      return { 
        model: 'gemini-3-pro-preview', 
        limiter: proLimiter,
        config: { thinkingConfig: { thinkingBudget: 1024 } } 
      };
    case 'fast':
    default:
      return { model: 'gemini-2.5-flash', limiter: flashLimiter };
  }
};

// FR-06: Retry Logic Wrapper
const withRetry = async <T>(
  fn: () => Promise<T>, 
  retries: number = 3, 
  delay: number = 1000
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error.status === 503 || error.status === 500 || error.message?.includes('overloaded');
    if (retries > 0 && isRetryable) {
      console.warn(`Request failed. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw error;
  }
};

export const generateEmbedding = async (text: string): Promise<number[] | undefined> => {
  const ai = getClient();
  try {
    const response = await withRetry<EmbedContentResponse>(() => ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    }));
    // Handle potential type mismatch: TS thinks embedding is missing and suggests embeddings.
    // We check both to be safe at runtime and satisfy TS by casting to any for the property access.
    const embedResult = (response as any).embedding || (response as any).embeddings?.[0];
    return embedResult?.values;
  } catch (e) {
    console.error("Embedding failed:", e);
    return undefined;
  }
};

export const cosineSimilarity = (vecA: number[], vecB: number[]) => {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const executeStandardPrompt = async (prompt: string, mode: ModelMode = 'fast'): Promise<ExecutionResult> => {
  const ai = getClient();
  const start = Date.now();
  const { model, limiter, config } = getModelConfig(mode);
  
  // FR-06: Rate Limit Check
  const canProceed = await limiter.consume();
  if (!canProceed) {
    return { text: '', error: `Rate limit exceeded for ${mode} mode. Please wait or switch to Fast mode.` };
  }

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: prompt,
      config: config
    }));
    
    return {
      text: response.text || "No response generated.",
      metadata: {
        model: model,
        latency: Date.now() - start,
      }
    };
  } catch (error: any) {
    return {
      text: '',
      error: error.message || "Unknown error occurred during execution."
    };
  }
};

export const executeStepBackPrompt = async (originalPrompt: string, mode: ModelMode = 'fast'): Promise<ExecutionResult> => {
  const ai = getClient();
  const start = Date.now();
  const steps: string[] = [];
  const { model, limiter } = getModelConfig(mode);

  if (!(await limiter.consume())) return { text: '', error: "Rate limit exceeded." };

  try {
    steps.push("Generating Step-Back abstraction...");
    // Step 1 always uses Flash for speed/cost unless strictly reasoning
    const stepBackModel = 'gemini-2.5-flash'; 

    const stepBackPrompt = `
    You are an expert at world modeling and abstraction.
    Take the following user request and rephrase it as a more general, abstract question.
    User Request: ${originalPrompt}
    `;

    const step1Response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: stepBackModel,
      contents: stepBackPrompt,
    }));
    
    const abstractPrinciples = step1Response.text || "";
    steps.push(`Abstraction: ${abstractPrinciples}`);

    steps.push("Executing final grounded prompt...");
    const finalPrompt = `
    Use the following principles and facts to answer the user's original request.
    
    Principles:
    ${abstractPrinciples}

    Original Request:
    ${originalPrompt}
    `;

    const step2Response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: finalPrompt,
    }));

    return {
      text: step2Response.text || "",
      metadata: {
        model: model,
        latency: Date.now() - start,
        steps: steps
      }
    };

  } catch (error: any) {
    return {
      text: '',
      error: error.message
    };
  }
};

export const executeChainOfDensity = async (originalPrompt: string, mode: ModelMode = 'fast'): Promise<ExecutionResult> => {
  const ai = getClient();
  const start = Date.now();
  const steps: string[] = [];
  const { model, limiter } = getModelConfig(mode);
  
  if (!(await limiter.consume())) return { text: '', error: "Rate limit exceeded." };

  const ITERATIONS = 3;
  let currentResponse = "";

  try {
    for (let i = 0; i < ITERATIONS; i++) {
      steps.push(`Iteration ${i + 1}/${ITERATIONS}...`);
      
      let promptToSend = "";
      
      if (i === 0) {
        promptToSend = `${originalPrompt}\nGenerate an initial concise response.`;
      } else {
        promptToSend = `
        Original Request: ${originalPrompt}
        Previous Response: ${currentResponse}
        Identify missing entities. Rewrite to include them without increasing length.
        `;
      }

      const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: model,
        contents: promptToSend,
      }));
      
      currentResponse = response.text || "";
      steps.push(`Result ${i+1}: ${currentResponse.substring(0, 50)}...`);
    }

    return {
      text: currentResponse,
      metadata: {
        model: model,
        latency: Date.now() - start,
        steps: steps
      }
    };

  } catch (error: any) {
    return {
      text: '',
      error: error.message
    };
  }
};