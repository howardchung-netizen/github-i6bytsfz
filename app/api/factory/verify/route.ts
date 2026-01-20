import { NextResponse } from 'next/server';
import { AUDITOR_MODEL_NAME } from '../../../lib/constants';
import { DB_SERVICE } from '../../../lib/db-service';

const parseJson = (rawText: string) => {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const target = match ? match[0] : cleaned;
  return JSON.parse(target);
};

const buildPrompt = (question: any) => {
  const options = Array.isArray(question.options) ? question.options : [];
  return `
You are a strict verifier. Solve the question and compare your computed answer with the provided answer.

Question: ${question.question}
Options: ${options.length > 0 ? options.join(' / ') : 'N/A'}
Provided Answer: ${question.answer}

Return JSON only:
{
  "computed_answer": "...",
  "provided_answer": "...",
  "match": true/false,
  "notes": "short explanation"
}
`.trim();
};

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId } = body || {};

    if (!questionId) {
      return NextResponse.json({ success: false, error: 'Missing questionId' }, { status: 400 });
    }

    const question = await DB_SERVICE.fetchQuestionById(questionId);
    if (!question) {
      return NextResponse.json({ success: false, error: 'Question not found' }, { status: 404 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API Key not configured' }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AUDITOR_MODEL_NAME}:generateContent?key=${apiKey}`;
    const prompt = buildPrompt(question);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: AbortSignal.timeout(55000)
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message || 'Verify failed' }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let verdict;
    try {
      verdict = parseJson(text);
    } catch (e) {
      verdict = { match: false, computed_answer: '', provided_answer: question.answer, notes: 'Parse error' };
    }

    const auditMetaStatus = verdict.match ? 'PASS' : 'FAIL';
    const reportRef = await DB_SERVICE.saveAuditReport({
      questionId: question.id,
      auditResult: verdict,
      model: AUDITOR_MODEL_NAME
    });

    await DB_SERVICE.updateQuestionFactoryStatus(question.id, {
      auditMeta: {
        status: auditMetaStatus,
        confidence: verdict.match ? 1 : 0,
        reportRef
      },
      audit_report: JSON.stringify(verdict)
    });

    return NextResponse.json({ success: true, data: { questionId, verdict } });
  } catch (error: any) {
    console.error('Factory Verify Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
