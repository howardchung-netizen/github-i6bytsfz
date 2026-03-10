import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebase-admin';
import { APP_ID } from '../../../lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionId, updates, collection } = body || {};

    if (!questionId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Missing questionId or updates' }, { status: 400 });
    }

    const collectionName = collection === 'seed_questions' ? 'seed_questions' : 'past_papers';
    const adminDb = getAdminDb();
    const ref = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection(collectionName)
      .doc(questionId);

    await ref.update({
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Factory Update Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
