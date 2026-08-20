import { VacancyItem, SearchFilterState } from '../types/vacancy';
import { AiBatchProgress, AiEvaluationItem } from '../types/ai';

export interface BackgroundState {
  vacancies: Map<string, VacancyItem>;
  evaluations: Map<string, AiEvaluationItem>;
  lastSearchBody: SearchFilterState | null;
  lastSearchToken: string | null;
  lastQueryParams: string;
  lastOrigin: string;
  totalFound: number;
  loadAllInProgress: boolean;
  activeAiRun: {
    inProgress: boolean;
    abortController: AbortController | null;
    criteria: string;
    progress: AiBatchProgress;
  } | null;
  activeTabId: number | null;
  connectedPageUrl: string | null;
  lastSyncedKey: string | null;
  lastSelection: any;
}

export const state: BackgroundState = {
  vacancies: new Map(),
  evaluations: new Map(),
  lastSearchBody: null,
  lastSearchToken: null,
  lastQueryParams: '',
  lastOrigin: 'https://hireseeker.ru',
  totalFound: 0,
  loadAllInProgress: false,
  activeAiRun: null,
  activeTabId: null,
  connectedPageUrl: null,
  lastSyncedKey: null,
  lastSelection: null
};

export function clearState() {
  state.vacancies.clear();
  state.evaluations.clear();
  state.lastSearchBody = null;
  state.lastSearchToken = null;
  state.lastQueryParams = '';
  state.lastSyncedKey = null;
  state.lastSelection = null;
  state.totalFound = 0;
  state.loadAllInProgress = false;
  if (state.activeAiRun?.abortController) {
    state.activeAiRun.abortController.abort();
  }
  state.activeAiRun = null;
}
