import { RAG_SERVICE } from './rag-service';

// --- Fallback Local Brain ---
const LOCAL_BRAIN = {
  generateQuestion: (level, difficulty, selectedTopics, allTopicsList) => {
    const validTopics = selectedTopics.filter(id => allTopicsList.find(t => t.id === id));
    if (validTopics.length === 0) return null;
    const randomTopicId = validTopics[Math.floor(Math.random() * validTopics.length)];
    const topicDetails = allTopicsList.find(t => t.id === randomTopicId);
    return { 
        id: Date.now(), 
        category: topicDetails.name, 
        type: 'text', 
        question: `(系統備援) 目前無法連接 AI 服務。\n這可能是後端 API 連線問題。\n題目單元：${topicDetails.name}`, 
        hint: "請檢查 API Route 設定", 
        explanation: "AI Service Unavailable", 
        answer: 0, 
        unit: '', 
        lang: 'zh-HK', 
        source: 'local_fallback' 
    };
  }
};

export const AI_SERVICE = {
  generateQuestion: async (level, difficulty, selectedTopicIds, allTopicsList) => {
    // 1. 先嘗試找種子題目 (RAG)
    const seedQuestion = await RAG_SERVICE.fetchSeedQuestion(level, selectedTopicIds, allTopicsList);
    // Fallback seed logic if none found in RAG
    const activeSeed = seedQuestion || {
        question: "基礎數學運算",
        topic: allTopicsList.find(t => t.id === selectedTopicIds[0])?.name || "General Math",
        type: 'text'
    };
    console.log("🌱 Seed Found for Context:", activeSeed.question);

    // 2. 建構 Prompt
    const promptText = `
        Role: Professional HK Primary Math Teacher.
        Task: Create a NEW variation of the following seed question.
        Seed: "${activeSeed.question}" (Topic: ${activeSeed.topic})
        Level: ${level}
        
        Constraints:
        1. Maintain the same difficulty and mathematical concept.
        2. Change the names, context, and numbers.
        3. If it is a division word problem, ensure you calculate the new answer properly.
        4. Output strict JSON only.
        5. IMPORTANT: Ensure all strings are valid JSON. Escape all backslashes.
        
        Output JSON Schema: { "question": "string", "answer": "string/number", "explanation": "string", "hint": "string", "params": null }
    `;

    // 3. 呼叫 Next.js API Route
    console.log("🚀 Calling Next.js API Route (/api/chat)...");
    try {
        const response = await fetch('/api/chat', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: promptText }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const data = await response.json();
        
        let aiResult = data;
        // 如果後端回傳的是字串，嘗試解析
        if (data.response && typeof data.response === 'string') {
             try {
                const cleanJson = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
                aiResult = JSON.parse(cleanJson);
             } catch (e) {
                 console.warn("JSON Parse from API text failed, using raw data if possible", e);
             }
        } else if (data.data) {
             aiResult = data.data;
        }

        const newQ = {
             ...aiResult,
             id: Date.now(),
             source: 'ai_next_api',
             type: activeSeed.type || 'text', 
             topic: activeSeed.topic,
             is_seed: false
        };

        // 儲存生成的題目
        RAG_SERVICE.saveGeneratedQuestion(newQ, selectedTopicIds[0], level);
        return newQ;

    } catch (err) {
        console.error("AI Generation Failed:", err);
        // 錯誤時回退到本地邏輯
        return {
            ...LOCAL_BRAIN.generateQuestion(level, difficulty, selectedTopicIds, allTopicsList),
            question: `(連線錯誤) 無法生成題目。\n錯誤訊息: ${err.message}\n請檢查 API Key 或網路連線。`,
            source: 'error_fallback'
        };
    }
  },
  speakQuestion: (text, lang) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'zh-HK' ? 'zh-HK' : 'en-US';
      utterance.rate = 0.85; 
      window.speechSynthesis.speak(utterance);
    }
  }
};