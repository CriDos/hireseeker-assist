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

  it('selects, updates, and deletes presets', async () => {
    useAiFilterStore.setState({
      presets: [
        { id: 'p1', name: 'Preset 1', text: 'Text 1' },
        { id: 'p2', name: 'Preset 2', text: 'Text 2' }
      ]
    });

    const store = useAiFilterStore.getState();
    store.selectPreset('p1');
    expect(useAiFilterStore.getState().selectedPresetId).toBe('p1');
    expect(useAiFilterStore.getState().criteriaText).toBe('Text 1');

    store.selectPreset(null);
    expect(useAiFilterStore.getState().selectedPresetId).toBeNull();

    await store.updatePreset('p2', { name: 'Renamed P2', text: 'New Text 2' });
    const p2 = useAiFilterStore.getState().presets.find(p => p.id === 'p2');
    expect(p2?.name).toBe('Renamed P2');
    expect(p2?.text).toBe('New Text 2');

    await store.deletePreset('p1');
    expect(useAiFilterStore.getState().presets.length).toBe(1);
    expect(useAiFilterStore.getState().presets[0].id).toBe('p2');
  });
});
