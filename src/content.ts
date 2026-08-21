function cleanText(str: string): string {
  return String(str || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Inject AI Badges onto Native Page Cards (Visual Overlay Only)
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

  const styleConfig =
    match && score >= 85
      ? { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.35)' }
      : match && score >= 60
        ? { bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: 'rgba(6, 182, 212, 0.35)' }
        : match && score >= 50
          ? { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.35)' }
          : { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.35)' };

  existingBadge.innerHTML = `
    <div style="display:inline-flex; align-items:center; gap:6px; padding:3px 8px; border-radius:6px; border:1px solid ${styleConfig.border}; background:${styleConfig.bg}; color:${styleConfig.color}; font-size:11px; font-weight:600; margin-top:6px; cursor:help;"
         title="${cleanText(reason)}">
      <span>AI: ${score}%</span>
      <span style="font-weight:400; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:0.9;">${cleanText(reason)}</span>
    </div>
  `;
}

let isUpdatingBadges = false;

function updateCardBadges(
  evaluations: Record<string, { score: number; reason: string; match: boolean }>
) {
  if (isUpdatingBadges) return;
  isUpdatingBadges = true;
  try {
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
      console.debug(`[HireSeeker] Бейджи на странице: ${count}`);
    }
  } finally {
    isUpdatingBadges = false;
  }
}

// 2. Main Initialization
function init() {
  console.info('[HireSeeker] Модуль активен:', window.location.pathname);

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
            lastSearchBody: body,
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

  // Listen for localStorage changes
  window.addEventListener('storage', () => {
    reportCurrentPageState('storage_event');
  });

  let badgeObserver: MutationObserver | null = null;
  function ensureBadgeObserver() {
    if (badgeObserver || typeof MutationObserver === 'undefined' || !document.body) return;
    let timer: any = null;
    badgeObserver = new MutationObserver(() => {
      if (isUpdatingBadges || Object.keys(lastEvaluations).length === 0) return;
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
        lastSearchBody,
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
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
