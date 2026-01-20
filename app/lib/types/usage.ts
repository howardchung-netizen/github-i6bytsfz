export interface QuestionUsage {
  questionId: string;
  questionRef?: string;
  usedAt?: string;
  createdAt?: string;
  isCorrect: boolean;
  timeSpentMs: number;
  time_spent_ms?: number;
  hintUsedCount: number;
  hint_used_count?: number;
  retryCount: number;
  attemptIndex?: number;
}
