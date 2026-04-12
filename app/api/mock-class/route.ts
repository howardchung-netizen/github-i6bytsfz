import { NextResponse } from 'next/server';
import { getAdminDb } from '../../lib/firebase-admin';
import { APP_ID } from '../../lib/constants';

export const dynamic = 'force-dynamic';

// ── helpers ─────────────────────────────────────────────────────────────────

const surnames = ['陳', '李', '張', '王', '黃', '林', '劉', '吳', '何', '鄭'];
const givenNames = ['小明', '小華', '小美', '小強', '小文', '小玲', '小偉', '小芳', '小傑', '小婷', '小宇', '小欣', '小豪', '小雅', '小峰', '小慧', '小龍', '小琳', '小軍', '小雯'];
const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const generateChineseName = () => rand(surnames) + rand(givenNames);
const generateEmail = (name: string, index: number) =>
  `student${index}_${name.replace(/[^\w]/g, '').toLowerCase()}@test.com`;

const mathQuestions = [
  '有 45 粒糖果，平均分給 7 位小朋友，每人可得幾粒？還剩下幾粒？',
  '一個長方形的長是 12 厘米，寬是 8 厘米，它的周界是多少厘米？',
  '小明買了 3 支筆，每支 15 元，他付了 50 元，找回多少元？',
];
const chiQuestions = [
  '「春風得意馬蹄疾」這句詩運用了什麼修辭手法？',
  '「一鳴驚人」這個成語的意思是什麼？',
  '請選擇正確的標點符號：今天天氣真好（ ）',
];
const engQuestions = [
  'Choose the correct form: I _____ to school every day.',
  'What is the meaning of \"delicious\"?',
  'Complete the sentence: She _____ a book yesterday.',
];
const mathAnswers = ['6...3', '40', '5'];
const chiAnswers = ['比喻', '第一次表現就讓人驚嘆', '。'];
const engAnswers = ['go', '美味的', 'read'];

const subjects = ['math', 'chi', 'eng'] as const;

// ── learning log generator ───────────────────────────────────────────────────

function buildLearningLogs(studentUid: string, days: number) {
  const logs: object[] = [];
  for (let day = 0; day < days; day++) {
    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() - day);
    dayDate.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
    const questionsPerDay = Math.floor(Math.random() * 6) + 3;
    for (let q = 0; q < questionsPerDay; q++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const ts = new Date(dayDate);
      ts.setMinutes(ts.getMinutes() + q * 5);
      logs.push({
        action: 'generate_question',
        subject,
        timestamp: ts.toISOString(),
        topicIds: [],
        autoDetect: true,
        createdAt: ts.toISOString(),
      });
      const isCorrect = Math.random() > 0.3;
      const ts2 = new Date(ts.getTime() + 5000);
      logs.push({
        action: isCorrect ? 'answer_correct' : 'answer_wrong',
        subject,
        timestamp: ts2.toISOString(),
        questionId: `q_${Date.now()}_${day}_${q}`,
        topic: subject,
        timeSpent: Math.floor(Math.random() * 30000) + 10000,
        createdAt: ts2.toISOString(),
        ...(isCorrect
          ? {}
          : {
              userAnswer: Math.floor(Math.random() * 100).toString(),
              correctAnswer: Math.floor(Math.random() * 100).toString(),
            }),
      });
    }
  }
  return logs;
}

// ── mistake generator ────────────────────────────────────────────────────────

function buildMistakes(count: number) {
  const categories = {
    math: ['除法', '周界', '應用題'],
    chi: ['閱讀理解', '成語', '文法'],
    eng: ['Grammar', 'Vocabulary', 'Reading'],
  };
  const mistakes: object[] = [];
  for (let i = 0; i < count; i++) {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const catList = categories[subject];
    const category = catList[Math.floor(Math.random() * catList.length)];
    const qMap = { math: mathQuestions, chi: chiQuestions, eng: engQuestions };
    const aMap = { math: mathAnswers, chi: chiAnswers, eng: engAnswers };
    const idx = Math.floor(Math.random() * 3);
    mistakes.push({
      questionId: `mistake_${Date.now()}_${i}`,
      question: qMap[subject][idx],
      answer: aMap[subject][idx],
      userWrongAnswer: Math.floor(Math.random() * 100).toString(),
      category,
      hint: '請仔細閱讀題目',
      explanation: '這是正確答案的解釋',
      createdAt: new Date().toISOString(),
    });
  }
  return mistakes;
}

