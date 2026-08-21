export interface CandidateCriteria {
  id?: string;
  name?: string;
  text: string;
  updatedAt?: number;
}

export interface AiEvaluationItem {
  id: string;
  match: boolean;
  score: number; // 0..100
  reason: string;
}

export interface AiBatchProgress {
  stage: 'idle' | 'start' | 'progress' | 'done' | 'warning' | 'error';
  total: number;
  processed: number;
  matches: number;
  totalBatches?: number;
  currentBatch?: number;
  currentMatched?: any[];
  currentEvaluated?: any[];
  failed?: Array<{ index: number; error: any }>;
  message?: string;
}

export interface AiFilterResult {
  vacancies: any[];
  evaluations: Record<string, AiEvaluationItem>;
  progress: AiBatchProgress;
  totalEvaluated: number;
  matchCount: number;
}
