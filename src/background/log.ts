export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  ts: string;
  meta?: any;
}

export interface LlmLogEntry {
  timestamp: number;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  response: string;
  durationMs: number;
  status: 'success' | 'error';
}

const MAX_LOGS = 500;
const logBuffer: LogEntry[] = [];
let lastLlmEntry: LlmLogEntry | null = null;
const panelPorts = new Set<chrome.runtime.Port>();

export function pushLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any) {
  const ts = new Date().toLocaleTimeString();
  const entry: LogEntry = { level, message, ts, meta };

  if (logBuffer.length >= MAX_LOGS) {
    logBuffer.shift();
  }
  logBuffer.push(entry);

  // Structured console output in DevTools
  const prefix = `[HireSeeker:${level.toUpperCase()}] ${ts} -`;
  if (level === 'error') {
    if (meta) console.error(prefix, message, meta);
    else console.error(prefix, message);
  } else if (level === 'warn') {
    if (meta) console.warn(prefix, message, meta);
    else console.warn(prefix, message);
  } else if (level === 'debug') {
    if (meta) console.debug(prefix, message, meta);
    else console.debug(prefix, message);
  } else {
    if (meta) console.info(prefix, message, meta);
    else console.info(prefix, message);
  }

  broadcastToPanels({
    type: 'log',
    level,
    message,
    ts,
    meta
  });
}

export function setLlmLog(entry: LlmLogEntry) {
  lastLlmEntry = entry;
  broadcastToPanels({
    type: 'llm-updated',
    entry
  });
}

export function getLlmLog(): LlmLogEntry | null {
  return lastLlmEntry;
}

export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

export function clearLogs() {
  logBuffer.length = 0;
  broadcastToPanels({ type: 'logs-cleared' });
}

export function registerPanelPort(port: chrome.runtime.Port) {
  panelPorts.add(port);
  pushLog('debug', 'Панель подключена');
  port.onDisconnect.addListener(() => {
    pushLog('debug', 'Панель отключена');
  });
}
export function broadcastToPanels(message: any) {
  for (const port of panelPorts) {
    try {
      port.postMessage(message);
    } catch {
      panelPorts.delete(port);
    }
  }
}
