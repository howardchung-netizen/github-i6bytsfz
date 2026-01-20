import { collectionGroup, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const AnalyticsService = {
  getBehaviorDataCount: async () => {
    try {
      const attemptsQuery = query(
        collectionGroup(db, 'question_attempts'),
        where('timeSpentMs', '>=', 0),
        where('hintUsedCount', '>=', 0)
      );
      const snap = await getCountFromServer(attemptsQuery);
      return snap.data().count || 0;
    } catch (e) {
      console.error('Get Behavior Data Count Error:', e);
      return 0;
    }
  }
};
