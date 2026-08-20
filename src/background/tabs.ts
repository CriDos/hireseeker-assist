import { state } from './state';
import { broadcastToPanels } from './log';

export function initTabsTracker() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    if (tab.url && tab.url.includes('hireseeker.ru')) {
      state.activeTabId = tabId;
      state.connectedPageUrl = tab.url;
      broadcastToPanels({
        type: 'page-status',
        connected: true,
        url: tab.url,
        title: tab.title
      });
    }
  });

  chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
      if (tab?.url && tab.url.includes('hireseeker.ru')) {
        state.activeTabId = tab.id || null;
        state.connectedPageUrl = tab.url;
        broadcastToPanels({
          type: 'page-status',
          connected: true,
          url: tab.url,
          title: tab.title
        });
      }
    });
  });
}

export async function ensureHireSeekerTabOpen(): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, activeTabs => {
      const current = activeTabs[0];
      if (current?.url && current.url.includes('hireseeker.ru')) {
        state.activeTabId = current.id || null;
        state.connectedPageUrl = current.url;
        resolve();
        return;
      }

      // Check if any tab with hireseeker.ru is open
      chrome.tabs.query({ url: '*://hireseeker.ru/*' }, tabs => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.update(tabs[0].id, { active: true }, () => {
            state.activeTabId = tabs[0].id || null;
            state.connectedPageUrl = tabs[0].url || 'https://hireseeker.ru/';
            resolve();
          });
        } else {
          // Open hireseeker.ru in a new tab if not opened yet
          chrome.tabs.create({ url: 'https://hireseeker.ru/' }, newTab => {
            if (newTab?.id) {
              state.activeTabId = newTab.id;
              state.connectedPageUrl = 'https://hireseeker.ru/';
            }
            resolve();
          });
        }
      });
    });
  });
}

export async function checkActiveTabStatus(): Promise<{
  connected: boolean;
  url?: string;
  title?: string;
}> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return { connected: false };
  }

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs[0];
      if (activeTab?.url && activeTab.url.includes('hireseeker.ru')) {
        state.activeTabId = activeTab.id || null;
        state.connectedPageUrl = activeTab.url;
        resolve({
          connected: true,
          url: activeTab.url,
          title: activeTab.title
        });
      } else {
        // Search in all tabs
        chrome.tabs.query({ url: '*://hireseeker.ru/*' }, hsTabs => {
          if (hsTabs.length > 0) {
            const tab = hsTabs[0];
            state.activeTabId = tab.id || null;
            state.connectedPageUrl = tab.url || null;
            resolve({
              connected: true,
              url: tab.url,
              title: tab.title
            });
          } else {
            resolve({ connected: false });
          }
        });
      }
    });
  });
}
