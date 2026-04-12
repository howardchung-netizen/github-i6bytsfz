import { NextResponse } from 'next/server';
import { normalizeQuestion } from '../../../lib/question-schema';
import { getAdminDb } from '../../../lib/firebase-admin';
import { APP_ID } from '../../../lib/constants';

const buildApiUrl = (path: string, requestUrl: string) => new URL(path, requestUrl).toString();
const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeKey = (value: unknown) => normalizeText(value).replace(/\s+/g, ' ').toLowerCase();
const isMathSubject = (subject: string) => normalizeKey(subject) === 'math';

type MathSeedStyle = 'NUMERIC' | 'WORD_PROBLEM';

const detectMathSeedStyle = (seed: string, subTopic: string | null): MathSeedStyle => {
  const text = normalizeText(seed);
  const subTopicKey = normalizeKey(subTopic);
  if (subTopicKey.includes('應用')) return 'WORD_PROBLEM';
  if (/完成算式|計算|求值/.test(text)) return 'NUMERIC';

  const cjkChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const cjkCount = cjkChars.length;
  const hasEquation = /[+\-xX×÷*/=]/.test(text);
  const hasWordProblemHints = /每|共|多少|共有|剩|長|寬|面積|元|公斤|公分|厘米|米|支|本|天|小明|小華|書店|花店|貨倉/.test(text);

  if (hasWordProblemHints || cjkCount >= 8) return 'WORD_PROBLEM';
  if (hasEquation && cjkCount <= 5) return 'NUMERIC';
  return cjkCount > 0 ? 'WORD_PROBLEM' : 'NUMERIC';
};

const parseJsonPayload = (rawText: string) => {
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const target = arrayMatch?.[0] || objectMatch?.[0] || cleaned;
  const parsed = JSON.parse(target);
  return Array.isArray(parsed) ? parsed : [parsed];
};

const buildPrompt = (
  count: number,
  seed: string,
  subject: string,
  subTopic: string | null,
  mathSeedStyle: MathSeedStyle | null
) => {
  const subjectKey = normalizeKey(subject);
  const mathStyleRule = mathSeedStyle === 'NUMERIC'
    ? 'Math style lock: Keep numeric/expression style only. Do NOT convert to word problems. Output arithmetic expressions or equation-style items only.'
    : 'Math style lock: Keep word-problem style only. Do NOT convert to pure expression-only items.';
  const flexibilityRule = subjectKey === 'eng' || subjectKey === 'chi'
    ? 'Language flexibility: You may rewrite context and phrasing to improve variety while preserving difficulty and target skill.'
    : '';

  return `
Role: Professional HK Primary ${subject === 'eng' ? 'English' : subject === 'chi' ? 'Chinese' : 'Math'} Teacher.
Task: Create ${count} NEW questions based on the seed below. Each question must be distinct.
Seed: "${seed}"
${subTopic ? `Sub-topic focus: "${subTopic}"` : ''}
Output: Return a JSON ARRAY only (no markdown). Each object must include "question", "answer". Include "options" if MCQ.
${isMathSubject(subjectKey) && mathSeedStyle ? `Rule: ${mathStyleRule}` : ''}
${flexibilityRule ? `Rule: ${flexibilityRule}` : ''}
Rule: If the question involves measurement units, include unit-based distractors (e.g., mix cm/m/mm or m²/cm²) so only one option is correct after unit conversion.
Language: ${subject === 'eng' ? 'English (US)' : 'Traditional Chinese (HK)'}.
`.trim();
};

const pickRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      seedImage,
      seedImageUrl,
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

    const adminDb = getAdminDb();
    const topicsSnap = await adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('syllabus')
      .get();
    const topics = topicsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() || {}) } as Record<string, any>));
    const matchedTopic = topics.find(t => t.id === topic || t.name === topic);
    const resolvedGrade = matchedTopic?.grade || grade;
    const resolvedSubject = matchedTopic?.subject || subject || 'math';
    const topicId = matchedTopic?.id || null;
    const topicName = matchedTopic?.name || topic || null;

    let seedText = '';
    let seedId: string | null = null;
    let seedSource: string | null = null;
    let seedStyle: MathSeedStyle | null = null;
    if (type === 'TEXT') {
      const seedsRef = adminDb
        .collection('artifacts')
        .doc(APP_ID)
        .collection('public')
        .doc('data')
        .collection('seed_questions');
      const seedSnaps = await seedsRef
        .where('grade', '==', resolvedGrade)
        .where('subject', '==', resolvedSubject)
        .where('status', '==', 'PUBLISHED')
        .get();
      const seedCandidates = seedSnaps.docs.filter((doc) => {
        const data = doc.data() || {};
        if (!normalizeText(data.question)) return false;
        const topicMatch = Boolean(
          normalizeKey(data.topic) === normalizeKey(topicName)
          || normalizeKey(data.topic_id || data.topicId) === normalizeKey(topicId)
        );
        if (!topicMatch) return false;
        if (subTopic) return normalizeKey(data.subTopic) === normalizeKey(subTopic);
        return true;
      });
      if (seedCandidates.length > 0) {
        const picked = pickRandom(seedCandidates);
        const seedData = picked.data() || {};
        seedId = picked.id;
        seedSource = seedData.source || 'seed_questions';
        seedText = String(seedData.question || '');
      }
      if (!seedId || !normalizeText(seedText)) {
        return NextResponse.json(
          { success: false, error: 'No valid PUBLISHED seed found in seed_questions for selected topic/subTopic.' },
          { status: 400 }
        );
      }
      if (isMathSubject(resolvedSubject)) {
        seedStyle = detectMathSeedStyle(seedText, subTopic || null);
      }
    }
    if (seedImage) {
      const visionResponse = await fetch(buildApiUrl('/api/vision', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: seedImage })
      });
      const visionData = await visionResponse.json();
      if (!visionResponse.ok) {
        return NextResponse.json({ success: false, error: visionData?.error || 'Vision API failed' }, { status: 500 });
      }
      const first = Array.isArray(visionData?.result) ? visionData.result[0] : visionData?.result;
      if (first?.question) {
        seedText = first.question;
      }
    }
    if (type !== 'TEXT' && !normalizeText(seedText)) {
      seedText = topicName || '綜合練習';
    }

    const prompt = buildPrompt(count, seedText, resolvedSubject, subTopic || null, seedStyle);
    const chatResponse = await fetch(buildApiUrl('/api/chat', request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
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
      const withImage = seedImageUrl && poolType !== 'TEXT'
        ? { ...base, imageUrl: seedImageUrl }
        : (seedImage && poolType !== 'TEXT' ? { ...base, image: seedImage } : base);
      return {
        ...withImage,
        grade: resolvedGrade,
        subject: resolvedSubject,
        topic_id: topicId || undefined,
        topic: topicName || withImage.topic,
        subTopic: subTopic || withImage.subTopic,
        source: seedId ? `factory_generate_seed:${seedId}` : 'factory_generate',
        seedId: seedId || undefined,
        seedSource: seedSource || undefined,
        seedStyle: seedStyle || undefined,
        origin: 'AI_GEN',
        poolType,
        status: 'DRAFT'
      };
    });

    const duplicateSignatures = new Set<string>();
    const existingSnap = await adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('past_papers')
      .where('grade', '==', resolvedGrade)
      .where('subject', '==', resolvedSubject)
      .where('topic', '==', topicName || '')
      .get();
    existingSnap.docs.forEach((doc) => {
      const data = doc.data() || {};
      if (normalizeText(data.status || 'PUBLISHED') !== 'PUBLISHED') return;
      const key = `${normalizeKey(data.question)}::${normalizeKey(data.answer)}`;
      duplicateSignatures.add(key);
    });

    const localSignatures = new Set<string>();
    const deduped = normalized.filter((item) => {
      const key = `${normalizeKey(item.question)}::${normalizeKey(item.answer)}`;
      if (!normalizeText(item.question) || !normalizeText(item.answer)) return false;
      if (duplicateSignatures.has(key)) return false;
      if (localSignatures.has(key)) return false;
      localSignatures.add(key);
      return true;
    });
    if (deduped.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All generated questions are duplicates of existing past_papers.' },
        { status: 409 }
      );
    }

    const createdIds: string[] = [];
    const batch = adminDb.batch();
    const nowIso = new Date().toISOString();
    deduped.forEach((item) => {
      const docRef = adminDb
        .collection('artifacts')
        .doc(APP_ID)
        .collection('public')
        .doc('data')
        .collection('past_papers')
        .doc();
      batch.set(docRef, {
        ...item,
        createdAt: (item as any).createdAt || nowIso,
        updatedAt: nowIso
      });
      createdIds.push(docRef.id);
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      count: createdIds.length,
      questionIds: createdIds,
      requestedCount: Number(count || 0),
      dedupDropped: Number(count || 0) - createdIds.length
    });
  } catch (error: any) {
    console.error('Factory Generate Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
