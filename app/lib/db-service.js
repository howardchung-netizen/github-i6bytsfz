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
    writeBatch 
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
    }
};