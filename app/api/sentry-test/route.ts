import { NextResponse } from 'next/server';

export async function GET() {
  try {
    throw new Error('Sentry test error from /api/sentry-test');
  } catch (err) {
    return NextResponse.json({ ok: false, message: (err as Error).message }, { status: 500 });
  }
}
