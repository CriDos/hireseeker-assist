import { describe, it, expect, beforeEach } from 'vitest';
import { useAiFilterStore } from '../../src/panel/store/useAiFilterStore';

describe('panel/useAiFilterStore', () => {
  beforeEach(() => {
    useAiFilterStore.setState({
      criteriaText: '',
      selectedPresetId: null,
      presets: [],
      isRunning: false,
      progress: null,
      error: null
    });
  });

  it('updates criteria text and presets', () => {
    const store = useAiFilterStore.getState();
    store.setCriteriaText('Python FastAPI Senior');
    expect(useAiFilterStore.getState().criteriaText).toBe('Python FastAPI Senior');
  });

  it('sets running and progress state', () => {
    const store = useAiFilterStore.getState();
    store.setIsRunning(true);
    store.setProgress({ stage: 'progress', total: 10, processed: 5, matches: 3 });

    const state = useAiFilterStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.progress?.processed).toBe(5);
    expect(state.progress?.matches).toBe(3);
  });
});
