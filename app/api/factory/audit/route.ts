import { NextResponse } from 'next/server';
import { auditQuestion } from '../../../lib/auditor-service';
import { AUDITOR_MODEL_NAME } from '../../../lib/constants';
import { APP_ID } from '../../../lib/constants';
import { getAdminDb } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const CONCURRENCY = 5;

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeSubject = (value: unknown) => {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return 'math';
  if (raw.startsWith('chi') || raw.includes('chinese')) return 'chi';
  if (raw.startsWith('eng') || raw.includes('english')) return 'eng';
  if (raw.startsWith('math')) return 'math';
  return raw;
};

const createSyllabusBucket = () => ({
  topics: new Set<string>(),
  subTopicsByTopic: new Map<string, Set<string>>(),
  subTopicsAll: new Set<string>()
});

const buildSyllabusIndex = (docs: Array<Record<string, any>>) => {
  const index = new Map<string, ReturnType<typeof createSyllabusBucket>>();
  const addToBucket = (key: string, topicName: string, subTopics: string[]) => {
    if (!topicName) return;
    if (!index.has(key)) index.set(key, createSyllabusBucket());
    const bucket = index.get(key)!;
    bucket.topics.add(topicName);
    if (!bucket.subTopicsByTopic.has(topicName)) {
      bucket.subTopicsByTopic.set(topicName, new Set());
    }
    const subTopicSet = bucket.subTopicsByTopic.get(topicName)!;
    subTopics.forEach((st) => {
      if (!st) return;
      subTopicSet.add(st);
      bucket.subTopicsAll.add(st);
    });
  };

  docs.forEach((doc) => {
    const subject = normalizeSubject(doc.subject);
    const grade = normalizeText(doc.grade || doc.gradeLevel || doc.level);
    const topicName = normalizeText(doc.name || doc.topic || doc.title);
    const subTopics = Array.isArray(doc.subTopics)
      ? doc.subTopics.map((st) => normalizeText(st)).filter(Boolean)
      : [];
    if (!subject || !topicName) return;
    addToBucket(`${subject}::${grade || 'all'}`, topicName, subTopics);
    addToBucket(`${subject}::all`, topicName, subTopics);
  });

  return index;
};

const getSyllabusBucket = (index: Map<string, ReturnType<typeof createSyllabusBucket>>, subject: string, grade?: string) => {
  const gradeKey = normalizeText(grade);
  return index.get(`${subject}::${gradeKey || 'all'}`) || index.get(`${subject}::all`) || null;
};

const validateSuggestedClassification = (bucket: ReturnType<typeof createSyllabusBucket> | null, suggestedTopic: string, suggestedSubTopic: string, fallbackTopic: string) => {
  if (!bucket) {
    return { topic: suggestedTopic, subTopic: suggestedSubTopic, warning: '' };
  }

  const cleanedTopic = normalizeText(suggestedTopic);
  const cleanedSubTopic = normalizeText(suggestedSubTopic);
  let validTopic = cleanedTopic;
  if (cleanedTopic && !bucket.topics.has(cleanedTopic)) {
    validTopic = '';
  }

  const topicForSubTopic = validTopic || normalizeText(fallbackTopic);
  let validSubTopic = cleanedSubTopic;
  if (cleanedSubTopic) {
    const subSet = topicForSubTopic ? bucket.subTopicsByTopic.get(topicForSubTopic) : null;
    const isValid = (subSet && subSet.has(cleanedSubTopic)) || bucket.subTopicsAll.has(cleanedSubTopic);
    if (!isValid) {
      validSubTopic = '';
    }
  }

  let warning = '';
  if (cleanedTopic && !validTopic) warning = `建議單元不存在：${cleanedTopic}`;
  if (cleanedSubTopic && !validSubTopic) {
    warning = warning ? `${warning}；建議子單元不存在：${cleanedSubTopic}` : `建議子單元不存在：${cleanedSubTopic}`;
  }

  return { topic: validTopic, subTopic: validSubTopic, warning };
};

const normalizeAuditResult = (raw: any) => {
  const statusRaw = String(raw?.status || '').trim().toUpperCase();
  const normalizedStatus = statusRaw === 'VERIFIED' ? 'PASS'
    : statusRaw === 'FLAGGED' ? 'FAIL'
      : statusRaw === 'FIXED' ? 'FIXED'
        : statusRaw === 'PASS' ? 'PASS'
          : statusRaw === 'FAIL' ? 'FAIL'
            : 'FAIL';
  return {
    status: normalizedStatus,
    confidence: typeof raw?.confidence === 'number' ? raw.confidence : 0,
    correctedAnswer: raw?.correctedAnswer ?? raw?.ai_answer ?? '',
    suggestedTopic: raw?.suggestedTopic ?? raw?.suggested_topic ?? '',
    suggestedSubTopic: raw?.suggestedSubTopic ?? raw?.suggested_subTopic ?? raw?.suggested_subtopic ?? '',
    reason: raw?.reason ?? raw?.report ?? ''
  };
};

