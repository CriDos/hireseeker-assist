import { create } from 'zustand';
import { CandidateCriteria, AiBatchProgress } from '../../types/ai';
import { sendRpc } from '../services/extension';
import { useSettingsStore } from './useSettingsStore';
import { useVacanciesStore } from './useVacanciesStore';

interface AiFilterState {
  criteriaText: string;
  selectedPresetId: string | null;
  presets: CandidateCriteria[];
  isRunning: boolean;
  progress: AiBatchProgress | null;
  error: string | null;

  setCriteriaText: (text: string) => void;
  setSelectedPresetId: (id: string | null) => void;
  setProgress: (progress: AiBatchProgress | null) => void;
  setIsRunning: (isRunning: boolean) => void;

  selectPreset: (id: string | null) => void;
  saveCurrentAsPreset: (name: string) => Promise<void>;
  updatePreset: (id: string, updates: { name?: string; text?: string }) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;

  startAiFilter: () => Promise<void>;
  cancelAiFilter: () => Promise<void>;
}

export const useAiFilterStore = create<AiFilterState>((set, get) => ({
  criteriaText: '',
  selectedPresetId: null,
  presets: [],
  isRunning: false,
  progress: null,
  error: null,

  setCriteriaText: criteriaText => set({ criteriaText }),
  setSelectedPresetId: selectedPresetId => set({ selectedPresetId }),
  setProgress: progress => set({ progress }),
  setIsRunning: isRunning => set({ isRunning }),

  selectPreset: id => {
    if (!id) {
      set({ selectedPresetId: null });
      void useSettingsStore.getState().saveSettings({
        activeCriteriaId: null
      });
      return;
    }
    const { presets } = get();
    const found = presets.find(p => p.id === id);
    if (found) {
      set({ selectedPresetId: id, criteriaText: found.text });
      void useSettingsStore.getState().saveSettings({
        activeCriteriaId: id,
        activeCriteriaText: found.text
      });
    }
  },

  saveCurrentAsPreset: async name => {
    const { criteriaText, presets } = get();
    if (!criteriaText.trim() || !name.trim()) return;

    const newPreset: CandidateCriteria = {
      id: `preset_${Date.now()}`,
      name: name.trim(),
      text: criteriaText.trim(),
      updatedAt: Date.now()
    };

    const nextPresets = [...presets, newPreset];
    set({ presets: nextPresets, selectedPresetId: newPreset.id });

    const settings = useSettingsStore.getState().settings;
    if (settings) {
      await useSettingsStore.getState().saveSettings({
        criteriaPresets: nextPresets,
        activeCriteriaId: newPreset.id,
        activeCriteriaText: criteriaText
      });
    }
  },

  updatePreset: async (id, updates) => {
    const { presets, criteriaText } = get();
    const nextPresets = presets.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
          ...(updates.text !== undefined ? { text: updates.text.trim() } : {}),
          updatedAt: Date.now()
        };
      }
      return p;
    });

    const activePreset = nextPresets.find(p => p.id === id);
    const newText =
      updates.text !== undefined ? updates.text : (activePreset?.text ?? criteriaText);

    set({ presets: nextPresets, criteriaText: newText });

    const settings = useSettingsStore.getState().settings;
    if (settings) {
      await useSettingsStore.getState().saveSettings({
        criteriaPresets: nextPresets,
        activeCriteriaId: id,
        activeCriteriaText: newText
      });
    }
  },

  deletePreset: async id => {
    const { presets, selectedPresetId } = get();
    const nextPresets = presets.filter(p => p.id !== id);
    const nextSelected = selectedPresetId === id ? nextPresets[0]?.id || null : selectedPresetId;
    const nextText = selectedPresetId === id ? nextPresets[0]?.text || '' : get().criteriaText;

    set({
      presets: nextPresets,
      selectedPresetId: nextSelected,
      criteriaText: nextText
    });

    await useSettingsStore.getState().saveSettings({
      criteriaPresets: nextPresets,
      activeCriteriaId: nextSelected,
      activeCriteriaText: nextText
    });
  },

  startAiFilter: async () => {
    const { criteriaText } = get();
    if (!criteriaText.trim()) {
      set({ error: 'Введите критерии или резюме для проверки' });
      return;
    }

    try {
      set({ isRunning: true, error: null });
      const currentVacancies = useVacanciesStore.getState().vacancies;
      await sendRpc('START_AI_FILTER', {
        criteria: criteriaText.trim(),
        vacancies: currentVacancies
      });
    } catch (e: any) {
      set({ isRunning: false, error: e.message || 'Ошибка запуска ИИ-фильтрации' });
    }
  },

  cancelAiFilter: async () => {
    try {
      await sendRpc('CANCEL_AI_FILTER');
      set({ isRunning: false });
    } catch (e: any) {
      set({ error: e.message || 'Ошибка отмены' });
    }
  }
}));
