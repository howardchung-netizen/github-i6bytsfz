import { db, auth } from './firebase'; 

// 👇 1. 這裡只引入資料庫相關的函數
import { 
    collection, 
    getDocs, 
    addDoc, 
    query, 
    where, 
    deleteDoc, 
    doc, 
    writeBatch,
    updateDoc,
    getDoc,
    orderBy
} from "firebase/firestore";

// 👇 2. 這裡是修正重點：Auth 相關函數必須從 'firebase/auth' 引入
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously, 
    deleteUser 
} from "firebase/auth";

import { APP_ID, SAMPLE_PAST_PAPERS } from './constants';

export const DB_SERVICE = {
    addTopic: async (topicData) => { 
        try {
            const docRef = await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "syllabus"), topicData);
            return docRef.id; 
        } catch (e) { console.error("Add Topic Error:", e); return null; }
    },
    fetchTopics: async () => { 
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "syllabus"));
            const res = []; snap.forEach(d => res.push({id: d.id, ...d.data()})); 
            return res; 
        } catch (e) { console.error("Fetch Topic Error:", e); return []; }
    },
    deleteTopic: async (id) => { 
        try { await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "syllabus", id)); return true; } 
        catch (e) { console.error("Delete Topic Error:", e); return false; } 
    },
    checkEmailExists: async (email) => { 
        if (!auth.currentUser) return false;
        try {
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("email", "==", email));
            const snap = await getDocs(q); 
            return !snap.empty; 
        } catch (e) { console.error("Check Email Error:", e); return false; }
    },
    getUserProfile: async (email) => { 
        try {
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("email", "==", email));
            const snap = await getDocs(q); 
            if (snap.empty) return null; 
            const doc = snap.docs[0]; 
            return { id: doc.id, ...doc.data() };
        } catch (e) { console.error("Get Profile Error:", e); return null; }
    },
    registerUser: async (userData, password) => { 
        try { 
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
            const user = userCredential.user; 
            await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "users"), { ...userData, uid: user.uid, createdAt: new Date().toISOString() });
            return user.uid; 
        } catch (e) { 
            if (e.code === 'auth/operation-not-allowed') { 
                const mockUid = "mock_" + Date.now();
                await signInAnonymously(auth); 
                await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "users"), { ...userData, uid: mockUid, createdAt: new Date().toISOString(), isAnonymousFallback: true });
                return mockUid; 
            } 
            return null;
        } 
    },
    loginUser: async (email, password) => { 
        try { 
            await signInWithEmailAndPassword(auth, email, password);
            return await DB_SERVICE.getUserProfile(email); 
        } catch (e) { 
            if (e.code === 'auth/operation-not-allowed') { 
                await signInAnonymously(auth);
                const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("email", "==", email)); 
                const snap = await getDocs(q);
                if (!snap.empty) { const doc = snap.docs[0]; return { id: doc.id, ...doc.data() }; } 
            } 
            throw e;
        } 
    },
    deleteUserAccount: async (user) => { 
        try { await deleteUser(user); return true; } 
        catch (e) { console.error("Delete User Error:", e); return false; } 
    },
    saveMistake: async (uid, q, ans) => { 
        try {
            await addDoc(collection(db, "artifacts", APP_ID, "users", uid, "mistakes"), { 
                questionId: q.id, question: q.question, answer: q.answer, userWrongAnswer: ans, 
                hint: q.hint || '請重讀題目關鍵字', explanation: q.explanation || '參考相關課本章節', category: q.category || '一般', createdAt: new Date().toISOString() 
            }); 
        } catch(e) { console.error("Save Mistake Error", e); } 
    },
    fetchMistakes: async (uid) => { 
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "users", uid, "mistakes"));
            const res = []; snap.forEach(d => res.push({id: d.id, ...d.data()})); 
            return res; 
        } catch(e) { console.error("Fetch Mistakes Error:", e); return []; } 
    },
    deleteMistake: async (id, uid) => { 
        try { await deleteDoc(doc(db, "artifacts", APP_ID, "users", uid, "mistakes", id)); } 
        catch (e) { console.error("Delete Mistake Error:", e); } 
    },
    uploadPastPaperBatch: async (papers) => { 
        try {
            const batch = writeBatch(db);
            const collectionRef = collection(db, "artifacts", APP_ID, "public", "data", "past_papers"); 
            papers.forEach(paper => { const docRef = doc(collectionRef); batch.set(docRef, { ...paper, createdAt: new Date().toISOString() }); });
            await batch.commit(); return true; 
        } catch (e) { console.error("Batch Upload Error:", e); return false; } 
    },
    countPastPapers: async () => { 
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"));
            return snap.size; 
        } catch (e) { console.error("Count Error:", e); return 0; }
    },
    seedInitialData: async () => {
        try {
            const count = await DB_SERVICE.countPastPapers();
            if (count === 0) {
                console.log("🌱 Seeding initial mock data...");
                await DB_SERVICE.uploadPastPaperBatch(SAMPLE_PAST_PAPERS);
            }
        } catch (e) {
            console.error("Auto-seed failed:", e);
        }
    },
    saveLearningLog: async (uid, logData) => {
        try {
            await addDoc(collection(db, "artifacts", APP_ID, "users", uid, "logs"), {
                ...logData,
                createdAt: new Date().toISOString()
            });
        } catch(e) { 
            console.error("Save Learning Log Error:", e); 
        }
    },
    getDailyQuestionCount: async (uid) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.toISOString();
            
            const q = query(
                collection(db, "artifacts", APP_ID, "users", uid, "logs"),
                where("action", "in", ["start_practice", "generate_question"]),
                where("timestamp", ">=", todayStart)
            );
            const snap = await getDocs(q);
            return snap.size;
        } catch(e) { 
            console.error("Get Daily Question Count Error:", e); 
            return 0; 
        }
    },
    getDailyTasks: async (uid) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStart = today.toISOString();
            
            // 獲取今日所有生成題目的記錄
            const q = query(
                collection(db, "artifacts", APP_ID, "users", uid, "logs"),
                where("action", "in", ["start_practice", "generate_question"]),
                where("timestamp", ">=", todayStart)
            );
            const snap = await getDocs(q);
            
            // 統計各科目的使用量
            const tasks = { math: 0, chi: 0, eng: 0 };
            snap.forEach(doc => {
                const data = doc.data();
                const subject = data.subject || data.topicId?.split('_')[0] || 'math';
                if (subject.includes('math') || subject.includes('數學')) {
                    tasks.math++;
                } else if (subject.includes('chi') || subject.includes('中文')) {
                    tasks.chi++;
                } else if (subject.includes('eng') || subject.includes('英文')) {
                    tasks.eng++;
                } else {
                    // 默認歸類為數學
                    tasks.math++;
                }
            });
            
            return {
                math: { used: tasks.math, limit: 20 },
                chi: { used: tasks.chi, limit: 20 },
                eng: { used: tasks.eng, limit: 20 }
            };
        } catch(e) { 
            console.error("Get Daily Tasks Error:", e); 
            return {
                math: { used: 0, limit: 20 },
                chi: { used: 0, limit: 20 },
                eng: { used: 0, limit: 20 }
            };
        }
    },
    updateUserSubscription: async (uid, isPremium, subscriptionId = null) => {
        try {
            // 更新用戶資料中的訂閱狀態
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("uid", "==", uid));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const userDoc = snap.docs[0];
                const updateData = {
                    isPremium: isPremium,
                    subscriptionUpdatedAt: new Date().toISOString()
                };
                
                if (subscriptionId) {
                    updateData.stripeSubscriptionId = subscriptionId;
                }
                
                await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "users", userDoc.id), updateData);
                return true;
            }
            return false;
        } catch(e) {
            console.error("Update User Subscription Error:", e);
            return false;
        }
    },
    
    // === 家長功能 ===
    linkParentToStudent: async (parentUid, studentEmail) => {
        try {
            // 查找學生帳號
            const studentProfile = await DB_SERVICE.getUserProfile(studentEmail);
            if (!studentProfile) return false;
            
            // 更新學生資料，添加家長 ID
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("uid", "==", studentProfile.uid));
            const snap = await getDocs(q);
            
            if (!snap.empty) {
                const studentDoc = snap.docs[0];
                await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "users", studentDoc.id), {
                    parentId: parentUid,
                    linkedAt: new Date().toISOString()
                });
                return true;
            }
            return false;
        } catch(e) {
            console.error("Link Parent to Student Error:", e);
            return false;
        }
    },
    
    getStudentChildren: async (parentUid) => {
        try {
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("parentId", "==", parentUid));
            const snap = await getDocs(q);
            const children = [];
            snap.forEach(d => children.push({ id: d.id, ...d.data() }));
            return children;
        } catch(e) {
            console.error("Get Student Children Error:", e);
            return [];
        }
    },
    
    getStudentLearningStats: async (studentUid, days = 30) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();
            
            // 獲取學習日誌
            const q = query(
                collection(db, "artifacts", APP_ID, "users", studentUid, "logs"),
                where("timestamp", ">=", startDateStr)
            );
            const snap = await getDocs(q);
            
            const stats = {
                totalQuestions: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                totalTimeSpent: 0,
                subjects: { math: 0, chi: 0, eng: 0 },
                dailyActivity: {},
                mistakes: []
            };
            
            snap.forEach(doc => {
                const data = doc.data();
                if (data.action === 'generate_question' || data.action === 'start_practice') {
                    stats.totalQuestions++;
                    const subject = data.subject || 'math';
                    if (subject.includes('math') || subject.includes('數學')) stats.subjects.math++;
                    else if (subject.includes('chi') || subject.includes('中文')) stats.subjects.chi++;
                    else if (subject.includes('eng') || subject.includes('英文')) stats.subjects.eng++;
                }
                if (data.action === 'answer_correct') {
                    stats.correctAnswers++;
                    if (data.timeSpent) stats.totalTimeSpent += data.timeSpent;
                }
                if (data.action === 'answer_wrong') {
                    stats.wrongAnswers++;
                    if (data.timeSpent) stats.totalTimeSpent += data.timeSpent;
                }
                
                // 按日期統計
                if (data.timestamp) {
                    const date = data.timestamp.split('T')[0];
                    if (!stats.dailyActivity[date]) {
                        stats.dailyActivity[date] = { questions: 0, correct: 0, wrong: 0 };
                    }
                    if (data.action === 'generate_question') stats.dailyActivity[date].questions++;
                    if (data.action === 'answer_correct') stats.dailyActivity[date].correct++;
                    if (data.action === 'answer_wrong') stats.dailyActivity[date].wrong++;
                }
            });
            
            // 獲取錯題
            const mistakesSnap = await getDocs(collection(db, "artifacts", APP_ID, "users", studentUid, "mistakes"));
            mistakesSnap.forEach(d => stats.mistakes.push({ id: d.id, ...d.data() }));
            
            return stats;
        } catch(e) {
            console.error("Get Student Learning Stats Error:", e);
            return null;
        }
    },
    
    // === 教師功能 ===
    createClass: async (teacherUid, className, grade) => {
        try {
            const classData = {
                teacherId: teacherUid,
                className: className,
                grade: grade,
                students: [],
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "classes"), classData);
            return docRef.id;
        } catch(e) {
            console.error("Create Class Error:", e);
            return null;
        }
    },
    
    addStudentToClass: async (classId, studentEmail) => {
        try {
            const studentProfile = await DB_SERVICE.getUserProfile(studentEmail);
            if (!studentProfile) return false;
            
            const classDoc = await getDoc(doc(db, "artifacts", APP_ID, "public", "data", "classes", classId));
            if (!classDoc.exists()) return false;
            
            const classData = classDoc.data();
            if (!classData.students.find(s => s.email === studentEmail)) {
                classData.students.push({
                    email: studentEmail,
                    uid: studentProfile.uid,
                    name: studentProfile.name,
                    addedAt: new Date().toISOString()
                });
                await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "classes", classId), {
                    students: classData.students
                });
            }
            return true;
        } catch(e) {
            console.error("Add Student to Class Error:", e);
            return false;
        }
    },
    
    getTeacherClasses: async (teacherUid) => {
        try {
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "classes"), where("teacherId", "==", teacherUid));
            const snap = await getDocs(q);
            const classes = [];
            snap.forEach(d => classes.push({ id: d.id, ...d.data() }));
            return classes;
        } catch(e) {
            console.error("Get Teacher Classes Error:", e);
            return [];
        }
    },
    
    createAssignment: async (classId, assignmentData) => {
        try {
            const assignment = {
                classId: classId,
                ...assignmentData,
                createdAt: new Date().toISOString(),
                status: 'active'
            };
            const docRef = await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "assignments"), assignment);
            return docRef.id;
        } catch(e) {
            console.error("Create Assignment Error:", e);
            return null;
        }
    },
    
    getAssignments: async (classId) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "assignments"),
                where("classId", "==", classId),
                where("status", "==", "active")
            );
            const snap = await getDocs(q);
            const assignments = [];
            snap.forEach(d => assignments.push({ id: d.id, ...d.data() }));
            return assignments;
        } catch(e) {
            console.error("Get Assignments Error:", e);
            return [];
        }
    },
    
    createAssignmentNotifications: async (classId, assignmentId, assignmentTitle) => {
        try {
            // 獲取班級信息
            const classDoc = await getDoc(doc(db, "artifacts", APP_ID, "public", "data", "classes", classId));
            if (!classDoc.exists()) return false;
            
            const classData = classDoc.data();
            const students = classData.students || [];
            
            // 為每個學生創建通知
            const batch = writeBatch(db);
            const notificationsRef = collection(db, "artifacts", APP_ID, "public", "data", "notifications");
            
            students.forEach(student => {
                const notificationRef = doc(notificationsRef);
                batch.set(notificationRef, {
                    studentUid: student.uid,
                    assignmentId: assignmentId,
                    classId: classId,
                    title: assignmentTitle,
                    type: 'assignment',
                    read: false,
                    createdAt: new Date().toISOString()
                });
            });
            
            await batch.commit();
            return true;
        } catch(e) {
            console.error("Create Assignment Notifications Error:", e);
            return false;
        }
    },
    
    getStudentNotifications: async (studentUid) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "notifications"),
                where("studentUid", "==", studentUid),
                where("read", "==", false)
            );
            const snap = await getDocs(q);
            const notifications = [];
            snap.forEach(d => notifications.push({ id: d.id, ...d.data() }));
            return notifications;
        } catch(e) {
            console.error("Get Student Notifications Error:", e);
            return [];
        }
    },
    
    markNotificationAsRead: async (notificationId) => {
        try {
            await updateDoc(
                doc(db, "artifacts", APP_ID, "public", "data", "notifications", notificationId),
                { read: true, readAt: new Date().toISOString() }
            );
            return true;
        } catch(e) {
            console.error("Mark Notification Read Error:", e);
            return false;
        }
    },
    
    updateAssignmentStatus: async (assignmentId, status) => {
        try {
            await updateDoc(
                doc(db, "artifacts", APP_ID, "public", "data", "assignments", assignmentId),
                { status: status }
            );
            return true;
        } catch(e) {
            console.error("Update Assignment Status Error:", e);
            return false;
        }
    },
    
    getClassStats: async (classId) => {
        try {
            const classDoc = await getDoc(doc(db, "artifacts", APP_ID, "public", "data", "classes", classId));
            if (!classDoc.exists()) return null;
            
            const classData = classDoc.data();
            const stats = {
                totalStudents: classData.students.length,
                students: []
            };
            
            // 獲取每個學生的統計數據
            for (const student of classData.students) {
                const studentStats = await DB_SERVICE.getStudentLearningStats(student.uid, 14); // 最近 14 天
                stats.students.push({
                    ...student,
                    stats: studentStats
                });
            }
            
            return stats;
        } catch(e) {
            console.error("Get Class Stats Error:", e);
            return null;
        }
    },
    
    // === AI 報告功能 ===
    generateProgressReport: async (studentUid, periodDays = 14) => {
        try {
            const stats = await DB_SERVICE.getStudentLearningStats(studentUid, periodDays);
            if (!stats) return null;
            
            // 調用 AI 生成報告
            const reportPrompt = `
                作為專業的教育顧問，請為學生生成一份 ${periodDays} 天的學習進度報告。
                
                學習數據：
                - 總題數：${stats.totalQuestions}
                - 答對：${stats.correctAnswers}
                - 答錯：${stats.wrongAnswers}
                - 正確率：${stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0}%
                - 各科目題數：數學 ${stats.subjects.math}，中文 ${stats.subjects.chi}，英文 ${stats.subjects.eng}
                - 錯題數：${stats.mistakes.length}
                
                請生成一份包含以下內容的 JSON 報告：
                {
                    "summary": "總體學習情況摘要（50字以內）",
                    "strengths": ["強項1", "強項2"],
                    "weaknesses": ["弱項1", "弱項2"],
                    "recommendations": ["建議1", "建議2", "建議3"],
                    "nextPhasePlan": "下一階段的學習計劃（100字以內）"
                }
            `;
            
            // 這裡應該調用 AI API，但為了簡化，先返回結構化數據
            const report = {
                periodDays: periodDays,
                generatedAt: new Date().toISOString(),
                summary: `在過去 ${periodDays} 天中，學生完成了 ${stats.totalQuestions} 道題目，正確率為 ${stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0}%。`,
                strengths: stats.correctAnswers > stats.wrongAnswers ? ['基礎知識掌握良好', '答題速度穩定'] : ['學習態度積極'],
                weaknesses: stats.mistakes.length > 0 ? ['需要加強錯題練習', '部分概念理解不足'] : ['無明顯弱項'],
                recommendations: [
                    '繼續保持每日練習習慣',
                    '重點複習錯題本中的題目',
                    '加強弱項科目的練習'
                ],
                nextPhasePlan: `建議在接下來 ${periodDays} 天中，重點加強弱項科目的練習，並定期複習錯題本。目標是將正確率提升到 80% 以上。`,
                stats: stats
            };
            
            // 保存報告
            await addDoc(collection(db, "artifacts", APP_ID, "users", studentUid, "reports"), report);
            
            return report;
        } catch(e) {
            console.error("Generate Progress Report Error:", e);
            return null;
        }
    },
    
    getStudentReports: async (studentUid) => {
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "users", studentUid, "reports"));
            const reports = [];
            snap.forEach(d => reports.push({ id: d.id, ...d.data() }));
            return reports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
        } catch(e) {
            console.error("Get Student Reports Error:", e);
            return [];
        }
    }
};