import { state } from './state';
import { pushLog, broadcastToPanels } from './log';
import { AiBatchProgress, AiEvaluationItem } from '../types/ai';
import { filterVacanciesWithAi } from '../core/ai-filter';
import { loadSettings } from '../core/settings';
import { fetchSearchPage } from '../core/api';
import { normalizeApiVacancy } from '../core/vacancy';
import { ensureKeepAlive } from './keepalive';

export async function startAiFilterRun(criteria: string): Promise<void> {
  if (state.activeAiRun?.inProgress) {
    pushLog('warn', 'ИИ-фильтрация уже выполняется');
    throw new Error('ИИ-фильтрация уже выполняется');
  }

  const vacancies = Array.from(state.vacancies.values());
  if (!vacancies.length) {
    pushLog('warn', 'Нет вакансий для анализа');
    throw new Error('Нет доступных вакансий. Откройте поиск на hireseeker.ru');
  }

  const settings = await loadSettings();
  const config = settings.llm;

  const abortController = new AbortController();
  const initialProgress: AiBatchProgress = {
    stage: 'start',
    total: vacancies.length,
    processed: 0,
    matches: 0
  };

  state.activeAiRun = {
    inProgress: true,
    abortController,
    criteria,
    progress: initialProgress
  };
  ensureKeepAlive();

  const startTime = Date.now();
  pushLog(
    'info',
    `Анализ ${vacancies.length} вакансий (${config.model}, пачка: ${config.batchSize}, потоков: ${config.concurrency})`
  );

  // Reset previous AI evaluations on start
  state.evaluations.clear();
  state.vacancies.forEach(v => {
    delete v.aiScore;
    delete v.aiMatch;
    delete v.aiReason;
    delete v.aiEvaluatedAt;
  });

  broadcastToPanels({
    type: 'vacancies-updated',
    vacancies: Array.from(state.vacancies.values()),
    count: state.vacancies.size
  });

  broadcastToPanels({
    type: 'ai-progress',
    progress: initialProgress
  });

  try {
    const matched = await filterVacanciesWithAi(
      criteria,
      vacancies,
      config,
      progress => {
        if (state.activeAiRun) {
          state.activeAiRun.progress = progress;
        }

        // Apply any newly evaluated matching vacancies to state live in real-time
        if (progress.currentMatched && progress.currentMatched.length) {
          progress.currentMatched.forEach(v => {
            const existing = state.vacancies.get(v.id);
            if (existing) {
              existing.aiScore = v.aiScore;
              existing.aiMatch = true;
              existing.aiReason = v.aiReason;
              existing.aiEvaluatedAt = v.aiEvaluatedAt || Date.now();
            }
          });

          broadcastToPanels({
            type: 'vacancies-updated',
            vacancies: Array.from(state.vacancies.values()),
            count: state.vacancies.size
          });
        }

        broadcastToPanels({
          type: 'ai-progress',
          progress
        });

        // Also notify content script to show badges on page
        notifyActiveTabBadges();
      },
      abortController.signal
    );

    // Save final evaluations
    const evalMap: Record<string, AiEvaluationItem> = {};
    vacancies.forEach(v => {
      if (v.aiScore !== undefined) {
        const evItem: AiEvaluationItem = {
          id: v.id,
          score: v.aiScore,
          match: Boolean(v.aiMatch),
          reason: v.aiReason || ''
        };
        state.evaluations.set(v.id, evItem);
        evalMap[v.id] = evItem;
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    pushLog(
      'info',
      `Анализ завершен за ${elapsed}с: подходит ${matched.length} из ${vacancies.length}`
    );

    broadcastToPanels({
      type: 'ai-done',
      total: vacancies.length,
      matches: matched.length
    });

    broadcastToPanels({
      type: 'vacancies-updated',
      vacancies: Array.from(state.vacancies.values()),
      count: state.vacancies.size
    });

    notifyActiveTabBadges();
  } catch (error: any) {
    if (abortController.signal.aborted) {
      pushLog('info', 'Анализ остановлен');
    } else {
      pushLog('error', `Ошибка анализа: ${error?.message || error}`);
    }
    broadcastToPanels({
      type: 'ai-progress',
      progress: {
        stage: 'error',
        total: vacancies.length,
        processed: state.activeAiRun?.progress.processed || 0,
        matches: state.activeAiRun?.progress.matches || 0,
        message: error?.message || String(error)
      }
    });
  } finally {
    if (state.activeAiRun) {
      state.activeAiRun.inProgress = false;
    }
    ensureKeepAlive();
  }
}

export function cancelAiFilterRun() {
  if (state.activeAiRun?.abortController) {
    state.activeAiRun.abortController.abort();
    state.activeAiRun.inProgress = false;
    ensureKeepAlive();
    pushLog('info', 'Остановка анализа...');
    broadcastToPanels({
      type: 'ai-progress',
      progress: {
        stage: 'idle',
        total: state.vacancies.size,
        processed: 0,
        matches: 0,
        message: 'Отменено'
      }
    });
  }
}

export function notifyActiveTabBadges() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  const evalObj: Record<string, any> = {};
  state.vacancies.forEach((v, id) => {
    if (v.aiScore !== undefined) {
      evalObj[id] = {
        score: v.aiScore,
        match: v.aiMatch,
        reason: v.aiReason
      };
    }
  });

  if (Object.keys(evalObj).length === 0) return;

  chrome.tabs.query({ url: '*://hireseeker.ru/*' }, tabs => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: 'APPLY_AI_EVALUATIONS',
            data: evalObj
          })
          .catch(() => {});
      }
    });
  });
}

