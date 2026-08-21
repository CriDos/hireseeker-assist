import { describe, it, expect } from 'vitest';
import {
  convertLayout,
  tokenize,
  highlight,
  extractSnippet,
  cleanText,
  stripHtml
} from '../../src/core/text';

describe('core/text', () => {
  it('converts keyboard layout between English and Russian', () => {
    expect(convertLayout('ghbdtn')).toBe('привет');
    expect(convertLayout('привет')).toBe('ghbdtn');
    expect(convertLayout('python')).toBe('знерщт');
    expect(convertLayout('знерщт')).toBe('python');
  });

  it('tokenizes search queries with layout alternatives', () => {
    const tokens = tokenize('python react');
    expect(tokens.length).toBe(2);
    expect(tokens[0]).toEqual(['python', 'знерщт']);
    expect(tokens[1]).toEqual(['react', 'куфсе']);
  });

  it('strips html tags and trims whitespace', () => {
    expect(stripHtml('<p>Hello <strong>World</strong>&nbsp;!</p>')).toBe('Hello World!');
    expect(cleanText('   multiple    spaces   ')).toBe('multiple spaces');
  });

  it('highlights search tokens in text without corrupting HTML entities', () => {
    const text = 'Ищем Senior Python разработчика в команду & отдел';
    const highlighted = highlight(text, ['python']);
    expect(highlighted).toContain('<mark class="hs-mark">Python</mark>');
    expect(highlighted).toContain('&amp;');

    const htmlText = 'C++ & <Advanced> Tools';
    const h2 = highlight(htmlText, ['<Advanced>', 'C++']);
    expect(h2).toContain('<mark class="hs-mark">&lt;Advanced&gt;</mark>');
    expect(h2).toContain('<mark class="hs-mark">C++</mark>');
    expect(h2).toContain('&amp;');
  });

  it('extracts snippet around matched tokens', () => {
    const text =
      'Очень длинный текст перед описанием стека. Мы используем Python, FastAPI и PostgreSQL для микросервисов. Также есть много других технологий.';
    const snippet = extractSnippet(text, ['python'], 80);
    expect(snippet).toContain('<mark class="hs-mark">Python</mark>');
  });

  it('extractJsonFromText parses clean, fenced and embedded JSON', async () => {
    const { extractJsonFromText } = await import('../../src/core/text');
    expect(extractJsonFromText('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonFromText('```json\n{"b":2}\n```')).toEqual({ b: 2 });
    expect(extractJsonFromText('Prefix text {"c":3} suffix text')).toEqual({ c: 3 });
    expect(extractJsonFromText('[1, 2, 3]')).toEqual([1, 2, 3]);
    expect(extractJsonFromText('Invalid not JSON')).toBeNull();
  });
});
