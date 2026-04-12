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
  customCurriculum?: string;
  clinicalAssessment?: string;
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

  const adhdUsages = usages.filter(u => u.adhdMode === true).length;
  const adhdUsageRate = total > 0 ? (adhdUsages / total) * 100 : 0;

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
    timeVariance,
    adhdUsageRate: Math.round(adhdUsageRate)
  };
};

const fillTemplate = (template: string, data: Record<string, string | number>) => {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    return value === undefined || value === null ? '' : String(value);
  });
};

const buildEducatorPrompt = (data: ReturnType<typeof computeStats>) => {
  const template = (REPORT_GENERATION_RULES as any)?.educator?.promptTemplate;
  const fallback = `You are a Professional Educational Consultant. This report is for a parent regarding their child's learning performance. You must provide a professional, in-depth evaluation and concrete, actionable solutions. Do not just state problems; provide precise ways to improve.
Use professional, warm, and supportive Cantonese-style Traditional Chinese. Maintain professional authority.

Your task is to generate a JSON report. Crucially, you MUST design a '7-Day Custom Curriculum' (7天的每日課程) based on the student's weaknesses and strengths. This curriculum should prescribe daily exercises (e.g., 每天X題) mixing subjects as appropriate.

Return JSON ONLY with this structure:
{
  "summary": "string (Professional Consultant overview)",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string (Actionable advice)", "string"],
  "nextPhasePlan": "string (General direction for the next phase)",
  "customCurriculum": "string (Detailed 7-day daily practice curriculum, e.g. Day 1: ... Day 2: ...)"
}

Data Summary:
- Average Time per Question: {{avgTimeSec}}s
- Hint Usage Rate: {{hintRate}}%
- Retry Rate: {{retryRate}}%
- Strong Topics: {{strongTopics}}
- Weak Topics: {{weakTopics}}
- Error Pattern: {{errorPattern}}
- Learning Assist Mode Usage: {{adhdUsageRate}}%
`.trim();

  let finalPrompt = fillTemplate(template || fallback, data as Record<string, string | number>);

  if (typeof data.adhdUsageRate === 'number' && data.adhdUsageRate > 30) {
    const clinicalInstruction = `

[CRITICAL CLINICAL REQUIREMENT]
The student utilized the 'Learning Assist (ADHD) Mode' for ${data.adhdUsageRate}% of the questions. 
You MUST adopt the role of an 'Educational Clinician / AI Doctor' for this specific observation.
Please cross-reference their usage rate with 'Error Pattern' and 'Average Time' to provide a 'clinicalAssessment' (臨床學習觀察). 
Example: "觀察顯示，當開啟學習輔助模式時，孩子的專注時間更為平穩..."

Ensure your JSON response includes the following new field:
"clinicalAssessment": "string (AI Doctor's clinical observation based on Assist Mode usage)"
`;
    finalPrompt += clinicalInstruction;
  }

  return finalPrompt;
};

const buildObserverPrompt = (data: ReturnType<typeof computeStats>) => {
  const template = (REPORT_GENERATION_RULES as any)?.observer?.promptTemplate;
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
  const template = (TEACHER_PRACTICE_PLAN_RULES as any)?.promptTemplate;
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
      customCurriculum: String(parsed?.customCurriculum || '').trim() || '',
      clinicalAssessment: String(parsed?.clinicalAssessment || '').trim() || '',
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
