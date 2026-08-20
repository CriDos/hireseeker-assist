import { RawApiVacancy } from '../types/vacancy';

export const PROFESSION_GROUPS: Record<string, string[]> = {
  // Backend
  backend: [
    'python_backend',
    'jvm_backend',
    'go_backend',
    'nodejs_backend',
    'dotnet_backend',
    'php_backend',
    'cpp_backend',
    'other_backend'
  ],
  'developers,backend': [
    'python_backend',
    'jvm_backend',
    'go_backend',
    'nodejs_backend',
    'dotnet_backend',
    'php_backend',
    'cpp_backend',
    'other_backend'
  ],

  // Frontend
  frontend: ['react_frontend', 'vue_frontend', 'angular_frontend', 'other_frontend'],
  'developers,frontend': ['react_frontend', 'vue_frontend', 'angular_frontend', 'other_frontend'],

  // Mobile
  mobile_development: [
    'ios_mobile',
    'android_mobile',
    'flutter_mobile',
    'react_native_mobile',
    'kmp_mobile'
  ],
  'developers,mobile_development': [
    'ios_mobile',
    'android_mobile',
    'flutter_mobile',
    'react_native_mobile',
    'kmp_mobile'
  ],

  // Management / Leads
  engineering_management: ['tech_lead', 'cto', 'chief_data_officer'],
  leads: ['tech_lead', 'cto', 'chief_data_officer'],
  'developers,leads': ['tech_lead', 'cto', 'chief_data_officer'],
  'developers,engineering_management': ['tech_lead', 'cto', 'chief_data_officer'],

  // Web Development
  web_development: ['wordpress_developer', 'landing_developer'],
  'developers,web_development': ['wordpress_developer', 'landing_developer'],

  // ERP Development
  erp_development: ['lowcode_developer', 'developer_1c', 'sap_developer'],
  'developers,erp_development': ['lowcode_developer', 'developer_1c', 'sap_developer'],

  // Game Development
  game_development: [
    'game_producer',
    'game_design',
    'level_design',
    'game_graphics',
    'unity_developer',
    'unreal_developer',
    'game_server_developer'
  ],
  'developers,game_development': [
    'game_producer',
    'game_design',
    'level_design',
    'game_graphics',
    'unity_developer',
    'unreal_developer',
    'game_server_developer'
  ],

  // System Engineering / DevOps
  system_engineering: [
    'embedded_iot',
    'cybersecurity',
    'devops',
    'architecture',
    'sysadmin',
    'network_engineer',
    'dba'
  ],
  devops: ['devops', 'sysadmin', 'dba', 'network_engineer', 'architecture'],
  embedded: ['embedded_iot'],
  'developers,embedded': ['embedded_iot'],

  // QA / Testing
  qa_testing: ['qa_manual', 'qa_automation'],
  qa: ['qa_manual', 'qa_automation'],
  testing: ['qa_manual', 'qa_automation'],
  manual_qa: ['qa_manual'],
  automation_qa: ['qa_automation'],
  'qa,manual_qa': ['qa_manual'],
  'qa,automation_qa': ['qa_automation'],
  'qa_testing,qa_testing': ['qa_manual', 'qa_automation'],
  'qa_testing,manual_qa': ['qa_manual'],
  'qa_testing,automation_qa': ['qa_automation'],

  // Analytics
  analytics: [
    'business_analytics',
    'system_analytics',
    'data_analytics',
    'bi_developer',
    'analyst_1c',
    'analyst_sap'
  ],
  data_analytics: ['data_analytics', 'business_analytics', 'system_analytics', 'bi_developer'],
  'analytics,data_analytics': [
    'business_analytics',
    'system_analytics',
    'data_analytics',
    'bi_developer',
    'analyst_1c',
    'analyst_sap'
  ],

  // ML / AI
  ml_ai: [
    'data_science_ml',
    'data_engineer',
    'ai_engineer',
    'mlops_engineer',
    'ai_workflow_specialist'
  ],
  ai: [
    'data_science_ml',
    'data_engineer',
    'ai_engineer',
    'mlops_engineer',
    'ai_workflow_specialist'
  ],
  'ml_ai,ml_ai': [
    'data_science_ml',
    'data_engineer',
    'ai_engineer',
    'mlops_engineer',
    'ai_workflow_specialist'
  ],

  // Design
  design: [
    'product_design',
    'graphic_design',
    'motion_design',
    '3d_designer',
    'ui_ux_designer',
    'design_lead'
  ],
  ui_ux: ['ui_ux_designer', 'product_design'],
  'design,ui_ux': [
    'ui_ux_designer',
    'product_design',
    'graphic_design',
    'motion_design',
    '3d_designer'
  ],

  // Vibe Coding
  vibe_coding: ['vibe_coding'],
  'developers,vibe_coding': ['vibe_coding'],

  // Product / Project Management
  product_project: [
    'chief_product_officer',
    'product_management',
    'technical_product_management',
    'project_management',
    'scrum_master'
  ],
  management: [
    'chief_product_officer',
    'product_management',
    'technical_product_management',
    'project_management',
    'scrum_master'
  ],
  product: ['product_management', 'technical_product_management', 'chief_product_officer'],
  project: ['project_management', 'scrum_master'],
  'management,product': [
    'product_management',
    'technical_product_management',
    'chief_product_officer'
  ],
  'product_project,product_project': [
    'chief_product_officer',
    'product_management',
    'technical_product_management',
    'project_management',
    'scrum_master'
  ],

  // Marketing & Creative
  marketing_creative: [
    'pr_communications',
    'product_marketing',
    'smm',
    'digital_marketing',
    'content_marketing',
    'performance_marketing',
    'community_manager',
    'brand_manager',
    'creative_director',
    'event_manager',
    'chief_marketing_officer'
  ],
  marketing: [
    'digital_marketing',
    'product_marketing',
    'smm',
    'content_marketing',
    'performance_marketing'
  ],
  'marketing_creative,marketing_creative': [
    'pr_communications',
    'product_marketing',
    'smm',
    'digital_marketing',
    'content_marketing',
    'performance_marketing',
    'community_manager',
    'brand_manager',
    'creative_director',
    'event_manager',
    'chief_marketing_officer'
  ],

  // HR
  hr: ['recruiting', 'hrbp_hrd_pp', 'hr_generalist', 'compensation_benefits'],
  'hr,hr': ['recruiting', 'hrbp_hrd_pp', 'hr_generalist', 'compensation_benefits']
};

