import { NextResponse } from 'next/server';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';

export const dynamic = 'force-dynamic';

const toIsoDate = (date: Date) => date.toISOString();

export async function GET() {
  try {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 29);
    const startIso = toIsoDate(startDate);

    const visitQuery = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'visit_logs'),
      where('createdAt', '>=', startIso)
    );
    const userQuery = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'users'),
      where('createdAt', '>=', startIso)
    );
    const usageQuery = query(
      collectionGroup(db, 'question_usage'),
      where('createdAt', '>=', startIso)
    );

    const [visitSnap, userSnap, usageSnap] = await Promise.all([
      getDocs(visitQuery),
      getDocs(userQuery),
      getDocs(usageQuery)
    ]);

    let visitCount = 0;
    let webVisitCount = 0;
    let tabletVisitCount = 0;

    visitSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const platform = data.platform || 'web';
      visitCount += 1;
      if (platform === 'tablet') {
        tabletVisitCount += 1;
      } else {
        webVisitCount += 1;
      }
    });

    let webSignupCount = 0;
    let appSignupCount = 0;

    userSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const platform = data.platform || 'web';
      if (platform === 'tablet') {
        appSignupCount += 1;
      } else {
        webSignupCount += 1;
      }
    });

    const dayAgo = new Date();
    dayAgo.setDate(now.getDate() - 1);
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);

    const dailyUsers = new Set<string>();
    const weeklyUsers = new Set<string>();
    const monthlyUsers = new Set<string>();

    usageSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : null;
      const userId = docSnap.ref.parent.parent?.id;
      if (!userId || !createdAt) return;
      monthlyUsers.add(userId);
      if (createdAt >= weekAgo.getTime()) weeklyUsers.add(userId);
      if (createdAt >= dayAgo.getTime()) dailyUsers.add(userId);
    });

    const response = {
      range: {
        start: startIso,
        end: toIsoDate(now)
      },
      visits: {
        total: visitCount,
        web: webVisitCount,
        tablet: tabletVisitCount
      },
      signups: {
        web: webSignupCount,
        app: appSignupCount,
        web_rate: webVisitCount > 0 ? +(webSignupCount / webVisitCount).toFixed(4) : 0,
        app_rate: tabletVisitCount > 0 ? +(appSignupCount / tabletVisitCount).toFixed(4) : 0
      },
      active_users: {
        dau: dailyUsers.size,
        wau: weeklyUsers.size,
        mau: monthlyUsers.size
      },
      generation: {
        gen_count: 0,
        gen_fail_count: 0
      }
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Metrics API Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
