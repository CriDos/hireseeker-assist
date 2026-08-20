// 1. Inject Main World script to intercept and trigger official API requests
function injectMainWorldInterceptor() {
  const script = document.createElement('script');
  script.textContent = `
    (() => {
      const origFetch = window.fetch;
      if (window.__hs_fetch_injected) return;
      window.__hs_fetch_injected = true;

      // Intercept SPA navigation
      const origPushState = history.pushState;
      const origReplaceState = history.replaceState;
      history.pushState = function(...args) {
        const res = origPushState.apply(this, args);
        window.dispatchEvent(new CustomEvent('__hs_location_change__', { detail: window.location.href }));
        return res;
      };
      history.replaceState = function(...args) {
        const res = origReplaceState.apply(this, args);
        window.dispatchEvent(new CustomEvent('__hs_location_change__', { detail: window.location.href }));
        return res;
      };
      window.addEventListener('popstate', () => {
        window.dispatchEvent(new CustomEvent('__hs_location_change__', { detail: window.location.href }));
      });
      window.addEventListener('hashchange', () => {
        window.dispatchEvent(new CustomEvent('__hs_location_change__', { detail: window.location.href }));
      });

      window.fetch = async function(...args) {
        let urlStr = '';
        if (typeof args[0] === 'string') urlStr = args[0];
        else if (args[0] && args[0].url) urlStr = args[0].url;

        let isSearchPost = false;
        let isPageGet = false;
        let parsedUrl = null;

        try {
          parsedUrl = new URL(urlStr, window.location.origin);
        } catch {}

        const method = (args[1] && args[1].method || 'GET').toUpperCase();
        if (parsedUrl) {
          if (/\\/api\\/v1\\/search$/.test(parsedUrl.pathname) && method === 'POST') isSearchPost = true;
          if (/\\/api\\/v1\\/search\\/[^/]+\\/page/.test(parsedUrl.pathname) && method === 'GET') isPageGet = true;
        }

        if (isSearchPost && args[1] && args[1].body) {
          try {
            const body = typeof args[1].body === 'string' ? JSON.parse(args[1].body) : args[1].body;
            window.__hs_last_post_body = body;
            window.dispatchEvent(new CustomEvent('__hs_search_post__', { detail: body }));
          } catch {}
        }

        const response = await origFetch.apply(this, args);

        try {
          if (response.ok && (isSearchPost || isPageGet)) {
            const clone = response.clone();
            clone.json().then((json) => {
              window.__hs_last_search_json = json;
              window.__hs_last_search_url = urlStr;
              window.dispatchEvent(new CustomEvent('__hs_search_response__', {
                detail: {
                  isSearchPost,
                  isPageGet,
                  json,
                  url: urlStr
                }
              }));
            }).catch(() => {});
          }
        } catch {}

        return response;
      };

      // Handler to trigger API search programmatically using page's current URL or state
      window.addEventListener('__hs_trigger_search__', async () => {
        try {
          let postBody = window.__hs_last_post_body;
          if (!postBody) {
            try {
              const raw = localStorage.getItem('hs_v2_last_search_body');
              if (raw) postBody = JSON.parse(raw);
            } catch {}
          }

          if (postBody && Array.isArray(postBody.profession_codes) && postBody.profession_codes.length > 0) {
            await window.fetch('/api/v1/search', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*'
              },
              body: JSON.stringify(postBody)
            });
            return;
          }
        } catch (err) {
          console.warn('[HireSeeker Assist] Не удалось выполнить повторный запрос поиска:', err);
        }
      });
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function cleanText(str: string): string {
  return String(str || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 2. Inject AI Badges onto Native Page Cards (Visual Overlay Only)
function injectAiBadge(card: HTMLElement, score: number, reason: string, match: boolean) {
  let existingBadge = card.querySelector<HTMLElement>('.hs-ai-score-badge');
  if (!existingBadge) {
    existingBadge = document.createElement('div');
    existingBadge.className = 'hs-ai-score-badge';
    const container = card.querySelector('div.flex.items-start') || card.firstElementChild;
    if (container) {
      container.appendChild(existingBadge);
    } else {
      card.appendChild(existingBadge);
    }
  }

  const colorClass =
    match && score >= 85
      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
      : match && score >= 60
        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
        : match && score >= 50
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';

  existingBadge.innerHTML = `
    <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 8px; border-radius:6px; border:1px solid; font-size:11px; font-weight:600; margin-top:6px; cursor:help;"
         class="${colorClass}"
         title="${cleanText(reason)}">
      <span>AI: ${score}%</span>
      <span style="font-weight:400; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.85;">${cleanText(reason)}</span>
    </div>
  `;
}

function updateCardBadges(
  evaluations: Record<string, { score: number; reason: string; match: boolean }>
) {
  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="/vacancy/"]');
  let count = 0;
  links.forEach(link => {
    const href = link.href || '';
    const idMatch = href.match(/\/vacancy\/([^/?#]+)/);
    const id = idMatch ? idMatch[1] : '';
    if (id && evaluations[id]) {
      const card =
        link.closest<HTMLElement>(
          'div.group\\/card, [data-slot="card"], div.flex.flex-col, article'
        ) || (link.parentElement?.parentElement as HTMLElement);
      if (card) {
        const ev = evaluations[id];
        injectAiBadge(card, ev.score, ev.reason, ev.match);
        count++;
      }
    }
  });
  if (count > 0) {
    console.debug(`[HireSeeker Assist] Отображено ${count} AI-бейджей на странице`);
  }
}

// 3. Main Initialization
function init() {
  injectMainWorldInterceptor();
  console.info('[HireSeeker Assist] API-модуль активирован на', window.location.pathname);

  let lastEvaluations: Record<string, any> = {};
  let lastReportedStateKey = '';

  function reportCurrentPageState(reason: string = 'check') {
    try {
      const rawBody = localStorage.getItem('hs_v2_last_search_body');
      const rawSel = localStorage.getItem('hs_last_selection');
      const body = rawBody ? JSON.parse(rawBody) : null;
      const sel = rawSel ? JSON.parse(rawSel) : null;

      const currentKey = `${window.location.href}::${rawBody || ''}::${rawSel || ''}`;
      if (currentKey === lastReportedStateKey) return;
      lastReportedStateKey = currentKey;

      chrome.runtime
        .sendMessage({
          type: 'PAGE_STORAGE_DETECTED',
          data: {
            lastSearchBody: lastCapturedPostBody || body,
            lastSelection: sel,
            url: window.location.href,
            origin: window.location.origin,
            reason
          }
        })
        .catch(() => {});
    } catch {}
  }

  // Report initial page state
  reportCurrentPageState('init');

  // Listen for SPA navigation from main world
  window.addEventListener('__hs_location_change__', () => {
    reportCurrentPageState('location_change');
  });

  // Listen for localStorage changes
  window.addEventListener('storage', () => {
    reportCurrentPageState('storage_event');
  });

  let lastCapturedPostBody: any = null;

  // Listen for intercepted events from Main World fetch
  window.addEventListener('__hs_search_post__', (ev: any) => {
    lastCapturedPostBody = ev.detail;
    console.info('[HireSeeker Assist] Перехвачен поиск API:', lastCapturedPostBody);
    reportCurrentPageState('search_post');
    chrome.runtime
      .sendMessage({
        type: 'SEARCH_POST_INTERCEPTED',
        data: lastCapturedPostBody
      })
      .catch(() => {});
  });

  window.addEventListener('__hs_search_response__', (ev: any) => {
    const { isSearchPost, isPageGet, json, url } = ev.detail;
    const token = json?.token || json?.search?.token;
    const rawVacancies = json?.vacancies || [];

    let queryParams = '';
    try {
      if (url) {
        const parsed = new URL(url, window.location.origin);
        queryParams = parsed.search.replace(/^\?/, '');
      }
    } catch {}

    console.info(
      `[HireSeeker Assist] Получен ответ API: ${rawVacancies.length} вакансий (всего: ${json?.total_items ?? '?'}, токен: ${token ? token.slice(0, 8) + '…' : '—'})`
    );

    chrome.runtime
      .sendMessage({
        type: 'SEARCH_RESPONSE_INTERCEPTED',
        data: {
          token,
          rawVacancies,
          origin: window.location.origin,
          total_items: json?.total_items ?? json?.stats?.total_found ?? json?.search?.total_items,
          stats: json?.stats,
          queryParams,
          isSearchPost,
          isPageGet
        }
      })
      .catch(() => {});

    if (Object.keys(lastEvaluations).length) {
      setTimeout(() => updateCardBadges(lastEvaluations), 400);
    }
  });

  let badgeObserver: MutationObserver | null = null;
  function ensureBadgeObserver() {
    if (badgeObserver || typeof MutationObserver === 'undefined' || !document.body) return;
    let timer: any = null;
    badgeObserver = new MutationObserver(() => {
      if (Object.keys(lastEvaluations).length === 0) return;
      clearTimeout(timer);
      timer = setTimeout(() => updateCardBadges(lastEvaluations), 250);
    });
    badgeObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_PAGE_STATE') {
      let lastSearchBody = null;
      let lastSelection = null;
      try {
        const rawBody = localStorage.getItem('hs_v2_last_search_body');
        const rawSel = localStorage.getItem('hs_last_selection');
        lastSearchBody = rawBody ? JSON.parse(rawBody) : null;
        lastSelection = rawSel ? JSON.parse(rawSel) : null;
      } catch {}
      sendResponse({
        url: window.location.href,
        lastSearchBody: lastCapturedPostBody || lastSearchBody || null,
        lastSelection,
        origin: window.location.origin
      });
      return true;
    }
    if (message.type === 'APPLY_AI_EVALUATIONS') {
      lastEvaluations = { ...lastEvaluations, ...(message.data || {}) };
      updateCardBadges(lastEvaluations);
      ensureBadgeObserver();
    }
    if (message.type === 'REQUEST_PAGE_SYNC') {
      // Trigger API search
      window.dispatchEvent(new CustomEvent('__hs_trigger_search__'));
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
