import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebase-admin';
import { APP_ID } from '../../../lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionIds } = body || {};

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing questionIds' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const nowIso = new Date().toISOString();
    const refs = questionIds
      .filter(Boolean)
      .map((questionId: string) => ({
        id: questionId,
        ref: adminDb
          .collection('artifacts')
          .doc(APP_ID)
          .collection('public')
          .doc('data')
          .collection('past_papers')
          .doc(questionId)
      }));

    const batch = adminDb.batch();
    refs.forEach(({ ref }) => {
      batch.update(ref, { status: 'PUBLISHED', publishedAt: nowIso, updatedAt: nowIso });
    });
    await batch.commit();

    const verifySnaps = await Promise.all(refs.map(item => item.ref.get()));
    const failedIds = refs
      .filter((item, idx) => {
        const snap = verifySnaps[idx];
        if (!snap.exists) return true;
        const data = snap.data() || {};
        return data.status !== 'PUBLISHED';
      })
      .map(item => item.id);

    if (failedIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `Publish verify failed: ${failedIds.join(', ')}`, failedIds },
        { status: 500 }
      );
    }

    const results = refs.map(({ id }) => ({ questionId: id, success: true }));
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Factory Publish Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
