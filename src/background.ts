import { installRpc } from './background/rpc';
import { restoreStateFromStorage } from './background/state';
import { initTabsTracker, ensureHireSeekerTabOpen } from './background/tabs';
import { registerPanelPort, pushLog } from './background/log';
import { getAppVersion } from './core/version';

// Restore state from persistent storage on service worker boot
void restoreStateFromStorage();

// 1. Configure Side Panel behavior
if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// 2. Automatically open or focus hireseeker.ru when extension action is clicked
if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
  chrome.action.onClicked.addListener(() => {
    void ensureHireSeekerTabOpen();
  });
}

// 3. Install RPC message handler
installRpc();

// 4. Initialize tab tracker
initTabsTracker();

// 5. Panel live port connection (when side panel opens, ensure site tab is active)
if (typeof chrome !== 'undefined' && chrome.runtime?.onConnect) {
  chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'hs-panel') {
      registerPanelPort(port);
      void ensureHireSeekerTabOpen();
    }
  });
}

// 6. Initial startup log
setTimeout(() => {
  pushLog('info', `HireSeeker Assist v${getAppVersion()}`);
}, 100);
