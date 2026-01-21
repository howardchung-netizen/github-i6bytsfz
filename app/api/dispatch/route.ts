import { NextResponse } from 'next/server';
import { dispatchQuestion } from '../../../services/question-dispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      grade,
      subject = null,
      topicId = null,
      mode = 'TEXT',
      poolTypes,
      topics,
      userContext
    } = body || {};

    if (!userId || !grade) {
      return NextResponse.json({ success: false, error: 'Missing userId or grade' }, { status: 400 });
    }

    if (mode !== 'TEXT' && mode !== 'IMAGE') {
      return NextResponse.json({ success: false, error: 'Invalid mode. Use TEXT or IMAGE.' }, { status: 400 });
    }

    const result = await dispatchQuestion({
      userId,
      grade,
      subject,
      topicId,
      mode,
      poolTypes,
      topics,
      userContext
    });

    if (!result.question) {
      return NextResponse.json({ success: false, error: 'No question available', data: result }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Dispatch API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
