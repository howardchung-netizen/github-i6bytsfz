import { NextResponse } from 'next/server';
import { DB_SERVICE } from '../../../lib/db-service';
import { normalizeQuestion } from '../../../lib/question-schema';

const resolveApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '';
  if (!envUrl) return '';
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) return envUrl;
  return `https://${envUrl}`;
};

const buildApiUrl = (path: string) => `${resolveApiBaseUrl()}${path}`;

const parseJsonPayload = (rawText: string) => {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const target = arrayMatch?.[0] || objectMatch?.[0] || cleaned;
  const parsed = JSON.parse(target);
  return Array.isArray(parsed) ? parsed : [parsed];
};

const buildPrompt = (count: number, seed: string, subject: string, subTopic: string | null) => {
  return `
Role: Professional HK Primary ${subject === 'eng' ? 'English' : subject === 'chi' ? 'Chinese' : 'Math'} Teacher.
Task: Create ${count} NEW questions based on the seed below. Each question must be distinct.
Seed: "${seed}"
${subTopic ? `Sub-topic focus: "${subTopic}"` : ''}
Output: Return a JSON ARRAY only (no markdown). Each object must include "question", "answer". Include "options" if MCQ.
Language: ${subject === 'eng' ? 'English (US)' : 'Traditional Chinese (HK)'}.
`.trim();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      seedImage,
      topic,
      subTopic,
      count = 3,
      type = 'TEXT',
      grade = 'P4',
      subject = null
    } = body || {};

    if (!topic && !seedImage) {
      return NextResponse.json({ success: false, error: 'Missing topic or seedImage' }, { status: 400 });
    }

    const topics = await DB_SERVICE.fetchTopics();
    const matchedTopic = topics.find(t => t.id === topic || t.name === topic);
    const resolvedGrade = matchedTopic?.grade || grade;
    const resolvedSubject = matchedTopic?.subject || subject || 'math';
    const topicId = matchedTopic?.id || null;
    const topicName = matchedTopic?.name || topic || null;

    let seedText = topicName || '綜合練習';
    if (seedImage) {
      const visionResponse = await fetch(buildApiUrl('/api/vision'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: seedImage })
      });
      const visionData = await visionResponse.json();
      if (!visionResponse.ok) {
        return NextResponse.json({ success: false, error: visionData?.error || 'Vision API failed' }, { status: 500 });
      }
      if (visionData?.result?.question) {
        seedText = visionData.result.question;
      }
    }

    const prompt = buildPrompt(count, seedText, resolvedSubject, subTopic || null);
    const chatResponse = await fetch(buildApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt })
    });
    const chatData = await chatResponse.json();
    if (!chatResponse.ok) {
      return NextResponse.json({ success: false, error: chatData?.error || 'Generator failed' }, { status: 500 });
    }

    const rawText = chatData.response || '';
    const items = parseJsonPayload(String(rawText));
    const poolType = type;

    const normalized = items.map((item) => {
      const base = normalizeQuestion(item);
      const withImage = seedImage && poolType !== 'TEXT' ? { ...base, image: seedImage } : base;
      return {
        ...withImage,
        grade: resolvedGrade,
        subject: resolvedSubject,
        topic_id: topicId || undefined,
        topic: topicName || withImage.topic,
        subTopic: subTopic || withImage.subTopic,
        source: 'factory_generate',
        poolType,
        status: 'DRAFT'
      };
    });

    const createdIds = await DB_SERVICE.createFactoryQuestions(normalized, { status: 'DRAFT', poolType });

    return NextResponse.json({
      success: true,
      count: createdIds.length,
      questionIds: createdIds
    });
  } catch (error: any) {
    console.error('Factory Generate Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
