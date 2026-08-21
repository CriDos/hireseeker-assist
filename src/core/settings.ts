import { AppSettings, LLMConfig } from '../types/settings';
import { CandidateCriteria } from '../types/ai';
import { AI_SYSTEM_PROMPT } from './ai-prompts';

export const SETTINGS_STORAGE_KEY = 'hs_settings';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  provider: 'auto',
  reasoningEffort: 'none',
  batchSize: 25,
  concurrency: 3,
  systemPrompt: AI_SYSTEM_PROMPT
};

export const DEFAULT_CRITERIA_PRESETS: CandidateCriteria[] = [
  {
    id: 'default-python',
    name: 'Python Backend (Удаленка)',
    text: 'Ищу вакансии Python Backend (FastAPI, Django, PostgreSQL, Docker, AsyncIO). Только удаленный формат работы по РФ или без привязки к городу. Опыт 2+ года. Не подходят 1С, PHP, стажировки и офисные вакансии.',
    updatedAt: Date.now()
  },
  {
    id: 'default-frontend',
    name: 'Frontend Developer (React / TS)',
    text: 'Ищу вакансии Frontend Developer на React / TypeScript. Удаленка или офис в СПб. Не подходит Vue, Angular, верстка без JS.',
    updatedAt: Date.now()
  }
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  llm: DEFAULT_LLM_CONFIG,
  criteriaPresets: DEFAULT_CRITERIA_PRESETS,
  activeCriteriaId: 'default-python',
  activeCriteriaText: DEFAULT_CRITERIA_PRESETS[0].text,
  autoSyncPage: true,
  maxPages: 50,
  highlightInPage: true
};

export function settingsDefaults(raw: any = {}): AppSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_APP_SETTINGS };

  const llmRaw = raw.llm || {};
  let baseUrl = String(llmRaw.baseUrl || DEFAULT_LLM_CONFIG.baseUrl).trim();
  let apiKey = String(llmRaw.apiKey || '').trim();

  if (baseUrl.startsWith('sk-')) {
    if (!apiKey) apiKey = baseUrl;
    baseUrl = 'https://api.openai.com/v1';
  }
  if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }
  baseUrl = baseUrl.replace(/\/+$/, '');

  const llm: LLMConfig = {
    baseUrl,
    apiKey,
    model: String(llmRaw.model || DEFAULT_LLM_CONFIG.model),
    provider: String(llmRaw.provider || DEFAULT_LLM_CONFIG.provider),
    reasoningEffort: llmRaw.reasoningEffort || DEFAULT_LLM_CONFIG.reasoningEffort,
    batchSize: Math.max(
      5,
      Math.min(
        llmRaw.batchSize != null && !isNaN(Number(llmRaw.batchSize))
          ? Number(llmRaw.batchSize)
          : DEFAULT_LLM_CONFIG.batchSize,
        50
      )
    ),
    concurrency: Math.max(
      1,
      Math.min(
        llmRaw.concurrency != null && !isNaN(Number(llmRaw.concurrency))
          ? Number(llmRaw.concurrency)
          : DEFAULT_LLM_CONFIG.concurrency,
        5
      )
    ),
    systemPrompt: llmRaw.systemPrompt || DEFAULT_LLM_CONFIG.systemPrompt
  };

  const criteriaPresets: CandidateCriteria[] =
    Array.isArray(raw.criteriaPresets) && raw.criteriaPresets.length
      ? raw.criteriaPresets
      : DEFAULT_CRITERIA_PRESETS;

  return {
    llm,
    criteriaPresets,
    activeCriteriaId: raw.activeCriteriaId ?? criteriaPresets[0]?.id ?? null,
    activeCriteriaText: String(raw.activeCriteriaText ?? criteriaPresets[0]?.text ?? ''),
    autoSyncPage: raw.autoSyncPage ?? DEFAULT_APP_SETTINGS.autoSyncPage,
    maxPages: Number(raw.maxPages) || DEFAULT_APP_SETTINGS.maxPages,
    highlightInPage: raw.highlightInPage ?? DEFAULT_APP_SETTINGS.highlightInPage
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      return settingsDefaults(res[SETTINGS_STORAGE_KEY]);
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) return settingsDefaults(JSON.parse(raw));
    }
  } catch {}

  return { ...DEFAULT_APP_SETTINGS };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = settingsDefaults({ ...current, ...settings });

  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: next });
    }
  } catch {}

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {}

  return next;
}
