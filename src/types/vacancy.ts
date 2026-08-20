export interface VacancySalary {
  from?: number;
  to?: number;
  currency?: string;
  gross?: boolean;
  text?: string;
  from_rub?: number;
  to_rub?: number;
}

export interface VacancyItem {
  id: string;
  href: string;
  title: string;
  company: string;
  salary: string;
  area: string;
  schedule: string;
  experience: string;
  employment: string;
  skills: string[];
  source: string;
  publishedAt?: string;
  description: string;
  text: string;
  // Evaluated AI data if available
  aiScore?: number;
  aiMatch?: boolean;
  aiReason?: string;
  aiEvaluatedAt?: number;
  card?: any;
}

export interface SearchFilterState {
  query?: string;
  profession_codes?: string[];
  salary_buckets?: string[];
  salary_from?: number;
  include_without_salary?: boolean;
  country_filter?: string[];
  schedule_filter?: string[];
  schedule_types?: string[];
  experience_ids?: string[];
  employment_types?: string[];
  period_days?: number;
  city_ids?: string[];
  source_filter?: string[];
  [key: string]: any;
}

export interface RawApiVacancy {
  id?: string | number;
  vacancy_id?: string | number;
  uuid?: string;
  title?: string;
  name?: string;
  employer?: { name?: string };
  company?: string;
  salary?: any;
  area?: { name?: string };
  primary_city_name?: string;
  city?: string;
  address?: { city?: string };
  schedule?: any;
  experience?: any;
  employment?: any;
  key_skills?: any[];
  skills?: any[];
  source?: any;
  published_at?: string;
  published_date?: string;
  description?: string;
  snippet?: { requirement?: string; responsibility?: string };
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalKnown: boolean;
  totalPages: number;
  loaded: number;
}
