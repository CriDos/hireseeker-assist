import { describe, it, expect, beforeEach } from 'vitest';
import {
  pushLog,
  getLogs,
  clearLogs,
  setLlmLog,
  getLlmLog,
  registerPanelPort,
  broadcastToPanels
} from '../../src/background/log';

describe('background/log', () => {
  beforeEach(() => {
    clearLogs();
  });

  it('pushes and retrieves logs', () => {
    pushLog('info', 'Hello info');
    pushLog('warn', 'Warning msg', { detail: 123 });
    pushLog('error', 'Error occurred');

    const logs = getLogs();
    expect(logs.length).toBe(3);
    expect(logs[0].message).toBe('Hello info');
    expect(logs[0].level).toBe('info');
    expect(logs[1].meta).toEqual({ detail: 123 });
  });

  it('clears logs', () => {
    pushLog('info', 'Some log');
    expect(getLogs().length).toBe(1);

    clearLogs();
    expect(getLogs().length).toBe(0);
  });

  it('stores and retrieves LLM log entry', () => {
    const entry = {
      timestamp: Date.now(),
      model: 'gpt-4o',
      systemPrompt: 'System',
      userPrompt: 'User',
      response: 'Response',
      durationMs: 120,
      status: 'success' as const
    };

    setLlmLog(entry);
    expect(getLlmLog()).toEqual(entry);
  });

  it('registers and broadcasts to panel ports', () => {
    const messages: any[] = [];
    let disconnectHandler: any = null;

    const mockPort: any = {
      name: 'hs-panel',
      postMessage: (msg: any) => messages.push(msg),
      onDisconnect: {
        addListener: (fn: any) => {
          disconnectHandler = fn;
        }
      }
    };

    registerPanelPort(mockPort);
    broadcastToPanels({ type: 'custom-event', val: 42 });

    expect(messages.some(m => m.type === 'custom-event' && m.val === 42)).toBe(true);

    if (disconnectHandler) disconnectHandler();
  });
});
