import { describe, it, expect, afterEach } from 'vitest';
import {
  formatBatchForAi,
  validateBatchResults,
  evaluateBatch,
  filterVacanciesWithAi
} from '../../src/core/ai-filter';
import { VacancyItem } from '../../src/types/vacancy';
import { LLMConfig } from '../../src/types/settings';

describe('core/ai-filter', () => {
  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  const batch: VacancyItem[] = [
    {
      id: '101',
      title: 'Python Backend Developer',
      company: 'Alpha Corp',
      salary: '180k–220k ₽',
      area: 'Москва',
      schedule: 'Удалёнка',
      experience: '2 года',
      employment: 'Полная',
      skills: ['Python', 'FastAPI'],
      source: 'hh.ru',
      description: 'Разработка сервисов',
      text: '',
      href: ''
    },
    {
      id: '102',
      title: 'React Frontend Developer',
      company: 'Beta Soft',
      salary: '250k ₽',
      area: 'СПб',
      schedule: 'Гибрид',
      experience: '3 года',
      employment: 'Полная',
      skills: ['React', 'TypeScript'],
      source: 'hh.ru',
      description: 'Фронтенд на React',
      text: '',
      href: ''
    }
  ];

  const testConfig: LLMConfig = {
    baseUrl: 'https://api.test/v1',
    apiKey: 'test-key',
    model: 'gpt-4o-mini',
    provider: 'auto',
    reasoningEffort: 'none',
    batchSize: 25,
    concurrency: 2
  };

  it('formats batch of vacancies into readable prompt text', () => {
    const formatted = formatBatchForAi(batch);
    expect(formatted).toContain('[ID: 101] Python Backend Developer | Alpha Corp');
    expect(formatted).toContain('Формат: Удалёнка');
    expect(formatted).toContain('Стек: Python, FastAPI');
    expect(formatted).toContain('[ID: 102] React Frontend Developer | Beta Soft');
  });

  it('validates and clamps score and match consistency', () => {
    const rawResults = [
      { id: '101', match: true, score: 90, reason: 'Идеальный стек' },
      { id: '102', match: false, score: 80, reason: 'Не подходит' }, // match false but score > 50 -> clamped to 45
      { id: '999', match: true, score: 100, reason: 'Alien ID' } // not in batch -> ignored
    ];

    const valid = validateBatchResults(rawResults, batch);
    expect(valid.length).toBe(2);
    expect(valid[0].id).toBe('101');
    expect(valid[0].match).toBe(true);
    expect(valid[0].score).toBe(90);

    expect(valid[1].id).toBe('102');
    expect(valid[1].match).toBe(false);
    expect(valid[1].score).toBe(45);
  });

  it('clamps match: true with score < 50 up to 55', () => {
    const rawResults = [{ id: '101', match: true, score: 30, reason: 'Норм' }];
    const valid = validateBatchResults(rawResults, batch);
    expect(valid[0].match).toBe(true);
    expect(valid[0].score).toBe(55);
  });

  it('evaluates batch via streaming tool calls successfully', async () => {
    const sseResponse = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"submit_vacancy_evaluations","arguments":"{\\"results\\": ["}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"id\\": \\"101\\", \\"match\\": true, \\"score\\": 92, \\"reason\\": \\"Python стек подходит\\"}"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"]}"}}]}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('');

    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        text: async () => sseResponse
      }) as any;

    const evaluated = await evaluateBatch('Ищу Python разработчика', batch, testConfig);
    expect(evaluated.length).toBe(1);
    expect(evaluated[0].id).toBe('101');
    expect(evaluated[0].match).toBe(true);
    expect(evaluated[0].score).toBe(92);
    expect(evaluated[0].reason).toContain('Python');
  });

  it('filters vacancies end-to-end and reports progress accurately', async () => {
    const sseResponse = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"submit_vacancy_evaluations","arguments":"{\\"results\\": [{\\"id\\": \\"101\\", \\"match\\": true, \\"score\\": 95, \\"reason\\": \\"Отличный Python\\"}]}"}}]}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('');

    globalThis.fetch = async () =>
      ({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        text: async () => sseResponse
      }) as any;

    const progressEvents: any[] = [];
    const matched = await filterVacanciesWithAi('Python', batch, testConfig, p =>
      progressEvents.push(p)
    );

    expect(matched.length).toBe(1);
    expect(matched[0].id).toBe('101');
    expect(matched[0].aiScore).toBe(95);
    expect(matched[0].aiMatch).toBe(true);
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[progressEvents.length - 1].stage).toBe('done');
  });

  it('handles abort signal cancellation during filter run', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      filterVacanciesWithAi('Python', batch, testConfig, undefined, controller.signal)
    ).rejects.toThrow();
  });

  it('evaluates batch via fallback plain JSON stream when tool calls return HTTP 400', async () => {
    let callCount = 0;
    const sseResponse = [
      'data: {"choices":[{"delta":{"content":"```json\\n{\\"results\\": [{\\"id\\": \\"101\\", \\"match\\": true, \\"score\\": 91, \\"reason\\": \\"Fallback Python\\"}]}\\n```"}}]}\n\n',
      'data: [DONE]\n\n'
    ].join('');

    globalThis.fetch = async (_url: any, options: any) => {
      callCount++;
      const body = JSON.parse(options?.body || '{}');
      if (body.tools) {
        // First call with tools rejected with HTTP 400
        return {
          ok: false,
          status: 400,
          text: async () => '{"error": "Tools not supported"}'
        } as any;
      }
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        text: async () => sseResponse
      } as any;
    };

    const evaluated = await evaluateBatch('Ищу Python разработчика', batch, testConfig);
    expect(callCount).toBe(2);
    expect(evaluated.length).toBe(1);
    expect(evaluated[0].id).toBe('101');
    expect(evaluated[0].score).toBe(91);
  });

  it('validates missing apiKey or criteria', async () => {
    const invalidConfig = { ...testConfig, apiKey: '' };
    await expect(filterVacanciesWithAi('Python', batch, invalidConfig)).rejects.toThrow(/API Key/);

    await expect(filterVacanciesWithAi('', batch, testConfig)).rejects.toThrow(/критерии/);
  });
});
