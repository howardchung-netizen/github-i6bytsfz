import { NextResponse } from 'next/server';
import { getAdminDb } from '../../lib/firebase-admin';
import { APP_ID } from '../../lib/constants';

export const dynamic = 'force-dynamic';

const toIsoDate = (date: Date) => date.toISOString();
const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const getDateKey = (value: string | Date | null | undefined) => {
  const date = toDate(value);
  if (!date) return null;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const isFailedPrecondition = (error: any) =>
  error?.code === 9 || error?.code === 'failed-precondition';

const safeQuery = async (
  label: string,
  run: () => Promise<FirebaseFirestore.QuerySnapshot>,
  fallback: () => Promise<FirebaseFirestore.QuerySnapshot>
) => {
  try {
    return { snap: await run(), filtered: true };
  } catch (error: any) {
    if (isFailedPrecondition(error)) {
      console.warn(`Metrics API: fallback to unfiltered query for ${label} due to missing index.`);
      try {
        return { snap: await fallback(), filtered: false };
      } catch (fallbackError: any) {
        console.warn(`Metrics API: fallback failed for ${label}.`, fallbackError);
        const emptySnap = { forEach: () => {} } as unknown as FirebaseFirestore.QuerySnapshot;
        return { snap: emptySnap, filtered: false };
      }
    }
    throw error;
  }
};

export async function GET() {
  try {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - 29);
    const startIso = toIsoDate(startDate);

    const adminDb = getAdminDb();
    const visitQuery = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('visit_logs');
    const userQuery = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('users');
    const usageQuery = adminDb.collectionGroup('question_usage');
    const paperQuery = adminDb
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('past_papers');

    const [visitResult, userResult, userAllSnap, usageResult, paperResult] = await Promise.all([
      safeQuery(
        'visit_logs',
        () => visitQuery.where('createdAt', '>=', startIso).get(),
        () => visitQuery.get()
      ),
      safeQuery(
        'users_recent',
        () => userQuery.where('createdAt', '>=', startIso).get(),
        () => userQuery.get()
      ),
      userQuery.get(),
      safeQuery(
        'question_usage',
        () => usageQuery.where('createdAt', '>=', startIso).get(),
        () => usageQuery.get()
      ),
      safeQuery(
        'past_papers',
        () => paperQuery.where('createdAt', '>=', startIso).get(),
        () => paperQuery.get()
      )
    ]);

    const visitSnap = visitResult.snap;
    const userSnap = userResult.snap;
    const usageSnap = usageResult.snap;
    const paperSnap = paperResult.snap;

    let visitCount = 0;
    let webVisitCount = 0;
    let tabletVisitCount = 0;
    const dailyMap: Record<string, any> = {};

    visitSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const platform = data.platform || 'web';
      const createdAt = toDate(data.createdAt);
      if (!createdAt) return;
      if (!visitResult.filtered && createdAt < startDate) return;
      const dateKey = getDateKey(createdAt);
      visitCount += 1;
      if (platform === 'tablet') {
        tabletVisitCount += 1;
      } else {
        webVisitCount += 1;
      }
      if (dateKey) {
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, visits: 0, web_visits: 0, tablet_visits: 0, web_signups: 0, app_signups: 0, gen_count: 0 };
        }
        dailyMap[dateKey].visits += 1;
        if (platform === 'tablet') {
          dailyMap[dateKey].tablet_visits += 1;
        } else {
          dailyMap[dateKey].web_visits += 1;
        }
      }
    });

    let webSignupCount = 0;
    let appSignupCount = 0;
    let newUserCount = 0;
    let premiumNewCount = 0;
    const roleCounts: Record<string, number> = {};

    userSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const platform = data.platform || 'web';
      const createdAt = toDate(data.createdAt);
      if (!createdAt) return;
      if (!userResult.filtered && createdAt < startDate) return;
      const dateKey = getDateKey(createdAt);
      const role = data.role || 'other';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      newUserCount += 1;
      if (data.isPremium) {
        premiumNewCount += 1;
      }
      if (platform === 'tablet') {
        appSignupCount += 1;
      } else {
        webSignupCount += 1;
      }
      if (dateKey) {
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, visits: 0, web_visits: 0, tablet_visits: 0, web_signups: 0, app_signups: 0, gen_count: 0 };
        }
        if (platform === 'tablet') {
          dailyMap[dateKey].app_signups += 1;
        } else {
          dailyMap[dateKey].web_signups += 1;
        }
      }
    });

    let totalUserCount = 0;
    let premiumTotalCount = 0;
    const roleTotals: Record<string, number> = {};
    userAllSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const role = data.role || 'other';
      totalUserCount += 1;
      roleTotals[role] = (roleTotals[role] || 0) + 1;
      if (data.isPremium) {
        premiumTotalCount += 1;
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
      const createdAtDate = toDate(data.createdAt);
      if (!createdAtDate) return;
      if (!usageResult.filtered && createdAtDate < startDate) return;
      const createdAt = createdAtDate.getTime();
      const userId = docSnap.ref.parent.parent?.id;
      if (!userId || !createdAt) return;
      monthlyUsers.add(userId);
      if (createdAt >= weekAgo.getTime()) weeklyUsers.add(userId);
      if (createdAt >= dayAgo.getTime()) dailyUsers.add(userId);
    });

    let genCount = 0;
    paperSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const createdAt = toDate(data.createdAt);
      if (!createdAt) return;
      if (!paperResult.filtered && createdAt < startDate) return;
      const dateKey = getDateKey(createdAt);
      genCount += 1;
      if (dateKey) {
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, visits: 0, web_visits: 0, tablet_visits: 0, web_signups: 0, app_signups: 0, gen_count: 0 };
        }
        dailyMap[dateKey].gen_count += 1;
      }
    });

    const daily = Object.values(dailyMap).sort((a: any, b: any) => (a.date > b.date ? 1 : -1));

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
        total: webSignupCount + appSignupCount,
        download_rate: visitCount > 0 ? +((webSignupCount + appSignupCount) / visitCount).toFixed(4) : 0,
        web_rate: webVisitCount > 0 ? +(webSignupCount / webVisitCount).toFixed(4) : 0,
        app_rate: tabletVisitCount > 0 ? +(appSignupCount / tabletVisitCount).toFixed(4) : 0
      },
      active_users: {
        dau: dailyUsers.size,
        wau: weeklyUsers.size,
        mau: monthlyUsers.size
      },
      users: {
        total: totalUserCount,
        new_30d: newUserCount,
        premium_total: premiumTotalCount,
        premium_new_30d: premiumNewCount,
        roles_total: roleTotals,
        roles_new_30d: roleCounts
      },
      generation: {
        gen_count: genCount,
        gen_fail_count: 0
      },
      roles: roleCounts,
      daily
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
