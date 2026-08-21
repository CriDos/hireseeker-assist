import { describe, it, expect } from 'vitest';
import { settingsDefaults, DEFAULT_LLM_CONFIG } from '../../src/core/settings';

describe('core/settings', () => {
  it('returns valid defaults for empty input', () => {
    const s = settingsDefaults({});
    expect(s.llm.baseUrl).toBe(DEFAULT_LLM_CONFIG.baseUrl);
    expect(s.llm.model).toBe(DEFAULT_LLM_CONFIG.model);
    expect(s.llm.batchSize).toBe(DEFAULT_LLM_CONFIG.batchSize);
    expect(s.criteriaPresets.length).toBeGreaterThan(0);
  });

  it('normalizes baseUrl and sk- prefix', () => {
    const s = settingsDefaults({
      llm: {
        baseUrl: 'sk-1234567890'
      }
    });
    expect(s.llm.baseUrl).toBe('https://api.openai.com/v1');
    expect(s.llm.apiKey).toBe('sk-1234567890');
  });

  it('clamps batchSize between 5 and 50', () => {
    const s1 = settingsDefaults({ llm: { batchSize: 2 } });
    expect(s1.llm.batchSize).toBe(5);

    const s2 = settingsDefaults({ llm: { batchSize: 100 } });
    expect(s2.llm.batchSize).toBe(50);
  });

  it('clamps concurrency between 1 and 5', () => {
    const s1 = settingsDefaults({ llm: { concurrency: 0 } });
    expect(s1.llm.concurrency).toBe(1);

    const s2 = settingsDefaults({ llm: { concurrency: 10 } });
    expect(s2.llm.concurrency).toBe(5);
  });

  it('loads and saves settings via storage', async () => {
    const { loadSettings, saveSettings } = await import('../../src/core/settings');
    const store: Record<string, any> = {};
    (globalThis as any).chrome = {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: store[key] }),
          set: async (obj: any) => Object.assign(store, obj)
        }
      }
    };

    const initial = await loadSettings();
    expect(initial.llm.model).toBe('gpt-4o-mini');

    await saveSettings({ llm: { ...initial.llm, model: 'deepseek-chat' } });
    const updated = await loadSettings();
    expect(updated.llm.model).toBe('deepseek-chat');
  });
});
