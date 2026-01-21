import { QuestionUsage } from '../app/lib/types/usage';
import { REPORT_MODEL_NAME } from '../app/lib/constants';

export type ReportMode = 'EDUCATOR' | 'OBSERVER';

export interface AnalysisData {
  usages: QuestionUsage[];
}

const formatPercent = (value: number) => Math.round(value);

const computeStats = (usages: QuestionUsage[]) => {
  const total = usages.length || 0;
  const totalTimeMs = usages.reduce((sum, u) => sum + (u.timeSpentMs || u.time_spent_ms || 0), 0);
  const avgTimeSec = total > 0 ? (totalTimeMs / total) / 1000 : 0;

  const hintUsedQuestions = usages.filter(u => (u.hintUsedCount || u.hint_used_count || 0) > 0).length;
  const retryUsedQuestions = usages.filter(u => (u.retryCount || 0) > 0).length;

  const hintRate = total > 0 ? (hintUsedQuestions / total) * 100 : 0;
  const retryRate = total > 0 ? (retryUsedQuestions / total) * 100 : 0;

  const wrongAttempts = usages.filter(u => !u.isCorrect).length;
  const wrongRate = total > 0 ? (wrongAttempts / total) * 100 : 0;

  const fastWrong = usages.filter(u => !u.isCorrect && (u.timeSpentMs || u.time_spent_ms || 0) < 5000).length;
  const fastWrongRate = total > 0 ? (fastWrong / total) * 100 : 0;

  const times = usages.map(u => (u.timeSpentMs || u.time_spent_ms || 0) / 1000);
  const mean = avgTimeSec;
  const variance = times.length > 0
    ? times.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / times.length
    : 0;
  const timeVariance = Math.round(Math.sqrt(variance) * 10) / 10;

  const topicStats: Record<string, { total: number; correct: number }> = {};
  usages.forEach((u) => {
    const topic = (u as any).topic || (u as any).topicId || (u as any).topic_id || 'unknown';
    if (!topicStats[topic]) {
      topicStats[topic] = { total: 0, correct: 0 };
    }
    topicStats[topic].total += 1;
    if (u.isCorrect) topicStats[topic].correct += 1;
  });

  const topicEntries = Object.entries(topicStats).filter(([k]) => k !== 'unknown');
  const topicAcc = topicEntries.map(([topic, stat]) => ({
    topic,
    accuracy: stat.total > 0 ? stat.correct / stat.total : 0
  }));

  const strongTopics = topicAcc
    .filter(t => t.accuracy >= 0.7)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3)
    .map(t => t.topic);

  const weakTopics = topicAcc
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map(t => t.topic);

  return {
    total,
    avgTimeSec: Math.round(avgTimeSec * 10) / 10,
    hintRate: formatPercent(hintRate),
    retryRate: formatPercent(retryRate),
    strongTopics: strongTopics.length > 0 ? strongTopics.join(', ') : '（資料不足）',
    weakTopics: weakTopics.length > 0 ? weakTopics.join(', ') : '（資料不足）',
    errorPattern: `錯誤率 ${formatPercent(wrongRate)}%，快速錯誤 ${formatPercent(fastWrongRate)}%`,
    timeVariance
  };
};

const buildEducatorPrompt = (data: ReturnType<typeof computeStats>) => `
You are an experienced, empathetic primary school teacher. Your goal is to encourage the student. Focus on their effort and progress. Use warm, supportive language (Cantonese style written Chinese). Avoid technical jargon. Even if the score is low, find a highlight to praise. Structure the feedback as: 1. Encouragement, 2. Key Strength, 3. One gentle suggestion for improvement.

Data Summary:
- Average Time per Question: ${data.avgTimeSec}s
- Hint Usage Rate: ${data.hintRate}%
- Retry Rate: ${data.retryRate}%
- Strong Topics: ${data.strongTopics}
- Weak Topics: ${data.weakTopics}
- Error Pattern: ${data.errorPattern}
`.trim();

const buildObserverPrompt = (data: ReturnType<typeof computeStats>) => `
You are an educational data scientist and auditor. Your goal is to diagnose the student's learning gaps based strictly on the data. Be precise, concise, and clinical. No emotional fluff. Identify: 1. Error Patterns (e.g., 'Careless calculation' vs 'Concept misunderstanding'), 2. Specific weak topics, 3. Recommended intervention. Use professional, analytical language.

Data Summary:
- Average Time: ${data.avgTimeSec}s
- Hint Usage Rate: ${data.hintRate}%
- Retry Rate: ${data.retryRate}%
- Weak Topics: ${data.weakTopics}
- Error Pattern: ${data.errorPattern}
- Consistency (Time Variance): ${data.timeVariance}
`.trim();

export const generateReport = async (userId: string, mode: ReportMode, data: AnalysisData) => {
  const stats = computeStats(data.usages || []);
  const prompt = mode === 'OBSERVER'
    ? buildObserverPrompt(stats)
    : buildEducatorPrompt(stats);

  const modelConfig = {
    model: "gemini-1.5-pro",
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 2048
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: prompt,
      model: modelConfig.model || REPORT_MODEL_NAME,
      generationConfig: {
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
        maxOutputTokens: modelConfig.maxOutputTokens
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Report generation failed');
  }
  return String(result?.response || '').trim();
};
