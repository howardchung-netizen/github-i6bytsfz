import { z } from 'zod';
import type { Question } from './types/question';

const OptionSchema = z.union([z.string(), z.number()]);

export const QuestionSchema = z.object({
  question: z.string().min(1),
  answer: z.union([z.string(), z.number()]),
  options: z.array(OptionSchema).min(2).optional(),
  type: z.string().optional(),
  explanation: z.string().optional(),
  hint: z.string().optional(),
  lang: z.string().optional(),
  category: z.string().optional(),
  topic: z.string().optional(),
  subject: z.string().optional(),
  shape: z.string().optional(),
  params: z.record(z.any()).optional(),
  mapData: z.record(z.any()).optional()
}).passthrough();

const toPrimitiveString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const padOptionsToEight = (options: Array<string | number>) => {
  if (!Array.isArray(options)) return options;
  if (options.length >= 8) return options;
  if (options.length < 2) return options;
  const padded = [...options];
  while (padded.length < 8) {
    padded.push('');
  }
  return padded;
};

export const normalizeQuestion = (raw: unknown): Question => {
  const base = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
  const normalized: Partial<Question> & Record<string, unknown> = { ...base };

  if (!normalized.question) {
    normalized.question = normalized.questionText
      ?? normalized.stem
      ?? normalized.prompt
      ?? normalized.q_text
      ?? normalized.text
      ?? '';
  }

  if (!normalized.options) {
    if (Array.isArray(normalized.choices)) {
      normalized.options = normalized.choices;
    } else if (Array.isArray(normalized.alternatives)) {
      normalized.options = normalized.alternatives;
    } else if (Array.isArray(normalized.answers)) {
      normalized.options = normalized.answers;
    }
  }

  if (Array.isArray(normalized.options)) {
    const mappedOptions = normalized.options.map(toPrimitiveString);
    normalized.options = padOptionsToEight(mappedOptions);
  }

  if (normalized.answer === undefined) {
    if (normalized.answerIndex !== undefined && Array.isArray(normalized.options)) {
      const idx = Number(normalized.answerIndex);
      if (!Number.isNaN(idx) && normalized.options[idx] !== undefined) {
        normalized.answer = normalized.options[idx];
      }
    }

    if (normalized.answer === undefined && normalized.correctAnswer !== undefined) {
      normalized.answer = normalized.correctAnswer as unknown;
    }

    if (normalized.answer === undefined && normalized.correctOption !== undefined) {
      normalized.answer = normalized.correctOption as unknown;
    }

    if (normalized.answer === undefined && normalized.correct !== undefined) {
      normalized.answer = normalized.correct as unknown;
    }

    if (normalized.answer === undefined && normalized.solution !== undefined) {
      const solution = normalized.solution as Record<string, unknown> | string | number;
      if (solution && typeof solution === 'object') {
        normalized.answer = solution.answer ?? solution.value ?? solution.result ?? solution.solution ?? solution;
      } else {
        normalized.answer = solution as unknown;
      }
    }
  }

  if (!normalized.type) {
    normalized.type = Array.isArray(normalized.options) ? 'mcq' : 'text';
  }

  if (!normalized.lang && normalized.language) {
    normalized.lang = normalized.language as string;
  }

  if (normalized.answer === undefined) {
    normalized.answer = '';
  }

  normalized.__raw = base;

  return {
    ...normalized,
    question: toPrimitiveString(normalized.question),
    answer: normalized.answer as string | number
  };
};
