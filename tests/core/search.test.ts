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

  it('filters by salary threshold accurately with various formats', () => {
    const highSalary = searchVacancies(sampleVacancies, '', '250k');
    expect(highSalary.length).toBe(2); // items with 300k and 350k

    const extraVacancies: VacancyItem[] = [
      {
        id: '4',
        title: 'Tech Lead',
        company: 'MegaCorp',
        salary: 'от 1.2M ₽',
        area: 'Москва',
        schedule: 'Удалёнка',
        experience: '6+ лет',
        employment: 'Полная',
        skills: ['Architecture'],
        source: 'hh.ru',
        description: '',
        text: 'Tech Lead',
        href: ''
      },
      {
        id: '5',
        title: 'Junior Support',
        company: 'MiniCorp',
        salary: 'от 80000 ₽',
        area: 'Москва',
        schedule: 'Офис',
        experience: 'без опыта',
        employment: 'Полная',
        skills: [],
        source: 'hh.ru',
        description: '',
        text: 'Junior Support',
        href: ''
      }
    ];

    // 1.2M must pass both 150k and 250k
    const lead150 = searchVacancies(extraVacancies, '', '150k');
    expect(lead150.length).toBe(1);
    expect(lead150[0].id).toBe('4');

    const lead250 = searchVacancies(extraVacancies, '', '250k');
    expect(lead250.length).toBe(1);
    expect(lead250[0].id).toBe('4');

    // 80 000 must NOT pass 150k or 250k
    const junior150 = searchVacancies([extraVacancies[1]], '', '150k');
    expect(junior150.length).toBe(0);
  });

  it('combines text search and filters', () => {
    const res = searchVacancies(sampleVacancies, 'FastAPI', undefined, 'remote');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('1');
  });
});
