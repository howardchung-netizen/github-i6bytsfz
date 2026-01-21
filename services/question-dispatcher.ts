import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../app/lib/firebase';
import { APP_ID } from '../app/lib/constants';
import { AI_SERVICE } from '../app/lib/ai-service';
import { DB_SERVICE } from '../app/lib/db-service';

export type PoolType = 'TEXT' | 'IMAGE_STATIC' | 'IMAGE_CANVAS';
export type DispatchMode = 'TEXT' | 'IMAGE';

export interface DispatchRequest {
  userId: string;
  grade: string;
  subject?: string | null;
  topicId?: string | null;
  mode: DispatchMode;
  poolTypes?: PoolType[];
  topics?: Array<Record<string, any>>;
  userContext?: Record<string, any> | null;
}

export interface DispatchResult {
  question: Record<string, any> | null;
  dispatchPath: 'POOL_UNUSED' | 'GENERATED' | 'RECYCLED' | 'POOL_EMPTY';
  poolType?: PoolType;
  isRecycle?: boolean;
}

const normalizePoolType = (value: unknown): PoolType | null => {
  if (value === 'TEXT' || value === 'IMAGE_STATIC' || value === 'IMAGE_CANVAS') return value;
  return null;
};

const withDefaultStatus = (question: Record<string, any>) => ({
  ...question,
  status: question.status || 'PUBLISHED'
});

const inferPoolType = (question: Record<string, any>): PoolType => {
  const explicit = normalizePoolType(question.poolType) || normalizePoolType(question.type);
  if (explicit) return explicit;
  if (question.image) return 'IMAGE_STATIC';
  if (question.shape || question.params || question.mapData || question.type === 'geometry' || question.type === 'map_grid') {
    return 'IMAGE_CANVAS';
  }
  return 'TEXT';
};

const pickRandom = <T>(list: T[]): T | null => {
  if (!list.length) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx];
};

const fetchUserUsedQuestionIds = async (userId: string) => {
  const usedIds = new Set<string>();
  if (!userId) return usedIds;
  const usageSnap = await getDocs(
    collection(db, 'artifacts', APP_ID, 'users', userId, 'question_usage')
  );
  usageSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const questionId = data.questionId || docSnap.id;
    if (questionId) {
      usedIds.add(String(questionId));
    }
  });
  return usedIds;
};

const fetchPoolQuestions = async ({
  grade,
  subject,
  topicId,
  batchSize = 120
}: {
  grade: string;
  subject?: string | null;
  topicId?: string | null;
  batchSize?: number;
}) => {
  const conditions = [where('grade', '==', grade)];
  if (subject) conditions.push(where('subject', '==', subject));
  if (topicId) conditions.push(where('topic_id', '==', topicId));

  const poolQuery = query(
    collection(db, 'artifacts', APP_ID, 'public', 'data', 'past_papers'),
    ...conditions,
    limit(batchSize)
  );
  const snap = await getDocs(poolQuery);
  const items: Record<string, any>[] = [];
  snap.forEach((docSnap) => items.push({ id: docSnap.id, ...docSnap.data() }));
  return items;
};

const filterByPoolTypes = (questions: Record<string, any>[], poolTypes: PoolType[]) => {
  const targetSet = new Set(poolTypes);
  return questions.filter((q) => targetSet.has(inferPoolType(q)));
};

export const dispatchQuestion = async (request: DispatchRequest): Promise<DispatchResult> => {
  const { userId, grade, subject = null, topicId = null, mode, poolTypes, topics, userContext } = request;
  const usedIds = await fetchUserUsedQuestionIds(userId);

  const desiredPoolTypes: PoolType[] =
    poolTypes && poolTypes.length > 0
      ? poolTypes
      : mode === 'TEXT'
        ? ['TEXT']
        : ['IMAGE_STATIC', 'IMAGE_CANVAS'];

  const poolCandidates = await fetchPoolQuestions({ grade, subject, topicId });
  const normalizedCandidates = poolCandidates.map(withDefaultStatus);
  const typedCandidates = filterByPoolTypes(normalizedCandidates, desiredPoolTypes);
  const publishedCandidates = typedCandidates.filter((q) => q.status === 'PUBLISHED');
  const unusedCandidates = publishedCandidates.filter((q) => !usedIds.has(String(q.id)));

  if (unusedCandidates.length > 0) {
    const picked = pickRandom(unusedCandidates);
    return {
      question: picked,
      dispatchPath: 'POOL_UNUSED',
      poolType: picked ? inferPoolType(picked) : undefined,
      isRecycle: false
    };
  }

  if (mode === 'TEXT') {
    const topicsList = topics && topics.length > 0 ? topics : await DB_SERVICE.fetchTopics();
    const generated = await AI_SERVICE.generateQuestionDirect(
      grade,
      'normal',
      topicId ? [topicId] : [],
      topicsList,
      subject || null,
      userContext || null
    );

    return {
      question: generated,
      dispatchPath: generated ? 'GENERATED' : 'POOL_EMPTY',
      poolType: generated ? 'TEXT' : undefined,
      isRecycle: false
    };
  }

  if (publishedCandidates.length === 0) {
    const broaderCandidates = await fetchPoolQuestions({ grade, subject, topicId: null, batchSize: 200 });
    const broaderTyped = filterByPoolTypes(broaderCandidates.map(withDefaultStatus), desiredPoolTypes);
    const broaderPublished = broaderTyped.filter((q) => q.status === 'PUBLISHED');
    const recycled = pickRandom(broaderPublished);
    return {
      question: recycled,
      dispatchPath: recycled ? 'RECYCLED' : 'POOL_EMPTY',
      poolType: recycled ? inferPoolType(recycled) : undefined,
      isRecycle: Boolean(recycled)
    };
  }

  const recycled = pickRandom(publishedCandidates);
  return {
    question: recycled,
    dispatchPath: recycled ? 'RECYCLED' : 'POOL_EMPTY',
    poolType: recycled ? inferPoolType(recycled) : undefined,
    isRecycle: Boolean(recycled)
  };
};
