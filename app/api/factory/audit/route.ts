import { NextResponse } from 'next/server';
import { auditQuestion } from '../../../lib/auditor-service';
import { AUDITOR_MODEL_NAME } from '../../../lib/constants';
import { APP_ID } from '../../../lib/constants';
import { getAdminDb } from '../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const adminDb = getAdminDb();
  try {
    const body = await request.json();
    const { questionIds, collection } = body || {};

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing questionIds' }, { status: 400 });
    }

    const collectionName = collection === 'seed_questions' ? 'seed_questions' : 'past_papers';
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
      .map(snap => ({ id: snap.id, ...(snap.data() || {}) }));
    const targets = questions.filter(q => (q.status || 'PUBLISHED') === 'DRAFT');

    if (targets.length === 0) {
      return NextResponse.json({ success: false, error: 'No DRAFT questions found' }, { status: 400 });
    }

    const results = [];

    for (const question of targets) {
      const questionId = (question as { id?: string })?.id;
      if (!questionId) {
        console.warn('Factory Audit: missing question id', question);
        continue;
      }
      const logicSupplement = (question as any)?.logic_supplement || null;
      const origin = (question as any)?.origin;
      const auditResult = await auditQuestion(question, logicSupplement, { origin });
      const isUpload = origin === 'SEED';
      const providedAnswer = (question as any)?.answer ?? '';
      const aiAnswer = auditResult?.ai_answer ?? auditResult?.answer ?? '';
      const normalizedProvided = String(providedAnswer ?? '').trim();
      const normalizedAi = String(aiAnswer ?? '').trim();
      const isMismatch = isUpload && normalizedProvided && normalizedAi && normalizedProvided !== normalizedAi;
      const mappedStatus = auditResult?.status === 'verified' && !isMismatch ? 'PASS' : 'FAIL';
      const score = typeof auditResult?.score === 'number' ? auditResult.score : 0;
      const confidence = Math.max(0, Math.min(1, score / 100));

      const baseReport = auditResult?.report || '';
      const mismatchReport = isMismatch
        ? `答案不匹配！OCR 說是 ${normalizedProvided}，但我算出 ${normalizedAi}`
        : '';
      const mergedReport = [baseReport, mismatchReport].filter(Boolean).join('\n');
      const auditReport = {
        ...(auditResult || {}),
        report: mergedReport || auditResult?.report
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
      await adminDb
        .collection('artifacts')
        .doc(APP_ID)
        .collection('public')
        .doc('data')
        .collection(collectionName)
        .doc(questionId)
        .update({
        status: nextStatus,
        auditMeta: {
          status: mappedStatus,
          confidence,
          reportRef,
          answerCheck: isUpload
            ? { provided: normalizedProvided, aiAnswer: normalizedAi, mismatch: isMismatch }
            : undefined
        },
        audit_status: auditReport?.status || null,
        audit_report: JSON.stringify(auditReport || {}),
        auditor_model_used: AUDITOR_MODEL_NAME,
        audit_timestamp: new Date().toISOString(),
        audit_issues: auditReport?.issues || [],
        audit_score: score,
        updatedAt: new Date().toISOString()
      });

      results.push({
        questionId,
        auditStatus: mappedStatus,
        nextStatus,
        reportRef
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Factory Audit Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
