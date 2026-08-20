import { create } from 'zustand';
import { sendRpc } from '../services/extension';

export interface PageSessionState {
  connected: boolean;
  url?: string;
  title?: string;
  totalFound?: number;
  loading: boolean;
  setSession: (session: Partial<PageSessionState>) => void;
  checkStatus: () => Promise<void>;
}

export const useSessionStore = create<PageSessionState>(set => ({
  connected: false,
  url: undefined,
  title: undefined,
  totalFound: 0,
  loading: true,
  setSession: session => set(prev => ({ ...prev, ...session, loading: false })),
  checkStatus: async () => {
    try {
      const res = await sendRpc<any>('GET_STATUS');
      if (res?.pageStatus) {
        set({
          connected: res.pageStatus.connected,
          url: res.pageStatus.url,
          title: res.pageStatus.title,
          totalFound: res.totalFound || 0,
          loading: false
        });
      }
    } catch {
      set({ connected: false, loading: false });
    }
  }
}));
