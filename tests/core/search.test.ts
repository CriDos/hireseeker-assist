import { describe, it, expect } from 'vitest';
import { searchVacancies } from '../../src/core/search';
import { VacancyItem } from '../../src/types/vacancy';

describe('core/search', () => {
  const sampleVacancies: VacancyItem[] = [
    {
      id: '1',
      title: 'Senior Python Developer',
      company: 'DataCorp',
      salary: '200k–300k ₽',
      area: 'Москва',
      schedule: 'Удалёнка',
      experience: '3–6 лет',
      employment: 'Полная',
      skills: ['Python', 'FastAPI', 'PostgreSQL'],
      source: 'hh.ru',
      description: 'Разработка бэкенда микросервисов',
      text: 'Senior Python Developer DataCorp 200k–300k ₽ Москва Удалёнка Python FastAPI PostgreSQL',
      href: ''
    },
    {
      id: '2',
      title: 'Frontend React Engineer',
      company: 'WebStudio',
      salary: '150k–200k ₽',
      area: 'Санкт-Петербург',
      schedule: 'Гибрид',
      experience: '1–3 года',
      employment: 'Полная',
      skills: ['React', 'TypeScript', 'Redux'],
      source: 'hh.ru',
      description: 'Создание интерфейсов на React',
      text: 'Frontend React Engineer WebStudio 150k–200k ₽ Санкт-Петербург Гибрид React TypeScript Redux',
      href: ''
    },
    {
      id: '3',
      title: 'DevOps / SRE Engineer',
      company: 'CloudOps',
      salary: '250k–350k ₽',
      area: 'Москва',
      schedule: 'Офис',
      experience: '3–6 лет',
      employment: 'Полная',
      skills: ['Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
      source: 'hh.ru',
      description: 'Поддержка инфраструктуры Kubernetes',
      text: 'DevOps SRE Engineer CloudOps 250k–350k ₽ Москва Офис Kubernetes Docker Terraform',
      href: ''
    }
  ];

  it('searches by exact keyword', () => {
    const res = searchVacancies(sampleVacancies, 'Python');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('1');
  });

  it('searches across layout misprints (e.g. "знерщт" for "python")', () => {
    const res = searchVacancies(sampleVacancies, 'знерщт');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('1');
  });

  it('filters by schedule', () => {
    const remote = searchVacancies(sampleVacancies, '', undefined, 'remote');
    expect(remote.length).toBe(1);
    expect(remote[0].schedule).toBe('Удалёнка');

    const hybrid = searchVacancies(sampleVacancies, '', undefined, 'hybrid');
    expect(hybrid.length).toBe(1);
    expect(hybrid[0].schedule).toBe('Гибрид');
  });

  it('filters by salary threshold', () => {
    const highSalary = searchVacancies(sampleVacancies, '', '250k');
    expect(highSalary.length).toBe(2); // items with 300k and 350k
  });

  it('combines text search and filters', () => {
    const res = searchVacancies(sampleVacancies, 'FastAPI', undefined, 'remote');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('1');
  });
});
