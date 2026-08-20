export const KEYBOARD_LAYOUT_MAP: Record<string, string> = {
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  й: 'q',
  ц: 'w',
  у: 'e',
  к: 'r',
  е: 't',
  н: 'y',
  г: 'u',
  ш: 'i',
  щ: 'o',
  з: 'p',
  х: '[',
  ъ: ']',
  ф: 'a',
  ы: 's',
  в: 'd',
  а: 'f',
  п: 'g',
  р: 'h',
  о: 'j',
  л: 'k',
  д: 'l',
  ж: ';',
  э: "'",
  я: 'z',
  ч: 'x',
  с: 'c',
  м: 'v',
  и: 'b',
  т: 'n',
  ь: 'm',
  б: ',',
  ю: '.'
};

export function escapeRegex(str: string): string {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHtml(str: string): string {
  return String(str || '').replace(
    /[&<>"']/g,
    c =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c] || c
  );
}

export function cleanText(str: string): string {
  return String(str || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(src: string): string {
  return String(src || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

export function convertLayout(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split('')
    .map(ch => KEYBOARD_LAYOUT_MAP[ch] || ch)
    .join('');
}

export function tokenize(query: string): string[][] {
  const raw = String(query || '')
    .trim()
    .toLowerCase();
  if (!raw) return [];
  const words = raw.split(/[^\p{L}\p{N}+#]+/u).filter(Boolean);
  return words.map(word => {
    const alt = convertLayout(word);
    return alt && alt !== word ? [word, alt] : [word];
  });
}

export function highlight(text: string, tokens: string[]): string {
  if (!text) return '';
  const esc = escapeHtml(text);
  if (!tokens || !tokens.length) return esc;
  const unique = Array.from(new Set(tokens.filter(t => t && String(t).length))).sort(
    (a, b) => String(b).length - String(a).length
  );
  if (!unique.length) return esc;
  const pattern = unique.map(t => `(?:${escapeRegex(t)})`).join('|');
  return esc.replace(new RegExp(pattern, 'gi'), '<mark class="hs-mark">$&</mark>');
}

export function extractSnippet(text: string, tokens: string[], maxLen = 160): string {
  if (!text) return '';
  const normalized = stripHtml(text);
  if (!tokens || !tokens.length) {
    return escapeHtml(normalized.slice(0, maxLen)) + (normalized.length > maxLen ? '…' : '');
  }
  const lower = normalized.toLowerCase();
  const hit = tokens.find(t => lower.includes(t));
  if (!hit) {
    return escapeHtml(normalized.slice(0, maxLen)) + (normalized.length > maxLen ? '…' : '');
  }
  const idx = lower.indexOf(hit);
  const start = Math.max(0, idx - Math.floor(maxLen / 3));
  const end = Math.min(normalized.length, start + maxLen);
  const slice =
    (start > 0 ? '…' : '') + normalized.slice(start, end) + (end < normalized.length ? '…' : '');
  return highlight(slice, tokens);
}

export function extractJsonFromText(text: string): any {
  if (!text) return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim());
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {}
  }

  return null;
}
