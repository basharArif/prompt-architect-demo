import { PromptTemplate } from '../types';
import { cosineSimilarity } from './geminiService';

const STORAGE_KEY = 'prompt_architect_templates';

const SEED_DATA: PromptTemplate[] = [
  {
    id: 'seed-1',
    name: 'Rust Code Refactor',
    description: 'Refactors Rust code for idiomatic patterns and borrow checker safety.',
    tags: ['coding', 'rust', 'refactor'],
    template: `You are a Rust Expert. Refactor the following code to be more idiomatic and safe.

Code:
\`\`\`rust
{{code_snippet}}
\`\`\`

Explain your changes specifically regarding memory safety.`,
    variables: [{ name: 'code_snippet', type: 'text', defaultValue: '' }],
    algorithms: { chainOfDensity: false, stepBack: true },
    lastModified: Date.now(),
    usageCount: 5,
    modelPreference: { mode: 'smart' }
  },
  {
    id: 'seed-2',
    name: 'Email Summarizer (Dense)',
    description: 'Creates a high-density summary of long email threads.',
    tags: ['productivity', 'email', 'summary'],
    template: `Summarize the following email thread. Focus on action items and dates.

Email Content:
{{email_body}}`,
    variables: [{ name: 'email_body', type: 'text', defaultValue: '' }],
    algorithms: { chainOfDensity: true, stepBack: false },
    lastModified: Date.now(),
    usageCount: 12,
    modelPreference: { mode: 'fast' }
  }
];

export const storageService = {
  getAll: (): PromptTemplate[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return SEED_DATA;
    }
    return JSON.parse(stored);
  },

  save: (template: PromptTemplate) => {
    const templates = storageService.getAll();
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      // Preserve embedding if not provided in update
      if (!template.embedding && templates[index].embedding) {
        template.embedding = templates[index].embedding;
      }
      // Preserve usage count if updating
      template.usageCount = templates[index].usageCount || 0;
      templates[index] = template;
    } else {
      // New templates start with 0 usage
      template.usageCount = 0;
      templates.push(template);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },

  incrementUsage: (id: string) => {
    const templates = storageService.getAll();
    const index = templates.findIndex((t) => t.id === id);
    if (index >= 0) {
      templates[index].usageCount = (templates[index].usageCount || 0) + 1;
      // Update last modified implies "last used" in some contexts, but SRS asks for recency.
      // We won't update lastModified here to keep 'edit' recency separate from 'usage'.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    }
  },

  delete: (id: string) => {
    const templates = storageService.getAll().filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  },

  getById: (id: string): PromptTemplate | undefined => {
    return storageService.getAll().find((t) => t.id === id);
  },

  // FR-05: Hybrid Ranking Implementation
  // Weights: Usage Frequency, Recency, Vector Similarity, Keyword Match
  search: (query: string, queryEmbedding?: number[]): PromptTemplate[] => {
    const all = storageService.getAll();
    if (!query) return all;

    const lowerTerm = query.toLowerCase();
    const now = Date.now();
    const DAY_MS = 1000 * 60 * 60 * 24;
    
    return all.map(p => {
      let score = 0;
      
      // 1. Keyword Score (Base Relevance)
      if (p.name.toLowerCase().includes(lowerTerm)) score += 10;
      if (p.description.toLowerCase().includes(lowerTerm)) score += 5;
      if (p.tags.some(t => t.toLowerCase().includes(lowerTerm))) score += 3;
      
      // 2. Vector Score (Semantic Relevance)
      if (queryEmbedding && p.embedding) {
        const sim = cosineSimilarity(queryEmbedding, p.embedding);
        // Strong weight on semantic meaning
        score += (sim * 25); 
      }

      // 3. Recency Score (Decay)
      // Recently modified prompts get a small boost.
      const daysSinceMod = (now - p.lastModified) / DAY_MS;
      const recencyBoost = Math.max(0, 5 - daysSinceMod); // +5 points if today, 0 if >5 days
      score += recencyBoost;

      // 4. Usage Frequency Score (Logarithmic Boost)
      // Prompts used often are likely better. log10(1) = 0, log10(10) = 1, log10(100) = 2
      const usageBoost = Math.log10((p.usageCount || 0) + 1) * 5;
      score += usageBoost;

      return { ...p, score };
    })
    .filter(p => p.score > 0.5) // Filter noise
    .sort((a, b) => b.score - a.score);
  }
};