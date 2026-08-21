import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TabsNav, TabId } from './components/TabsNav';
import { SearchTab } from './components/tabs/SearchTab';
import { AiFilterTab } from './components/tabs/AiFilterTab';
import { LogTab } from './components/tabs/LogTab';
import { SettingsTab } from './components/tabs/SettingsTab';

import { useSessionStore } from './store/useSessionStore';
import { useVacanciesStore } from './store/useVacanciesStore';
import { useAiFilterStore } from './store/useAiFilterStore';
import { useLogStore } from './store/useLogStore';
import { useSettingsStore } from './store/useSettingsStore';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('search');

  useEffect(() => {
    // 1. Initial data loads
    useSessionStore.getState().checkStatus();
    useSettingsStore.getState().loadSettings();
    useVacanciesStore.getState().syncFromPage();
    useLogStore.getState().loadHistory();

    // 2. Port connection to Service Worker
    let port: chrome.runtime.Port | null = null;
    let reconnectTimer: any = null;

    function connect() {
      if (typeof chrome === 'undefined' || !chrome.runtime?.connect) return;
      try {
        port = chrome.runtime.connect({ name: 'hs-panel' });
        port.onMessage.addListener((message: any) => {
          if (message?.type === 'log') {
            useLogStore
              .getState()
              .appendLog(message.level, message.message, message.ts, message.meta);
          }
          if (message?.type === 'logs-cleared') {
            useLogStore.getState().clearLog();
          }
          if (message?.type === 'vacancies-updated') {
            if (Array.isArray(message.vacancies)) {
              useVacanciesStore.getState().setVacancies(message.vacancies);
            }
          }
          if (message?.type === 'sync-progress') {
            useVacanciesStore.getState().setSyncProgress({
              inProgress: Boolean(message.inProgress),
              loaded: message.loaded || 0,
              total: message.total || 0,
              message: message.message
            });
          }
          if (message?.type === 'ai-progress') {
            useAiFilterStore.getState().setProgress(message.progress);
            if (
              message.progress?.currentMatched &&
              Array.isArray(message.progress.currentMatched)
            ) {
              useVacanciesStore
                .getState()
                .updateEvaluatedVacancies(message.progress.currentMatched);
            }
            if (message.progress?.stage === 'progress' || message.progress?.stage === 'start') {
              useAiFilterStore.getState().setIsRunning(true);
            } else if (
              message.progress?.stage === 'done' ||
              message.progress?.stage === 'error' ||
              message.progress?.stage === 'warning'
            ) {
              useAiFilterStore.getState().setIsRunning(false);
            }
          }
          if (message?.type === 'ai-done') {
            useAiFilterStore.getState().setIsRunning(false);
            useVacanciesStore.getState().loadVacancies();
          }
          if (message?.type === 'page-status') {
            useSessionStore.getState().setSession({
              connected: message.connected,
              url: message.url,
              title: message.title
            });
          }
        });

        port.onDisconnect.addListener(() => {
          reconnectTimer = setTimeout(connect, 2000);
        });
      } catch {
        reconnectTimer = setTimeout(connect, 2000);
      }
    }

    connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (port) {
        try {
          port.disconnect();
        } catch {}
      }
    };
  }, []);

  const handleSelectTab = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === 'search') useVacanciesStore.getState().loadVacancies();
    if (tab === 'log') useLogStore.getState().loadHistory();
    if (tab === 'settings') useSettingsStore.getState().loadSettings();
  };

  return (
    <div className="hs-app-container">
      <Header />
      <TabsNav activeTab={activeTab} onSelectTab={handleSelectTab} />

      <main className="hs-main">
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'ai' && <AiFilterTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};
