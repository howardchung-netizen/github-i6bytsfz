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
    fetchSeedQuestion: async (level, selectedTopics, allTopicsList) => {
        try {
            const targetTopicObjs = allTopicsList.filter(t => selectedTopics.includes(t.id));
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), 
                where("grade", "==", level),
                limit(50)
            );
            const snap = await getDocs(q);
            if (snap.empty) return null;
            const papers = [];
            snap.forEach(d => papers.push({ id: d.id, ...d.data() }));
            // Filter: Must NOT be AI generated
            const seeds = papers.filter(p => {
                if (p.source && p.source.startsWith('ai_')) return false; 
                return targetTopicObjs.some(t => {
                    return (p.topic && t.name.includes(p.topic)) || (p.question && p.question.includes(t.name.split(' ')[0]));
                });
            });
            if (seeds.length === 0) {
                 const autoSeeds = papers.filter(p => p.source === 'seed_init');
                 const relevantAutoSeeds = autoSeeds.filter(p => targetTopicObjs.some(t => p.topic && t.name.includes(p.topic)));
                 if(relevantAutoSeeds.length > 0) return relevantAutoSeeds[Math.floor(Math.random() * relevantAutoSeeds.length)];
            }
            if (seeds.length > 0) return seeds[Math.floor(Math.random() * seeds.length)];
            return null;
        } catch (e) { return null; }
    },
    saveGeneratedQuestion: async (newQuestion, topicId, level) => {
        try {
            await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), {
                ...newQuestion,
                grade: level,
                topic_id: topicId,
                source: 'ai_next_api', // 標記來源為 Next.js API
                created_at: new Date().toISOString()
            });
        } catch (e) { console.error("Save gen error", e); }
    }
};