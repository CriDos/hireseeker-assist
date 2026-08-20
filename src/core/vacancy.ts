import { VacancyItem, RawApiVacancy } from '../types/vacancy';
import { stripHtml } from './text';

export function getVacancyId(vacancy: any): string {
  const value = vacancy?.id ?? vacancy?.vacancy_id ?? vacancy?.uuid;
  if (value === undefined || value === null || String(value).trim() === '') return '';
  return String(value).trim();
}

export function formatSalary(salary: any): string {
  if (!salary) return '';
  if (typeof salary === 'string') {
    if (/не указана/i.test(salary)) return '';
    return salary;
  }
  const from = salary.from_rub ?? salary.from;
  const to = salary.to_rub ?? salary.to;
  const fmt = (num: number) => {
    if (num == null || isNaN(num)) return '';
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    return Math.round(num / 1e3) + 'k';
  };
  if (from != null && to != null) return `${fmt(from)}–${fmt(to)} ₽`;
  if (from != null) return `от ${fmt(from)} ₽`;
  if (to != null) return `до ${fmt(to)} ₽`;
  return '';
}

export function formatSchedule(sched: any): string {
  if (!sched) return '';
  const str = typeof sched === 'string' ? sched : sched?.name || sched?.title || '';
  const map: Record<string, string> = {
    remote: 'Удалёнка',
    hybrid: 'Гибрид',
    office: 'Офис'
  };
  return map[str.toLowerCase()] || str;
}

export function normalizeSkills(vacancy: any): string[] {
  const rawSkills = Array.isArray(vacancy?.key_skills)
    ? vacancy.key_skills
    : Array.isArray(vacancy?.skills)
      ? vacancy.skills
      : [];
  return rawSkills
    .map((skill: any) => (typeof skill === 'string' ? skill : skill?.name))
    .map((value: any) => String(value || '').trim())
    .filter(Boolean);
}

function readName(value: any): string {
  if (value && typeof value === 'object') return value.name || value.title || value.label || '';
  return value ? String(value) : '';
}

export function createVacancyText(item: Partial<VacancyItem>): string {
  return [
    item.title,
    item.company,
    item.salary,
    item.area,
    item.schedule,
    item.experience,
    item.employment,
    Array.isArray(item.skills) ? item.skills.join(' ') : item.skills,
    item.description
  ]
    .filter(value => value !== undefined && value !== null && String(value).trim())
    .map(value => String(value).trim())
    .join(' ');
}

export function normalizeApiVacancy(
  vacancy: RawApiVacancy,
  origin: string = 'https://hireseeker.ru'
): VacancyItem {
  const id = getVacancyId(vacancy);
  const skills = normalizeSkills(vacancy);
  const description = stripHtml(
    vacancy?.description || vacancy?.snippet?.requirement || vacancy?.snippet?.responsibility || ''
  );
  const title = String(vacancy?.title || vacancy?.name || '').trim();
  const company = String(vacancy?.employer?.name || vacancy?.company || '').trim();
  const salary = formatSalary(vacancy?.salary);
  const area = String(
    vacancy?.area?.name ||
      vacancy?.primary_city_name ||
      vacancy?.address?.city ||
      vacancy?.city ||
      ''
  ).trim();
  const schedule = formatSchedule(readName(vacancy?.schedule));
  const experience = String(readName(vacancy?.experience)).trim();
  const employment = String(readName(vacancy?.employment)).trim();
  const source = String(vacancy?.source?.type || vacancy?.source || 'hh.ru').trim() || 'hh.ru';

  return {
    id,
    href:
      id && origin ? `${String(origin).replace(/\/$/, '')}/vacancy/${encodeURIComponent(id)}` : '',
    title,
    company,
    salary,
    area,
    schedule,
    experience,
    employment,
    skills,
    source,
    publishedAt: vacancy?.published_at || vacancy?.published_date,
    description,
    text: createVacancyText({
      title,
      company,
      salary,
      area,
      schedule,
      experience,
      employment,
      skills,
      description
    })
  };
}

export function mergeVacancies(
  existing?: VacancyItem,
  next?: Partial<VacancyItem>
): VacancyItem | null {
  if (!next) return existing || null;
  if (!existing) return next as VacancyItem;
  return {
    ...existing,
    ...next,
    aiScore: next.aiScore !== undefined ? next.aiScore : existing.aiScore,
    aiMatch: next.aiMatch !== undefined ? next.aiMatch : existing.aiMatch,
    aiReason: next.aiReason !== undefined ? next.aiReason : existing.aiReason,
    aiEvaluatedAt: next.aiEvaluatedAt !== undefined ? next.aiEvaluatedAt : existing.aiEvaluatedAt,
    card: next.card || existing.card || null,
    source:
      next.source && next.source !== 'hh.ru'
        ? next.source
        : existing.source || next.source || 'hh.ru'
  };
}
