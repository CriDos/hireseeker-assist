import { describe, it, expect, afterEach } from 'vitest';
import { checkActiveTabStatus, ensureHireSeekerTabOpen } from '../../src/background/tabs';
import { state } from '../../src/background/state';

describe('background/tabs', () => {
  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  it('returns connected: false when chrome is undefined', async () => {
    delete (globalThis as any).chrome;
    const status = await checkActiveTabStatus();
    expect(status.connected).toBe(false);
  });

  it('detects active tab on hireseeker.ru', async () => {
    (globalThis as any).chrome = {
      tabs: {
        query: (queryInfo: any, cb: any) => {
          if (queryInfo.active) {
            cb([{ id: 42, url: 'https://hireseeker.ru/search', title: 'HireSeeker' }]);
          } else {
            cb([]);
          }
        }
      }
    };

    const status = await checkActiveTabStatus();
    expect(status.connected).toBe(true);
    expect(status.url).toBe('https://hireseeker.ru/search');
    expect(state.activeTabId).toBe(42);
  });

  it('ensures hireseeker tab open focuses existing tab', async () => {
    let updatedTabId = 0;

    (globalThis as any).chrome = {
      tabs: {
        query: (queryInfo: any, cb: any) => {
          if (queryInfo.active) {
            cb([{ id: 1, url: 'https://google.com' }]);
          } else if (queryInfo.url) {
            cb([{ id: 10, url: 'https://hireseeker.ru/vacancies' }]);
          }
        },
        update: (id: number, _opts: any, cb: any) => {
          updatedTabId = id;
          cb?.();
        }
      }
    };

    await ensureHireSeekerTabOpen();
    expect(updatedTabId).toBe(10);
    expect(state.activeTabId).toBe(10);
  });

  it('ensures hireseeker tab open creates new tab if none open', async () => {
    let createdUrl = '';

    (globalThis as any).chrome = {
      tabs: {
        query: (_queryInfo: any, cb: any) => {
          cb([]);
        },
        create: (opts: any, cb: any) => {
          createdUrl = opts.url;
          cb?.({ id: 11 });
        }
      }
    };

    await ensureHireSeekerTabOpen();
    expect(createdUrl).toBe('https://hireseeker.ru/');
    expect(state.activeTabId).toBe(11);
  });
});
