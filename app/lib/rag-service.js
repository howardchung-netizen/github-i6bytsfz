import { db } from './firebase'; 
import { collection, getDocs, addDoc, query, where, limit } from "firebase/firestore";
import { APP_ID } from './constants';
import { DB_SERVICE } from './db-service';

export const RAG_SERVICE = {
    fetchCachedGeneratedQuestion: async (level, selectedTopics) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), 
                where("grade", "==", level),
                where("source", "in", ["ai_cloud", "ai_client_test", "ai_next_api"]), 
                limit(20)
            );
            const snap = await getDocs(q);
            if (snap.empty) return null;
            const papers = [];
            snap.forEach(d => papers.push({ id: d.id, ...d.data() }));
            const relevant = papers.find(p => selectedTopics.some(tid => p.topic_id === tid));
            if (relevant) return relevant;
            return null;
        } catch (e) { return null; }
    },
    fetchSeedQuestion: async (level, selectedTopics, allTopicsList, user = null, selectedSubTopics = {}) => {
        try {
            const targetTopicObjs = allTopicsList.filter(t => selectedTopics.includes(t.id));
            const targetTopicId = selectedTopics && selectedTopics.length > 0 ? selectedTopics[0] : null;
            const allowedSubTopics = targetTopicId && Array.isArray(selectedSubTopics?.[targetTopicId])
                ? selectedSubTopics[targetTopicId].filter(Boolean)
                : [];
            const papers = [];
            
            // 1. 查詢主資料庫（開發者上傳的種子題目）
            const mainQuery = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), 
                where("grade", "==", level),
                limit(50)
            );
            const mainSnap = await getDocs(mainQuery);
            mainSnap.forEach(d => {
                const data = d.data() || {};
                const status = data.status || 'PUBLISHED';
                if (status !== 'PUBLISHED') return;
                papers.push({ id: d.id, source: 'main_db', ...data, status });
            });
            
            // 2. 如果是教學者，同時查詢機構專用庫
            if (user && user.role === 'teacher' && user.institutionName) {
                try {
                    const teacherQuery = query(
                        collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", user.institutionName, "questions"),
                        where("grade", "==", level),
                        limit(50)
                    );
                    const teacherSnap = await getDocs(teacherQuery);
                    teacherSnap.forEach(d => {
                        const data = d.data() || {};
                        const status = data.status || 'PUBLISHED';
                        if (status !== 'PUBLISHED') return;
                        papers.push({ id: d.id, source: 'teacher_db', institutionName: user.institutionName, ...data, status });
                    });
                } catch (e) {
                    console.error("Fetch Teacher Seed Questions Error:", e);
                    // 如果機構庫不存在或查詢失敗，繼續使用主庫
                }
            }
            
            if (papers.length === 0) return null;
            
            // Filter: Must NOT be AI generated
            const seeds = papers.filter(p => {
                if (p.source && p.source.startsWith('ai_')) return false; 
                return targetTopicObjs.some(t => {
                    return (p.topic && t.name.includes(p.topic)) || (p.question && p.question.includes(t.name.split(' ')[0]));
                });
            });

            if (allowedSubTopics.length > 0) {
                const subTopicSeeds = seeds.filter(p => {
                    const st = p.subTopic || p.sub_topic || p.subtopic || '';
                    return st && allowedSubTopics.includes(st);
                });
                if (subTopicSeeds.length > 0) return subTopicSeeds[Math.floor(Math.random() * subTopicSeeds.length)];
            }
            
            if (seeds.length === 0) {
                 const autoSeeds = papers.filter(p => p.source === 'seed_init' || p.source === 'teacher_db');
                 const relevantAutoSeeds = autoSeeds.filter(p => targetTopicObjs.some(t => p.topic && t.name.includes(p.topic)));
                 if (allowedSubTopics.length > 0) {
                    const subTopicAutoSeeds = relevantAutoSeeds.filter(p => {
                        const st = p.subTopic || p.sub_topic || p.subtopic || '';
                        return st && allowedSubTopics.includes(st);
                    });
                    if (subTopicAutoSeeds.length > 0) return subTopicAutoSeeds[Math.floor(Math.random() * subTopicAutoSeeds.length)];
                 }
                 if(relevantAutoSeeds.length > 0) return relevantAutoSeeds[Math.floor(Math.random() * relevantAutoSeeds.length)];
            }
            if (seeds.length > 0) return seeds[Math.floor(Math.random() * seeds.length)];
            return null;
        } catch (e) { return null; }
    },
    /**
     * 儲存生成的題目到 Firebase
     * 分類邏輯：年級 > 科目 > 單元 > 子單元
     * 
     * @param {object} newQuestion - 題目物件
     * @param {string} topicId - 單元 ID（如 'p4_division'）
     * @param {string} level - 年級（如 'P4'）
     * @param {string} subject - 科目（'math' | 'chi' | 'eng'），如果未提供則從 topicId 推斷
     * @param {array} allTopicsList - 所有單元列表（用於推斷 subject，如果未提供）
     */
    saveGeneratedQuestion: async (newQuestion, topicId, level, subject = null, allTopicsList = null) => {
        try {
            // 如果沒有提供 subject，嘗試從 topicId 推斷
            let finalSubject = subject;
            if (!finalSubject && topicId && allTopicsList) {
                const topic = allTopicsList.find(t => t.id === topicId);
                if (topic && topic.subject) {
                    finalSubject = topic.subject;
                }
            }
            
            // 如果還是沒有，嘗試從 newQuestion 中獲取（如果題目物件本身有 subject）
            if (!finalSubject && newQuestion.subject) {
                finalSubject = newQuestion.subject;
            }
            
            // 最後的 fallback：默認為 'math'
            if (!finalSubject) {
                finalSubject = 'math';
                console.warn(`⚠️ 無法確定 subject，使用默認值 'math' (topicId: ${topicId})`);
            }
            
            await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), {
                ...newQuestion,
                grade: level,              // 年級
                subject: finalSubject,      // 科目（新增）
                topic_id: topicId,         // 單元 ID
                source: 'ai_next_api',     // 標記來源為 Next.js API
                created_at: new Date().toISOString()
            });
            
            console.log(`✅ 已儲存題目：grade=${level}, subject=${finalSubject}, topic_id=${topicId}`);
        } catch (e) { 
            console.error("Save gen error", e); 
        }
    },
    
    /**
     * Fetches an unused question for a user (a question they haven't attempted yet).
     * Uses client-side filtering strategy since Firestore doesn't support NOT IN for large arrays.
     * 
     * @param {string} level - Grade level (e.g., 'P4')
     * @param {string} topicId - Topic ID (e.g., 'p4_division')
     * @param {string} subject - Subject ('math' | 'chi' | 'eng')
     * @param {string} userId - User UID
     * @returns {Promise<object|null>} - Returns a question object or null if no unused questions found
     */
    fetchUnusedQuestion: async (level, topicId, subject, userId) => {
        try {
            if (!userId) {
                console.warn("⚠️ fetchUnusedQuestion: Missing userId");
                return null;
            }
            
            // Step 1: Fetch user's usage history for this topic (or all usage if topic filtering is not needed)
            const usageQuery = query(
                collection(db, "artifacts", APP_ID, "users", userId, "question_usage")
            );
            const usageSnap = await getDocs(usageQuery);
            const usedQuestionIds = new Set(usageSnap.docs.map(d => d.data().questionId || d.id));
            
            console.log(`📊 User has attempted ${usedQuestionIds.size} questions`);
            
            // Step 2: Query candidate questions matching criteria
            // 使用服務器端過濾（grade + subject + topic_id + source）以提升性能
            // 分類邏輯：年級 > 科目 > 單元 > 子單元
            const queryConditions = [
                where("grade", "==", level),
                where("source", "==", "ai_next_api")
            ];
            
            // 如果提供了 subject，在服務器端過濾（需要 Firebase 索引）
            if (subject) {
                queryConditions.push(where("subject", "==", subject));
            }
            
            // 如果提供了 topicId，在服務器端過濾（需要 Firebase 索引）
            if (topicId) {
                queryConditions.push(where("topic_id", "==", topicId));
            }
            
            const questionsQuery = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
                ...queryConditions,
                limit(50) // 服務器端過濾後，通常不需要查詢太多
            );
            const questionsSnap = await getDocs(questionsQuery);
            
            if (questionsSnap.empty) {
                console.log(`⚠️ No questions found for grade=${level}, subject=${subject || 'any'}, topic=${topicId || 'any'}`);
                return null;
            }
            
            console.log(`📊 Server-side filtered: found ${questionsSnap.size} questions (grade=${level}, subject=${subject || 'any'}, topic=${topicId || 'any'})`);
            
            // Step 3: Client-side filtering (only for usage exclusion)
            // 現在只需要過濾已使用的題目，其他過濾已在服務器端完成
            const candidateQuestions = [];
            questionsSnap.forEach(doc => {
                const questionData = doc.data();
                const questionId = doc.id;
                
                // 只過濾已使用的題目（服務器端無法做 NOT IN 查詢）
                if (usedQuestionIds.has(questionId) || usedQuestionIds.has(questionId.toString())) {
                    return; // Skip if already used
                }
                
                candidateQuestions.push({
                    id: questionId,
                    ...questionData
                });
            });
            
            console.log(`📋 Found ${candidateQuestions.length} unused questions after filtering`);
            
            // Step 4: Return a random unused question
            if (candidateQuestions.length > 0) {
                const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
                const selectedQuestion = candidateQuestions[randomIndex];
                console.log(`✅ Selected unused question: ${selectedQuestion.id}`);
                return selectedQuestion;
            }
            
            console.log(`⚠️ No unused questions found for user ${userId} (grade: ${level}, topic: ${topicId}, subject: ${subject})`);
            return null;
            
        } catch (e) {
            console.error("❌ Fetch Unused Question Error:", e);
            return null;
        }
    }
};