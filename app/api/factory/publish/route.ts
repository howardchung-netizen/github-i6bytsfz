import { NextResponse } from 'next/server';
import { DB_SERVICE } from '../../../lib/db-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { questionIds } = body || {};

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing questionIds' }, { status: 400 });
    }

    const results = await Promise.all(questionIds.map(async (questionId: string) => {
      const ok = await DB_SERVICE.updateQuestionFactoryStatus(questionId, { status: 'PUBLISHED' });
      return { questionId, success: ok };
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Factory Publish Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
