import { state, clearState } from './state';
import { getLogs, clearLogs, pushLog, broadcastToPanels } from './log';
import { startAiFilterRun, cancelAiFilterRun, fetchAllPagesForSearch } from './coordinator';
import { checkActiveTabStatus } from './tabs';
import { loadSettings, saveSettings } from '../core/settings';
import { testConnection, fetchModels } from '../core/llm';
import { mergeVacancies, normalizeApiVacancy } from '../core/vacancy';
import {
  executeSearch,
  buildSearchRequestBody,
  buildPageQueryParams,
  formatFiltersSummary
} from '../core/api';

export function installRpc() {
  if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handleAsync = async () => {
      const type = message?.type;
      const data = message?.data;

      // Messages from content script (API Interception & Page Storage)
      if (type === 'PAGE_STORAGE_DETECTED' || type === 'PAGE_STATE_UPDATED') {
        if (data?.lastSearchBody) {
          state.lastSearchBody = data.lastSearchBody;
        }
        if (data?.lastSelection) {
          state.lastSelection = data.lastSelection;
        }
        if (data?.url) {
          state.connectedPageUrl = data.url;
        }
        if (data?.origin) {
          state.lastOrigin = data.origin;
        }
        state.lastQueryParams = buildPageQueryParams(
          state.connectedPageUrl || '',
          '',
          state.lastSelection
        );
        return { success: true };
      }

      if (type === 'SEARCH_POST_INTERCEPTED') {
        state.lastSearchBody = data;
        return { success: true };
      }

      if (type === 'SEARCH_RESPONSE_INTERCEPTED') {
        const isNewSearch =
          data?.isSearchPost || (data?.token && data.token !== state.lastSearchToken);
        if (isNewSearch) {
          state.vacancies.clear();
        }

        if (data?.token) state.lastSearchToken = data.token;
        state.lastQueryParams = buildPageQueryParams(
          state.connectedPageUrl || '',
          data.queryParams || '',
          state.lastSelection
        );

        const totalItems = data?.total_items ?? data?.stats?.total_items;
        const totalCategory = data?.stats?.total_found ?? totalItems;
        if (totalCategory != null) state.totalFound = Number(totalCategory);

        const rawList = data?.rawVacancies || data?.vacancies || [];
        const origin = data?.origin || state.lastOrigin || 'https://hireseeker.ru';
        let added = 0;
        rawList.forEach((v: any) => {
          const item = v?.text ? v : normalizeApiVacancy(v, origin);
          if (!item.id) return;
          const existing = state.vacancies.get(item.id);
          const merged = mergeVacancies(existing, item);
          if (merged) {
            state.vacancies.set(item.id, merged);
            if (!existing) added++;
          }
        });

        if (added > 0) {
          broadcastToPanels({
            type: 'vacancies-updated',
            vacancies: Array.from(state.vacancies.values()),
            count: state.vacancies.size
          });
        }

        return { success: true, count: state.vacancies.size };
      }

      // Commands from Side Panel
      if (type === 'GET_STATUS') {
        const pageStatus = await checkActiveTabStatus();
        return {
          success: true,
          data: {
            vacanciesCount: state.vacancies.size,
            totalFound: state.totalFound,
            isAiRunning: Boolean(state.activeAiRun?.inProgress),
            loadAllInProgress: Boolean(state.loadAllInProgress),
            progress: state.activeAiRun?.progress || null,
            pageStatus
          }
        };
      }

      if (type === 'GET_VACANCIES') {
        return {
          success: true,
          data: Array.from(state.vacancies.values())
        };
      }

      if (type === 'SYNC_NOW') {
        let currentUrl = state.connectedPageUrl || '';
        let pageBody = state.lastSearchBody;

        if (typeof chrome !== 'undefined' && chrome.tabs) {
          try {
            const tabs = await new Promise<chrome.tabs.Tab[]>(resolve => {
              chrome.tabs.query({ active: true, currentWindow: true }, t => {
                if (t.length && t[0].url?.includes('hireseeker.ru')) resolve(t);
                else chrome.tabs.query({ url: '*://hireseeker.ru/*' }, resolve);
              });
            });

            if (tabs.length && tabs[0].id) {
              state.activeTabId = tabs[0].id;
              const pageState: any = await new Promise(resolve => {
                chrome.tabs.sendMessage(tabs[0].id!, { type: 'GET_PAGE_STATE' }, resp => {
                  if (chrome.runtime.lastError || !resp) resolve(null);
                  else resolve(resp);
                });
              });

              if (pageState?.url) {
                currentUrl = pageState.url;
                state.connectedPageUrl = currentUrl;
              }
              if (pageState?.lastSearchBody) {
                pageBody = pageState.lastSearchBody;
                state.lastSearchBody = pageBody;
              }
              if (pageState?.lastSelection) {
                state.lastSelection = pageState.lastSelection;
              }
            }
          } catch {}
        }

        // Execute API search directly using current tab URL search parameters or live page body
        try {
          const filterBody = buildSearchRequestBody(currentUrl, pageBody, state.lastSelection);
          const qp = buildPageQueryParams(currentUrl, '', state.lastSelection);
          const filterSummary = formatFiltersSummary(qp);
          const codes =
            filterBody.profession_codes?.slice(0, 3).join(', ') +
            (filterBody.profession_codes?.length > 3 ? '…' : '');
          const queryText = filterBody.search_text ? `«${filterBody.search_text}»` : '';
          const mainTarget = queryText || codes || 'все специальности';
          const filterDesc = filterSummary ? `${mainTarget} (${filterSummary})` : mainTarget;

          pushLog('info', `Поиск: ${filterDesc}...`);

          const origin = state.lastOrigin || 'https://hireseeker.ru';
          const searchRes = await executeSearch(origin, filterBody);

          // Clear previous vacancies cache for clean search synchronization
          state.vacancies.clear();
          state.lastSearchToken = searchRes.token;
          state.lastQueryParams = qp;
          if (searchRes.total_items != null) {
            state.totalFound = searchRes.total_items;
          }

          // Fetch all pages in background with exact query filters (schedule, salary, etc.)
          await fetchAllPagesForSearch();

          return {
            success: true,
            data: Array.from(state.vacancies.values())
          };
        } catch (err: any) {
          pushLog('warn', `Ошибка поиска: ${err?.message || err}`);
          throw new Error(
            err?.message || 'Не удалось синхронизировать поиск с сайтом hireseeker.ru'
          );
        }
      }

      if (type === 'FETCH_ALL_PAGES') {
        const total = await fetchAllPagesForSearch();
        return { success: true, data: { total } };
      }

      if (type === 'START_AI_FILTER') {
        const criteria = String(data?.criteria || '');
        void startAiFilterRun(criteria);
        return { success: true };
      }

      if (type === 'CANCEL_AI_FILTER') {
        cancelAiFilterRun();
        return { success: true };
      }

      if (type === 'CLEAR_VACANCIES') {
        clearState();
        pushLog('info', 'Список вакансий очищен');
        broadcastToPanels({
          type: 'vacancies-updated',
          vacancies: [],
          count: 0
        });
        return { success: true };
      }

      if (type === 'GET_CONFIG') {
        const cfg = await loadSettings();
        return { success: true, data: cfg };
      }

      if (type === 'SAVE_CONFIG') {
        const saved = await saveSettings(data);
        pushLog('info', 'Настройки сохранены');
        return { success: true, data: saved };
      }

      if (type === 'TEST_LLM_CONNECTION') {
        const cfg = data || (await loadSettings()).llm;
        pushLog('info', `Проверка LLM (${cfg.model})...`);
        try {
          await testConnection(cfg);
          pushLog('info', '✓ Связь с LLM установлена');
          return { success: true };
        } catch (err: any) {
          pushLog('warn', `✗ Ошибка связи с LLM: ${err?.message || err}`);
          throw err;
        }
      }

      if (type === 'FETCH_MODELS') {
        const cfg = data || (await loadSettings()).llm;
        pushLog('info', 'Загрузка списка моделей...');
        try {
          const models = await fetchModels(cfg);
          pushLog('info', `✓ Загружено моделей: ${models.length}`);
          return { success: true, data: models };
        } catch (err: any) {
          pushLog('warn', `✗ Ошибка загрузки моделей: ${err?.message || err}`);
          throw err;
        }
      }

      if (type === 'GET_LOGS') {
        return { success: true, data: getLogs() };
      }

      if (type === 'CLEAR_LOGS') {
        clearLogs();
        return { success: true };
      }

      return { success: false, error: `Неизвестная команда RPC: ${type}` };
    };

    handleAsync()
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ success: false, error: err?.message || String(err) }));

    return true; // Keep channel open for async response
  });
}