/**
 * Fetch ALL pages for the active search session automatically (e.g. 500 items per page up to 10k+)
 */
export async function fetchAllPagesForSearch(): Promise<number> {
  if (!state.lastSearchToken) {
    pushLog('warn', 'Сессия поиска не найдена');
    throw new Error('Токен сессии поиска не найден. Выполните поиск на hireseeker.ru');
  }

  if (state.loadAllInProgress) {
    return state.vacancies.size;
  }

  state.loadAllInProgress = true;
  const origin = state.lastOrigin || 'https://hireseeker.ru';
  const token = state.lastSearchToken;
  const pageSize = 500;
  const queryParams = state.lastQueryParams || '';
  const startTime = Date.now();

  pushLog('debug', 'Загрузка страниц поиска...');

  broadcastToPanels({
    type: 'sync-progress',
    inProgress: true,
    loaded: state.vacancies.size,
    total: state.totalFound || state.vacancies.size,
    message: 'Загрузка вакансий...'
  });

  try {
    let page = 1;
    let totalItems = state.totalFound || 0;
    let totalPages = 1;

    while (page <= totalPages) {
      const pageData = await fetchSearchPage(origin, token, page, pageSize, queryParams);

      if (pageData?.total_items != null) {
        totalItems = Number(pageData.total_items);
        totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        if (!state.totalFound) {
          state.totalFound = totalItems;
        }
      }

      if (page === 1) {
        state.vacancies.clear();
      }

      if (pageData?.vacancies?.length) {
        pageData.vacancies.forEach(v => {
          const item = normalizeApiVacancy(v, origin);
          if (item.id) {
            state.vacancies.set(item.id, item);
          }
        });

        broadcastToPanels({
          type: 'sync-progress',
          inProgress: page < totalPages,
          loaded: state.vacancies.size,
          total: totalItems || state.vacancies.size,
          message: `Загружено ${state.vacancies.size} из ${totalItems || '?'}`
        });

        broadcastToPanels({
          type: 'vacancies-updated',
          vacancies: Array.from(state.vacancies.values()),
          count: state.vacancies.size
        });

        pushLog('debug', `Страница ${page}/${totalPages}: ${state.vacancies.size} вакансий`);

        if (pageData.vacancies.length < pageSize || page >= totalPages) {
          break;
        }

        page++;
      } else {
        break;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    pushLog('info', `Загружено ${state.vacancies.size} вакансий за ${elapsed}с`);
  } catch (error: any) {
    pushLog('warn', `Ошибка загрузки страниц: ${error?.message || error}`);
  } finally {
    state.loadAllInProgress = false;
    broadcastToPanels({
      type: 'sync-progress',
      inProgress: false,
      loaded: state.vacancies.size,
      total: state.totalFound || state.vacancies.size,
      message: 'Загрузка завершена'
    });
  }

  return state.vacancies.size;
}
