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
        try {
            const uid = user.uid || user.id;
            if (!uid) {
                console.error("Delete User Error: No UID provided");
                return false;
            }
            
            // 1. 刪除 Firestore 中的所有用戶資料
            const batch = writeBatch(db);
            
            // 刪除用戶個人資料
            const userDocRef = doc(db, "artifacts", APP_ID, "public", "data", "users", uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                batch.delete(userDocRef);
            }
            
            // 刪除學習歷程
            const logsQuery = query(collection(db, "artifacts", APP_ID, "users", uid, "logs"));
            const logsSnap = await getDocs(logsQuery);
            logsSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            // 刪除錯題記錄
            const mistakesQuery = query(collection(db, "artifacts", APP_ID, "users", uid, "mistakes"));
            const mistakesSnap = await getDocs(mistakesQuery);
            mistakesSnap.forEach((doc) => {
                batch.delete(doc.ref);
            });
            
            // 刪除學習統計（如果有的話）
            const statsDocRef = doc(db, "artifacts", APP_ID, "users", uid, "stats", "summary");
            const statsDoc = await getDoc(statsDocRef);
            if (statsDoc.exists()) {
                batch.delete(statsDocRef);
            }
            
            // 執行批量刪除
            await batch.commit();
            
            // 2. 刪除 Firebase Authentication 帳號
            if (auth.currentUser && auth.currentUser.uid === uid) {
                await deleteUser(auth.currentUser);
            }
            
            console.log(`✅ User account and all data deleted: ${uid}`);
            return true;
        } catch (e) { 
            console.error("Delete User Error:", e); 
            return false; 
        } 
    },
    saveMistake: async (uid, q, ans) => { 
        try {
            await addDoc(collection(db, "artifacts", APP_ID, "users", uid, "mistakes"), { 
                questionId: q.id, 
                question: q.question, 
                answer: q.answer, 
                userWrongAnswer: ans, 
                hint: q.hint || '請重讀題目關鍵字',
                explanation: q.explanation || '參考相關課本章節',
                category: q.category || '一般',
                createdAt: new Date().toISOString() 
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
    uploadPastPaperBatch: async (papers, user = null) => { 
        try {
            const batch = writeBatch(db);
            
            // 判斷存儲位置：教學者存到機構專用庫，開發者存到主庫
            let collectionRef;
            if (user && user.role === 'teacher' && user.institutionName) {
                // 教學者：存到機構專用庫
                collectionRef = collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", user.institutionName, "questions");
            } else {
                // 開發者/主庫：存到主庫
                collectionRef = collection(db, "artifacts", APP_ID, "public", "data", "past_papers");
            }
            
            papers.forEach(paper => { 
                const docRef = doc(collectionRef); 
                batch.set(docRef, { 
                    ...paper, 
                    createdAt: new Date().toISOString(),
                    uploadedBy: user?.email || 'system',
                    institutionName: user?.institutionName || null
                }); 
            });
            await batch.commit(); 
            return true; 
        } catch (e) { console.error("Batch Upload Error:", e); return false; }
    },
    countPastPapers: async (user = null) => {
        try {
            // 如果是教學者，計算機構庫的數量
            if (user && user.role === 'teacher' && user.institutionName) {
                const snap = await getDocs(
                    collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", user.institutionName, "questions")
                );
                return snap.size;
            }
            // 開發者/主庫
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"));
            return snap.size; 
        } catch (e) { console.error("Count Error:", e); return 0; }
    },
    
    // ========== 教學者種子題目庫管理 ==========
    
    // 獲取教學者機構的種子題目庫
    getTeacherSeedQuestions: async (institutionName) => {
        try {
            const snap = await getDocs(
                collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", institutionName, "questions")
            );
            const questions = [];
            snap.forEach(d => {
                questions.push({ id: d.id, ...d.data() });
            });
            return questions;
        } catch (e) {
            console.error("Get Teacher Seed Questions Error:", e);
            return [];
        }
    },
    
    // 獲取所有教學者上傳的試題（開發者用）
    getAllTeacherSeedQuestions: async () => {
        try {
            const allQuestions = [];
            // 獲取所有機構
            const institutionsSnap = await getDocs(
                collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions")
            );
            
            for (const institutionDoc of institutionsSnap.docs) {
                const institutionName = institutionDoc.id;
                const questionsSnap = await getDocs(
                    collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", institutionName, "questions")
                );
                questionsSnap.forEach(qDoc => {
                    allQuestions.push({
                        id: qDoc.id,
                        institutionName: institutionName,
                        ...qDoc.data()
                    });
                });
            }
            return allQuestions;
        } catch (e) {
            console.error("Get All Teacher Seed Questions Error:", e);
            return [];
        }
    },
    
    // 將教學者試題加入主資料庫（開發者用）
    addTeacherQuestionToMainDB: async (questionData) => {
        try {
            await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
                {
                    ...questionData,
                    source: 'teacher_imported',
                    importedAt: new Date().toISOString(),
                    createdAt: new Date().toISOString()
                }
            );
            return true;
        } catch (e) {
            console.error("Add Teacher Question to Main DB Error:", e);
            return false;
        }
    },
    seedInitialData: async () => {
        try {
            const count = await DB_SERVICE.countPastPapers();
            if (count === 0) {
                console.log("?�� Seeding initial mock data...");
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
            
            // ?��?今日??��??��??��?記�?
            const q = query(
                collection(db, "artifacts", APP_ID, "users", uid, "logs"),
                where("action", "in", ["start_practice", "generate_question"]),
                where("timestamp", ">=", todayStart)
            );
            const snap = await getDocs(q);
            
            // 統?????使用??
            const tasks = { math: 0, chi: 0, eng: 0 };
            snap.forEach(doc => {
                const data = doc.data();
                const subject = data.subject || data.topicId?.split('_')[0] || 'math';
                if (subject.includes('math') || subject.includes('?�學')) {
                    tasks.math++;
                } else if (subject.includes('chi') || subject.includes('中�?')) {
                    tasks.chi++;
                } else if (subject.includes('eng') || subject.includes('?��?')) {
                    tasks.eng++;
                } else {
                    // 默?歸??數?
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
            // ?新?戶資?中?訂閱???
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
    
    // === 家長?能 ===
    linkParentToStudent: async (parentUid, studentEmail) => {
        try {
            // ?找學?帳?
            const studentProfile = await DB_SERVICE.getUserProfile(studentEmail);
            if (!studentProfile) return false;
            
            // ?新學?資?，添?家??ID
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
            
            // ??學???
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
                    if (subject.includes('math') || subject.includes('?�學')) stats.subjects.math++;
                    else if (subject.includes('chi') || subject.includes('中�?')) stats.subjects.chi++;
                    else if (subject.includes('eng') || subject.includes('?��?')) stats.subjects.eng++;
                }
                if (data.action === 'answer_correct') {
                    stats.correctAnswers++;
                    if (data.timeSpent) stats.totalTimeSpent += data.timeSpent;
                }
                if (data.action === 'answer_wrong') {
                    stats.wrongAnswers++;
                    if (data.timeSpent) stats.totalTimeSpent += data.timeSpent;
                }
                
                // ?日?統?
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
            
            // ????
            const mistakesSnap = await getDocs(collection(db, "artifacts", APP_ID, "users", studentUid, "mistakes"));
            mistakesSnap.forEach(d => stats.mistakes.push({ id: d.id, ...d.data() }));
            
            return stats;
        } catch(e) {
            console.error("Get Student Learning Stats Error:", e);
            return null;
        }
    },
    
    // === ?師?能 ===
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
            // ????信息
            const classDoc = await getDoc(doc(db, "artifacts", APP_ID, "public", "data", "classes", classId));
            if (!classDoc.exists()) return false;
            
            const classData = classDoc.data();
            const students = classData.students || [];
            
            // ???學?創建通知
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
            
            // ??每個學??統???
            for (const student of classData.students) {
                const studentStats = await DB_SERVICE.getStudentLearningStats(student.uid, 14); // ??14 ?
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
    
    // === AI ?��??�能 ===
    generateProgressReport: async (studentUid, periodDays = 14) => {
        try {
            const stats = await DB_SERVICE.getStudentLearningStats(studentUid, periodDays);
            if (!stats) return null;
            
            // 調用 AI ?��??��?
            const reportPrompt = `
                作為專業?��??�顧?��?請為學�??��?一?${periodDays} 天�?學�??�度?��???                
                學�??��??                - 總�??��?${stats.totalQuestions}
                - 答�??{stats.correctAnswers}
                - 答錯?{stats.wrongAnswers}
                - ?��?��?${stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0}%
                - ?��??��??��??�學 ${stats.subjects.math}，中??${stats.subjects.chi}，英??${stats.subjects.eng}
                - ?��??��?${stats.mistakes.length}
                
                請�??��?份�??�以下內容�? JSON ?��??                {
                    "summary": "總�?學�??��??��??0字以?��?",
                    "strengths": ["強�?1", "強�?2"],
                    "weaknesses": ["弱�?1", "弱�?2"],
                    "recommendations": ["建議1", "建議2", "建議3"],
                    "nextPhasePlan": "下�??�段?�學習�??��?100字以?��?"
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
    },

    // ========== 回饋管理系統 ==========
    
    // 保存開發者回饋（只有 admin@test.com 可以）
    saveDeveloperFeedback: async (feedbackData) => {
        try {
            const feedbackDoc = {
                questionId: feedbackData.questionId || null,
                questionType: feedbackData.questionType || [], // 多標籤數組
                category: feedbackData.category || '', // 主分類
                subject: feedbackData.subject || 'math', // 科目
                feedback: feedbackData.feedback,
                status: 'active',
                createdBy: feedbackData.createdBy || 'admin@test.com',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "developer_feedback"), 
                feedbackDoc
            );
            return docRef.id;
        } catch(e) {
            console.error("Save Developer Feedback Error:", e);
            return null;
        }
    },

    // 保存教學者回饋（待審核）
    saveTeacherFeedback: async (feedbackData) => {
        try {
            const feedbackDoc = {
                questionId: feedbackData.questionId || null,
                questionType: feedbackData.questionType || [],
                category: feedbackData.category || '',
                subject: feedbackData.subject || 'math',
                feedback: feedbackData.feedback,
                status: 'pending',
                createdBy: feedbackData.createdBy,
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "teacher_feedback"), 
                feedbackDoc
            );
            return docRef.id;
        } catch(e) {
            console.error("Save Teacher Feedback Error:", e);
            return null;
        }
    },

    // 查詢有效的回饋（開發者回饋 + 已審核的教學者回饋）
    getActiveFeedback: async (questionType = [], subject = null, category = null) => {
        try {
            const feedbacks = [];
            
            // 1. 查詢開發者回饋（active）
            const devQuery = query(
                collection(db, "artifacts", APP_ID, "public", "data", "developer_feedback"),
                where("status", "==", "active")
            );
            const devSnap = await getDocs(devQuery);
            devSnap.forEach(d => {
                const data = d.data();
                feedbacks.push({ id: d.id, source: 'developer', ...data });
            });

            // 2. 查詢已審核的教學者回饋（approved）
            const teacherQuery = query(
                collection(db, "artifacts", APP_ID, "public", "data", "approved_feedback"),
                where("status", "==", "active")
            );
            const teacherSnap = await getDocs(teacherQuery);
            teacherSnap.forEach(d => {
                const data = d.data();
                feedbacks.push({ id: d.id, source: 'approved_teacher', ...data });
            });

            // 3. 過濾匹配的回饋
            if (questionType.length === 0 && !subject && !category) {
                return feedbacks; // 返回所有回饋
            }

            return feedbacks.filter(fb => {
                // 科目匹配
                if (subject && fb.subject !== subject) return false;
                
                // 分類匹配
                if (category && fb.category !== category) return false;
                
                // 題型匹配（多標籤匹配：如果回饋的題型與目標題型有交集）
                if (questionType.length > 0 && fb.questionType && Array.isArray(fb.questionType)) {
                    const hasMatch = questionType.some(type => fb.questionType.includes(type));
                    if (!hasMatch) return false;
                }
                
                return true;
            });
        } catch(e) {
            console.error("Get Active Feedback Error:", e);
            return [];
        }
    },

    // 獲取所有待審核的教學者回饋
    getPendingTeacherFeedback: async () => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "teacher_feedback"),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const feedbacks = [];
            snap.forEach(d => {
                feedbacks.push({ id: d.id, ...d.data() });
            });
            return feedbacks;
        } catch(e) {
            console.error("Get Pending Teacher Feedback Error:", e);
            return [];
        }
    },

    // 審核教學者回饋（批准）
    approveTeacherFeedback: async (feedbackId, approvedBy = 'admin@test.com') => {
        try {
            // 1. 獲取原始回饋
            const feedbackRef = doc(db, "artifacts", APP_ID, "public", "data", "teacher_feedback", feedbackId);
            const feedbackSnap = await getDoc(feedbackRef);
            
            if (!feedbackSnap.exists()) {
                console.error("Feedback not found");
                return false;
            }

            const feedbackData = feedbackSnap.data();
            
            // 2. 轉移到 approved_feedback 集合
            await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "approved_feedback"),
                {
                    ...feedbackData,
                    status: 'active',
                    approvedBy: approvedBy,
                    approvedAt: new Date().toISOString(),
                    originalFeedbackId: feedbackId
                }
            );

            // 3. 更新原始回饋狀態為 approved
            await updateDoc(feedbackRef, {
                status: 'approved',
                approvedBy: approvedBy,
                approvedAt: new Date().toISOString()
            });

            return true;
        } catch(e) {
            console.error("Approve Teacher Feedback Error:", e);
            return false;
        }
    },

    // 拒絕教學者回饋
    rejectTeacherFeedback: async (feedbackId, rejectedBy = 'admin@test.com') => {
        try {
            const feedbackRef = doc(db, "artifacts", APP_ID, "public", "data", "teacher_feedback", feedbackId);
            await updateDoc(feedbackRef, {
                status: 'rejected',
                rejectedBy: rejectedBy,
                rejectedAt: new Date().toISOString()
            });
            return true;
        } catch(e) {
            console.error("Reject Teacher Feedback Error:", e);
            return false;
        }
    },

    // 獲取所有開發者回饋（用於管理）
    getAllDeveloperFeedback: async () => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "developer_feedback"),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const feedbacks = [];
            snap.forEach(d => {
                feedbacks.push({ id: d.id, ...d.data() });
            });
            return feedbacks;
        } catch(e) {
            console.error("Get All Developer Feedback Error:", e);
            return [];
        }
    },

    // ========== 試卷管理系統 ==========
    
    // 保存已發送的試卷
    saveSentPaper: async (paperData, teacherUid, institutionName) => {
        try {
            const paperDoc = {
                title: paperData.title || '未命名試卷',
                description: paperData.description || '',
                questions: paperData.questions || [],
                questionCount: paperData.questions?.length || 0,
                grade: paperData.grade || 'P4',
                topicIds: paperData.topicIds || [],
                createdBy: paperData.createdBy || teacherUid,
                institutionName: institutionName || '',
                sentAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "sent_papers"),
                paperDoc
            );
            return docRef.id;
        } catch(e) {
            console.error("Save Sent Paper Error:", e);
            return null;
        }
    },

    // 獲取教學者已發送的試卷
    getSentPapers: async (teacherUid, institutionName = null) => {
        try {
            let q;
            if (institutionName) {
                // 如果是教學者，只獲取自己機構的試卷
                q = query(
                    collection(db, "artifacts", APP_ID, "public", "data", "sent_papers"),
                    where("institutionName", "==", institutionName),
                    orderBy("sentAt", "desc")
                );
            } else {
                // 開發者可以查看所有試卷
                q = query(
                    collection(db, "artifacts", APP_ID, "public", "data", "sent_papers"),
                    orderBy("sentAt", "desc")
                );
            }
            const snap = await getDocs(q);
            const papers = [];
            snap.forEach(d => {
                papers.push({ id: d.id, ...d.data() });
            });
            return papers;
        } catch(e) {
            console.error("Get Sent Papers Error:", e);
            return [];
        }
    },

    // 獲取單個試卷詳情
    getPaperById: async (paperId) => {
        try {
            const paperRef = doc(db, "artifacts", APP_ID, "public", "data", "sent_papers", paperId);
            const paperSnap = await getDoc(paperRef);
            if (!paperSnap.exists()) return null;
            return { id: paperSnap.id, ...paperSnap.data() };
        } catch(e) {
            console.error("Get Paper By ID Error:", e);
            return null;
        }
    }
}; 
