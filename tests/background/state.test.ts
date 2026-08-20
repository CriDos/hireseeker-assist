import { test, assert } from 'vitest';
import { state, clearState } from '../../src/background/state.ts';

test('state: initial background state and clearState', () => {
  clearState();
  assert.equal(state.vacancies.size, 0);
  assert.equal(state.evaluations.size, 0);
  assert.equal(state.totalFound, 0);
  assert.equal(state.activeAiRun, null);

  state.vacancies.set('1', {
    id: '1',
    title: 'Test',
    company: '',
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
  });
  assert.equal(state.vacancies.size, 1);

  clearState();
  assert.equal(state.vacancies.size, 0);
});
