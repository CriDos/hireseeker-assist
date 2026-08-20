import { create } from 'zustand';
import { AppSettings, LLMConfig } from '../../types/settings';
import { sendRpc } from '../services/extension';
import { useAiFilterStore } from './useAiFilterStore';

interface SettingsState {
  settings: AppSettings | null;
  models: string[];
  modelsLoading: boolean;
  testingConnection: boolean;
  testStatus: { success: boolean; message: string } | null;
  error: string | null;

  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateLlmConfig: (config: Partial<LLMConfig>) => Promise<void>;
  testLlmConnection: (config?: LLMConfig) => Promise<void>;
  fetchModelsList: (config?: LLMConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  models: [],
  modelsLoading: false,
  testingConnection: false,
  testStatus: null,
  error: null,

  loadSettings: async () => {
    try {
      const data = await sendRpc<AppSettings>('GET_CONFIG');
      set({ settings: data });

      if (data) {
        useAiFilterStore.setState({
          presets: data.criteriaPresets || [],
          selectedPresetId: data.activeCriteriaId,
          criteriaText: data.activeCriteriaText || data.criteriaPresets?.[0]?.text || ''
        });
      }
    } catch (e: any) {
      set({ error: e.message || 'Ошибка загрузки настроек' });
    }
  },

  saveSettings: async updated => {
    try {
      const res = await sendRpc<AppSettings>('SAVE_CONFIG', updated);
      set({ settings: res });
    } catch (e: any) {
      set({ error: e.message || 'Ошибка сохранения настроек' });
    }
  },

  updateLlmConfig: async llmPartial => {
    const { settings } = get();
    if (!settings) return;

    const nextLlm = { ...settings.llm, ...llmPartial };
    await get().saveSettings({ llm: nextLlm });
  },

  testLlmConnection: async config => {
    const { settings } = get();
    const cfg = config || settings?.llm;
    if (!cfg) return;

    try {
      set({ testingConnection: true, testStatus: null, error: null });
      await sendRpc('TEST_LLM_CONNECTION', cfg);
      set({
        testingConnection: false,
        testStatus: { success: true, message: 'Соединение успешно установлено!' }
      });
    } catch (e: any) {
      set({
        testingConnection: false,
        testStatus: { success: false, message: e.message || 'Ошибка подключения' }
      });
    }
  },

  fetchModelsList: async config => {
    const { settings } = get();
    const cfg = config || settings?.llm;
    if (!cfg) return;

    try {
      set({ modelsLoading: true, error: null });
      const models = await sendRpc<string[]>('FETCH_MODELS', cfg);
      set({ models: models || [], modelsLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Ошибка получения списка моделей', modelsLoading: false });
    }
  }
}));
