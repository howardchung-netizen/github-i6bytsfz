export interface Question {
  id?: string | number;
  question: string;
  answer: string | number;
  options?: Array<string | number>;
  status?: 'DRAFT' | 'AUDITED' | 'PUBLISHED' | 'REJECTED';
  poolType?: 'TEXT' | 'IMAGE_STATIC' | 'IMAGE_CANVAS';
  auditMeta?: {
    status?: 'PASS' | 'FIXED' | 'FAIL';
    confidence?: number;
    reportRef?: string;
  };
  type?: string;
  explanation?: string;
  hint?: string;
  lang?: string;
  category?: string;
  topic?: string;
  subTopic?: string;
  subject?: string;
  origin?: string;
  originalImage?: string;
  shape?: string;
  params?: Record<string, unknown> | null;
  mapData?: Record<string, unknown> | null;
  source?: string;
  __raw?: unknown;
}