// ── GET handler (fetch classes for a teacher) ────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherUid = searchParams.get('teacherUid');
    if (!teacherUid) {
      return NextResponse.json({ success: false, error: 'Missing teacherUid' }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('classes')
      .where('teacherId', '==', teacherUid)
      .get();

    const classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, classes });
  } catch (error: any) {
    console.error('Mock class GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      teacherUid,
      className = '測試班級',
      grade = 'P4',
      studentCount = 20,
    } = body || {};

    if (!teacherUid) {
      return NextResponse.json({ success: false, error: 'Missing teacherUid' }, { status: 400 });
    }

    const db = getAdminDb();
    const now = new Date().toISOString();

    // 1. Create class document
    const classRef = db
      .collection('artifacts')
      .doc(APP_ID)
      .collection('public')
      .doc('data')
      .collection('classes')
      .doc();

    const studentsForClass: object[] = [];
    const studentsData: { uid: string; name: string; email: string; level: string; xp: number; avatar: string }[] = [];

    for (let i = 0; i < studentCount; i++) {
      const name = generateChineseName();
      const email = generateEmail(name, i);
      const mockUid = `admin_mock_student_${Date.now()}_${i}`;
      const xp = Math.floor(Math.random() * 5000) + 1000;
      studentsData.push({ uid: mockUid, name, email, level: grade, xp, avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}` });
      studentsForClass.push({ email, uid: mockUid, name, level: grade, addedAt: now });
    }

    const classData = {
      teacherId: teacherUid,
      className,
      grade,
      students: studentsForClass,
      createdAt: now,
      isMockData: true,
      createdBy: 'admin',
    };

    // Use admin batch for reliable writes
    const BATCH_LIMIT = 499;

    // 2. Write class doc + student docs in batches
    let batch = db.batch();
    let opsInBatch = 0;

    batch.set(classRef, classData);
    opsInBatch++;

    for (const student of studentsData) {
      const studentRef = db
        .collection('artifacts')
        .doc(APP_ID)
        .collection('public')
        .doc('data')
        .collection('users')
        .doc(student.uid);

      batch.set(studentRef, {
        ...student,
        role: 'student',
        isPremium: false,
        school: '測試小學',
        gender: Math.random() > 0.5 ? 'boy' : 'girl',
        age: 9,
        createdAt: now,
        isMockData: true,
        createdBy: 'admin',
      });
      opsInBatch++;

      if (opsInBatch >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }

    // 3. Write learning logs + mistakes per student
    for (const student of studentsData) {
      const days = Math.floor(Math.random() * 10) + 5;
      const logs = buildLearningLogs(student.uid, days);
      const logsRef = db
        .collection('artifacts')
        .doc(APP_ID)
        .collection('users')
        .doc(student.uid)
        .collection('logs');

      for (const log of logs) {
        batch.set(logsRef.doc(), log);
        opsInBatch++;
        if (opsInBatch >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      }

      const mistakeCount = Math.floor(Math.random() * 10) + 5;
      const mistakes = buildMistakes(mistakeCount);
      const mistakesRef = db
        .collection('artifacts')
        .doc(APP_ID)
        .collection('users')
        .doc(student.uid)
        .collection('mistakes');

      for (const mistake of mistakes) {
        batch.set(mistakesRef.doc(), mistake);
        opsInBatch++;
        if (opsInBatch >= BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      }
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      classId: classRef.id,
      className,
      students: studentsData.map(s => ({ ...s, id: s.uid })),
    });
  } catch (error: any) {
    console.error('Mock class API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
