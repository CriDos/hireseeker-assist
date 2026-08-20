import { state } from './state';

export const KEEP_ALIVE_ALARM = 'hs-keepalive';

export function isWorkActive(): boolean {
  return Boolean(state.activeAiRun?.inProgress);
}

export function ensureKeepAlive(): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      if (isWorkActive()) {
        chrome.alarms.create(KEEP_ALIVE_ALARM, { periodInMinutes: 0.5 });
      } else {
        chrome.alarms.clear(KEEP_ALIVE_ALARM);
      }
    }
  } catch {}
}

if (typeof chrome !== 'undefined' && chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === KEEP_ALIVE_ALARM) ensureKeepAlive();
  });
}
