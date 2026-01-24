import { QuestionUsage } from '../app/lib/types/usage';
import { REPORT_MODEL_NAME } from '../app/lib/constants';
import { REPORT_GENERATION_RULES, TEACHER_PRACTICE_PLAN_RULES } from '../app/lib/logic-rules';

export type ReportMode = 'EDUCATOR' | 'OBSERVER';

export interface AnalysisData {
  usages: QuestionUsage[];
}

export interface ReportContent {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextPhasePlan: string;
  medicalRecord?: string;
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

const fillTemplate = (template: string, data: Record<string, string | number>) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
};

const buildEducatorPrompt = (data: ReturnType<typeof computeStats>) => {
  const template = REPORT_GENERATION_RULES?.educator?.promptTemplate;
  const fallback = `
You are an experienced primary school teacher. This report is for a normal student (no learning difficulties). Evaluate the last 14 days of performance and create a concrete 2-week curriculum plan.
Use warm, supportive Cantonese-style Traditional Chinese. Avoid technical jargon.

Return JSON ONLY in Traditional Chinese with this structure:
{
  "summary": "string",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string", "string"],
  "nextPhasePlan": "string (2-week curriculum plan)"
}

Data Summary:
- Average Time per Question: {{avgTimeSec}}s
- Hint Usage Rate: {{hintRate}}%
- Retry Rate: {{retryRate}}%
- Strong Topics: {{strongTopics}}
- Weak Topics: {{weakTopics}}
- Error Pattern: {{errorPattern}}
`.trim();
  return fillTemplate(template || fallback, data as Record<string, string | number>);
};

const buildObserverPrompt = (data: ReturnType<typeof computeStats>) => {
  const template = REPORT_GENERATION_RULES?.observer?.promptTemplate;
  const fallback = `
You are an educational clinician. Assume the student may have learning difficulties or attention deficits. Provide a formal learning record for a real doctor to reference. Be precise, concise, and clinical.

Return JSON ONLY in Traditional Chinese with this structure:
{
  "summary": "string",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string", "string"],
  "medicalRecord": "string (formal learning record)",
  "nextPhasePlan": "string (follow-up plan or referral suggestion)"
}

Data Summary:
- Average Time: {{avgTimeSec}}s
- Hint Usage Rate: {{hintRate}}%
- Retry Rate: {{retryRate}}%
- Weak Topics: {{weakTopics}}
- Error Pattern: {{errorPattern}}
- Consistency (Time Variance): {{timeVariance}}
`.trim();
  return fillTemplate(template || fallback, data as Record<string, string | number>);
};

export const buildPracticePlanPrompt = (data: ReturnType<typeof computeStats>) => {
  const template = TEACHER_PRACTICE_PLAN_RULES?.promptTemplate;
  if (!template) return '';
  return fillTemplate(template, data as Record<string, string | number>);
};

const normalizeList = (value: unknown, fallback: string[]) => {
  if (Array.isArray(value)) {
    const cleaned = value.map(v => String(v || '').trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : fallback;
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return fallback;
};

const parseReportJson = (text: string): ReportContent | null => {
  try {
    const trimmed = String(text || '').trim();
    if (!trimmed) return null;
    let cleanText = trimmed.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }
    const parsed = JSON.parse(cleanText);
    return {
      summary: String(parsed?.summary || '').trim() || '（無摘要）',
      strengths: normalizeList(parsed?.strengths, ['（未提供）']),
      weaknesses: normalizeList(parsed?.weaknesses, ['（未提供）']),
      recommendations: normalizeList(parsed?.recommendations, ['（未提供）']),
      nextPhasePlan: String(parsed?.nextPhasePlan || '').trim() || '（未提供）',
      medicalRecord: String(parsed?.medicalRecord || '').trim() || ''
    };
  } catch (error) {
    console.error('Report JSON parse failed:', error);
    return null;
  }
};

export const generateReport = async (userId: string, mode: ReportMode, data: AnalysisData): Promise<ReportContent> => {
  const stats = computeStats(data.usages || []);
  const prompt = mode === 'OBSERVER'
    ? buildObserverPrompt(stats)
    : buildEducatorPrompt(stats);

  const modelConfig = {
    model: REPORT_MODEL_NAME,
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
        maxOutputTokens: modelConfig.maxOutputTokens,
        responseMimeType: "application/json"
      }
    })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Report generation failed');
  }
  const rawText = String(result?.response || '').trim();
  const parsed = parseReportJson(rawText);
  if (parsed) return parsed;

  return {
    summary: rawText || '（無摘要）',
    strengths: ['（未提供）'],
    weaknesses: ['（未提供）'],
    recommendations: ['（未提供）'],
    nextPhasePlan: '（未提供）'
  };
};