export async function POST(request: Request) {
  const adminDb = getAdminDb();
  try {
    const body = await request.json();
    const { questionIds, collection } = body || {};

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing questionIds' }, { status: 400 });
    }

    const collectionName = collection === 'seed_questions' ? 'seed_questions' : 'past_papers';
    const syllabusSnap = await adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('syllabus')
      .get();
    const syllabusIndex = buildSyllabusIndex(syllabusSnap.docs.map(doc => doc.data() || {}));
    const questionRefs = questionIds.map((qid: string) =>
      adminDb
        .collection('artifacts')
        .doc(APP_ID)
        .collection('public')
        .doc('data')
        .collection(collectionName)
        .doc(qid)
    );
    const questionSnaps = await Promise.all(questionRefs.map(ref => ref.get()));
    const questions = questionSnaps
      .filter(snap => snap.exists)
      .map(snap => ({ id: snap.id, ...(snap.data() || {}) })) as Array<Record<string, any>>;
    const targets = questions.filter(q => ((q as any).status ?? 'DRAFT') === 'DRAFT');

    if (targets.length === 0) {
      return NextResponse.json({ success: false, error: 'No DRAFT questions found' }, { status: 400 });
    }

    const results: Array<any> = [];

    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map(async (question) => {
        const questionId = (question as { id?: string })?.id;
        if (!questionId) {
          console.warn('Factory Audit: missing question id', question);
          return null;
        }
        try {
          const logicSupplement = (question as any)?.logic_supplement || null;
          const origin = (question as any)?.origin;
          const subject = normalizeSubject((question as any)?.subject);
          const grade = normalizeText((question as any)?.grade || (question as any)?.gradeLevel || (question as any)?.level);
          const bucket = getSyllabusBucket(syllabusIndex, subject, grade);
          const allowedTopics = bucket ? Array.from(bucket.topics) : [];
          const allowedSubTopics = bucket
            ? Array.from(bucket.subTopicsByTopic.get(normalizeText((question as any)?.topic)) || bucket.subTopicsAll)
            : [];
          const auditResult = await auditQuestion(question, logicSupplement, { origin, allowedTopics, allowedSubTopics });
          const normalized = normalizeAuditResult(auditResult);
          const isUpload = origin === 'SEED';

          const correctedAnswer = normalized.correctedAnswer;
          const suggestedTopic = normalized.suggestedTopic;
          const suggestedSubTopic = normalized.suggestedSubTopic;
          const validatedSuggestion = validateSuggestedClassification(
            bucket,
            suggestedTopic,
            suggestedSubTopic,
            normalizeText((question as any)?.topic)
          );
          const validSuggestedTopic = validatedSuggestion.topic;
          const validSuggestedSubTopic = validatedSuggestion.subTopic;
          const hasSuggestedClassification = Boolean(validSuggestedTopic || validSuggestedSubTopic);
          const shouldAutoFixAnswer = Boolean(correctedAnswer);
          const autoFixed = Boolean(hasSuggestedClassification || shouldAutoFixAnswer);

          const mappedStatus = autoFixed ? 'FIXED' : normalized.status;
          const confidence = normalized.confidence;

          const auditReport = {
            ...(auditResult || {}),
            report: normalized.reason || '（無內容）'
          };

          const reportRef = await adminDb
            .collection('artifacts')
            .doc(APP_ID)
            .collection('public')
            .doc('data')
            .collection('audit_reports')
            .add({
            questionId,
            auditResult: auditReport,
            model: AUDITOR_MODEL_NAME,
            createdAt: new Date().toISOString()
          })
            .then(ref => ref.id);

          const nextStatus = mappedStatus === 'FAIL' ? 'REJECTED' : 'AUDITED';
          const updatePayload: Record<string, any> = {
            status: nextStatus,
            auditMeta: {
              status: mappedStatus,
              confidence,
              reportRef,
              autoFixed,
            },
            audit_status: auditReport?.status || null,
            audit_report: JSON.stringify(auditReport || {}),
            auditor_model_used: AUDITOR_MODEL_NAME,
            audit_timestamp: new Date().toISOString(),
            audit_issues: auditReport?.issues || [],
            audit_score: null,
            updatedAt: new Date().toISOString()
          };
          if (isUpload && correctedAnswer) {
            updatePayload.auditMeta.answerCheck = {
              provided: (question as any)?.answer ?? '',
              aiAnswer: correctedAnswer,
              mismatch: true
            };
          }

          if (validatedSuggestion.warning) {
            updatePayload.auditMeta.classificationWarning = validatedSuggestion.warning;
          }

          if (hasSuggestedClassification) {
            updatePayload.topic = validSuggestedTopic || (question as any)?.topic || '未分類';
            updatePayload.subTopic = validSuggestedSubTopic || (question as any)?.subTopic || null;
          }
          if (shouldAutoFixAnswer) {
            updatePayload.answer = correctedAnswer;
          }

          await adminDb
            .collection('artifacts')
            .doc(APP_ID)
            .collection('public')
            .doc('data')
            .collection(collectionName)
            .doc(questionId)
            .update(updatePayload);

          return {
            questionId,
            auditStatus: mappedStatus,
            nextStatus,
            reportRef
          };
        } catch (error) {
          console.error('Factory Audit Item Error:', questionId, error);
          return {
            questionId,
            auditStatus: 'FAIL',
            nextStatus: 'REJECTED',
            reportRef: null
          };
        }
      }));
      results.push(...chunkResults.filter(Boolean));
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Factory Audit Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
