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
  subTopic?: string | null;
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
  requestedSubTopic?: string | null;
  actualSubTopic?: string | null;
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

const normalizeText = (value: unknown) => String(value ?? '').trim();
const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase();

const isMathSubject = (subject?: string | null) => normalizeKey(subject) === 'math';

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
  subTopic,
  batchSize = 120
}: {
  grade: string;
  subject?: string | null;
  topicId?: string | null;
  subTopic?: string | null;
  batchSize?: number;
}) => {
  const conditions = [where('grade', '==', grade)];
  if (subject) conditions.push(where('subject', '==', subject));
  if (topicId) conditions.push(where('topic_id', '==', topicId));
  if (subTopic) conditions.push(where('subTopic', '==', subTopic));

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

const hasPoolAvailability = async ({
  grade,
  subject,
  topicId,
  subTopic,
  poolTypes
}: {
  grade: string;
  subject?: string | null;
  topicId?: string | null;
  subTopic: string;
  poolTypes: PoolType[];
}) => {
  const candidates = await fetchPoolQuestions({
    grade,
    subject,
    topicId,
    subTopic,
    batchSize: 8
  });
  const published = candidates
    .map(withDefaultStatus)
    .filter((q) => q.status === 'PUBLISHED');
  const typed = filterByPoolTypes(published, poolTypes);
  return typed.length > 0;
};

const hasSeedAvailability = async ({
  grade,
  subject,
  topicId,
  topicName,
  subTopic
}: {
  grade: string;
  subject?: string | null;
  topicId?: string | null;
  topicName?: string | null;
  subTopic: string;
}) => {
  const conditions: any[] = [where('grade', '==', grade), where('status', '==', 'PUBLISHED')];
  if (subject) conditions.push(where('subject', '==', subject));
  conditions.push(where('subTopic', '==', subTopic));

  const snap = await getDocs(
    query(
      collection(db, 'artifacts', APP_ID, 'public', 'data', 'seed_questions'),
      ...conditions,
      limit(8)
    )
  );
  if (snap.empty) return false;

  const topicIdKey = normalizeKey(topicId);
  const topicNameKey = normalizeKey(topicName);
  return snap.docs.some((docSnap) => {
    const data = docSnap.data() || {};
    const matchesTopic =
      (topicIdKey && normalizeKey(data.topic_id || data.topicId) === topicIdKey) ||
      (topicNameKey && normalizeKey(data.topic) === topicNameKey);
    return matchesTopic && normalizeText(data.question).length > 0;
  });
};

const resolveAvailableSubTopics = async ({
  grade,
  subject,
  topicId,
  mode,
  poolTypes,
  topicsList
}: {
  grade: string;
  subject?: string | null;
  topicId: string;
  mode: DispatchMode;
  poolTypes: PoolType[];
  topicsList: Array<Record<string, any>>;
}) => {
  const topic = topicsList.find((t) => t.id === topicId);
  const topicName = topic?.name || null;
  const subTopics = Array.isArray(topic?.subTopics) ? topic.subTopics.filter(Boolean) : [];
  if (subTopics.length === 0) return [];

  const checks = await Promise.all(
    subTopics.map(async (st) => {
      const poolAvailable = await hasPoolAvailability({
        grade,
        subject,
        topicId,
        subTopic: st,
        poolTypes
      });

      if (mode === 'IMAGE') return poolAvailable ? st : null;

      const seedAvailable = await hasSeedAvailability({
        grade,
        subject,
        topicId,
        topicName,
        subTopic: st
      });
      return poolAvailable || seedAvailable ? st : null;
    })
  );

  return checks.filter(Boolean) as string[];
};

const filterByPoolTypes = (questions: Record<string, any>[], poolTypes: PoolType[]) => {
  const targetSet = new Set(poolTypes);
  return questions.filter((q) => targetSet.has(inferPoolType(q)));
};

export const dispatchQuestion = async (request: DispatchRequest): Promise<DispatchResult> => {
  const { userId, grade, subject = null, topicId = null, subTopic = null, mode, poolTypes, topics, userContext } = request;
  const usedIds = await fetchUserUsedQuestionIds(userId);

  const desiredPoolTypes: PoolType[] =
    poolTypes && poolTypes.length > 0
      ? poolTypes
      : mode === 'TEXT'
        ? ['TEXT']
        : ['IMAGE_STATIC', 'IMAGE_CANVAS'];

  const topicsList = topics && topics.length > 0 ? topics : await DB_SERVICE.fetchTopics();
  const topicRecord = topicId ? topicsList.find((t) => t.id === topicId) : null;
  const resolvedSubject = subject || topicRecord?.subject || null;
  let resolvedSubTopic = subTopic;
  if (!resolvedSubTopic && topicId && topicsList.length > 0) {
    const availableSubTopics = await resolveAvailableSubTopics({
      grade,
      subject: resolvedSubject,
      topicId,
      mode,
      poolTypes: desiredPoolTypes,
      topicsList
    });
    resolvedSubTopic = pickRandom(availableSubTopics);
  }

  const hasSubTopics = Array.isArray(topicRecord?.subTopics) && topicRecord.subTopics.filter(Boolean).length > 0;
  if (topicId && hasSubTopics && !resolvedSubTopic) {
    return {
      question: null,
      dispatchPath: 'POOL_EMPTY',
      isRecycle: false,
      requestedSubTopic: null,
      actualSubTopic: null
    };
  }

  const poolCandidates = await fetchPoolQuestions({ grade, subject: resolvedSubject, topicId, subTopic: resolvedSubTopic });
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
      isRecycle: false,
      requestedSubTopic: resolvedSubTopic || null,
      actualSubTopic: picked?.subTopic || resolvedSubTopic || null
    };
  }

  if (mode === 'TEXT') {
    const subTopicFocus = resolvedSubTopic && topicId ? { [topicId]: [resolvedSubTopic] } : {};
    const generated = await AI_SERVICE.generateQuestionDirect(
      grade,
      'normal',
      topicId ? [topicId] : [],
      topicsList,
      resolvedSubject,
      userContext || null,
      null,
      subTopicFocus,
      {
        strictMathSeedLock: isMathSubject(resolvedSubject),
        requestedSubTopic: resolvedSubTopic || null
      }
    );

    return {
      question: generated,
      dispatchPath: generated ? 'GENERATED' : 'POOL_EMPTY',
      poolType: generated ? 'TEXT' : undefined,
      isRecycle: false,
      requestedSubTopic: resolvedSubTopic || null,
      actualSubTopic: generated?.subTopic || resolvedSubTopic || null
    };
  }

  if (publishedCandidates.length === 0) {
    const broaderCandidates = await fetchPoolQuestions({ grade, subject: resolvedSubject, topicId: null, batchSize: 200 });
    const broaderTyped = filterByPoolTypes(broaderCandidates.map(withDefaultStatus), desiredPoolTypes);
    const broaderPublished = broaderTyped.filter((q) => q.status === 'PUBLISHED');
    const recycled = pickRandom(broaderPublished);
    return {
      question: recycled,
      dispatchPath: recycled ? 'RECYCLED' : 'POOL_EMPTY',
      poolType: recycled ? inferPoolType(recycled) : undefined,
      isRecycle: Boolean(recycled),
      requestedSubTopic: resolvedSubTopic || null,
      actualSubTopic: recycled?.subTopic || null
    };
  }

  const recycled = pickRandom(publishedCandidates);
  return {
    question: recycled,
    dispatchPath: recycled ? 'RECYCLED' : 'POOL_EMPTY',
    poolType: recycled ? inferPoolType(recycled) : undefined,
    isRecycle: Boolean(recycled),
    requestedSubTopic: resolvedSubTopic || null,
    actualSubTopic: recycled?.subTopic || null
  };
};
