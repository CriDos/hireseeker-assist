import { test, afterEach, assert, expect } from 'vitest';
import { EFFORT_VALUES, PRESET_PROVIDERS } from '../../src/core/models.ts';

afterEach(() => {
  delete (globalThis as any).fetch;
  delete (globalThis as any).chrome;
});

test('models: listModels strips the trailing slash, sorts and dedupes ids', async () => {
  const { listModels } = await import('../../src/core/models.ts');
  let requestedUrl: any = null;
  let requestedHeaders: any = null;
  globalThis.fetch = async (url: any, opts: any) => {
    requestedUrl = url;
    requestedHeaders = opts?.headers;
    return {
      ok: true,
      json: async () => ({ data: [{ id: 'gamma' }, { id: 'alpha' }, { id: 'gamma' }] })
    } as any;
  };

  const models = await listModels('https://api.test/v1/', 'test-key');
  assert.equal(requestedUrl, 'https://api.test/v1/models');
  assert.equal(requestedHeaders?.Authorization, 'Bearer test-key');
  assert.deepEqual(models, ['alpha', 'gamma']);
});

test('models: listModels supports models array and string lists', async () => {
  const { listModels } = await import('../../src/core/models.ts');
  globalThis.fetch = async () =>
    ({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3' }, { name: 'mistral' }] })
    }) as any;

  const models = await listModels('https://api.test/v1', '');
  assert.deepEqual(models, ['llama3', 'mistral']);
});

test('models: cachedModels/saveCachedModels round-trip via storage.local', async () => {
  const { cachedModels, saveCachedModels } = await import('../../src/core/models.ts');
  const store: Record<string, any> = {};
  (globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key: any) =>
          typeof key === 'string' ? { [key]: store[key] } : Object.assign({}, key, store),
        set: async (obj: any) => Object.assign(store, obj)
      }
    }
  };

  assert.equal(await cachedModels('https://api.test/v1'), null, 'без кэша — null');
  await saveCachedModels('https://api.test/v1', ['a', 'b'], { a: { reasoning: true } } as any);
  const entry = await cachedModels('https://api.test/v1/');
  assert.deepEqual(entry?.models, ['a', 'b']);
  assert.equal(entry?.meta?.a?.reasoning, true);
  assert.ok((entry?.at || 0) > 0);
  assert.equal(await cachedModels('https://other.test'), null, 'кэш изолирован по baseUrl');
});

test('listModels throws on http errors and empty lists', async () => {
  const { listModels } = await import('../../src/core/models.ts');
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'forbidden' }) as any;
  await expect(listModels('https://api.test/v1', 'k')).rejects.toThrow(/HTTP 403 forbidden/);

  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: [] }) }) as any;
  await expect(listModels('https://api.test/v1', 'k')).rejects.toThrow(/не вернуло моделей/);
});

test('EFFORT_VALUES exposes a stable whitelist', () => {
  assert.deepEqual(EFFORT_VALUES, [
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'default'
  ]);
});

test('PRESET_PROVIDERS contains OpenCode Zen with correct endpoint', () => {
  const opencode = PRESET_PROVIDERS.find(p => p.id === 'opencode');
  assert.ok(opencode, 'OpenCode Zen provider must be present in presets');
  assert.equal(opencode.name, 'OpenCode Zen');
  assert.equal(opencode.baseUrl, 'https://opencode.ai/zen/go/v1');
});

test('PRESET_PROVIDERS contains all required providers', () => {
  const ids = PRESET_PROVIDERS.map(p => p.id);
  expect(ids).toContain('custom');
  expect(ids).toContain('openai');
  expect(ids).toContain('openrouter');
  expect(ids).toContain('opencode');
  expect(ids).toContain('deepseek');
  expect(ids).toContain('groq');
  expect(ids).toContain('mistral');
  expect(ids).toContain('ollama');
  expect(ids).toContain('vllm');
});
