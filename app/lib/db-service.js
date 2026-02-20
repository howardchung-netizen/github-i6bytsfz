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
    getDoc,
    orderBy,
    updateDoc,
    setDoc,
    serverTimestamp,
    increment,
    limit
} from "firebase/firestore";

// 👇 2. 這裡是修正重點：Auth 相關函數必須從 'firebase/auth' 引入
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInAnonymously, 
    deleteUser 
} from "firebase/auth";

import { APP_ID, SAMPLE_PAST_PAPERS } from './constants';
import { generateReport } from '../../services/report-generator';

const buildInstructionFromFeedback = (text = '') => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    if (/^(請|不要|必須|禁止)/.test(trimmed)) return trimmed;
    return `請${trimmed}`;
};

const normalizeQuestionRecord = (data = {}) => {
    const status = data.status || 'PUBLISHED';
    const hasImage = Boolean(data.imageUrl || data.image || data.originalImage);
    const poolType = data.poolType || (hasImage ? 'IMAGE_STATIC' : 'TEXT');
    return { ...data, status, poolType };
};

let lastError = null;

export const DB_SERVICE = {
    getLastError: () => lastError,
    clearLastError: () => { lastError = null; },
    logVisit: async ({ path = '/', platform = 'web', sessionId = '' }) => {
        try {
            lastError = null;
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "visit_logs"),
                {
                    path,
                    platform,
                    sessionId,
                    createdAt: new Date().toISOString(),
                    createdAtServer: serverTimestamp()
                }
            );
            return docRef.id;
        } catch (e) {
            lastError = e;
            console.error("Log Visit Error:", e);
            return null;
        }
    },
    addTopic: async (topicData) => { 
        try {
            lastError = null;
            const docRef = await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "syllabus"), topicData);
            return docRef.id; 
        } catch (e) {
            lastError = e;
            console.error("Add Topic Error:", e);
            return null;
        }
    },
    fetchTopics: async () => { 
        try {
            lastError = null;
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "syllabus"));
            const res = []; snap.forEach(d => res.push({id: d.id, ...d.data()})); 
            return res; 
        } catch (e) {
            lastError = e;
            console.error("Fetch Topic Error:", e);
            return [];
        }
    },
    deleteTopic: async (id) => { 
        try {
            lastError = null;
            await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "syllabus", id));
            return true;
        } catch (e) {
            lastError = e;
            console.error("Delete Topic Error:", e);
            return false;
        }
    },
    updateTopic: async (id, updates = {}) => {
        try {
            lastError = null;
            const payload = { ...updates, updatedAt: new Date().toISOString() };
            await setDoc(
                doc(db, "artifacts", APP_ID, "public", "data", "syllabus", id),
                payload,
                { merge: true }
            );
            return true;
        } catch (e) {
            lastError = e;
            console.error("Update Topic Error:", e);
            return false;
        }
    },
    normalizeSyllabusDocs: async () => {
        try {
            lastError = null;
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "syllabus"));
            let updated = 0;
            let skipped = 0;
            const now = new Date().toISOString();
            for (const docSnap of snap.docs) {
                const data = docSnap.data() || {};
                const payload = {};
                if (!data.createdAt) payload.createdAt = now;
                if (!data.updatedAt) payload.updatedAt = now;
                if (!data.type) payload.type = 'text';
                if (!data.lang) {
                    if (data.subject === 'eng') payload.lang = 'en-US';
                    else payload.lang = 'zh-HK';
                }
                if (!data.subTopics) payload.subTopics = [];
                const needsUpdate = Object.keys(payload).length > 0;
                if (needsUpdate) {
                    await setDoc(
                        doc(db, "artifacts", APP_ID, "public", "data", "syllabus", docSnap.id),
                        payload,
                        { merge: true }
                    );
                    updated += 1;
                } else {
                    skipped += 1;
                }
            }
            return { updated, skipped };
        } catch (e) {
            lastError = e;
            console.error("Normalize Syllabus Error:", e);
            return { updated: 0, skipped: 0, error: e };
        }
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
            const data = doc.data() || {};
            return { id: doc.id, report_mode: data.report_mode || 'EDUCATOR', ...data };
        } catch (e) { console.error("Get Profile Error:", e); return null; }
    },
    registerUser: async (userData, password) => { 
        try { 
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
            const user = userCredential.user; 
            await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "users"), { ...userData, report_mode: userData.report_mode || 'EDUCATOR', uid: user.uid, createdAt: new Date().toISOString() });
            return user.uid; 
        } catch (e) { 
            if (e.code === 'auth/operation-not-allowed') { 
                const mockUid = "mock_" + Date.now();
                await signInAnonymously(auth); 
                await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "users"), { ...userData, report_mode: userData.report_mode || 'EDUCATOR', uid: mockUid, createdAt: new Date().toISOString(), isAnonymousFallback: true });
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
                if (!snap.empty) { const doc = snap.docs[0]; const data = doc.data() || {}; return { id: doc.id, report_mode: data.report_mode || 'EDUCATOR', ...data }; } 
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
            lastError = null;
            const batch = writeBatch(db);
            
            // 種子一律寫入 seed_questions，審核通過後再入 past_papers
            const collectionRef = collection(db, "artifacts", APP_ID, "public", "data", "seed_questions");
            
            papers.forEach(paper => { 
                const docRef = doc(collectionRef); 
                const derivedPoolType = paper.poolType
                    || (paper.imageUrl || paper.image || paper.originalImage ? 'IMAGE_STATIC' : 'TEXT');
                const derivedSource = paper.source || paper.imageFileName || paper.fileName || 'seed_upload';
                batch.set(docRef, { 
                    ...paper, 
                    status: paper.status ?? 'DRAFT',
                    origin: paper.origin ?? 'SEED',
                    poolType: paper.poolType ?? derivedPoolType,
                    source: paper.source ?? derivedSource,
                    auditMeta: paper.auditMeta ?? null,
                    createdAt: paper.createdAt ?? new Date().toISOString(),
                    uploadedBy: user?.email || 'system',
                    institutionName: user?.institutionName || null
                }); 
            });
            await batch.commit(); 
            return true; 
        } catch (e) {
            lastError = e;
            console.error("Batch Upload Error:", e);
            return false;
        }
    },
    countPastPapers: async (user = null) => {
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "seed_questions"));
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
            if (process.env.NODE_ENV !== 'development') {
                return;
            }
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
    autoPromoteStudentIfNeeded: async (uid, profile) => {
        try {
            if (!uid || !profile || profile.role !== 'student') {
                return { updated: false, profile };
            }
            const currentGrade = profile.grade || profile.level;
            if (!currentGrade || !/^P\d+$/.test(currentGrade)) {
                return { updated: false, profile };
            }
            const now = new Date();
            const currentYear = now.getFullYear();
            const promotionDate = new Date(currentYear, 6, 1);
            if (now < promotionDate) {
                return { updated: false, profile };
            }
            if (profile.lastPromotionYear === currentYear) {
                return { updated: false, profile };
            }
            const numericGrade = Number(currentGrade.replace('P', ''));
            if (Number.isNaN(numericGrade) || numericGrade >= 6) {
                return { updated: false, profile };
            }
            const nextGrade = `P${numericGrade + 1}`;
            const q = query(collection(db, "artifacts", APP_ID, "public", "data", "users"), where("uid", "==", uid));
            const snap = await getDocs(q);
            if (snap.empty) return { updated: false, profile };
            const userDoc = snap.docs[0];
            const updates = {
                grade: nextGrade,
                level: nextGrade,
                lastPromotionYear: currentYear,
                lastPromotedAt: new Date().toISOString()
            };
            await updateDoc(doc(db, "artifacts", APP_ID, "public", "data", "users", userDoc.id), updates);
            return {
                updated: true,
                profile: { ...profile, ...updates }
            };
        } catch (e) {
            console.error("Auto Promote Error:", e);
            return { updated: false, profile };
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
                        stats.dailyActivity[date] = { questions: 0, correct: 0, wrong: 0, timeSpent: 0 };
                    }
                    if (data.action === 'generate_question') stats.dailyActivity[date].questions++;
                    if (data.action === 'answer_correct') stats.dailyActivity[date].correct++;
                    if (data.action === 'answer_wrong') stats.dailyActivity[date].wrong++;
                    if (data.timeSpent) stats.dailyActivity[date].timeSpent += data.timeSpent;
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

    getStudentLearningLogsRange: async (studentUid, days = 14) => {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();
            const q = query(
                collection(db, "artifacts", APP_ID, "users", studentUid, "logs"),
                where("timestamp", ">=", startDateStr)
            );
            const snap = await getDocs(q);
            const logs = [];
            snap.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
            return logs;
        } catch (e) {
            console.error("Get Student Learning Logs Error:", e);
            return [];
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
    
    getInstitutionClasses: async (institutionName) => {
        try {
            if (!institutionName) return [];
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "classes"),
                where("institutionName", "==", institutionName)
            );
            const snap = await getDocs(q);
            const classes = [];
            snap.forEach(d => classes.push({ id: d.id, ...d.data() }));
            return classes;
        } catch (e) {
            console.error("Get Institution Classes Error:", e);
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

    getAssignmentCompletionStats: async (classId) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "notifications"),
                where("classId", "==", classId),
                where("type", "==", "assignment")
            );
            const snap = await getDocs(q);
            const statsMap = {};
            snap.forEach(d => {
                const data = d.data();
                const assignmentId = data.assignmentId || 'unknown';
                if (!statsMap[assignmentId]) {
                    statsMap[assignmentId] = {
                        assignmentId,
                        title: data.title || '未命名作業',
                        total: 0,
                        completed: 0
                    };
                }
                statsMap[assignmentId].total += 1;
                if (data.read) statsMap[assignmentId].completed += 1;
            });
            return Object.values(statsMap).map((item) => ({
                ...item,
                completionRate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0
            }));
        } catch (e) {
            console.error("Get Assignment Completion Stats Error:", e);
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
    
    getClassStats: async (classId, days = 14) => {
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
                const studentStats = await DB_SERVICE.getStudentLearningStats(student.uid, days);
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
            const logs = await DB_SERVICE.getStudentLearningLogsRange(studentUid, periodDays);
            const usages = logs
                .filter(log => log.action === 'answer_correct' || log.action === 'answer_wrong')
                .map(log => ({
                    isCorrect: log.action === 'answer_correct',
                    timeSpentMs: log.timeSpent || 0,
                    hintUsedCount: log.hintUsedCount || log.hint_used_count || 0,
                    retryCount: log.retryCount || 0,
                    topic: log.topic || log.subject || ''
                }));

            const generatedAt = new Date().toISOString();
            const educatorReport = await generateReport(studentUid, 'EDUCATOR', { usages });
            const observerReport = await generateReport(studentUid, 'OBSERVER', { usages });

            const reportDocs = [
                { mode: 'EDUCATOR', ...educatorReport },
                { mode: 'OBSERVER', ...observerReport }
            ].map(report => ({
                periodDays: periodDays,
                generatedAt,
                ...report
            }));

            for (const report of reportDocs) {
                await addDoc(collection(db, "artifacts", APP_ID, "users", studentUid, "reports"), report);
            }

            return reportDocs;
        } catch(e) {
            console.error("Generate Progress Report Error:", e);
            throw e;
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
                    originalFeedbackId: feedbackId,
                    instruction: buildInstructionFromFeedback(feedbackData.feedback)
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
    },
    
    /**
     * Records that a user has attempted a specific question.
     * Uses a subcollection strategy to avoid Firestore 1MB document limit.
     * Path: artifacts/{APP_ID}/users/{userId}/question_usage/{questionId}
     * 
     * @param {string} userId - The current user's UID
     * @param {string} questionId - The ID of the question document (from past_papers collection)
     * @param {boolean} isCorrect - Whether the user got it right
     * @param {number} timeSpentMs - Time spent in milliseconds (optional, defaults to 0)
     * @returns {Promise<boolean>} - Returns true if successful, false otherwise
     */
    recordQuestionUsage: async (userId, questionId, isCorrect, timeSpentMs = 0, hintUsedCount = 0, retryCount = 0) => {
        try {
            if (!userId || !questionId) {
                console.warn("⚠️ recordQuestionUsage: Missing userId or questionId");
                return false;
            }
            
            // Reference the subcollection: artifacts/{APP_ID}/users/{userId}/question_usage
            const usageRef = doc(
                db, 
                "artifacts", 
                APP_ID, 
                "users", 
                userId, 
                "question_usage", 
                questionId
            );
            
            const attemptIndex = Number.isFinite(retryCount) ? retryCount + 1 : 1;

            // Summary doc (latest attempt)
            await setDoc(usageRef, {
                questionId: questionId,
                questionRef: `artifacts/${APP_ID}/public/data/past_papers/${questionId}`,
                usedAt: serverTimestamp(), // Server-side timestamp for consistency
                isCorrect: isCorrect,
                timeSpentMs: timeSpentMs || 0,
                time_spent_ms: timeSpentMs || 0,
                hintUsedCount: hintUsedCount || 0,
                hint_used_count: hintUsedCount || 0,
                retryCount: retryCount || 0,
                attemptIndex: attemptIndex,
                createdAt: new Date().toISOString() // Client-side timestamp as fallback
            }, { merge: true }); // merge: true allows updating existing records without overwriting other fields

            // Per-attempt log (append-only)
            await addDoc(
                collection(db, "artifacts", APP_ID, "users", userId, "question_attempts"),
                {
                    questionId: questionId,
                    questionRef: `artifacts/${APP_ID}/public/data/past_papers/${questionId}`,
                    attemptIndex: attemptIndex,
                    isCorrect: isCorrect,
                    timeSpentMs: timeSpentMs || 0,
                    time_spent_ms: timeSpentMs || 0,
                    hintUsedCount: hintUsedCount || 0,
                    hint_used_count: hintUsedCount || 0,
                    retryCount: retryCount || 0,
                    usedAt: serverTimestamp(),
                    createdAt: new Date().toISOString()
                }
            );

            const dateKey = new Date().toISOString().slice(0, 10);
            const dailyRef = doc(db, "artifacts", APP_ID, "users", userId, "daily_stats", dateKey);
            await setDoc(dailyRef, {
                date: dateKey,
                totalQuestions: increment(1),
                correctAnswers: increment(isCorrect ? 1 : 0),
                wrongAnswers: increment(isCorrect ? 0 : 1),
                timeSpentMs: increment(timeSpentMs || 0),
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            
            console.log(`✅ Recorded question usage: userId=${userId}, questionId=${questionId}, isCorrect=${isCorrect}`);
            return true;
        } catch (e) {
            console.error("❌ Record Question Usage Error:", e);
            return false;
        }
    },

    getUserDailyStatsRange: async (userId, days = 30) => {
        try {
            if (!userId) return [];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startKey = startDate.toISOString().slice(0, 10);
            const q = query(
                collection(db, "artifacts", APP_ID, "users", userId, "daily_stats"),
                where("date", ">=", startKey),
                orderBy("date", "asc")
            );
            const snap = await getDocs(q);
            const stats = [];
            snap.forEach(d => stats.push({ id: d.id, ...d.data() }));
            return stats;
        } catch (e) {
            console.error("Get User Daily Stats Error:", e);
            return [];
        }
    },

    cleanupUserDailyStats: async (userId, keepDays = 365) => {
        try {
            if (!userId) return false;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - keepDays);
            const cutoffKey = cutoff.toISOString().slice(0, 10);
            const q = query(
                collection(db, "artifacts", APP_ID, "users", userId, "daily_stats"),
                where("date", "<", cutoffKey)
            );
            const snap = await getDocs(q);
            if (snap.empty) return true;
            const batch = writeBatch(db);
            snap.forEach(d => batch.delete(d.ref));
            await batch.commit();
            return true;
        } catch (e) {
            console.error("Cleanup User Daily Stats Error:", e);
            return false;
        }
    },
    
    /**
     * 保存能力分數
     * @param {string} userId - 用戶 ID
     * @param {string} subject - 科目：'math' | 'chi' | 'eng'
     * @param {Object} scores - 能力分數對象，例如：{ 運算: 50, 幾何: 60, ... }
     */
    saveAbilityScores: async (userId, subject, scores) => {
        try {
            if (!userId || !subject || !scores) {
                console.warn("⚠️ Missing parameters for saveAbilityScores");
                return false;
            }
            
            const scoresRef = doc(db, "artifacts", APP_ID, "users", userId, "ability_scores", subject);
            await setDoc(scoresRef, {
                subject: subject,
                scores: scores,
                updatedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            
            console.log(`✅ Saved ability scores: userId=${userId}, subject=${subject}`, scores);
            return true;
        } catch (e) {
            console.error("❌ Save Ability Scores Error:", e);
            return false;
        }
    },
    
    /**
     * 載入能力分數
     * @param {string} userId - 用戶 ID
     * @param {string} subject - 科目：'math' | 'chi' | 'eng'
     * @returns {Object|null} 能力分數對象，如果不存在則返回 null
     */
    loadAbilityScores: async (userId, subject) => {
        try {
            if (!userId || !subject) {
                return null;
            }
            
            const scoresRef = doc(db, "artifacts", APP_ID, "users", userId, "ability_scores", subject);
            const scoresSnap = await getDoc(scoresRef);
            
            if (scoresSnap.exists()) {
                const data = scoresSnap.data();
                return data.scores || null;
            }
            
            return null;
        } catch (e) {
            console.error("❌ Load Ability Scores Error:", e);
            return null;
        }
    },

    // ========== 審計系統 ==========

    /**
     * 根據 ID 獲取題目
     * @param {string} questionId - 題目 ID
     * @returns {Promise<Object|null>} 題目對象，如果不存在則返回 null
     */
    fetchQuestionById: async (questionId) => {
        try {
            if (!questionId) {
                return null;
            }
            
            const questionRef = doc(db, "artifacts", APP_ID, "public", "data", "past_papers", questionId);
            const questionSnap = await getDoc(questionRef);
            
            if (questionSnap.exists()) {
                return normalizeQuestionRecord({ id: questionSnap.id, ...questionSnap.data() });
            }
            
            return null;
        } catch (e) {
            console.error("❌ Fetch Question By ID Error:", e);
            return null;
        }
    },

    /**
     * 更新題目審計狀態
     * @param {string} questionId - 題目 ID
     * @param {Object} auditResult - 審計結果對象
     * @param {string} auditorModel - 使用的審計模型名稱
     * @returns {Promise<boolean>} 是否成功
     */
    updateQuestionAuditStatus: async (questionId, auditResult, auditorModel) => {
        try {
            if (!questionId || !auditResult) {
                console.error("❌ Update Audit Status: Missing parameters");
                return false;
            }
            
            const questionRef = doc(db, "artifacts", APP_ID, "public", "data", "past_papers", questionId);
            await updateDoc(questionRef, {
                audit_status: auditResult.status || 'flagged',
                audit_report: JSON.stringify(auditResult),
                auditor_model_used: auditorModel,
                audit_timestamp: new Date().toISOString(),
                audit_issues: auditResult.issues || [],
                audit_score: auditResult.score || null
            });
            
            console.log(`✅ 已更新題目 ${questionId} 的審計狀態：${auditResult.status} (${auditResult.score}分)`);
            return true;
        } catch (e) {
            console.error("❌ Update Audit Status Error:", e);
            return false;
        }
    },

    fetchFactoryQueue: async (statuses = ['DRAFT', 'AUDITED', 'REJECTED']) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
                where("status", "in", statuses)
            );
            const snap = await getDocs(q);
            const items = [];
            snap.forEach(docSnap => {
                items.push(normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data() }));
            });
            items.sort((a, b) => {
                const ta = new Date(a.createdAt || 0).getTime();
                const tb = new Date(b.createdAt || 0).getTime();
                return tb - ta;
            });
            return items;
        } catch (e) {
            console.error("❌ Fetch Factory Queue Error:", e);
            return [];
        }
    },

    fetchSeedQueue: async (statuses = ['DRAFT', 'AUDITED', 'REJECTED']) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "seed_questions"),
                where("status", "in", statuses)
            );
            const snap = await getDocs(q);
            const items = [];
            snap.forEach(docSnap => {
                items.push(normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data() }));
            });
            items.sort((a, b) => {
                const ta = new Date(a.createdAt || 0).getTime();
                const tb = new Date(b.createdAt || 0).getTime();
                return tb - ta;
            });
            return items;
        } catch (e) {
            console.error("❌ Fetch Seed Queue Error:", e);
            return [];
        }
    },

    fetchQuestionManagerItems: async ({
        collectionName = 'past_papers',
        status = 'ALL',
        origin = 'ALL',
        grade = '',
        subject = '',
        topic = '',
        subTopic = '',
        max = 200
    } = {}) => {
        try {
            const colRef = collection(db, "artifacts", APP_ID, "public", "data", collectionName);
            const conditions = [];
            if (origin && origin !== 'ALL') conditions.push(where("origin", "==", origin));
            if (grade) conditions.push(where("grade", "==", grade));
            if (subject) conditions.push(where("subject", "==", subject));
            if (topic) conditions.push(where("topic", "==", topic));
            if (subTopic) conditions.push(where("subTopic", "==", subTopic));
            const pageLimit = Math.max(1, Number(max || 200));
            const fetchDocs = async (extraConditions = []) => {
                const q = query(colRef, ...conditions, ...extraConditions, limit(pageLimit));
                return getDocs(q);
            };

            const itemsMap = new Map();
            if (status && status !== 'ALL') {
                if (status === 'PUBLISHED') {
                    const [publishedSnap, legacySnap] = await Promise.all([
                        fetchDocs([where("status", "==", "PUBLISHED")]),
                        fetchDocs([where("status", "==", null)])
                    ]);
                    publishedSnap.forEach(docSnap => {
                        itemsMap.set(docSnap.id, normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data(), __collection: collectionName }));
                    });
                    legacySnap.forEach(docSnap => {
                        itemsMap.set(docSnap.id, normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data(), __collection: collectionName }));
                    });
                } else {
                    const snap = await fetchDocs([where("status", "==", status)]);
                    snap.forEach(docSnap => {
                        itemsMap.set(docSnap.id, normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data(), __collection: collectionName }));
                    });
                }
            } else {
                const snap = await fetchDocs();
                snap.forEach(docSnap => {
                    itemsMap.set(docSnap.id, normalizeQuestionRecord({ id: docSnap.id, ...docSnap.data(), __collection: collectionName }));
                });
            }

            const items = Array.from(itemsMap.values());
            items.sort((a, b) => {
                const ta = new Date(a.updatedAt || a.createdAt || a.uploadedAt || 0).getTime();
                const tb = new Date(b.updatedAt || b.createdAt || b.uploadedAt || 0).getTime();
                return tb - ta;
            });
            return items.slice(0, pageLimit);
        } catch (e) {
            console.error("❌ Fetch Question Manager Items Error:", e);
            return [];
        }
    },

    batchDeleteQuestions: async (questionIds = [], collectionName = 'past_papers') => {
        try {
            if (!Array.isArray(questionIds) || questionIds.length === 0) return { deleted: 0 };
            let deleted = 0;
            const chunkSize = 450;
            for (let i = 0; i < questionIds.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = questionIds.slice(i, i + chunkSize);
                chunk.forEach((qid) => {
                    if (!qid) return;
                    const ref = doc(db, "artifacts", APP_ID, "public", "data", collectionName, qid);
                    batch.delete(ref);
                });
                await batch.commit();
                deleted += chunk.length;
            }
            return { deleted };
        } catch (e) {
            console.error("❌ Batch Delete Questions Error:", e);
            return { deleted: 0, error: e.message || '未知錯誤' };
        }
    },

    getFactoryStats: async () => {
        try {
            const snap = await getDocs(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"));
            let draftCount = 0;
            let publishedCount = 0;
            let auditedCount = 0;
            let rejectedCount = 0;
            snap.forEach(docSnap => {
                const data = docSnap.data() || {};
                const status = data.status || 'PUBLISHED';
                if (status === 'DRAFT') draftCount += 1;
                else if (status === 'AUDITED') auditedCount += 1;
                else if (status === 'REJECTED') rejectedCount += 1;
                else publishedCount += 1;
            });
            return { draftCount, publishedCount, auditedCount, rejectedCount };
        } catch (e) {
            console.error("❌ Get Factory Stats Error:", e);
            return { draftCount: 0, publishedCount: 0, auditedCount: 0, rejectedCount: 0 };
        }
    },

    getPublishedQuestionCounts: async ({ grade = null, subject = null } = {}) => {
        try {
            const buildQuery = (statusValue) => {
                const conditions = [];
                if (grade) conditions.push(where("grade", "==", grade));
                if (subject) conditions.push(where("subject", "==", subject));
                if (statusValue === null) conditions.push(where("status", "==", null));
                else conditions.push(where("status", "==", statusValue));
                return query(
                    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
                    ...conditions
                );
            };

            const [publishedSnap, legacySnap] = await Promise.all([
                getDocs(buildQuery('PUBLISHED')),
                getDocs(buildQuery(null))
            ]);

            const seen = new Set();
            const counts = {};

            const pushDoc = (docSnap) => {
                if (seen.has(docSnap.id)) return;
                seen.add(docSnap.id);
                const data = docSnap.data() || {};
                const topicKey = data.topic_id || data.topicId || data.topic || 'unknown';
                if (!counts[topicKey]) {
                    counts[topicKey] = { total: 0, seed: 0, ai: 0, subTopics: {} };
                }
                counts[topicKey].total += 1;
                const origin = data.origin || 'AI_GEN';
                if (origin === 'SEED') counts[topicKey].seed += 1;
                else counts[topicKey].ai += 1;
                const subTopic = data.subTopic || data.sub_topic || data.subtopic || null;
                if (subTopic) {
                    if (!counts[topicKey].subTopics[subTopic]) {
                        counts[topicKey].subTopics[subTopic] = { total: 0, seed: 0, ai: 0 };
                    }
                    counts[topicKey].subTopics[subTopic].total += 1;
                    if (origin === 'SEED') counts[topicKey].subTopics[subTopic].seed += 1;
                    else counts[topicKey].subTopics[subTopic].ai += 1;
                }
            };

            publishedSnap.forEach(pushDoc);
            legacySnap.forEach(pushDoc);

            return counts;
        } catch (e) {
            console.error("❌ Get Published Question Counts Error:", e);
            return {};
        }
    },

    getPublishedQuestionStats: async () => {
        try {
            const snap = await getDocs(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers")
            );

            const stats = {};

            snap.forEach((docSnap) => {
                const data = docSnap.data() || {};
                const status = data.status || 'PUBLISHED';
                if (status !== 'PUBLISHED') return;
                const gradeKey = data.grade || '未分類';
                const subjectKey = data.subject || '未分類';
                const topicKey = data.topic_id || data.topicId || data.topic || '未分類';
                if (!stats[gradeKey]) stats[gradeKey] = {};
                if (!stats[gradeKey][subjectKey]) stats[gradeKey][subjectKey] = {};
                if (!stats[gradeKey][subjectKey][topicKey]) {
                    stats[gradeKey][subjectKey][topicKey] = { total: 0, subTopics: {} };
                }
                stats[gradeKey][subjectKey][topicKey].total += 1;
                const subTopic = data.subTopic || data.sub_topic || data.subtopic || null;
                if (subTopic) {
                    const subTopics = stats[gradeKey][subjectKey][topicKey].subTopics;
                    subTopics[subTopic] = (subTopics[subTopic] || 0) + 1;
                }
            });

            return stats;
        } catch (e) {
            console.error("❌ Get Published Question Stats Error:", e);
            return {};
        }
    },

    getAllPublishedQuestions: async () => {
        try {
            const snap = await getDocs(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers")
            );
            const result = [];
            snap.forEach((docSnap) => {
                const data = docSnap.data() || {};
                const status = data.status || 'PUBLISHED';
                if (status !== 'PUBLISHED') return;
                result.push({ id: docSnap.id, ...data });
            });
            return result;
        } catch (e) {
            console.error("❌ Get All Published Questions Error:", e);
            return [];
        }
    },

    batchUpdateQuestions: async (updates = []) => {
        try {
            if (!Array.isArray(updates) || updates.length === 0) return { updated: 0 };
            let updated = 0;
            const chunkSize = 450;
            for (let i = 0; i < updates.length; i += chunkSize) {
                const batch = writeBatch(db);
                const chunk = updates.slice(i, i + chunkSize);
                chunk.forEach(({ id, data }) => {
                    if (!id || !data) return;
                    const questionRef = doc(db, "artifacts", APP_ID, "public", "data", "past_papers", id);
                    batch.update(questionRef, { ...data, updatedAt: new Date().toISOString() });
                });
                await batch.commit();
                updated += chunk.length;
            }
            return { updated };
        } catch (e) {
            console.error("❌ Batch Update Questions Error:", e);
            return { updated: 0, error: e.message || '未知錯誤' };
        }
    },

    deleteQuestionFromPool: async (questionId) => {
        try {
            if (!questionId) return false;
            await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "past_papers", questionId));
            return true;
        } catch (e) {
            console.error("❌ Delete Question Error:", e);
            return false;
        }
    },

    fetchQuestionsByIds: async (questionIds = []) => {
        try {
            if (!Array.isArray(questionIds) || questionIds.length === 0) return [];
            const items = await Promise.all(questionIds.map(async (qid) => {
                const ref = doc(db, "artifacts", APP_ID, "public", "data", "past_papers", qid);
                const snap = await getDoc(ref);
                if (!snap.exists()) return null;
                return normalizeQuestionRecord({ id: snap.id, ...snap.data() });
            }));
            return items.filter(Boolean);
        } catch (e) {
            console.error("❌ Fetch Questions By IDs Error:", e);
            return [];
        }
    },

    createFactoryQuestions: async (questions = [], meta = {}) => {
        try {
            if (!Array.isArray(questions) || questions.length === 0) return [];
            const batch = writeBatch(db);
            const createdIds = [];
            const now = new Date().toISOString();
            const status = meta.status || 'DRAFT';
            const poolType = meta.poolType || null;
            questions.forEach((q) => {
                const docRef = doc(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"));
                const payload = normalizeQuestionRecord({
                    ...q,
                    status,
                    poolType: q.poolType || poolType || q.poolType,
                    auditMeta: q.auditMeta || meta.auditMeta || undefined,
                    createdAt: q.createdAt || now,
                    updatedAt: now
                });
                batch.set(docRef, payload);
                createdIds.push(docRef.id);
            });
            await batch.commit();
            return createdIds;
        } catch (e) {
            console.error("❌ Create Factory Questions Error:", e);
            return [];
        }
    },

    updateQuestionFactoryStatus: async (questionId, updates = {}) => {
        try {
            if (!questionId) return false;
            const questionRef = doc(db, "artifacts", APP_ID, "public", "data", "past_papers", questionId);
            await updateDoc(questionRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("❌ Update Question Status Error:", e);
            return false;
        }
    },

    updateSeedQuestionStatus: async (questionId, updates = {}) => {
        try {
            if (!questionId) return false;
            const questionRef = doc(db, "artifacts", APP_ID, "public", "data", "seed_questions", questionId);
            await updateDoc(questionRef, {
                ...updates,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (e) {
            console.error("❌ Update Seed Question Status Error:", e);
            return false;
        }
    },

    deleteSeedQuestion: async (questionId) => {
        try {
            if (!questionId) return false;
            await deleteDoc(doc(db, "artifacts", APP_ID, "public", "data", "seed_questions", questionId));
            return true;
        } catch (e) {
            console.error("❌ Delete Seed Question Error:", e);
            return false;
        }
    },

    publishSeedToPool: async (seedQuestion = {}, overrides = {}) => {
        try {
            const { id, __collection, ...rest } = seedQuestion || {};
            const now = new Date().toISOString();
            const payload = normalizeQuestionRecord({
                ...rest,
                ...overrides,
                origin: 'SEED',
                status: 'PUBLISHED',
                createdAt: rest.createdAt || now,
                publishedAt: now,
                updatedAt: now
            });
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
                payload
            );
            return docRef.id;
        } catch (e) {
            console.error("❌ Publish Seed Error:", e);
            return null;
        }
    },

    saveAuditReport: async (payload = {}) => {
        try {
            const docRef = await addDoc(
                collection(db, "artifacts", APP_ID, "public", "data", "audit_reports"),
                {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    createdAtServer: serverTimestamp()
                }
            );
            return docRef.id;
        } catch (e) {
            console.error("❌ Save Audit Report Error:", e);
            return null;
        }
    },

    /**
     * 獲取題目的邏輯補充（從題目本身或從 developer_feedback 關聯獲取）
     * @param {Object} question - 題目對象
     * @returns {Promise<string|null>} 邏輯補充文本，如果不存在則返回 null
     */
    getLogicSupplementForQuestion: async (question) => {
        try {
            // 優先從題目本身獲取
            if (question.logic_supplement) {
                return question.logic_supplement;
            }

            // 如果題目沒有，嘗試從 developer_feedback 中匹配
            const feedbacks = await DB_SERVICE.getActiveFeedback(
                question.type ? [question.type] : [],
                question.subject,
                question.category || question.topic
            );

            // 返回最相關的回饋（選擇最新的）
            if (feedbacks.length > 0) {
                // 按創建時間排序，返回最新的
                const sortedFeedbacks = feedbacks.sort((a, b) => {
                    const timeA = new Date(a.createdAt || 0).getTime();
                    const timeB = new Date(b.createdAt || 0).getTime();
                    return timeB - timeA;
                });
                return sortedFeedbacks[0].feedback;
            }

            return null;
        } catch (e) {
            console.error("❌ Get Logic Supplement Error:", e);
            return null;
        }
    }
}; 
