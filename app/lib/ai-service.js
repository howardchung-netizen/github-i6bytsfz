import { RAG_SERVICE } from './rag-service';
import { DB_SERVICE } from './db-service';

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
  generateQuestion: async (level, difficulty, selectedTopicIds = [], allTopicsList, subjectHint = null) => {
    // 1. 如果 selectedTopicIds 為空，使用 subjectHint 或自動偵測
    let targetSubject = subjectHint;
    if (!targetSubject && selectedTopicIds.length === 0) {
        // 自動偵測：從該年級的所有題目中隨機選擇一個科目
        const availableSubjects = [...new Set(allTopicsList.filter(t => t.grade === level).map(t => t.subject))];
        targetSubject = availableSubjects.length > 0 
            ? availableSubjects[Math.floor(Math.random() * availableSubjects.length)]
            : 'math';
    } else if (!targetSubject && selectedTopicIds.length > 0) {
        // 從選中的 topics 判斷科目
        const topic = allTopicsList.find(t => selectedTopicIds.includes(t.id));
        targetSubject = topic?.subject || 'math';
    }
    
    // 如果 selectedTopicIds 為空，從該科目的所有單元中隨機選擇
    let finalTopicIds = selectedTopicIds;
    if (finalTopicIds.length === 0 && targetSubject) {
        const subjectTopics = allTopicsList.filter(t => t.subject === targetSubject && t.grade === level);
        if (subjectTopics.length > 0) {
            // 隨機選擇一個單元
            const randomTopic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
            finalTopicIds = [randomTopic.id];
        }
    }
    
    // 2. 先嘗試找種子題目 (RAG)
    const seedQuestion = await RAG_SERVICE.fetchSeedQuestion(level, finalTopicIds, allTopicsList);
    // Fallback seed logic if none found in RAG
    const activeSeed = seedQuestion || {
        question: targetSubject === 'math' ? "基礎數學運算" : targetSubject === 'chi' ? "基礎中文練習" : "Basic English Practice",
        topic: allTopicsList.find(t => finalTopicIds.includes(t.id))?.name || `${targetSubject === 'math' ? '數學' : targetSubject === 'chi' ? '中文' : '英文'}綜合練習`,
        type: 'text',
        subject: targetSubject
    };
    console.log("🌱 Seed Found for Context:", activeSeed.question, "Subject:", targetSubject);

    // 3. 查詢相關回饋（開發者回饋 + 已審核的教學者回饋）
    let relevantFeedback = [];
    try {
        // 判斷題型（從種子題目或主題推斷）
        const inferredQuestionTypes = [];
        if (activeSeed.type === 'mcq' || activeSeed.type === 'multiple-choice') {
            inferredQuestionTypes.push('選擇題');
        }
        if (activeSeed.question && (activeSeed.question.includes('應用') || activeSeed.question.includes('問題'))) {
            inferredQuestionTypes.push('應用題');
        }
        if (activeSeed.question && (activeSeed.question.includes('計算') || activeSeed.question.includes('算'))) {
            inferredQuestionTypes.push('計算題');
        }
        if (activeSeed.question && (activeSeed.question.includes('圖') || activeSeed.question.includes('形'))) {
            inferredQuestionTypes.push('圖形題');
        }
        // 如果無法推斷，使用通用標籤
        if (inferredQuestionTypes.length === 0) {
            inferredQuestionTypes.push('文字題');
        }

        // 查詢回饋
        relevantFeedback = await DB_SERVICE.getActiveFeedback(
            inferredQuestionTypes,
            targetSubject,
            null // category 暫時不傳，因為種子題目可能沒有明確分類
        );
        
        if (relevantFeedback.length > 0) {
            console.log(`📝 找到 ${relevantFeedback.length} 條相關回饋，將應用於題目生成`);
        }
    } catch (e) {
        console.error("Get Feedback Error:", e);
        // 即使回饋查詢失敗，也繼續生成題目
    }

    // 4. 建構 Prompt
    // 檢查是否為數學科
    const isMathSubject = targetSubject === 'math' || (selectedTopicIds.length > 0 && selectedTopicIds.some(topicId => {
        const topic = allTopicsList.find(t => t.id === topicId);
        return topic && topic.subject === 'math';
    }));
    
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
        ${isMathSubject ? '6. For Math questions, you MUST create a multiple-choice question (MCQ) with exactly 8 options: 1 correct answer and 7 plausible distractors (wrong answers that are mathematically reasonable).' : '6. If creating a multiple-choice question, include 4 options: 1 correct answer and 3 plausible distractors.'}
        ${relevantFeedback.length > 0 ? `\n\n開發者回饋（請嚴格遵守）：\n${relevantFeedback.map((fb, idx) => `${idx + 1}. [題型：${fb.questionType?.join('、') || '通用'}，分類：${fb.category || '通用'}] ${fb.feedback}`).join('\n')}\n\n請在生成題目時參考以上回饋，確保題目質量符合要求。` : ''}
        
        Output JSON Schema: ${isMathSubject ? 
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", ..., "option8"] (exactly 8 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string", "hint": "string", "shape": "string (optional: rectangle, square, triangle, circle, trapezoid, parallelogram, irregular, composite, map_grid)", "params": "object (optional: for geometry shapes, e.g. {w: 5, h: 3} for rectangle, {radius: 4} for circle, {base: 6, height: 4} for triangle, {top: 4, bottom: 8, height: 5} for trapezoid, {points: [{x: -2, y: -1}, {x: 2, y: -1}, {x: 3, y: 2}, {x: -1, y: 2}]} for irregular)", "mapData": "object (optional: for map_grid type, e.g. {gridSize: {rows: 5, cols: 5}, startPos: {row: 2, col: 2}, path: [{direction: "north", steps: 2}, {direction: "east", steps: 3}], landmarks: [{row: 1, col: 1, label: "學校"}]})" }' :
            '{ "question": "string", "answer": "string/number", "explanation": "string", "hint": "string", "params": null }'
        }
        
        IMPORTANT for geometry questions:
        - If the question involves area/perimeter calculations with shapes, include "type": "geometry" and appropriate "shape" and "params"
        - For map/direction questions, use "shape": "map_grid" and provide "mapData" with grid layout, start position, path, and landmarks
        - Use LaTeX format for fractions: $\\frac{3}{8}$ for displaying fractions in the question text
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
            
            // 特別處理配額超限錯誤
            if (errorData.isQuotaExceeded) {
                const retryAfter = errorData.retryAfter || null;
                const userMsg = errorData.userMessage || `API 配額已達上限（免費層每分鐘 20 個請求）。${retryAfter ? `請等待約 ${retryAfter} 秒後再試。` : '請稍後再試。'}`;
                const errorMsg = `${errorData.error || 'Quota Exceeded'}\n\n${userMsg}`;
                throw new Error(errorMsg);
            }
            
            // 使用後端返回的詳細錯誤訊息（如果有 message 欄位）
            const errorMsg = errorData.userMessage || errorData.message || errorData.error || `API Error: ${response.status}`;
            throw new Error(errorMsg);
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
        // 錯誤時回退到本地邏輯，顯示詳細錯誤訊息
        const errorMessage = err.message || '未知錯誤';
        
        // 檢查是否為配額超限錯誤
        const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                            errorMessage.toLowerCase().includes('rate limit') ||
                            errorMessage.toLowerCase().includes('exceeded') ||
                            errorMessage.toLowerCase().includes('配額');
        
        // 檢查是否為每日限制（從錯誤訊息中提取）
        const isDailyLimit = errorMessage.includes('每日') || 
                            errorMessage.includes('daily') ||
                            (errorMessage.includes('250') && errorMessage.includes('請求'));
        
        let suggestionText = '';
        if (isQuotaError) {
            if (isDailyLimit) {
                suggestionText = `\n\n💡 這是 API 每日配額限制（免費層每日 250 個請求）：\n1. 您今天的配額已用完，請明天再試\n2. 或考慮升級到付費方案以獲得更高配額\n3. 您可以到 https://ai.dev/usage?tab=rate-limit 查看使用情況\n4. 建議：避免頻繁測試，節省配額用於實際練習`;
            } else {
                suggestionText = `\n\n💡 這是 API 配額限制（免費層每分鐘 20 個請求）：\n1. 請等待約 20-30 秒後再試\n2. 或考慮升級到付費方案以獲得更高配額\n3. 目前建議：放慢生成題目的速度，避免連續快速請求\n4. 您可以到 https://ai.dev/usage?tab=rate-limit 查看使用情況`;
            }
        } else {
            suggestionText = `\n\n💡 建議：\n1. 請確認 VPN 已開啟並連線到台灣地區\n2. 檢查網路連線是否正常\n3. 如問題持續，請稍後再試`;
        }
        
        return {
            ...LOCAL_BRAIN.generateQuestion(level, difficulty, selectedTopicIds, allTopicsList),
            question: `(連線錯誤) 無法生成題目。\n\n錯誤訊息: ${errorMessage}${suggestionText}`,
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
  },
  
  // 基於錯題生成「舉一反三」的新題目
  generateVariationFromMistake: async (mistakeData, level, allTopicsList) => {
    // 從錯題中提取信息
    const originalQuestion = mistakeData.question || '';
    const originalAnswer = mistakeData.answer || '';
    const category = mistakeData.category || '數學';
    const topic = mistakeData.topic || category;
    
    // 判斷科目（從 category 或 topic 推斷）
    let targetSubject = 'math';
    if (category && (category.includes('中文') || category.includes('Chinese'))) {
      targetSubject = 'chi';
    } else if (category && (category.includes('英文') || category.includes('English'))) {
      targetSubject = 'eng';
    } else {
      // 嘗試從 topics 中判斷
      const matchingTopic = allTopicsList.find(t => t.name === topic || t.name === category);
      if (matchingTopic) {
        targetSubject = matchingTopic.subject || 'math';
      }
    }
    
    // 檢查是否為數學科
    const isMathSubject = targetSubject === 'math';
    
    // 判斷題目類型（是否有 options 表示是選擇題）
    const hasOptions = mistakeData.options && Array.isArray(mistakeData.options);
    const isMCQ = hasOptions || originalQuestion.includes('選擇') || originalQuestion.includes('選項');
    
    // 建構 Prompt - 基於錯題生成新題目
    const promptText = `
        Role: Professional HK Primary ${targetSubject === 'math' ? 'Math' : targetSubject === 'chi' ? 'Chinese' : 'English'} Teacher.
        Task: Create a NEW variation question based on the student's mistake. This is a "舉一反三" (Learn by Analogy) exercise.
        
        Original Question: "${originalQuestion}"
        Correct Answer: "${originalAnswer}"
        Category/Topic: ${category} / ${topic}
        Level: ${level}
        
        Requirements:
        1. Maintain the SAME difficulty level and core concept as the original question.
        2. Change the numbers, names, context, and scenario completely.
        3. Keep the same mathematical/logical structure (e.g., if it's a division problem, make it a division problem with different numbers).
        4. Output strict JSON only.
        5. IMPORTANT: Ensure all strings are valid JSON. Escape all backslashes.
        ${isMathSubject && isMCQ ? '6. For Math MCQ questions, you MUST create a multiple-choice question with exactly 8 options: 1 correct answer and 7 plausible distractors (wrong answers that are mathematically reasonable).' : isMCQ ? '6. For MCQ questions, include 4 options: 1 correct answer and 3 plausible distractors.' : '6. Create a clear question that tests the same concept.'}
        7. The explanation should be concise (within 30 characters) and help the student understand the concept.
        
        Output JSON Schema: ${isMathSubject && isMCQ ? 
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", ..., "option8"] (exactly 8 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string (max 30 chars)", "hint": "string", "params": null }' :
            isMCQ ?
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", "option3", "option4"] (exactly 4 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string (max 30 chars)", "hint": "string", "params": null }' :
            '{ "question": "string", "type": "text", "answer": "string/number", "explanation": "string (max 30 chars)", "hint": "string", "params": null }'
        }
    `;

    console.log("🔄 Generating variation from mistake:", originalQuestion);
    
    try {
        const response = await fetch('/api/chat', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: promptText }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            // 特別處理配額超限錯誤
            if (errorData.isQuotaExceeded) {
                const retryAfter = errorData.retryAfter || null;
                const userMsg = errorData.userMessage || `API 配額已達上限（免費層每分鐘 20 個請求）。${retryAfter ? `請等待約 ${retryAfter} 秒後再試。` : '請稍後再試。'}`;
                const errorMsg = `${errorData.error || 'Quota Exceeded'}\n\n${userMsg}`;
                throw new Error(errorMsg);
            }
            
            // 使用後端返回的詳細錯誤訊息（如果有 message 欄位）
            const errorMsg = errorData.userMessage || errorData.message || errorData.error || `API Error: ${response.status}`;
            throw new Error(errorMsg);
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
             source: 'ai_variation_from_mistake',
             type: aiResult.type || (isMCQ ? 'mcq' : 'text'),
             topic: topic,
             category: category,
             is_variation: true,
             original_mistake_id: mistakeData.id || mistakeData.questionId
        };

        console.log("✅ Generated variation question:", newQ.question);
        return newQ;

    } catch (err) {
        console.error("AI Variation Generation Failed:", err);
        // 錯誤時回退：返回原題目但標記為 variation attempt failed
        return {
            ...mistakeData,
            id: Date.now(),
            question: `(生成失敗) ${originalQuestion}\n\n系統無法生成新題目，請檢查網路連線或稍後再試。`,
            source: 'variation_fallback',
            is_variation: false
        };
    }
  }
};