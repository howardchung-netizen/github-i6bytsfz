export interface Question {
  id?: string | number;
  question: string;
  answer: string | number;
  options?: Array<string | number>;
  type?: string;
  explanation?: string;
  hint?: string;
  lang?: string;
  category?: string;
  topic?: string;
  subject?: string;
  shape?: string;
  params?: Record<string, unknown> | null;
  mapData?: Record<string, unknown> | null;
  source?: string;
  __raw?: unknown;
}
