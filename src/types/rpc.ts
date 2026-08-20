import { VacancyItem } from './vacancy';
import { AiBatchProgress } from './ai';

export interface RpcRequest<T = any> {
  type: string;
  data?: T;
  id?: string;
}

export interface RpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type PanelEvent =
  | { type: 'log'; level: string; message: string; ts?: string }
  | { type: 'vacancies-updated'; vacancies: VacancyItem[]; count: number }
  | { type: 'ai-progress'; progress: AiBatchProgress }
  | { type: 'ai-result'; vacancyId: string; evaluation: any }
  | { type: 'ai-done'; total: number; matches: number }
  | { type: 'page-status'; connected: boolean; url?: string; title?: string }
  | { type: 'llm-updated'; entry: any }
  | { type: 'logs-cleared' };