export const PROFESSION_MAP = PROFESSION_GROUPS;

export const ALL_KNOWN_MEMBER_CODES = new Set<string>(Object.values(PROFESSION_GROUPS).flat());

export function resolveProfessionCodes(top?: string, group?: string, members?: string[]): string[] {
  // 1. If explicit members provided
  if (Array.isArray(members) && members.length > 0) {
    const valid = members.map(m => String(m || '').trim()).filter(Boolean);
    if (valid.length > 0) return Array.from(new Set(valid));
  }

  const cleanTop = String(top || '')
    .trim()
    .toLowerCase();
  const cleanGroup = String(group || '')
    .trim()
    .toLowerCase();

  // 2. Exact combined key match
  const combinedKey = `${cleanTop},${cleanGroup}`;
  if (PROFESSION_GROUPS[combinedKey]) {
    return PROFESSION_GROUPS[combinedKey];
  }

  // 3. Exact group match
  if (cleanGroup && PROFESSION_GROUPS[cleanGroup]) {
    return PROFESSION_GROUPS[cleanGroup];
  }
  if (cleanGroup && ALL_KNOWN_MEMBER_CODES.has(cleanGroup)) {
    return [cleanGroup];
  }

  // 4. Exact top match
  if (cleanTop && PROFESSION_GROUPS[cleanTop]) {
    return PROFESSION_GROUPS[cleanTop];
  }
  if (cleanTop && ALL_KNOWN_MEMBER_CODES.has(cleanTop)) {
    return [cleanTop];
  }

  // 5. Comma-separated items in group or members
  if (cleanGroup.includes(',')) {
    const parts = cleanGroup
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const resolved: string[] = [];
    parts.forEach(p => {
      if (PROFESSION_GROUPS[p]) resolved.push(...PROFESSION_GROUPS[p]);
      else if (ALL_KNOWN_MEMBER_CODES.has(p)) resolved.push(p);
    });
    if (resolved.length > 0) return Array.from(new Set(resolved));
  }

  return [];
}

export class PaginationError extends Error {
  page?: number;
  totalPages?: number;
  maxPages?: number;
  retryable?: boolean;

  constructor(message: string, details: any = {}) {
    super(message);
    this.name = 'PaginationError';
    Object.assign(this, details);
  }
}

export function pageCountFor(totalItems: number, pageSize: number): number {
  const total = Number(totalItems);
  const size = Number(pageSize);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(size) || size <= 0) return 1;
  return Math.max(1, Math.ceil(total / size));
}

