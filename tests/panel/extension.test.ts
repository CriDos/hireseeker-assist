import { describe, it, expect, afterEach } from 'vitest';
import { sendRpc } from '../../src/panel/services/extension';

describe('panel/services/extension', () => {
  afterEach(() => {
    delete (globalThis as any).chrome;
  });

  it('throws when chrome is undefined', async () => {
    delete (globalThis as any).chrome;
    await expect(sendRpc('GET_STATUS')).rejects.toThrow(/Chrome Extension API недоступно/);
  });

  it('sends RPC message and returns data on success', async () => {
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: async (msg: any) => {
          if (msg.type === 'GET_STATUS') {
            return { success: true, data: { vacanciesCount: 5 } };
          }
          return { success: false, error: 'Unknown' };
        }
      }
    };

    const res = await sendRpc<{ vacanciesCount: number }>('GET_STATUS');
    expect(res.vacanciesCount).toBe(5);
  });

  it('throws error when response success is false', async () => {
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: async () => ({ success: false, error: 'Ошибка сервера' })
      }
    };

    await expect(sendRpc('FAIL_COMMAND')).rejects.toThrow('Ошибка сервера');
  });
});
