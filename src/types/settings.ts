import { CandidateCriteria } from './ai';

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: string; // 'auto' | 'openai' | 'openrouter' | 'deepseek' | 'groq' | 'ollama' | 'custom'
  reasoningEffort: 'none' | 'low' | 'medium' | 'high' | 'max';
  batchSize: number;
  concurrency: number;
  systemPrompt?: string;
}

export interface AppSettings {
  llm: LLMConfig;
  criteriaPresets: CandidateCriteria[];
  activeCriteriaId: string | null;
  activeCriteriaText: string;
  autoSyncPage: boolean;
  maxPages: number;
  highlightInPage: boolean;
}