export function buildSearchRequestBody(
  urlStr?: string,
  cachedBody?: any,
  selection?: any
): Record<string, any> {
  let top = '';
  let group = '';
  let members: string[] = [];
  let searchText = '';
  let period = 7;
  let includeEnglish = false;
  let hideAutoBumped = false;

  // 1. From Selection object if available (live selection state on hireseeker.ru)
  if (selection && typeof selection === 'object') {
    if (selection.top_code) top = String(selection.top_code);
    if (selection.group_code) group = String(selection.group_code);
    if (Array.isArray(selection.members)) members = selection.members;
    if (selection.period_days) period = Number(selection.period_days);
    if (selection.include_english !== undefined)
      includeEnglish = Boolean(selection.include_english);
    if (selection.hide_auto_bumped !== undefined)
      hideAutoBumped = Boolean(selection.hide_auto_bumped);
  }

  // 2. From URL string parameters (URL is source of truth for active navigation)
  if (urlStr) {
    try {
      const url = new URL(urlStr);
      const params = url.searchParams;

      if (params.has('top')) top = params.get('top') || '';
      if (params.has('group')) group = params.get('group') || '';

      const m = params.get('m') || params.get('members');
      if (m) {
        members = m
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      searchText = params.get('q') || params.get('query') || params.get('search_text') || '';

      const pd = params.get('pd') || params.get('period_days');
      if (pd && !isNaN(Number(pd))) period = Number(pd);

      if (params.has('en')) {
        includeEnglish = params.get('en') === '1' || params.get('en') === 'true';
      } else if (params.has('include_english')) {
        includeEnglish =
          params.get('include_english') === '1' || params.get('include_english') === 'true';
      }

      if (params.has('hide_auto_bumped')) {
        hideAutoBumped =
          params.get('hide_auto_bumped') === '1' || params.get('hide_auto_bumped') === 'true';
      } else if (params.has('bumped')) {
        hideAutoBumped = params.get('bumped') === '0';
      }
    } catch {}
  }

  // Resolve top/group category codes for API POST search
  let codes = resolveProfessionCodes(top, group);
  if (codes.length === 0 && members.length > 0) {
    codes = resolveProfessionCodes('', '', members);
  }

  if (codes.length > 0 || searchText) {
    return {
      profession_codes: codes,
      interest_codes: codes,
      search_text: searchText,
      period_days: period,
      include_english: includeEnglish,
      hide_auto_bumped: hideAutoBumped
    };
  }

  // 3. Fallback to cached body ONLY if neither url nor selection had codes
  if (
    cachedBody &&
    Array.isArray(cachedBody.profession_codes) &&
    cachedBody.profession_codes.length > 0
  ) {
    return cachedBody;
  }

  throw new Error('Поисковые фильтры или профессии не выбраны на странице hireseeker.ru');
}

export function buildPageQueryParams(
  urlStr?: string,
  queryParams?: string,
  selection?: any
): string {
  const parts = new URLSearchParams();

  // If queryParams passed (e.g. from intercepted request), parse them
  if (queryParams) {
    try {
      const qp = new URLSearchParams(queryParams.replace(/^\?/, ''));
      qp.forEach((val, key) => parts.append(key, val));
    } catch {}
  }

  // 1. From Selection object if available
  if (selection && typeof selection === 'object') {
    if (Array.isArray(selection.members) && selection.members.length > 0 && !parts.has('members')) {
      selection.members.forEach((m: string) => parts.append('members', m));
    }
    if (
      Array.isArray(selection.schedules) &&
      selection.schedules.length > 0 &&
      !parts.has('schedule_filter')
    ) {
      selection.schedules.forEach((s: string) => parts.append('schedule_filter', s));
    }
    if (
      Array.isArray(selection.salary_buckets) &&
      selection.salary_buckets.length > 0 &&
      !parts.has('salary_buckets')
    ) {
      selection.salary_buckets.forEach((sb: string) => parts.append('salary_buckets', sb));
    }
    if (
      Array.isArray(selection.countries) &&
      selection.countries.length > 0 &&
      !parts.has('country_filter')
    ) {
      selection.countries.forEach((c: string) => parts.append('country_filter', c));
    }
    if (
      Array.isArray(selection.sources) &&
      selection.sources.length > 0 &&
      !parts.has('source_filter')
    ) {
      selection.sources.forEach((src: string) => parts.append('source_filter', src));
    }
    if (
      Array.isArray(selection.cities) &&
      selection.cities.length > 0 &&
      !parts.has('city_filter')
    ) {
      selection.cities.forEach((cit: string) => parts.append('city_filter', cit));
    }
    if (selection.include_without_salary !== undefined && !parts.has('include_without_salary')) {
      parts.set('include_without_salary', String(Boolean(selection.include_without_salary)));
    }
    if (selection.period_days && !parts.has('period_days')) {
      parts.set('period_days', String(selection.period_days));
    }
  }

  // 2. From URL string parameters
  if (urlStr) {
    try {
      const url = new URL(urlStr);
      const params = url.searchParams;

      // Members (m or members)
      const m = params.get('m') || params.get('members');
      if (m && !parts.has('members')) {
        m.split(',').forEach(code => {
          if (code.trim()) parts.append('members', code.trim());
        });
      }

      // Schedule filter (sched or schedule_filter)
      const sched = params.get('sched') || params.get('schedule_filter');
      if (sched && !parts.has('schedule_filter')) {
        sched.split(',').forEach(s => {
          if (s.trim()) parts.append('schedule_filter', s.trim());
        });
      }

      // Salary buckets (sb or salary_buckets)
      const sb = params.get('sb') || params.get('salary_buckets');
      if (sb && !parts.has('salary_buckets')) {
        sb.split(',').forEach(item => {
          if (item.trim()) parts.append('salary_buckets', item.trim());
        });
      }

      // Include without salary (nosal or include_without_salary)
      if (params.has('nosal') && !parts.has('include_without_salary')) {
        const nosal = params.get('nosal');
        parts.set('include_without_salary', String(nosal !== '0' && nosal !== 'false'));
      } else if (params.has('include_without_salary') && !parts.has('include_without_salary')) {
        parts.set(
          'include_without_salary',
          String(params.get('include_without_salary') !== 'false')
        );
      }

      // Country filter (cty or country_filter)
      const cty = params.get('cty') || params.get('country_filter');
      if (cty && !parts.has('country_filter')) {
        cty.split(',').forEach(c => {
          if (c.trim()) parts.append('country_filter', c.trim());
        });
      }

      // Source filter (sources or source_filter)
      const sources = params.get('sources') || params.get('source_filter');
      if (sources && !parts.has('source_filter')) {
        sources.split(',').forEach(src => {
          if (src.trim()) parts.append('source_filter', src.trim());
        });
      }

      // City filter (cities or city_ids or city_filter)
      const cities = params.get('cities') || params.get('city_ids') || params.get('city_filter');
      if (cities && !parts.has('city_filter')) {
        cities.split(',').forEach(cit => {
          if (cit.trim()) parts.append('city_filter', cit.trim());
        });
      }

      // Period days (pd or period_days)
      const pd = params.get('pd') || params.get('period_days');
      if (pd && !parts.has('period_days')) {
        parts.set('period_days', pd);
      }
    } catch {}
  }

  return parts.toString();
}

export async function fetchSearchPage(
  baseUrl: string,
  token: string,
  page: number,
  pageSize: number = 500,
  queryParams: string = '',
  signal?: AbortSignal
): Promise<{ vacancies: RawApiVacancy[]; total_items?: number; total_pages?: number }> {
  const origin = baseUrl.replace(/\/$/, '');
  let url = `${origin}/api/v1/search/${encodeURIComponent(token)}/page?per_page=${pageSize}&page=${page}`;
  if (queryParams) {
    url += `&${queryParams}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/plain, */*'
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки страницы ${page} поиска: HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json || !Array.isArray(json.vacancies)) {
    throw new PaginationError(`Страница ${page} имеет некорректный формат ответа`, {
      page,
      retryable: false
    });
  }

  return json;
}

export async function executeSearch(
  baseUrl: string,
  filterBody: Record<string, any>,
  signal?: AbortSignal
): Promise<{ token: string; vacancies?: RawApiVacancy[]; total_items?: number }> {
  const origin = baseUrl.replace(/\/$/, '');
  const url = `${origin}/api/v1/search`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*'
    },
    body: JSON.stringify(filterBody),
    signal
  });

  if (!response.ok) {
    throw new Error(`Ошибка запуска поиска: HTTP ${response.status}`);
  }

  const json = await response.json();
  const token = json?.token || json?.search?.token;
  if (!token) {
    throw new Error('Сервер не вернул токен сессии поиска');
  }

  return {
    token,
    vacancies: json?.vacancies || [],
    total_items: json?.total_items ?? json?.stats?.total_found ?? json?.search?.total_items
  };
}
