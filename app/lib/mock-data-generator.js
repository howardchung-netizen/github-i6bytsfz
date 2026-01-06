/**
 * 模擬數據生成器
 * 用於測試家長和教師功能
 */

import { db } from './firebase';
import { collection, doc, setDoc, addDoc, writeBatch } from 'firebase/firestore';
import { APP_ID } from './constants';

// 生成隨機中文名字
const generateChineseName = () => {
  const surnames = ['陳', '李', '張', '王', '黃', '林', '劉', '吳', '何', '鄭'];
  const givenNames = ['小明', '小華', '小美', '小強', '小文', '小玲', '小偉', '小芳', '小傑', '小婷', '小宇', '小欣', '小豪', '小雅', '小峰', '小慧', '小龍', '小琳', '小軍', '小雯'];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return surname + givenName;
};

// 生成隨機電郵
const generateEmail = (name, index) => {
  const cleanName = name.replace(/[^\w]/g, '').toLowerCase();
  return `student${index}_${cleanName}@test.com`;
};

// 生成隨機年級
const generateGrade = () => {
  const grades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
  return grades[Math.floor(Math.random() * grades.length)];
};

// 生成學習日誌數據（優化版：使用批量寫入，減少數據量）
const generateLearningLogs = async (studentUid, days = 14) => {
  const logs = [];
  const subjects = ['math', 'chi', 'eng'];
  
  // 減少數據量：只生成最近14天，每天3-8題
  for (let day = 0; day < days; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60), 0, 0);
    
    const questionsPerDay = Math.floor(Math.random() * 6) + 3; // 每天 3-8 題（減少數據量）
    
    for (let q = 0; q < questionsPerDay; q++) {
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const timestamp = new Date(date);
      timestamp.setMinutes(timestamp.getMinutes() + q * 5);
      
      // 生成題目
      logs.push({
        action: 'generate_question',
        subject: subject,
        timestamp: timestamp.toISOString(),
        topicIds: [],
        autoDetect: true,
        createdAt: timestamp.toISOString()
      });
      
      // 答題結果（70% 正確率）
      const isCorrect = Math.random() > 0.3;
      logs.push({
        action: isCorrect ? 'answer_correct' : 'answer_wrong',
        subject: subject,
        timestamp: new Date(timestamp.getTime() + 5000).toISOString(),
        questionId: `q_${Date.now()}_${day}_${q}`,
        topic: subject,
        timeSpent: Math.floor(Math.random() * 30000) + 10000,
        createdAt: new Date(timestamp.getTime() + 5000).toISOString(),
        ...(isCorrect ? {} : {
          userAnswer: Math.floor(Math.random() * 100).toString(),
          correctAnswer: Math.floor(Math.random() * 100).toString()
        })
      });
    }
  }
  
  // 使用批量寫入（每批500條，Firestore限制）
  const batchSize = 500;
  const logsRef = collection(db, "artifacts", APP_ID, "users", studentUid, "logs");
  
  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchLogs = logs.slice(i, i + batchSize);
    
    batchLogs.forEach(log => {
      const logRef = doc(logsRef);
      batch.set(logRef, log);
    });
    
    await batch.commit();
  }
  
  return logs.length;
};

// 生成錯題數據（優化版：使用批量寫入）
const generateMistakes = async (studentUid, count = 10) => {
  const subjects = ['math', 'chi', 'eng'];
  const categories = {
    math: ['除法', '周界', '應用題'],
    chi: ['閱讀理解', '成語', '文法'],
    eng: ['Grammar', 'Vocabulary', 'Reading']
  };
  
  const mistakes = [];
  const mistakesRef = collection(db, "artifacts", APP_ID, "users", studentUid, "mistakes");
  
  for (let i = 0; i < count; i++) {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const categoryList = categories[subject];
    const category = categoryList[Math.floor(Math.random() * categoryList.length)];
    
    const questions = {
      math: [
        '有 45 粒糖果，平均分給 7 位小朋友，每人可得幾粒？還剩下幾粒？',
        '一個長方形的長是 12 厘米，寬是 8 厘米，它的周界是多少厘米？',
        '小明買了 3 支筆，每支 15 元，他付了 50 元，找回多少元？'
      ],
      chi: [
        '「春風得意馬蹄疾」這句詩運用了什麼修辭手法？',
        '「一鳴驚人」這個成語的意思是什麼？',
        '請選擇正確的標點符號：今天天氣真好（ ）'
      ],
      eng: [
        'Choose the correct form: I _____ to school every day.',
        'What is the meaning of "delicious"?',
        'Complete the sentence: She _____ a book yesterday.'
      ]
    };
    
    const answers = {
      math: ['6...3', '40', '5'],
      chi: ['比喻', '第一次表現就讓人驚嘆', '。'],
      eng: ['go', '美味的', 'read']
    };
    
    const questionIndex = Math.floor(Math.random() * questions[subject].length);
    
    mistakes.push({
      questionId: `mistake_${Date.now()}_${i}`,
      question: questions[subject][questionIndex],
      answer: answers[subject][questionIndex],
      userWrongAnswer: Math.floor(Math.random() * 100).toString(),
      category: category,
      hint: '請仔細閱讀題目',
      explanation: '這是正確答案的解釋',
      createdAt: new Date().toISOString()
    });
  }
  
  // 批量寫入錯題
  const batch = writeBatch(db);
  mistakes.forEach(mistake => {
    const mistakeRef = doc(mistakesRef);
    batch.set(mistakeRef, mistake);
  });
  await batch.commit();
  
  return mistakes.length;
};

