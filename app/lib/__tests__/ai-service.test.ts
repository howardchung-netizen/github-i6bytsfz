import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AI_SERVICE } from '../ai-service';

vi.mock('../db-service', () => ({
  DB_SERVICE: {
    getActiveFeedback: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../rag-service', () => ({
  RAG_SERVICE: {
    fetchSeedQuestion: vi.fn().mockResolvedValue(null),
    saveGeneratedQuestion: vi.fn().mockResolvedValue(true)
  }
}));

const topics = [
  { id: 't1', name: '除法', grade: 'P4', subject: 'math' },
  { id: 't2', name: '周界', grade: 'P4', subject: 'math' },
  { id: 't3', name: '分數', grade: 'P4', subject: 'math' }
];

const buildResponse = (items: unknown[]) => ({
  ok: true,
  json: async () => ({ response: JSON.stringify(items) })
});

beforeEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error - override fetch for tests
  global.fetch = vi.fn();
});

describe('AI_SERVICE.generateQuestion', () => {
  it('標準格式：直接回傳正確題目', async () => {
    const items = [
      { question: 'Q1', answer: 'A', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], type: 'mcq' },
      { question: 'Q2', answer: 'B', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], type: 'mcq' },
      { question: 'Q3', answer: 'C', options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], type: 'mcq' }
    ];
    // @ts-expect-error - mock fetch
    global.fetch.mockResolvedValue(buildResponse(items));

    const q = await AI_SERVICE.generateQuestion('P4', 'normal', ['t1'], topics, 'math', { institutionName: '' });
    expect(q.question).toBe('Q1');
    expect(q.answer).toBe('A');
    expect(q.options?.length).toBe(8);
  });

  it('Alias 格式：choices + stem + answerIndex 會自動轉正並補齊選項', async () => {
    const items = [
      { stem: 'AliasQ1', choices: ['X', 'Y', 'Z'], answerIndex: 1 },
      { stem: 'AliasQ2', choices: ['L', 'M', 'N'], answerIndex: 2 },
      { stem: 'AliasQ3', choices: ['P', 'Q', 'R'], answerIndex: 0 }
    ];
    // @ts-expect-error - mock fetch
    global.fetch.mockResolvedValue(buildResponse(items));

    const q = await AI_SERVICE.generateQuestion('P4', 'normal', ['t2'], topics, 'math', { institutionName: '' });
    expect(q.question).toBe('AliasQ1');
    expect(q.answer).toBe('Y');
    expect(q.options?.length).toBe(8);
  });

  it('容錯格式：選項少於 2 不應拋錯，仍可回傳題目', async () => {
    const items = [
      { question: 'FewOptionsQ1', answer: 'OK', options: ['OK'] },
      { question: 'FewOptionsQ2', answer: 'OK', options: ['OK'] },
      { question: 'FewOptionsQ3', answer: 'OK', options: ['OK'] }
    ];
    // @ts-expect-error - mock fetch
    global.fetch.mockResolvedValue(buildResponse(items));

    const q = await AI_SERVICE.generateQuestion('P4', 'normal', ['t3'], topics, 'math', { institutionName: '' });
    expect(q.question).toBe('FewOptionsQ1');
    expect(q.options?.length).toBe(1);
  });
});
