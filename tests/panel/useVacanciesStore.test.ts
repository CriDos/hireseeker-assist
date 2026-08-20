import { describe, it, expect, beforeEach } from 'vitest';
import { useVacanciesStore } from '../../src/panel/store/useVacanciesStore';
import { searchVacancies } from '../../src/core/search';
import { VacancyItem } from '../../src/types/vacancy';

describe('panel/useVacanciesStore', () => {
  beforeEach(() => {
    useVacanciesStore.setState({
      vacancies: [],
      searchQuery: '',
      loading: false,
      syncProgress: null,
      error: null
    });
  });

  it('updates search query', () => {
    const store = useVacanciesStore.getState();
    store.setSearchQuery('Python');

    const updated = useVacanciesStore.getState();
    expect(updated.searchQuery).toBe('Python');
  });

  it('filters vacancies with pure searchVacancies helper in real-time', () => {
    const vacancies: VacancyItem[] = [
      {
        id: '1',
        title: 'Python Backend Developer',
        company: 'Alpha',
        salary: '200k ₽',
        area: 'Москва',
        schedule: 'Удалёнка',
        experience: '3 года',
        employment: 'Полная',
        skills: ['Python', 'FastAPI'],
        source: 'hh.ru',
        description: '',
        text: 'Python Backend Developer Alpha 200k ₽ Москва Удалёнка Python FastAPI',
        href: ''
      },
      {
        id: '2',
        title: 'Frontend Developer',
        company: 'Beta',
        salary: '120k ₽',
        area: 'Москва',
        schedule: 'Офис',
        experience: '1 год',
        employment: 'Полная',
        skills: ['React'],
        source: 'hh.ru',
        description: '',
        text: 'Frontend Developer Beta 120k ₽ Москва Офис React',
        href: ''
      }
    ];

    const filtered = searchVacancies(vacancies, 'Python');

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('updates matching vacancies live and resets evaluations cleanly', () => {
    const store = useVacanciesStore.getState();
    store.setVacancies([
      {
        id: '1',
        title: 'Python Dev',
        company: 'Alpha',
        salary: '',
        area: '',
        schedule: '',
        experience: '',
        employment: '',
        skills: [],
        source: 'hh.ru',
        description: '',
        text: '',
        href: ''
      }
    ]);

    store.updateEvaluatedVacancies([
      {
        id: '1',
        title: 'Python Dev',
        company: 'Alpha',
        salary: '',
        area: '',
        schedule: '',
        experience: '',
        employment: '',
        skills: [],
        source: 'hh.ru',
        description: '',
        text: '',
        href: '',
        aiScore: 92,
        aiMatch: true,
        aiReason: 'Отличный стек'
      }
    ]);

    let state = useVacanciesStore.getState();
    expect(state.vacancies[0].aiScore).toBe(92);
    expect(state.vacancies[0].aiMatch).toBe(true);

    store.resetAiEvaluations();
    state = useVacanciesStore.getState();
    expect(state.vacancies[0].aiScore).toBeUndefined();
    expect(state.vacancies[0].aiMatch).toBeUndefined();
  });
});
