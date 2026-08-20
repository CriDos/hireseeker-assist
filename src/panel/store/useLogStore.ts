import { create } from 'zustand';
import { LogEntry } from '../../background/log';
import { sendRpc } from '../services/extension';

export type LogFilter = 'all' | 'info' | 'warn' | 'error';

interface LogState {
  entries: LogEntry[];
  activeFilter: LogFilter;
  setFilter: (filter: LogFilter) => void;
  appendLog: (level: LogEntry['level'], message: string, ts: string, meta?: any) => void;
  clearLog: () => Promise<void>;
  loadHistory: () => Promise<void>;
  getFilteredEntries: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  entries: [],
  activeFilter: 'all',

  setFilter: activeFilter => set({ activeFilter }),

  appendLog: (level, message, ts, meta) => {
    set(state => {
      const next = [...state.entries, { level, message, ts, meta }];
      if (next.length > 500) next.shift();
      return { entries: next };
    });
  },

  clearLog: async () => {
    try {
      await sendRpc('CLEAR_LOGS');
      set({ entries: [] });
    } catch {
      set({ entries: [] });
    }
  },

  loadHistory: async () => {
    try {
      const logs = await sendRpc<LogEntry[]>('GET_LOGS');
      if (Array.isArray(logs)) {
        set({ entries: logs });
      }
    } catch {}
  },

  getFilteredEntries: () => {
    const { entries, activeFilter } = get();
    if (activeFilter === 'all') return entries;
    return entries.filter(e => e.level === activeFilter);
  }
}));
