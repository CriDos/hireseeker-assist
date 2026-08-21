import { state } from './state';

export const KEEP_ALIVE_ALARM = 'hs-keepalive';

export function isWorkActive(): boolean {
  return Boolean(state.activeAiRun?.inProgress);
}

export function ensureKeepAlive(): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      if (isWorkActive()) {
        chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 1 });
      } else {
        chrome.alarms.clear(KEEP_ALIVE_ALARM);
      }
    }
  } catch {}
}

if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name === KEEP_ALIVE_ALARM) {
      if (isWorkActive()) {
        try {
          if (chrome.storage?.local) {
            await chrome.storage.local.get('_keepalive_ping');
          }
        } catch {}
      }
      ensureKeepAlive();
    }
  });
}
