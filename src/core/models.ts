export const EFFORT_VALUES = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
  'default'
] as const;
export type EffortValue = (typeof EFFORT_VALUES)[number];

export interface PresetProvider {
  id: string;
  name: string;
  baseUrl: string;
  hint: string;
}

export const PRESET_PROVIDERS: PresetProvider[] = [
  {
    id: 'custom',
    name: 'Свой сервер / Прокси',
    baseUrl: '',
    hint: 'http://localhost:11434/v1 или свой адрес'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    hint: 'https://api.openai.com/v1'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    hint: 'https://openrouter.ai/api/v1'
  },
  {
    id: 'opencode',
    name: 'OpenCode Zen',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    hint: 'https://opencode.ai/zen/go/v1'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    hint: 'https://api.deepseek.com/v1'
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    hint: 'https://api.groq.com/openai/v1'
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    hint: 'https://api.mistral.ai/v1'
  },
  {
    id: 'ollama',
    name: 'Ollama (локально)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    hint: 'http://127.0.0.1:11434/v1'
  },
  {
    id: 'vllm',
    name: 'vLLM (локально)',
    baseUrl: 'http://127.0.0.1:8000/v1',
    hint: 'http://127.0.0.1:8000/v1'
  }
];

export const MODELS_TTL = 30 * 60 * 1000;
const MODELS_CACHE_PREFIX = 'models:';
const MODELS_FETCH_TIMEOUT_MS = 20000;

const modelsCacheKey = (baseUrl: string) =>
  `${MODELS_CACHE_PREFIX}${String(baseUrl || '').replace(/\/+$/, '')}`;

export interface CachedModelsEntry {
  models: string[];
  meta?: Record<string, any>;
  at: number;
}

export async function cachedModels(
  baseUrl: string,
  storage = (globalThis as any).chrome?.storage?.local
): Promise<CachedModelsEntry | null> {
  if (!storage?.get) return null;
  const key = modelsCacheKey(baseUrl);
  const stash = await storage.get(key).catch(() => ({}));
  const entry = stash[key];
  if (!entry || !Array.isArray(entry.models)) return null;
  if (Date.now() - (entry.at || 0) > MODELS_TTL) return null;
  return entry;
}

export async function saveCachedModels(
  baseUrl: string,
  models: string[],
  meta?: Record<string, any>,
  storage = (globalThis as any).chrome?.storage?.local
): Promise<void> {
  if (!storage?.set) return;
  const key = modelsCacheKey(baseUrl);
  await storage.set({ [key]: { models, meta: meta || {}, at: Date.now() } }).catch(() => {});
}

export async function listModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${String(baseUrl).replace(/\/+$/, '')}/models`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MODELS_FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }
    const response = await fetch(url, {
      headers,
      signal: ctrl.signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status} ${body.slice(0, 300)}`);
    }

    const json = await response.json();
    const rawList = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.models)
        ? json.models
        : Array.isArray(json)
          ? json
          : [];

    const models = rawList
      .map((item: any) => (typeof item === 'string' ? item : item?.id || item?.name))
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));

    if (!models.length) throw new Error('API не вернуло моделей');
    return [...new Set(models)] as string[];
  } finally {
    clearTimeout(timer);
  }
}