// 創建模擬學生（優化版：只保存在 admin 帳號下）
export const createMockStudent = async (parentUid, index = 0, onProgress = null) => {
  const name = generateChineseName();
  const email = generateEmail(name, index);
  const grade = 'P4'; // 固定為 P4 以便測試
  
  // 創建學生用戶資料
  const mockUid = `admin_mock_student_${Date.now()}_${index}`;
  const studentData = {
    name: name,
    email: email,
    level: grade,
    xp: Math.floor(Math.random() * 5000) + 1000,
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
    role: 'student',
    isPremium: false,
    parentId: parentUid,
    school: '測試小學',
    gender: Math.random() > 0.5 ? 'boy' : 'girl',
    age: 9,
    linkedAt: new Date().toISOString(),
    isMockData: true, // 標記為模擬數據
    createdBy: 'admin' // 標記由 admin 創建
  };
  
  try {
    if (onProgress) onProgress('創建學生資料...');
    
    // 保存學生資料到 Firestore（只保存在 admin 測試環境）
    await setDoc(
      doc(collection(db, "artifacts", APP_ID, "public", "data", "users"), mockUid),
      {
        ...studentData,
        uid: mockUid,
        createdAt: new Date().toISOString()
      }
    );
    
    if (onProgress) onProgress('生成學習日誌...');
    // 生成學習數據（減少天數和題數以加快速度）
    await generateLearningLogs(mockUid, 14); // 只生成14天
    
    if (onProgress) onProgress('生成錯題數據...');
    await generateMistakes(mockUid, 10); // 只生成10道錯題
    
    if (onProgress) onProgress('完成！');
    
    return { ...studentData, id: mockUid, uid: mockUid };
  } catch (error) {
    console.error("Create mock student error:", error);
    throw error;
  }
};

// 為教師創建模擬班級和學生（優化版：批量處理，只保存在 admin 帳號下）
export const createMockClassWithStudents = async (teacherUid, className = '測試班', grade = 'P4', studentCount = 20, onProgress = null) => {
  try {
    if (onProgress) onProgress('創建班級...');
    
    // 創建班級
    const classData = {
      teacherId: teacherUid,
      className: className,
      grade: grade,
      students: [],
      createdAt: new Date().toISOString(),
      isMockData: true, // 標記為模擬數據
      createdBy: 'admin'
    };
    
    const classRef = doc(collection(db, "artifacts", APP_ID, "public", "data", "classes"));
    await setDoc(classRef, classData);
    const classId = classRef.id;
    
    console.log('班級創建成功，classId:', classId, 'teacherId:', teacherUid);
    
    // 批量創建學生資料
    const studentsData = [];
    for (let i = 0; i < studentCount; i++) {
      const name = generateChineseName();
      const email = generateEmail(name, i);
      const mockUid = `admin_mock_student_${Date.now()}_${i}`;
      
      studentsData.push({
        uid: mockUid,
        name: name,
        email: email,
        level: grade,
        xp: Math.floor(Math.random() * 5000) + 1000,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        role: 'student',
        isPremium: false,
        school: '測試小學',
        gender: Math.random() > 0.5 ? 'boy' : 'girl',
        age: 9,
        createdAt: new Date().toISOString(),
        isMockData: true,
        createdBy: 'admin'
      });
      
      classData.students.push({
        email: email,
        uid: mockUid,
        name: name,
        level: grade,
        addedAt: new Date().toISOString()
      });
    }
    
    // 批量保存學生資料
    if (onProgress) onProgress(`保存 ${studentCount} 個學生資料...`);
    const batch = writeBatch(db);
    studentsData.forEach(student => {
      const studentRef = doc(collection(db, "artifacts", APP_ID, "public", "data", "users"), student.uid);
      batch.set(studentRef, student);
    });
    await batch.commit();
    
    // 更新班級學生列表
    await setDoc(classRef, {
      ...classData,
      students: classData.students
    });
    
    // 為每個學生生成學習數據（並行處理，但減少數據量）
    if (onProgress) onProgress('生成學習數據（這可能需要一些時間）...');
    const dataPromises = studentsData.map(async (student, index) => {
      try {
        // 每個學生生成不同天數的數據（5-14天）
        const days = Math.floor(Math.random() * 10) + 5;
        await generateLearningLogs(student.uid, days);
        await generateMistakes(student.uid, Math.floor(Math.random() * 10) + 5);
        if (onProgress && (index + 1) % 5 === 0) {
          onProgress(`已完成 ${index + 1}/${studentCount} 個學生的數據...`);
        }
      } catch (e) {
        console.error(`Error generating data for student ${student.uid}:`, e);
      }
    });
    
    // 並行處理，但限制並發數為5
    const concurrency = 5;
    for (let i = 0; i < dataPromises.length; i += concurrency) {
      await Promise.all(dataPromises.slice(i, i + concurrency));
    }
    
    if (onProgress) onProgress('完成！');
    
    return {
      classId: classId,
      className: className,
      students: studentsData.map(s => ({ ...s, id: s.uid }))
    };
  } catch (error) {
    console.error("Create mock class error:", error);
    throw error;
  }
};
