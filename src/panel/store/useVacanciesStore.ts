import { create } from 'zustand';
import { VacancyItem } from '../../types/vacancy';
import { sendRpc } from '../services/extension';
import { useSessionStore } from './useSessionStore';

export interface SyncProgress {
  inProgress: boolean;
  loaded: number;
  total: number;
  message?: string;
}

interface VacanciesState {
  vacancies: VacancyItem[];
  searchQuery: string;
  loading: boolean;
  syncProgress: SyncProgress | null;
  error: string | null;

  setSearchQuery: (query: string) => void;
  setVacancies: (vacancies: VacancyItem[]) => void;
  resetAiEvaluations: () => void;
  updateEvaluatedVacancies: (evaluated: VacancyItem[]) => void;
  setSyncProgress: (progress: SyncProgress | null) => void;
  loadVacancies: () => Promise<void>;
  syncFromPage: () => Promise<void>;
  clearVacancies: () => Promise<void>;
  fetchAllPages: () => Promise<void>;
}

export const useVacanciesStore = create<VacanciesState>((set, get) => ({
  vacancies: [],
  searchQuery: '',
  loading: false,
  syncProgress: null,
  error: null,

  setSearchQuery: searchQuery => set({ searchQuery }),
  setVacancies: vacancies => set({ vacancies }),
  resetAiEvaluations: () => {
    const { vacancies } = get();
    set({
      vacancies: vacancies.map(v => ({
        ...v,
        aiScore: undefined,
        aiMatch: undefined,
        aiReason: undefined,
        aiEvaluatedAt: undefined
      }))
    });
  },
  updateEvaluatedVacancies: (evaluated: VacancyItem[]) => {
    if (!evaluated || !evaluated.length) return;
    const { vacancies } = get();
    const evalMap = new Map(evaluated.map(e => [String(e.id), e]));
    const updated = vacancies.map(v => {
      const match = evalMap.get(String(v.id));
      if (match) {
        return {
          ...v,
          aiScore: match.aiScore,
          aiMatch: match.aiMatch,
          aiReason: match.aiReason,
          aiEvaluatedAt: match.aiEvaluatedAt || Date.now()
        };
      }
      return v;
    });
    set({ vacancies: updated });
  },
  setSyncProgress: syncProgress => set({ syncProgress }),

  loadVacancies: async () => {
    try {
      set({ loading: true, error: null });
      const data = await sendRpc<VacancyItem[]>('GET_VACANCIES');
      set({ vacancies: data || [], loading: false });
      void useSessionStore.getState().checkStatus();
    } catch (e: any) {
      set({ error: e.message || 'Ошибка загрузки вакансий', loading: false });
    }
  },

  syncFromPage: async () => {
    try {
      set({ loading: true, error: null });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Превышено время ожидания синхронизации')), 15000)
      );
      const syncPromise = sendRpc<VacancyItem[]>('SYNC_NOW');
      const data = await Promise.race([syncPromise, timeoutPromise]);
      if (Array.isArray(data)) {
        set({ vacancies: data, loading: false });
      } else {
        await get().loadVacancies();
      }
      void useSessionStore.getState().checkStatus();
    } catch (e: any) {
      set({ error: e.message || 'Ошибка синхронизации со страницей', loading: false });
    }
  },

  clearVacancies: async () => {
    try {
      await sendRpc('CLEAR_VACANCIES');
      set({ vacancies: [] });
    } catch (e: any) {
      set({ error: e.message || 'Ошибка очистки' });
    }
  },

  fetchAllPages: async () => {
    try {
      set({ loading: true, error: null });
      await sendRpc('FETCH_ALL_PAGES');
      await get().loadVacancies();
    } catch (e: any) {
      set({ error: e.message || 'Ошибка загрузки всех вакансий', loading: false });
    }
  }
}));
