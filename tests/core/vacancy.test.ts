import { describe, it, expect } from 'vitest';
import {
  getVacancyId,
  formatSalary,
  formatSchedule,
  normalizeSkills,
  normalizeApiVacancy,
  mergeVacancies
} from '../../src/core/vacancy';

describe('core/vacancy', () => {
  it('extracts vacancy ID correctly', () => {
    expect(getVacancyId({ id: '123' })).toBe('123');
    expect(getVacancyId({ vacancy_id: 456 })).toBe('456');
    expect(getVacancyId({ uuid: 'abc-def' })).toBe('abc-def');
    expect(getVacancyId(null)).toBe('');
  });

  it('formats salary objects and strings', () => {
    expect(formatSalary({ from: 150000, to: 250000 })).toBe('150k–250k ₽');
    expect(formatSalary({ from: 300000 })).toBe('от 300k ₽');
    expect(formatSalary({ to: 200000 })).toBe('до 200k ₽');
    expect(formatSalary({ from: 1200000 })).toBe('от 1.2M ₽');
    expect(formatSalary({ from: 800 })).toBe('от 800 ₽');
    expect(formatSalary('150 000 руб.')).toBe('150 000 руб.');
    expect(formatSalary('Зарплата не указана')).toBe('');
  });

  it('formats schedule values', () => {
    expect(formatSchedule('remote')).toBe('Удалёнка');
    expect(formatSchedule('hybrid')).toBe('Гибрид');
    expect(formatSchedule('office')).toBe('Офис');
    expect(formatSchedule({ name: 'remote' })).toBe('Удалёнка');
  });

  it('normalizes skills from array of strings or objects', () => {
    expect(normalizeSkills({ skills: ['Python', 'FastAPI', 'Docker'] })).toEqual([
      'Python',
      'FastAPI',
      'Docker'
    ]);
    expect(normalizeSkills({ key_skills: [{ name: 'PostgreSQL' }, { name: 'Redis' }] })).toEqual([
      'PostgreSQL',
      'Redis'
    ]);
  });

  it('normalizes raw API vacancy object into VacancyItem', () => {
    const raw = {
      id: 99999,
      title: 'Senior Python Developer',
      employer: { name: 'Tech Solutions' },
      salary: { from: 200000, to: 300000 },
      area: { name: 'Москва' },
      schedule: 'remote',
      experience: 'От 3 до 6 лет',
      skills: ['Python', 'Django', 'PostgreSQL'],
      description: '<p>Ищем <b>опытного разработчика</b></p>'
    };

    const item = normalizeApiVacancy(raw, 'https://hireseeker.ru');
    expect(item.id).toBe('99999');
    expect(item.title).toBe('Senior Python Developer');
    expect(item.company).toBe('Tech Solutions');
    expect(item.salary).toBe('200k–300k ₽');
    expect(item.schedule).toBe('Удалёнка');
    expect(item.area).toBe('Москва');
    expect(item.skills).toEqual(['Python', 'Django', 'PostgreSQL']);
    expect(item.description).toBe('Ищем опытного разработчика');
    expect(item.href).toBe('https://hireseeker.ru/vacancy/99999');
  });

  it('merges existing vacancy with new data preserving AI evaluations', () => {
    const existing = normalizeApiVacancy({ id: '1', title: 'Developer' });
    existing.aiScore = 95;
    existing.aiMatch = true;
    existing.aiReason = 'Отличный стек';

    const next = normalizeApiVacancy({ id: '1', title: 'Lead Developer' });
    const merged = mergeVacancies(existing, next);

    expect(merged?.title).toBe('Lead Developer');
    expect(merged?.aiScore).toBe(95);
    expect(merged?.aiMatch).toBe(true);
    expect(merged?.aiReason).toBe('Отличный стек');
  });
});
