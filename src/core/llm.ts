import { LLMConfig } from '../types/settings';
import { extractJsonFromText } from './text';

export const MAX_RETRIES = 3;
export const RETRY_BASE_DELAY_MS = 1200;
export const RETRY_MAX_DELAY_MS = 8000;

export function formatHttpError(status: number, rawBody: string, url: string): string {
  let formatted = rawBody || '';
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed.error) {
      const errMsg =
        typeof parsed.error === 'string'
          ? parsed.error
          : parsed.error.message || JSON.stringify(parsed.error, null, 2);
      formatted = `${errMsg}\n\n${JSON.stringify(parsed, null, 2)}`;
    } else {
      formatted = JSON.stringify(parsed, null, 2);
    }
  } catch {}
  if (formatted.includes('<!DOCTYPE') || formatted.includes('<html')) {
    formatted = `Сервер вернул HTML вместо JSON. Проверьте правильность Base URL (сейчас: ${url})`;
  }
  return `HTTP ${status}:\n${formatted}`;
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export function parseSseStream(raw: string): any[] {
  const events: any[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('data:')) {
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') continue;
      try {
        events.push(JSON.parse(dataStr));
      } catch {}
    }
  }
  return events;
}

export interface StreamingToolCallResult {
  functionName: string;
  arguments: any;
  rawArgumentsText: string;
}

/**
 * Pure SSE Streaming tool call executor.
 * Reads the response as a live byte/character stream, accumulates tool call arguments,
 * and parses the structured result.
 */
export async function sendAiStreamingToolCall(
  url: string,
  payload: any,
  apiKey: string,
  signal?: AbortSignal
): Promise<StreamingToolCallResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream, application/json'
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  // Ensure stream mode is active
  payload.stream = true;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(formatHttpError(response.status, errorText, url));
  }

  let fullArguments = '';
  let fullContent = '';
  let functionName = '';

  // Stream reading with ReadableStream
  if (response.body && typeof (response.body as any).getReader === 'function') {
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    let isDone = false;
    try {
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            isDone = true;
            try {
              await reader.cancel();
            } catch {}
            break;
          }

          try {
            const chunk = JSON.parse(data);
            const choice = chunk.choices?.[0];
            const delta = choice?.delta || choice?.message;

            if (delta?.content) {
              fullContent += delta.content;
            }

            if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name && !functionName) {
                  functionName = tc.function.name;
                }
                if (tc.function?.arguments) {
                  fullArguments +=
                    typeof tc.function.arguments === 'string'
                      ? tc.function.arguments
                      : JSON.stringify(tc.function.arguments);
                }
              }
            }
          } catch {}
        }
      }

      if (!isDone && buffer.trim().startsWith('data:')) {
        const data = buffer.trim().slice(5).trim();
        if (data !== '[DONE]') {
          try {
            const chunk = JSON.parse(data);
            const choice = chunk.choices?.[0];
            const delta = choice?.delta || choice?.message;
            if (delta?.content) {
              fullContent += delta.content;
            }
            if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                if (tc.function?.name && !functionName) {
                  functionName = tc.function.name;
                }
                if (tc.function?.arguments) {
                  fullArguments +=
                    typeof tc.function.arguments === 'string'
                      ? tc.function.arguments
                      : JSON.stringify(tc.function.arguments);
                }
              }
            }
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    // Fallback if environment doesn't provide getReader (e.g. mock)
    const rawText = await response.text();
    const events = parseSseStream(rawText);
    for (const ev of events) {
      const choice = ev.choices?.[0];
      const delta = choice?.delta || choice?.message;
      if (delta?.content) {
        fullContent += delta.content;
      }
      if (delta?.tool_calls && Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name && !functionName) {
            functionName = tc.function.name;
          }
          if (tc.function?.arguments) {
            fullArguments += tc.function.arguments;
          }
        }
      }
    }
  }

  let parsed: any = null;

  if (fullArguments) {
    try {
      parsed = JSON.parse(fullArguments);
    } catch {}
  }

  if (!parsed && fullContent) {
    parsed = extractJsonFromText(fullContent);
  }

  if (!parsed) {
    const preview = (fullContent || fullArguments || '').slice(0, 200);
    throw new Error(
      preview
        ? `Модель вернула некорректный ответ: ${preview}`
        : 'Модель не вернула аргументы вызова функции или JSON в ответе'
    );
  }

  return {
    functionName: functionName || 'submit_vacancy_evaluations',
    arguments: parsed,
    rawArgumentsText: fullArguments || fullContent
  };
}

export async function sendAiRequest(
  url: string,
  payload: any,
  apiKey: string,
  signal?: AbortSignal,
  method: string = 'POST'
): Promise<any> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream'
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey.trim()}`;
  }

  if (payload) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
    signal
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(formatHttpError(response.status, responseText, url));
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') || responseText.startsWith('data:')) {
    const events = parseSseStream(responseText);
    let fullContent = '';
    let toolCallArgs = '';
    let toolCallName = '';
    let toolCallId = '';

    for (const ev of events) {
      const delta = ev.choices?.[0]?.delta || ev.choices?.[0]?.message;
      if (delta?.content) {
        fullContent += delta.content;
      }
      if (delta?.tool_calls?.[0]) {
        const tc = delta.tool_calls[0];
        if (tc.id) toolCallId = tc.id;
        if (tc.function?.name) toolCallName = tc.function.name;
        if (tc.function?.arguments) toolCallArgs += tc.function.arguments;
      }
    }

    return {
      choices: [
        {
          message: {
            content: fullContent,
            tool_calls: toolCallName
              ? [
                  {
                    id: toolCallId || 'call_1',
                    type: 'function',
                    function: {
                      name: toolCallName,
                      arguments: toolCallArgs
                    }
                  }
                ]
              : undefined
          }
        }
      ]
    };
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error('API вернуло некорректный JSON');
  }
}

export async function testConnection(config: LLMConfig, signal?: AbortSignal): Promise<boolean> {
  if (
    !config.apiKey &&
    !config.baseUrl.includes('localhost') &&
    !config.baseUrl.includes('127.0.0.1')
  ) {
    throw new Error('Укажите API Key для проверки соединения');
  }
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const payload: any = {
    model: config.model,
    stream: true,
    messages: [{ role: 'user', content: 'Ping' }]
  };
  if (config.reasoningEffort && config.reasoningEffort !== 'none') {
    payload.reasoning_effort = config.reasoningEffort;
  }
  await sendAiRequest(url, payload, config.apiKey, signal);
  return true;
}

export async function fetchModels(config: LLMConfig, signal?: AbortSignal): Promise<string[]> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/models`;
  const json = await sendAiRequest(url, null, config.apiKey, signal, 'GET');
  let modelsList: string[] = [];

  if (json && Array.isArray(json.data)) {
    modelsList = json.data.map((m: any) => m.id || m.name).filter(Boolean);
  } else if (json && Array.isArray(json.models)) {
    modelsList = json.models.map((m: any) => m.name || m.id || m.model).filter(Boolean);
  } else if (Array.isArray(json)) {
    modelsList = json.map((m: any) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
  }

  if (!modelsList.length) {
    throw new Error('Сервер не вернул список моделей');
  }

  return Array.from(new Set(modelsList)).sort((a, b) => a.localeCompare(b));
}
