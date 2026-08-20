import { describe, it, expect, afterEach } from 'vitest';
import {
  formatHttpError,
  isRetryableStatus,
  parseSseStream,
  sendAiRequest,
  sendAiStreamingToolCall,
  testConnection,
  fetchModels
} from '../../src/core/llm';
import { LLMConfig } from '../../src/types/settings';

describe('core/llm', () => {
  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('formats HTTP error properly', () => {
    const err = formatHttpError(
      401,
      JSON.stringify({ error: { message: 'Invalid API key' } }),
      'https://api.openai.com/v1'
    );
    expect(err).toContain('HTTP 401');
    expect(err).toContain('Invalid API key');
  });

  it('identifies retryable status codes', () => {
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(500)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(401)).toBe(false);
    expect(isRetryableStatus(404)).toBe(false);
  });

  it('parses Server-Sent Events stream data', () => {
    const raw = `
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}
data: [DONE]
    `.trim();

    const events = parseSseStream(raw);
    expect(events.length).toBe(2);
    expect(events[0].choices[0].delta.content).toBe('Hello');
    expect(events[1].choices[0].delta.content).toBe(' world');
  });

  it('streams and parses tool call arguments chunk-by-chunk', async () => {
    const sseChunks = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"submit_vacancy_evaluations","arguments":"{\\"results\\": ["}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"id\\": \\"101\\", \\"match\\": true, \\"score\\": 95, \\"reason\\": \\"React стек\\"}"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"]}"}}]}}]}\n\n',
      'data: [DONE]\n\n'
    ];

    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        text: async () => sseChunks.join('')
      }) as any;

    const result = await sendAiStreamingToolCall(
      'https://api.test/v1/chat/completions',
      { model: 'gpt-4o-mini' },
      'secret-key'
    );

    expect(result.functionName).toBe('submit_vacancy_evaluations');
    expect(result.arguments.results.length).toBe(1);
    expect(result.arguments.results[0].id).toBe('101');
    expect(result.arguments.results[0].match).toBe(true);
    expect(result.arguments.results[0].score).toBe(95);
  });

  it('sends AI request and returns parsed response', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () =>
          JSON.stringify({
            choices: [{ message: { content: 'Test response' } }]
          })
      }) as any;

    const res = await sendAiRequest(
      'https://api.test/v1/chat/completions',
      { model: 'gpt-4o-mini' },
      'secret-key'
    );

    expect(res.choices[0].message.content).toBe('Test response');
  });

  it('tests connection to LLM endpoint', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => JSON.stringify({ choices: [{ message: { content: 'Pong' } }] })
      }) as any;

    const config: LLMConfig = {
      baseUrl: 'https://api.test/v1',
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      provider: 'auto',
      reasoningEffort: 'none',
      batchSize: 25,
      concurrency: 3
    };

    const ok = await testConnection(config);
    expect(ok).toBe(true);
  });

  it('fetches model list from /models', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () =>
          JSON.stringify({
            data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }, { id: 'deepseek-chat' }]
          })
      }) as any;

    const config: LLMConfig = {
      baseUrl: 'https://api.test/v1',
      apiKey: 'test-key',
      model: '',
      provider: 'auto',
      reasoningEffort: 'none',
      batchSize: 25,
      concurrency: 3
    };

    const models = await fetchModels(config);
    expect(models).toEqual(['deepseek-chat', 'gpt-4o', 'gpt-4o-mini']);
  });
});
