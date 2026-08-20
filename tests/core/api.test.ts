import { describe, it, expect, afterEach } from 'vitest';
import {
  buildSearchRequestBody,
  buildPageQueryParams,
  pageCountFor,
  resolveProfessionCodes,
  PROFESSION_GROUPS,
  fetchSearchPage,
  executeSearch
} from '../../src/core/api';

describe('core/api', () => {
  afterEach(() => {
    delete (globalThis as any).fetch;
  });

  it('calculates page count correctly', () => {
    expect(pageCountFor(1000, 500)).toBe(2);
    expect(pageCountFor(1001, 500)).toBe(3);
    expect(pageCountFor(0, 500)).toBe(1);
    expect(pageCountFor(50, 500)).toBe(1);
  });

  it('throws error when no professions or query specified in search body', () => {
    expect(() => buildSearchRequestBody()).toThrowError(
      /Поисковые фильтры или профессии не выбраны/
    );
  });

  it('builds search request body from URL params (?top=developers&group=backend&en=0&sched=remote)', () => {
    const url = 'https://hireseeker.ru/?top=developers&group=backend&en=0&sched=remote';
    const body = buildSearchRequestBody(url);
    expect(body.profession_codes).toEqual(PROFESSION_GROUPS['backend']);
    expect(body.include_english).toBe(false);
    expect(body.search_text).toBe('');
    expect(body.period_days).toBe(7);

    const queryParams = buildPageQueryParams(url);
    expect(queryParams).toContain('schedule_filter=remote');
  });

  it('resolves qa_testing category accurately (?top=qa_testing&group=qa_testing&en=0&sched=remote)', () => {
    const url = 'https://hireseeker.ru/?top=qa_testing&group=qa_testing&en=0&sched=remote';
    const body = buildSearchRequestBody(url);
    expect(body.profession_codes).toEqual(['qa_manual', 'qa_automation']);
    expect(body.include_english).toBe(false);

    const queryParams = buildPageQueryParams(url);
    expect(queryParams).toContain('schedule_filter=remote');
  });

  it('resolves frontend category accurately (?top=developers&group=frontend&en=0&sched=remote)', () => {
    const url = 'https://hireseeker.ru/?top=developers&group=frontend&en=0&sched=remote';
    const body = buildSearchRequestBody(url);
    expect(body.profession_codes).toEqual([
      'react_frontend',
      'vue_frontend',
      'angular_frontend',
      'other_frontend'
    ]);
  });

  it('resolves all known profession categories', () => {
    expect(resolveProfessionCodes('developers', 'backend')).toEqual(PROFESSION_GROUPS['backend']);
    expect(resolveProfessionCodes('developers', 'frontend')).toEqual(PROFESSION_GROUPS['frontend']);
    expect(resolveProfessionCodes('developers', 'mobile_development')).toEqual(
      PROFESSION_GROUPS['mobile_development']
    );
    expect(resolveProfessionCodes('qa_testing', 'qa_testing')).toEqual([
      'qa_manual',
      'qa_automation'
    ]);
    expect(resolveProfessionCodes('qa', 'manual_qa')).toEqual(['qa_manual']);
    expect(resolveProfessionCodes('qa', 'automation_qa')).toEqual(['qa_automation']);
    expect(resolveProfessionCodes('design', 'ui_ux')).toEqual(PROFESSION_GROUPS['design,ui_ux']);
    expect(resolveProfessionCodes('ml_ai', 'ml_ai')).toEqual(PROFESSION_GROUPS['ml_ai']);
    expect(resolveProfessionCodes('system_engineering', 'system_engineering')).toEqual(
      PROFESSION_GROUPS['system_engineering']
    );
    expect(resolveProfessionCodes('engineering_management', 'leads')).toEqual(
      PROFESSION_GROUPS['engineering_management']
    );
    expect(resolveProfessionCodes('marketing_creative', 'marketing_creative')).toEqual(
      PROFESSION_GROUPS['marketing_creative']
    );
    expect(resolveProfessionCodes('hr', 'hr')).toEqual(PROFESSION_GROUPS['hr']);
  });

  it('parses all detailed filter params into page query parameters', () => {
    const url =
      'https://hireseeker.ru/?top=qa&group=automation_qa&sched=remote,hybrid&sb=150_200&nosal=0&cty=RU&sources=hh&cities=1&pd=14';
    const body = buildSearchRequestBody(url);
    expect(body.profession_codes).toEqual(['qa_automation']);
    expect(body.period_days).toBe(14);

    const queryParams = buildPageQueryParams(url);
    expect(queryParams).toContain('schedule_filter=remote');
    expect(queryParams).toContain('salary_buckets=150_200');
    expect(queryParams).toContain('include_without_salary=false');
    expect(queryParams).toContain('country_filter=RU');
    expect(queryParams).toContain('source_filter=hh');
    expect(queryParams).toContain('city_filter=1');
    expect(queryParams).toContain('period_days=14');
  });

  it('handles m query parameter and selection object in buildPageQueryParams', () => {
    const url =
      'https://hireseeker.ru/?top=qa_testing&group=qa_testing&m=qa_automation&en=0&sched=remote';
    const queryParams = buildPageQueryParams(url, '', {
      members: ['qa_automation'],
      schedules: ['remote'],
      include_without_salary: true
    });
    expect(queryParams).toContain('members=qa_automation');
    expect(queryParams).toContain('schedule_filter=remote');
    expect(queryParams).toContain('include_without_salary=true');
  });

  it('handles custom members array in search body', () => {
    const url = 'https://hireseeker.ru/?members=python_backend,fastapi_dev&en=1&bumped=0&q=senior';
    const body = buildSearchRequestBody(url);
    expect(body.profession_codes).toEqual(['python_backend', 'fastapi_dev']);
    expect(body.search_text).toBe('senior');
    expect(body.include_english).toBe(true);
    expect(body.hide_auto_bumped).toBe(true);
  });

  it('uses cached body if valid', () => {
    const cached = {
      profession_codes: ['python_backend'],
      interest_codes: ['python_backend'],
      search_text: 'fastapi',
      period_days: 30,
      include_english: true,
      hide_auto_bumped: false
    };
    const body = buildSearchRequestBody('https://hireseeker.ru', cached);
    expect(body).toEqual(cached);
  });

  it('executes API search and returns session token and count', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          token: 'token_123',
          total_items: 42,
          vacancies: []
        })
      }) as any;

    const res = await executeSearch('https://hireseeker.ru', {
      profession_codes: ['python_backend']
    });
    expect(res.token).toBe('token_123');
    expect(res.total_items).toBe(42);
  });

  it('fetches search page and returns vacancies list', async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          vacancies: [{ id: 101, title: 'Dev' }],
          total_items: 1,
          total_pages: 1
        })
      }) as any;

    const res = await fetchSearchPage(
      'https://hireseeker.ru',
      'token_123',
      1,
      500,
      'schedule_filter=remote'
    );
    expect(res.vacancies.length).toBe(1);
    expect(res.vacancies[0].id).toBe(101);
  });
});
