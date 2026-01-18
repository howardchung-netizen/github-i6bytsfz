import { NextResponse } from 'next/server';
import { collection, collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { APP_ID } from '../../lib/constants';

export const dynamic = 'force-dynamic';

const toIsoDate = (date: Date) => date.toISOString();
const getDateKey = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

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
    const userAllQuery = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'users')
    );
    const usageQuery = query(
      collectionGroup(db, 'question_usage'),
      where('createdAt', '>=', startIso)
    );
    const paperQuery = query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'past_papers'),
      where('createdAt', '>=', startIso)
    );

    const [visitSnap, userSnap, userAllSnap, usageSnap, paperSnap] = await Promise.all([
      getDocs(visitQuery),
      getDocs(userQuery),
      getDocs(userAllQuery),
      getDocs(usageQuery),
      getDocs(paperQuery)
    ]);

    let visitCount = 0;
    let webVisitCount = 0;
    let tabletVisitCount = 0;
    const dailyMap: Record<string, any> = {};

    visitSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const platform = data.platform || 'web';
      const dateKey = getDateKey(data.createdAt);
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
      const dateKey = getDateKey(data.createdAt);
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
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : null;
      const userId = docSnap.ref.parent.parent?.id;
      if (!userId || !createdAt) return;
      monthlyUsers.add(userId);
      if (createdAt >= weekAgo.getTime()) weeklyUsers.add(userId);
      if (createdAt >= dayAgo.getTime()) dailyUsers.add(userId);
    });

    let genCount = 0;
    paperSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const dateKey = getDateKey(data.createdAt);
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
