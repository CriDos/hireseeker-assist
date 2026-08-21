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

const STORAGE_STATE_KEY = 'hs_bg_state_v1';

export async function saveStateToStorage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  try {
    const serialized = {
      vacancies: Array.from(state.vacancies.values()),
      evaluations: Array.from(state.evaluations.values()),
      lastSearchBody: state.lastSearchBody,
      lastSearchToken: state.lastSearchToken,
      lastQueryParams: state.lastQueryParams,
      lastOrigin: state.lastOrigin,
      totalFound: state.totalFound,
      connectedPageUrl: state.connectedPageUrl,
      lastSelection: state.lastSelection
    };
    await chrome.storage.local.set({ [STORAGE_STATE_KEY]: serialized });
  } catch {}
}

export async function restoreStateFromStorage(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  try {
    const res = await chrome.storage.local.get(STORAGE_STATE_KEY);
    const data = res[STORAGE_STATE_KEY];
    if (data) {
      if (
        Array.isArray(data.vacancies) &&
        data.vacancies.length > 0 &&
        state.vacancies.size === 0
      ) {
        data.vacancies.forEach((v: VacancyItem) => {
          if (v && v.id) state.vacancies.set(v.id, v);
        });
      }
      if (
        Array.isArray(data.evaluations) &&
        data.evaluations.length > 0 &&
        state.evaluations.size === 0
      ) {
        data.evaluations.forEach((ev: AiEvaluationItem) => {
          if (ev && ev.id) state.evaluations.set(ev.id, ev);
        });
      }
      if (data.totalFound != null && !state.totalFound) {
        state.totalFound = data.totalFound;
      }
      if (data.lastSearchToken && !state.lastSearchToken) {
        state.lastSearchToken = data.lastSearchToken;
      }
      if (data.lastSearchBody && !state.lastSearchBody) {
        state.lastSearchBody = data.lastSearchBody;
      }
      if (data.lastQueryParams && !state.lastQueryParams) {
        state.lastQueryParams = data.lastQueryParams;
      }
      if (data.connectedPageUrl && !state.connectedPageUrl) {
        state.connectedPageUrl = data.connectedPageUrl;
      }
      if (data.lastSelection && !state.lastSelection) {
        state.lastSelection = data.lastSelection;
      }
    }
  } catch {}
}

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
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.remove(STORAGE_STATE_KEY).catch(() => {});
  }
}
