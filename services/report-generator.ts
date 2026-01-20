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
You are a Senior Educational Consultant with 20 years of experience. Your goal is to analyze a student's learning data and provide a "Formative Assessment Report" that is encouraging, insightful, and actionable.

**Tone**: Warm, Professional, like a supportive coach. Use the "Sandwich Method" (Praise -> Constructive Feedback -> Action).

**Data Context**:
- Average Time per Question: ${data.avgTimeSec}s (Norm: 10-30s)
- Hint Usage Rate: ${data.hintRate}%
- Retry Resilience: ${data.retryRate}% (How often they retry after failure)
- Strong Topics: ${data.strongTopics}
- Weak Topics: ${data.weakTopics}

**Report Structure (Output in Markdown)**:

## 🌟 雙週學習亮點 (Highlights)
[Identify 1 specific strength. E.g., "I noticed you never give up! Your retry rate is high..."]

## 🔍 深度診斷 (Diagnostic Analysis)
- **知識點 (Knowledge)**: [Analyze strong/weak topics]
- **技巧與習慣 (Skill)**: [Analyze time & hints. E.g., "You answer very quickly (avg ${data.avgTimeSec}s), which sometimes leads to careless mistakes..."]
- **學習態度 (Attitude)**: [Analyze retry behavior]

## 🚀 下一階段處方 (Next Steps)
[Give 2 concrete, actionable pieces of advice. No generic "work hard". Give specific strategy like "Draw a diagram before calculating".]

## 👨‍👩‍👧 給家長的安心小語
[A professional reassurance about the student's learning curve.]
`.trim();

const buildObserverPrompt = (data: ReturnType<typeof computeStats>) => `
You are a Clinical Learning Behavioral Observer. Your task is to generate an objective "Behavioral Observation Log" for a student (possibly with ADHD/ADD) to be reviewed by parents and clinicians. DO NOT diagnose; only observe and report patterns based on data.

**Tone**: Clinical, Objective, Data-driven. Avoid emotional adjectives.

**Data Context**:
- Average Time: ${data.avgTimeSec}s (Evaluate for Impulsivity if < 5s)
- Hint Dependency: ${data.hintRate}% (Evaluate for Working Memory support)
- Error Pattern: ${data.errorPattern}
- Consistency: ${data.timeVariance} (High variance indicates attention fluctuation)

**Report Structure (Output in Markdown)**:

## 📊 執行功能指標 (Executive Function Metrics)

### 1. 衝動控制 (Impulse Control)
- **Observation**: [Analyze if avgTime is too short on wrong answers. E.g., "User averages 3s on incorrect answers, suggesting impulsive responding."]
- **Data Point**: Avg Time: ${data.avgTimeSec}s.

### 2. 持續性注意力 (Sustained Attention)
- **Observation**: [Analyze performance decay over the session. E.g., "Accuracy drops significantly after the 10th question."]

### 3. 認知彈性與依賴度 (Flexibility & Dependency)
- **Hint Usage**: Used hints in ${data.hintRate}% of questions. [Analyze if hints successfully led to correct answers.]

## 📝 臨床/居家觀察建議 (Observations for Review)
[Summarize behavioral patterns that the doctor should pay attention to. E.g., "High frequency of 'rapid guessing' observed in text-heavy questions."]
`.trim();

export const generateReport = async (userId: string, mode: ReportMode, data: AnalysisData) => {
  const stats = computeStats(data.usages || []);
  const prompt = mode === 'OBSERVER'
    ? buildObserverPrompt(stats)
    : buildEducatorPrompt(stats);

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt, model: REPORT_MODEL_NAME })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Report generation failed');
  }
  return String(result?.response || '').trim();
};
