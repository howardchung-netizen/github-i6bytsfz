import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../lib/firebase-admin';
import { APP_ID } from '../../../lib/constants';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seedId, updates } = body || {};

    if (!seedId) {
      return NextResponse.json({ success: false, error: 'Missing seedId' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const seedRef = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('seed_questions')
      .doc(seedId);
    const seedSnap = await seedRef.get();
    if (!seedSnap.exists) {
      return NextResponse.json({ success: false, error: 'Seed not found' }, { status: 404 });
    }

    const seedData = seedSnap.data() || {};
    const nowIso = new Date().toISOString();
    const merged = {
      ...seedData,
      ...(updates || {})
    };

    const batch = adminDb.batch();
    batch.update(seedRef, {
      ...updates,
      status: 'PUBLISHED',
      updatedAt: nowIso
    });

    const pastRef = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('past_papers')
      .doc();

    batch.set(pastRef, {
      ...merged,
      origin: 'SEED',
      status: 'PUBLISHED',
      createdAt: merged.createdAt || nowIso,
      publishedAt: nowIso,
      updatedAt: nowIso
    });

    await batch.commit();

    const [seedVerify, pastVerify] = await Promise.all([seedRef.get(), pastRef.get()]);
    const seedOk = seedVerify.exists && (seedVerify.data()?.status === 'PUBLISHED');
    const pastOk = pastVerify.exists && (pastVerify.data()?.status === 'PUBLISHED');
    if (!seedOk || !pastOk) {
      return NextResponse.json(
        { success: false, error: 'Publish verify failed', seedOk, pastOk },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pastPaperId: pastRef.id });
  } catch (error: any) {
    console.error('Factory Publish Seed Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
