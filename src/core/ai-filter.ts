import { LLMConfig } from '../types/settings';
import { VacancyItem } from '../types/vacancy';
import { AiBatchProgress, AiEvaluationItem } from '../types/ai';
import { AI_SYSTEM_PROMPT, AI_FILTER_TOOL_DEF } from './ai-prompts';
import { sendAiStreamingToolCall } from './llm';
import { stripHtml } from './text';
import { sleep } from './timing';

export function formatBatchForAi(batch: VacancyItem[]): string {
  return batch
    .map((v, i) => {
      const id = String(v.id || i + 1);
      const title = (v.title || '').trim();
      const company = (v.company || '').trim();
      const header = company ? `[ID: ${id}] ${title} | ${company}` : `[ID: ${id}] ${title}`;
      const details: string[] = [];
      if (v.schedule) details.push(`Формат: ${v.schedule}`);
      if (v.area) details.push(`Город: ${v.area}`);
      if (v.salary && !/не указана/i.test(v.salary)) details.push(`ЗП: ${v.salary}`);
      if (v.experience) details.push(`Опыт: ${v.experience}`);
      if (v.employment) details.push(`Занятость: ${v.employment}`);

      const lines = [header];
      if (details.length) lines.push(`Условия: ${details.join(' · ')}`);
      const skillsStr = Array.isArray(v.skills) ? v.skills.join(', ') : v.skills || '';
      if (skillsStr && skillsStr.trim()) lines.push(`Стек: ${skillsStr.trim()}`);
      const desc = stripHtml(v.description);
      if (desc) {
        const cleanDesc = desc.length > 700 ? desc.slice(0, 700).trim() + '…' : desc;
        lines.push(`Описание: ${cleanDesc}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');
}

export function validateBatchResults(rawResults: any[], batch: VacancyItem[]): AiEvaluationItem[] {
  if (!Array.isArray(rawResults)) return [];
  const knownIds = new Set(batch.map(b => String(b.id)));
  const valid: AiEvaluationItem[] = [];

  for (const item of rawResults) {
    if (!item || item.id == null) continue;
    const id = String(item.id);
    if (!knownIds.has(id)) continue;

    const match = Boolean(item.match);
    let score = Number(item.score);
    if (isNaN(score)) {
      score = match ? 80 : 20;
    } else {
      score = Math.max(0, Math.min(100, Math.round(score)));
      if (!match && score >= 50) {
        score = 45;
      }
      if (match && score < 50) {
        score = 55;
      }
    }

    const reason = String(
      item.reason || (match ? 'Подходит по стеку и условиям' : 'Не подходит')
    ).trim();
    valid.push({ id, match, score, reason });
  }

  return valid;
}

export async function evaluateBatch(
  criteria: string,
  batch: VacancyItem[],
  config: LLMConfig,
  signal?: AbortSignal
): Promise<AiEvaluationItem[]> {
  const userPrompt = `КРИТЕРИИ ПОЛЬЗОВАТЕЛЯ:\n${criteria}\n\nСПИСОК ВАКАНСИЙ ДЛЯ ОЦЕНКИ (${batch.length} шт.):\n\n${formatBatchForAi(batch)}`;
  const systemPrompt = config.systemPrompt || AI_SYSTEM_PROMPT;

  const payload: any = {
    model: config.model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    tools: [AI_FILTER_TOOL_DEF],
    tool_choice: {
      type: 'function',
      function: { name: 'submit_vacancy_evaluations' }
    }
  };

  if (config.reasoningEffort && config.reasoningEffort !== 'none') {
    payload.reasoning_effort = config.reasoningEffort;
  } else {
    payload.temperature = 0.1;
  }

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  let result: any;
  try {
    result = await sendAiStreamingToolCall(url, payload, config.apiKey, signal);
  } catch (err: any) {
    // If provider rejected tools / reasoning_effort with HTTP 400/422, fallback to direct JSON prompt without tools
    if (/HTTP (400|422)/i.test(err?.message || '')) {
      const fallbackPayload: any = {
        model: config.model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      };
      if (config.reasoningEffort && config.reasoningEffort !== 'none') {
        fallbackPayload.reasoning_effort = config.reasoningEffort;
      } else {
        fallbackPayload.temperature = 0.1;
      }
      result = await sendAiStreamingToolCall(url, fallbackPayload, config.apiKey, signal);
    } else {
      throw err;
    }
  }

  const raw =
    result?.arguments?.results || (Array.isArray(result?.arguments) ? result.arguments : null);
  if (Array.isArray(raw)) {
    return validateBatchResults(raw, batch);
  }

  throw new Error(`Модель «${config.model}» не вернула валидный массив оценок`);
}

export async function filterVacanciesWithAi(
  criteria: string,
  vacancies: VacancyItem[],
  config: LLMConfig,
  onProgress?: (progress: AiBatchProgress) => void,
  signal?: AbortSignal
): Promise<VacancyItem[]> {
  if (
    !config.apiKey &&
    !config.baseUrl.includes('localhost') &&
    !config.baseUrl.includes('127.0.0.1')
  ) {
    throw new Error('API Key не настроен. Откройте Настройки LLM.');
  }

  if (!criteria || !criteria.trim()) {
    throw new Error('Введите критерии или резюме для ИИ-фильтрации.');
  }

  if (!vacancies || !vacancies.length) {
    throw new Error('Нет доступных вакансий для фильтрации.');
  }

  const total = vacancies.length;
  const batchSize = Math.max(5, Math.min(config.batchSize || 25, 50));
  const batches: VacancyItem[][] = [];

  for (let i = 0; i < total; i += batchSize) {
    batches.push(vacancies.slice(i, i + batchSize));
  }

  const resultMap = new Map<string, AiEvaluationItem>();
  const failedBatches: Array<{ index: number; error: any }> = [];
  let processedCount = 0;
  let matchCount = 0;

  if (onProgress) {
    onProgress({
      stage: 'start',
      total,
      processed: 0,
      matches: 0,
      totalBatches: batches.length,
      currentBatch: 0
    });
  }

  const concurrency = Math.max(1, Math.min(config.concurrency || 3, 5));
  let batchIndex = 0;

  const worker = async () => {
    while (batchIndex < batches.length) {
      if (signal?.aborted) throw new Error('Операция отменена пользователем');
      const curIndex = batchIndex++;
      const batch = batches[curIndex];
      let batchMatches: AiEvaluationItem[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: any = null;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          batchMatches = await evaluateBatch(criteria, batch, config, signal);
          break;
        } catch (e: any) {
          lastError = e;
          if (signal?.aborted) throw e;
          const isTerminal = /HTTP (401|403|404)/.test(e?.message || '');
          if (isTerminal) {
            attempts = maxAttempts;
            break;
          }
          if (attempts < maxAttempts) {
            await sleep(1000 * attempts, { signal });
          }
        }
      }

      if (!Array.isArray(batchMatches)) {
        failedBatches.push({ index: curIndex, error: lastError });
      } else {
        batchMatches.forEach(res => {
          if (res && res.id != null) {
            resultMap.set(String(res.id), res);
            if (res.match && res.score >= 50) matchCount++;
          }
        });
      }

      processedCount += batch.length;
      const currentMatched: VacancyItem[] = [];
      const currentEvaluated: VacancyItem[] = [];

      vacancies.forEach(v => {
        const aiRes = resultMap.get(String(v.id));
        if (aiRes) {
          const item: VacancyItem = {
            ...v,
            aiScore: aiRes.score,
            aiMatch: aiRes.match,
            aiReason: aiRes.reason,
            aiEvaluatedAt: Date.now()
          };
          currentEvaluated.push(item);
          if (aiRes.match && aiRes.score >= 50) {
            currentMatched.push(item);
          }
        }
      });

      currentMatched.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

      if (onProgress) {
        onProgress({
          stage: 'progress',
          total,
          processed: Math.min(processedCount, total),
          matches: matchCount,
          totalBatches: batches.length,
          currentBatch: curIndex + 1,
          currentMatched,
          currentEvaluated
        });
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, batches.length) }, () => worker());
  await Promise.all(workers);

  if (failedBatches.length > 0 && failedBatches.length === batches.length) {
    const firstErr = failedBatches[0]?.error;
    throw new Error(
      `Все ${batches.length} пачек завершились с ошибкой: ${firstErr?.message || firstErr}`
    );
  }

  const matchedVacancies: VacancyItem[] = [];
  vacancies.forEach(v => {
    const aiRes = resultMap.get(String(v.id));
    if (aiRes) {
      const itemWithAi: VacancyItem = {
        ...v,
        aiScore: aiRes.score,
        aiMatch: aiRes.match,
        aiReason: aiRes.reason,
        aiEvaluatedAt: Date.now()
      };
      if (aiRes.match && aiRes.score >= 50) {
        matchedVacancies.push(itemWithAi);
      }
    }
  });

  matchedVacancies.sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0));

  if (onProgress) {
    onProgress({
      stage: failedBatches.length ? 'warning' : 'done',
      total,
      processed: total,
      matches: matchedVacancies.length,
      failed: failedBatches,
      message: failedBatches.length
        ? `Пачки №${failedBatches.map(fb => fb.index + 1).join(', ')} не обработаны (${failedBatches.length} из ${batches.length})`
        : undefined
    });
  }

  return matchedVacancies;
}
