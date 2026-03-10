import { RAG_SERVICE } from './rag-service';
import { DB_SERVICE } from './db-service';
import { CURRENT_MODEL_NAME } from './constants';
import { normalizeQuestion, QuestionSchema } from './question-schema';

const resolveApiBaseUrl = () => {
    if (typeof window !== 'undefined') return '';
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || '';
    if (!envUrl) return '';
    if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) return envUrl;
    return `https://${envUrl}`;
};

const buildApiUrl = (path) => `${resolveApiBaseUrl()}${path}`;

// --- Batch Generation Cache ---
// 全局緩存：Map<cacheKey, question[]>
let questionCache = new Map();
let lastCacheKey = null; // 追蹤上次使用的緩存鍵，用於檢測主題切換
let dispatchCache = new Map();
let lastDispatchCacheKey = null;

// 批量大小常量
const BATCH_SIZE = 3;

// 生成緩存鍵：確保主題、科目、機構一致性
const generateCacheKey = (level, selectedTopicIds, subjectHint, user, difficulty, languagePreference = null, selectedSubTopics = {}) => {
    // 標準化 topicIds：排序並轉換為字符串
    const topicIdsStr = selectedTopicIds.length > 0 
        ? [...selectedTopicIds].sort().join(',') 
        : 'auto';
    
    // 獲取機構名稱（教學者專用）
    const institutionName = user?.institutionName || 'public';
    
    // 構建緩存鍵物件
    const subTopicsKey = Object.entries(selectedSubTopics || {})
        .filter(([, list]) => Array.isArray(list) && list.length > 0)
        .sort(([a], [b]) => String(a).localeCompare(String(b)))
        .map(([topicId, list]) => `${topicId}:${[...list].sort().join('|')}`)
        .join(',') || 'all';

    const keyObj = {
        level,
        topicIds: topicIdsStr,
        subjectHint: subjectHint || 'auto',
        institutionName,
        difficulty: difficulty || 'normal',
        languagePreference: languagePreference || 'default',
        subTopics: subTopicsKey
    };
    
    // 轉換為 JSON 字符串作為唯一鍵
    return JSON.stringify(keyObj);
};

const resolveSubject = (level, selectedTopicIds, allTopicsList, subjectHint = null) => {
    if (subjectHint) return subjectHint;
    if (selectedTopicIds.length > 0) {
        const topic = allTopicsList.find(t => selectedTopicIds.includes(t.id));
        return topic?.subject || 'math';
    }
    const availableSubjects = [...new Set(allTopicsList.filter(t => t.grade === level).map(t => t.subject))];
    return availableSubjects.length > 0
        ? availableSubjects[Math.floor(Math.random() * availableSubjects.length)]
        : 'math';
};

const buildDispatchPlan = (subject, count) => {
    if (subject === 'math') {
        const plan = ['TEXT', 'TEXT', 'IMAGE'];
        if (count <= plan.length) return plan.slice(0, count);
        return Array.from({ length: count }, (_, idx) => plan[idx % plan.length]);
    }
    return Array.from({ length: count }, () => 'TEXT');
};

// --- JSON 清理和解析輔助函數 ---
const cleanAndParseJSON = (jsonString) => {
    try {
        // 步驟 1：移除 markdown 代碼塊標記
        let cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 步驟 2：嘗試直接解析
        try {
            return JSON.parse(cleanJson);
        } catch (firstError) {
            // 步驟 3：如果失敗，嘗試提取 JSON 部分（查找第一個 [ 或 { 到最後一個 ] 或 }）
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
            const jsonMatch = arrayMatch || objectMatch;
            
            if (jsonMatch) {
                cleanJson = jsonMatch[0];
                try {
                    return JSON.parse(cleanJson);
                } catch (secondError) {
                    // 步驟 4：嘗試修復常見的轉義字符問題
                    // 修復單獨的反斜線（不在有效轉義序列中的）- 這是一個常見的 AI 生成問題
                    // 正則表達式：匹配反斜線，但不在 \", \\, \/, \b, \f, \n, \r, \t, \uXXXX 之前
                    cleanJson = cleanJson.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\');
                    try {
                        return JSON.parse(cleanJson);
                    } catch (thirdError) {
                        // 最後嘗試：更激進的清理
                        // 移除可能的控制字符（保留換行和製表符）
                        cleanJson = cleanJson.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
                        return JSON.parse(cleanJson);
                    }
                }
            }
            throw firstError;
        }
    } catch (error) {
        console.error("❌ JSON 清理失敗，原始響應前 500 字符:", jsonString.substring(0, 500));
        throw error;
    }
};

const formatFeedbackInstruction = (fb) => {
    const base = String(fb?.instruction || fb?.feedback || '').trim();
    if (!base) return '';
    const typeLabel = fb?.questionType?.length ? fb.questionType.join('、') : '通用';
    const categoryLabel = fb?.category || '通用';
    const sourceLabel = fb?.source === 'approved_teacher' ? '教學者' : '開發者';
    return `【${sourceLabel}｜題型：${typeLabel}｜分類：${categoryLabel}】${base}`;
};

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
  fetchQuestionBatch: async (count, level, selectedTopicIds = [], allTopicsList, subjectHint = null, user = null, selectedSubTopics = {}) => {
    const topicId = selectedTopicIds.length > 0 ? selectedTopicIds[0] : null;
    const resolvedSubject = resolveSubject(level, selectedTopicIds, allTopicsList, subjectHint);
    const modes = buildDispatchPlan(resolvedSubject, count);
    const userId = user?.uid || user?.id || user?.userId || null;
    const subTopicCandidates = topicId && selectedSubTopics?.[topicId]?.length > 0
        ? selectedSubTopics[topicId]
        : [];

    if (!userId) {
        console.warn('⚠️ fetchQuestionBatch: Missing userId, fallback to direct generation');
        const fallbackQuestion = await AI_SERVICE.generateQuestionDirect(
            level,
            'normal',
            selectedTopicIds,
            allTopicsList,
            resolvedSubject,
            user,
            null,
            selectedSubTopics
        );
        return fallbackQuestion ? [fallbackQuestion] : [];
    }

    const requests = modes.map((mode, idx) => {
        const chosenSubTopic = subTopicCandidates.length > 0
            ? subTopicCandidates[idx % subTopicCandidates.length]
            : null;
        const payload = {
            userId,
            grade: level,
            subject: resolvedSubject,
            topicId,
            subTopic: chosenSubTopic,
            mode,
            poolTypes: mode === 'TEXT' ? ['TEXT'] : ['IMAGE_STATIC', 'IMAGE_CANVAS'],
            topics: allTopicsList,
            userContext: user
        };
        return fetch(buildApiUrl('/api/dispatch'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(async (response) => {
            const data = await response.json();
            if (!response.ok || !data?.success) {
                throw new Error(data?.error || `Dispatch failed (${response.status})`);
            }
            return data.data?.question || null;
        });
    });

    const results = await Promise.allSettled(requests);
    const questions = results
        .map((res) => (res.status === 'fulfilled' ? res.value : null))
        .filter(Boolean);

    if (questions.length === 0) {
        console.warn('⚠️ fetchQuestionBatch: No questions returned from dispatch, fallback to direct generation');
        const fallbackQuestion = await AI_SERVICE.generateQuestionDirect(
            level,
            'normal',
            selectedTopicIds,
            allTopicsList,
            resolvedSubject,
            user,
            null,
            selectedSubTopics
        );
        return fallbackQuestion ? [fallbackQuestion] : [];
    }

    return questions;
  },

  generateQuestion: async (level, difficulty, selectedTopicIds = [], allTopicsList, subjectHint = null, user = null, languagePreference = null, selectedSubTopics = {}) => {
    const currentCacheKey = generateCacheKey(level, selectedTopicIds, subjectHint, user, difficulty, languagePreference, selectedSubTopics);

    if (lastDispatchCacheKey && lastDispatchCacheKey !== currentCacheKey) {
        if (dispatchCache.has(lastDispatchCacheKey)) {
            dispatchCache.delete(lastDispatchCacheKey);
        }
    }
    lastDispatchCacheKey = currentCacheKey;

    if (!dispatchCache.has(currentCacheKey)) {
        dispatchCache.set(currentCacheKey, []);
    }
    const cache = dispatchCache.get(currentCacheKey);

    if (cache.length > 0) {
        const cachedQuestion = cache.shift();
        return cachedQuestion;
    }

    const batch = await AI_SERVICE.fetchQuestionBatch(
        BATCH_SIZE,
        level,
        selectedTopicIds,
        allTopicsList,
        subjectHint,
        user,
        selectedSubTopics
    );

    if (!batch || batch.length === 0) {
        return LOCAL_BRAIN.generateQuestion(level, difficulty, selectedTopicIds, allTopicsList);
    }

    const [firstQuestion, ...remainingQuestions] = batch;
    if (remainingQuestions.length > 0) {
        cache.push(...remainingQuestions);
    }
    return firstQuestion;
  },

  generateQuestionDirect: async (
    level,
    difficulty,
    selectedTopicIds = [],
    allTopicsList,
    subjectHint = null,
    user = null,
    languagePreference = null,
    selectedSubTopics = {},
    dispatchMeta = {}
  ) => {
    // ===== 階段 1: 緩存鍵生成與失效檢查 =====
    const currentCacheKey = generateCacheKey(level, selectedTopicIds, subjectHint, user, difficulty, languagePreference, selectedSubTopics);
    
    // 如果緩存鍵改變（主題/科目/機構切換），清空舊緩存
    if (lastCacheKey && lastCacheKey !== currentCacheKey) {
        console.log(`🔄 緩存鍵改變，清空舊緩存`);
        console.log(`   舊鍵: ${lastCacheKey.substring(0, 100)}...`);
        console.log(`   新鍵: ${currentCacheKey.substring(0, 100)}...`);
        if (questionCache.has(lastCacheKey)) {
            questionCache.delete(lastCacheKey);
        }
    }
    lastCacheKey = currentCacheKey;
    
    // 初始化緩存（如果不存在）
    if (!questionCache.has(currentCacheKey)) {
        questionCache.set(currentCacheKey, []);
    }
    const cache = questionCache.get(currentCacheKey);
    
    // ===== 階段 2: 檢查緩存 =====
    // 如果緩存中有題目，直接返回並從緩存中移除
    if (cache.length > 0) {
        const cachedQuestion = cache.shift();
        console.log(`✅ 從緩存中獲取題目（剩餘 ${cache.length} 題）`);
        
        // 儲存緩存中的題目到資料庫
        try {
            // 從緩存鍵中獲取 subject（或從 topic 推斷）
            let cachedSubject = subjectHint;
            if (!cachedSubject && selectedTopicIds.length > 0 && allTopicsList) {
                const topic = allTopicsList.find(t => selectedTopicIds.includes(t.id));
                cachedSubject = topic?.subject || 'math';
            }
            
            await RAG_SERVICE.saveGeneratedQuestion(
                cachedQuestion, 
                selectedTopicIds[0] || null, 
                level,
                cachedSubject,  // 傳入 subject
                allTopicsList    // 傳入 allTopicsList 以便推斷（如果需要）
            );
        } catch (e) {
            console.error(`⚠️ 儲存緩存題目失敗:`, e);
            // 即使儲存失敗，也繼續返回題目
        }
        
        return cachedQuestion;
    }
    
    // ===== 階段 3: 緩存未命中，調用 API =====
    console.log(`📡 緩存未命中，調用 API 生成批量題目（${BATCH_SIZE} 題）`);
    
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

    // 如果沒有子單元焦點，則在該單元內等距隨機挑一個子單元
    let subTopicFocusMap = selectedSubTopics || {};
    const hasSubTopicFocus = Object.values(subTopicFocusMap || {}).some(list => Array.isArray(list) && list.length > 0);
    if (!hasSubTopicFocus && finalTopicIds.length > 0) {
        const topicForSub = allTopicsList.find(t => t.id === finalTopicIds[0]);
        const subTopics = Array.isArray(topicForSub?.subTopics) ? topicForSub.subTopics.filter(Boolean) : [];
        if (subTopics.length > 0) {
            const picked = subTopics[Math.floor(Math.random() * subTopics.length)];
            subTopicFocusMap = { [finalTopicIds[0]]: [picked] };
        }
    }
    
    // 2. 先嘗試找種子題目 (RAG) - 支持混合查詢（主庫 + 教學者機構庫）
    const seedQuestion = await RAG_SERVICE.fetchSeedQuestion(
        level,
        finalTopicIds,
        allTopicsList,
        user,
        subTopicFocusMap,
        {
            strictSubTopicLock: Boolean(dispatchMeta?.strictMathSeedLock),
            subject: targetSubject
        }
    );
    if (dispatchMeta?.strictMathSeedLock && !seedQuestion) {
        console.warn('⚠️ Strict math seed lock: no seed found for requested subTopic');
        return null;
    }
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
    
    const resolvedLanguagePreference = targetSubject === 'eng'
        ? 'en'
        : (languagePreference || 'zh');
    const languageInstruction = resolvedLanguagePreference === 'en'
        ? 'Language: English (US). All text must be in English. Set "lang": "en-US".'
        : 'Language: 繁體中文（香港）。All text must be in Traditional Chinese. Set "lang": "zh-HK".';

    const subTopicFocusText = Object.entries(subTopicFocusMap || {})
        .filter(([, list]) => Array.isArray(list) && list.length > 0)
        .map(([topicId, list]) => {
            const topicName = allTopicsList.find(t => t.id === topicId)?.name || topicId;
            const uniqueList = [...new Set(list)].filter(Boolean);
            return uniqueList.length > 0 ? `${topicName}: ${uniqueList.join(', ')}` : null;
        })
        .filter(Boolean)
        .join('；');

    const promptText = `
        Role: Professional HK Primary Math Teacher.
        System: You are a top-tier primary education expert and exam item designer.
        Rules:
        - Ensure question diversity; avoid high similarity with recent outputs.
        - Distractors must be plausible (common student mistakes), never absurd.
        - Output strict JSON only (no markdown or extra text).
        - For calculations, verify the answer twice before finalizing.
        - If the question involves measurement units, include unit-based distractors (e.g., mix cm/m/mm or m²/cm²) so only one option is correct after unit conversion.
        Task: Create ${BATCH_SIZE} NEW variations of the following seed question. Each variation must be DISTINCT with different numbers, names, and contexts.
        Seed: "${activeSeed.question}" (Topic: ${activeSeed.topic})
        ${subTopicFocusText ? `Sub-topic focus: ${subTopicFocusText}` : ''}
        Level: ${level}
        ${languageInstruction}
        
        Constraints:
        1. You MUST output a JSON ARRAY containing exactly ${BATCH_SIZE} question objects.
        2. Each question must maintain the same difficulty and mathematical concept as the seed.
        3. Each question must have DIFFERENT numbers, names, contexts, and scenarios.
        4. If it is a division word problem, ensure you calculate the new answer properly for each variation.
        5. Output strict JSON only (no markdown, no code blocks).
        6. IMPORTANT: Ensure all strings are valid JSON. Escape all backslashes.
        ${isMathSubject ? `7. For Math questions, each question MUST be a multiple-choice question (MCQ) with exactly 8 options: 1 correct answer and 7 plausible distractors (wrong answers that are mathematically reasonable).\n   CRITICAL: All options within each question must be UNIQUE. Do NOT include duplicate values (e.g., "$72" and "$72.00" are the same - only include one). Normalize all numeric options to the same format (either all with decimals or all without, but be consistent).` : `7. If creating multiple-choice questions, each question must include 4 options: 1 correct answer and 3 plausible distractors.\n   CRITICAL: All options within each question must be UNIQUE. Do NOT include duplicate values.`}
        ${relevantFeedback.length > 0 ? `\n\n生題指令（請嚴格遵守）：\n${relevantFeedback.map((fb, idx) => `${idx + 1}. ${formatFeedbackInstruction(fb)}`).filter(Boolean).join('\n')}\n\n請在生成題目時遵守以上指令，確保題目質量符合要求。` : ''}
        
        🔢 CHAIN OF THOUGHT (CoT) REQUIREMENT - CRITICAL:
        You MUST think step-by-step for ALL mathematical calculations and problem-solving:
        1. Break down the problem into logical steps before providing the final answer
        2. Show your reasoning process clearly in the "explanation" field
        3. For calculations, show each step: "步驟 1: [what you do], 步驟 2: [next step], ..."
        4. Verify your answer by checking the calculation
        5. NEVER skip steps or provide answers without reasoning
        Example format for explanation: "步驟 1: 理解題意，找出已知條件\n步驟 2: 確定計算方法\n步驟 3: 執行計算：5 × 3 = 15\n步驟 4: 驗證答案\n答案: 15"
        
        📐 STRICT LaTeX FORMATTING REQUIREMENT:
        You MUST output ALL mathematical expressions using LaTeX format:
        - Use $ for inline math: $x + 5 = 10$ or $\\frac{3}{8}$
        - Use $$ for block/display math: $$\\frac{a}{b} = c$$
        - ALL fractions must use LaTeX: $\\frac{numerator}{denominator}$
        - ALL exponents: $x^2$, $2^{3}$
        - ALL square roots: $\\sqrt{16}$, $\\sqrt{x + 5}$
        - ALL mathematical symbols: $\\times$, $\\div$, $\\pm$, $\\leq$, $\\geq$, etc.
        - Numbers in formulas: Use LaTeX if they're part of an equation, e.g., "$5 \\times 3 = 15$"
        - DO NOT use plain text for any mathematical expressions
        - CRITICAL: Plain numbers (like 350, 38) should NOT be wrapped in $ signs. Only use $ for actual mathematical expressions, formulas, or symbols.
        - Example: "陳老師有 350 元" (correct) NOT "陳老師有 $350$ 元" (wrong for plain numbers)
        - Example: "每盒鉛筆售 38 元" (correct) NOT "每盒鉛筆售 $38$ 元" (wrong for plain numbers)
        
        Output JSON Schema: You MUST return a JSON ARRAY with exactly ${BATCH_SIZE} objects. Each object follows this schema:
        ${isMathSubject ? 
            '[{ "question": "string", "lang": "zh-HK|en-US", "type": "mcq", "options": ["option1", "option2", ..., "option8"] (exactly 8 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string", "hint": "string", "shape": "string (optional: rectangle, square, triangle, circle, trapezoid, parallelogram, irregular, composite, map_grid)", "params": "object (optional: for geometry shapes, e.g. {w: 5, h: 3} for rectangle, {radius: 4} for circle, {base: 6, height: 4} for triangle, {top: 4, bottom: 8, height: 5} for trapezoid, {points: [{x: -2, y: -1}, {x: 2, y: -1}, {x: 3, y: 2}, {x: -1, y: 2}]} for irregular)", "mapData": "object (optional: for map_grid type, e.g. {gridSize: {rows: 5, cols: 5}, startPos: {row: 2, col: 2}, path: [{direction: "north", steps: 2}, {direction: "east", steps: 3}], landmarks: [{row: 1, col: 1, label: "學校"}]})" }, ... (repeat ${BATCH_SIZE} times)]' :
            '[{ "question": "string", "lang": "zh-HK|en-US", "answer": "string/number", "explanation": "string", "hint": "string", "params": null }, ... (repeat ${BATCH_SIZE} times)]'
        }
        
        Example format:
        [
          { "question": "Variation 1...", "answer": "...", ... },
          { "question": "Variation 2...", "answer": "...", ... },
          { "question": "Variation 3...", "answer": "...", ... }
        ]
        
        IMPORTANT for geometry questions:
        - If the question involves area/perimeter calculations with shapes, include "type": "geometry" and appropriate "shape" and "params"
        - For map/direction questions, use "shape": "map_grid" and provide "mapData" with grid layout, start position, path, and landmarks
        - ALL geometric formulas must use LaTeX: Area = $\\pi r^2$, Perimeter = $2(l + w)$, etc.
    `;

    // 3. 呼叫 Next.js API Route
    console.log("🚀 Calling Next.js API Route (/api/chat)...");
    try {
        const response = await fetch(buildApiUrl('/api/chat'), { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: promptText,
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            }),
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
        
        // ===== 階段 4: 批量解析邏輯 =====
        let aiResult = null;
        
        try {
            // 如果後端回傳的是字串，嘗試解析
            if (data.response && typeof data.response === 'string') {
                const parsed = cleanAndParseJSON(data.response);
                
                // 檢查是否為陣列
                if (Array.isArray(parsed)) {
                    aiResult = parsed;
                    console.log(`✅ 解析成功：獲取 ${parsed.length} 題（陣列格式）`);
                } else if (typeof parsed === 'object' && parsed !== null) {
                    // 單個物件，包裝為陣列（向後兼容）
                    aiResult = [parsed];
                    console.warn(`⚠️ AI 返回單個物件而非陣列，已包裝為陣列（向後兼容）`);
                } else {
                    throw new Error('Invalid JSON format: expected array or object');
                }
            } else if (data.data) {
                // 處理 data.data 的情況
                if (Array.isArray(data.data)) {
                    aiResult = data.data;
                } else if (typeof data.data === 'object' && data.data !== null) {
                    aiResult = [data.data];
                    console.warn(`⚠️ data.data 是單個物件，已包裝為陣列`);
                } else {
                    throw new Error('Invalid data format: expected array or object');
                }
            } else {
                throw new Error('No valid response data found');
            }
            
            // 驗證陣列長度
            if (!Array.isArray(aiResult) || aiResult.length === 0) {
                throw new Error('AI returned empty or invalid array');
            }
            
            if (aiResult.length < BATCH_SIZE) {
                console.warn(`⚠️ AI 返回 ${aiResult.length} 題，少於預期的 ${BATCH_SIZE} 題，將使用所有可用題目`);
            }
            
            if (aiResult.length > BATCH_SIZE) {
                console.warn(`⚠️ AI 返回 ${aiResult.length} 題，多於預期的 ${BATCH_SIZE} 題，將截斷為 ${BATCH_SIZE} 題`);
                aiResult = aiResult.slice(0, BATCH_SIZE);
            }
            
        } catch (parseError) {
            console.error("❌ 批量解析失敗:", parseError);
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }

        // ===== 階段 5: 驗證和處理每一題 =====
        const validatedQuestions = [];
        const baseTimestamp = Date.now();
        
        for (let i = 0; i < aiResult.length; i++) {
            try {
                const normalizedQuestion = normalizeQuestion(aiResult[i]);
                const parsed = QuestionSchema.safeParse(normalizedQuestion);
                const question = parsed.success ? parsed.data : normalizedQuestion;
                if (!parsed.success) {
                    console.warn(`⚠️ 第 ${i + 1} 題 schema 驗證失敗，已套用 normalizeQuestion`, parsed.error?.issues);
                }
                
                // 1. 驗證必要欄位
                if (!question.question || question.answer === undefined) {
                    console.warn(`⚠️ 第 ${i + 1} 題缺少必要欄位（question 或 answer），跳過`);
                    continue;
                }
                
                // 2. 驗證和清理選項（確保唯一性）- 重用現有邏輯
                if (question.options && Array.isArray(question.options)) {
                    // 標準化選項：移除貨幣符號、空格，統一格式
                    const normalizeOption = (opt) => {
                        if (typeof opt !== 'string') opt = String(opt);
                        // 移除 $ 符號和空格
                        let normalized = opt.replace(/\$/g, '').trim();
                        // 將數字轉換為數值進行比較（處理 "72" 和 "72.00" 的情況）
                        const numValue = parseFloat(normalized);
                        if (!isNaN(numValue)) {
                            // 如果是整數，返回整數格式；否則返回小數格式
                            return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
                        }
                        return normalized.toLowerCase();
                    };
                    
                    // 去重：使用標準化後的選項進行比較
                    const seen = new Set();
                    const uniqueOptions = [];
                    const originalOptions = [...question.options]; // 保留原始選項
                    
                    for (let j = 0; j < originalOptions.length; j++) {
                        const normalized = normalizeOption(originalOptions[j]);
                        // 保留空白 placeholder，避免補齊後被去重移除
                        if (normalized === '') {
                            uniqueOptions.push(originalOptions[j]);
                            continue;
                        }
                        if (!seen.has(normalized)) {
                            seen.add(normalized);
                            uniqueOptions.push(originalOptions[j]); // 保留原始格式
                        } else {
                            console.warn(`⚠️ 第 ${i + 1} 題檢測到重複選項，已移除: "${originalOptions[j]}"`);
                        }
                    }
                    
                    // 如果去重後選項數量不足，記錄警告
                    if (uniqueOptions.length < originalOptions.length) {
                        console.warn(`⚠️ 第 ${i + 1} 題選項去重：從 ${originalOptions.length} 個減少到 ${uniqueOptions.length} 個`);
                    }
                    
                    question.options = uniqueOptions;
                    
                    // 確保答案仍然在選項中
                    if (question.answer !== undefined) {
                        const answerNormalized = normalizeOption(question.answer);
                        const answerInOptions = uniqueOptions.some(opt => normalizeOption(opt) === answerNormalized);
                        if (!answerInOptions) {
                            console.warn(`⚠️ 第 ${i + 1} 題答案 "${question.answer}" 不在去重後的選項中`);
                        }
                    }
                }
                
                // 3. 構建題目物件
                const resolvedLang = question.lang || (resolvedLanguagePreference === 'en' ? 'en-US' : 'zh-HK');
                const validatedQ = {
                    ...question,
                    id: baseTimestamp + i, // 確保每題有不同的 ID
                    source: 'ai_next_api',
                    poolType: 'TEXT',
                    type: activeSeed.type || question.type || 'text',
                    topic: activeSeed.topic,
                    lang: resolvedLang,
                    is_seed: false
                };
                
                validatedQuestions.push(validatedQ);
                
            } catch (questionError) {
                console.error(`❌ 第 ${i + 1} 題處理失敗:`, questionError);
                // 跳過該題，繼續處理下一題
            }
        }
        
        // 確保至少返回 1 題
        if (validatedQuestions.length === 0) {
            throw new Error('All questions in batch failed validation');
        }
        
        console.log(`✅ 成功驗證 ${validatedQuestions.length} 題，準備返回和緩存`);
        
        // ===== 階段 6: 儲存和緩存 =====
        // 使用第一題，緩存剩餘題目
        const firstQuestion = validatedQuestions[0];
        const remainingQuestions = validatedQuestions.slice(1);
        
        // 儲存第一題到資料庫
        try {
            await RAG_SERVICE.saveGeneratedQuestion(
                firstQuestion, 
                selectedTopicIds[0] || null, 
                level,
                targetSubject,  // 傳入 subject
                allTopicsList    // 傳入 allTopicsList 以便推斷（如果需要）
            );
        } catch (e) {
            console.error(`⚠️ 儲存第一題失敗:`, e);
            // 即使儲存失敗，也繼續返回題目
        }
        
        // 將剩餘題目存入緩存
        if (remainingQuestions.length > 0) {
            // 異步儲存剩餘題目到資料庫（不阻塞返回）
            remainingQuestions.forEach(async (q) => {
                try {
                    await RAG_SERVICE.saveGeneratedQuestion(
                        q, 
                        selectedTopicIds[0] || null, 
                        level,
                        targetSubject,  // 傳入 subject
                        allTopicsList   // 傳入 allTopicsList 以便推斷（如果需要）
                    );
                } catch (e) {
                    console.error(`⚠️ 異步儲存緩存題目失敗:`, e);
                }
            });
            
            cache.push(...remainingQuestions);
            console.log(`💾 已將 ${remainingQuestions.length} 題存入緩存（緩存鍵: ${currentCacheKey.substring(0, 50)}...）`);
        }
        
        return {
            ...firstQuestion,
            requestedSubTopic: dispatchMeta?.requestedSubTopic || null,
            actualSubTopic: firstQuestion?.subTopic || dispatchMeta?.requestedSubTopic || null
        };

    } catch (err) {
        console.error("AI Batch Generation Failed:", err);
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
            // 檢查是否為 API Key 錯誤
            const isApiKeyError = errorMessage.toLowerCase().includes('api key') || 
                                 errorMessage.toLowerCase().includes('authentication') ||
                                 errorMessage.toLowerCase().includes('unauthorized') ||
                                 errorMessage.toLowerCase().includes('403') ||
                                 errorMessage.toLowerCase().includes('401');
            
            // 檢查是否為模型不存在錯誤
            const isModelError = errorMessage.toLowerCase().includes('model') && 
                               (errorMessage.toLowerCase().includes('not found') ||
                                errorMessage.toLowerCase().includes('404') ||
                                errorMessage.toLowerCase().includes('invalid'));
            
            // 檢查是否為網路錯誤
            const isNetworkError = errorMessage.toLowerCase().includes('network') ||
                                  errorMessage.toLowerCase().includes('connection') ||
                                  errorMessage.toLowerCase().includes('fetch') ||
                                  errorMessage.toLowerCase().includes('econnrefused') ||
                                  errorMessage.toLowerCase().includes('enotfound');
            
            if (isApiKeyError) {
                suggestionText = `\n\n💡 這是 API Key 問題：\n1. 請檢查 .env.local 文件中的 GOOGLE_GEMINI_API_KEY 是否正確設置\n2. 確認 API Key 是否有效（可以到 Google AI Studio 檢查）\n3. 如果使用 Vercel，請確認環境變數已設置\n4. 重啟開發服務器（npm run dev）以重新載入環境變數`;
            } else if (isModelError) {
                suggestionText = `\n\n💡 這是模型配置問題：\n1. 確認模型名稱是否正確（當前使用：${CURRENT_MODEL_NAME}）\n2. 確認 API Key 有權限訪問該模型\n3. 檢查 Google AI Studio 確認模型是否可用\n4. 如果問題持續，檢查是否有其他地方使用了不同的模型`;
            } else if (isNetworkError) {
                suggestionText = `\n\n💡 這是網路連線問題：\n1. 請確認 VPN 已開啟並連線到台灣地區\n2. 檢查網路連線是否正常\n3. 如果使用本地開發，確認可以訪問 Google API\n4. 如問題持續，請稍後再試`;
            } else {
                suggestionText = `\n\n💡 建議：\n1. 檢查瀏覽器 Console（F12）查看詳細錯誤\n2. 檢查終端（運行 npm run dev 的窗口）查看服務器錯誤\n3. 確認 API Key 和環境變數設置正確\n4. 如果問題持續，請查看完整錯誤訊息：${errorMessage}`;
            }
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
  
  // 基於錯題生成「舉一反三」的新題目（支持 feedback 參數）
  generateVariationFromMistake: async (mistakeData, level, allTopicsList, feedbackText = null) => {
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
        System: You are a top-tier primary education expert and exam item designer.
        Rules:
        - Ensure question diversity; avoid high similarity with recent outputs.
        - Distractors must be plausible (common student mistakes), never absurd.
        - Output strict JSON only (no markdown or extra text).
        - For calculations, verify the answer twice before finalizing.
        - If the question involves measurement units, include unit-based distractors (e.g., mix cm/m/mm or m²/cm²) so only one option is correct after unit conversion.
        Task: Create a NEW variation question based on the original question. This is a "舉一反三" (Learn by Analogy) exercise.
        ${feedbackText ? `\n        IMPORTANT FEEDBACK: Please incorporate the following feedback when generating the improved question:\n        "${feedbackText}"\n        The improved question should address or implement the suggestions in this feedback.\n` : ''}
        Original Question: "${originalQuestion}"
        Correct Answer: "${originalAnswer}"
        Category/Topic: ${category} / ${topic}
        Level: ${level}
        
        Requirements:
        1. Maintain the SAME difficulty level and core concept as the original question.
        2. Change the numbers, names, context, and scenario completely.
        3. Keep the same mathematical/logical structure (e.g., if it's a division problem, make it a division problem with different numbers).
        ${feedbackText ? '4. CRITICAL: Apply the feedback provided above to improve the question quality, formatting, or approach.' : ''}
        4. Output strict JSON only.
        5. IMPORTANT: Ensure all strings are valid JSON. Escape all backslashes.
        ${isMathSubject && isMCQ ? '6. For Math MCQ questions, you MUST create a multiple-choice question with exactly 8 options: 1 correct answer and 7 plausible distractors (wrong answers that are mathematically reasonable).\n   CRITICAL: All options must be UNIQUE. Do NOT include duplicate values (e.g., "$72" and "$72.00" are the same - only include one). Normalize all numeric options to the same format.' : isMCQ ? '6. For MCQ questions, include 4 options: 1 correct answer and 3 plausible distractors.\n   CRITICAL: All options must be UNIQUE. Do NOT include duplicate values.' : '6. Create a clear question that tests the same concept.'}
        7. The explanation should be concise (within 30 characters) and help the student understand the concept.
        
        ${isMathSubject ? `🔢 CHAIN OF THOUGHT (CoT) REQUIREMENT - CRITICAL:
        You MUST think step-by-step for ALL mathematical calculations:
        1. Break down the problem into logical steps before providing the final answer
        2. Show your reasoning process clearly in the "explanation" field
        3. For calculations, show each step: "步驟 1: [what you do], 步驟 2: [next step], ..."
        4. Verify your answer by checking the calculation
        5. NEVER skip steps or provide answers without reasoning
        
        📐 STRICT LaTeX FORMATTING REQUIREMENT:
        You MUST output ALL mathematical expressions using LaTeX format:
        - Use $ for inline math: $x + 5 = 10$ or $\\frac{3}{8}$
        - Use $$ for block/display math: $$\\frac{a}{b} = c$$
        - ALL fractions must use LaTeX: $\\frac{numerator}{denominator}$
        - ALL exponents: $x^2$, $2^{3}$
        - ALL square roots: $\\sqrt{16}$, $\\sqrt{x + 5}$
        - ALL mathematical symbols: $\\times$, $\\div$, $\\pm$, $\\leq$, $\\geq$, etc.
        - CRITICAL: Plain numbers (like 350, 38) should NOT be wrapped in $ signs. Only use $ for actual mathematical expressions, formulas, or symbols.
        - Example: "陳老師有 350 元" (correct) NOT "陳老師有 $350$ 元" (wrong for plain numbers)
        - Example: "每盒鉛筆售 38 元" (correct) NOT "每盒鉛筆售 $38$ 元" (wrong for plain numbers)
        - DO NOT use plain text for any mathematical expressions` : ''}
        
        Output JSON Schema: ${isMathSubject && isMCQ ? 
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", ..., "option8"] (exactly 8 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string (max 30 chars)", "hint": "string", "params": null }' :
            isMCQ ?
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", "option3", "option4"] (exactly 4 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string (max 30 chars)", "hint": "string", "params": null }' :
            '{ "question": "string", "type": "text", "answer": "string/number", "explanation": "string (max 30 chars)", "hint": "string", "params": null }'
        }
    `;

    console.log("🔄 Generating variation from mistake:", originalQuestion);
    
    try {
        const response = await fetch(buildApiUrl('/api/chat'), { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: promptText,
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            }),
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
                aiResult = cleanAndParseJSON(data.response);
             } catch (e) {
                 console.warn("JSON Parse from API text failed, using raw data if possible", e);
                 // 如果解析失敗，嘗試使用原始數據（如果有）
                 if (data.data) {
                     aiResult = data.data;
                 }
             }
        } else if (data.data) {
             aiResult = data.data;
        }

        // 驗證和清理選項（確保唯一性）- 與主生成函數相同的邏輯
        const normalizedResult = normalizeQuestion(aiResult);
        const parsedResult = QuestionSchema.safeParse(normalizedResult);
        const sanitizedResult = parsedResult.success ? parsedResult.data : normalizedResult;
        if (!parsedResult.success) {
            console.warn(`⚠️ 錯題變化題 schema 驗證失敗，已套用 normalizeQuestion`, parsedResult.error?.issues);
        }
        aiResult = sanitizedResult;

        if (aiResult.options && Array.isArray(aiResult.options)) {
            const normalizeOption = (opt) => {
                if (typeof opt !== 'string') opt = String(opt);
                let normalized = opt.replace(/\$/g, '').trim();
                const numValue = parseFloat(normalized);
                if (!isNaN(numValue)) {
                    return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
                }
                return normalized.toLowerCase();
            };
            
            const seen = new Set();
            const uniqueOptions = [];
            const originalOptions = [...aiResult.options];
            
            for (let i = 0; i < originalOptions.length; i++) {
                const normalized = normalizeOption(originalOptions[i]);
                // 保留空白 placeholder，避免補齊後被去重移除
                if (normalized === '') {
                    uniqueOptions.push(originalOptions[i]);
                    continue;
                }
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    uniqueOptions.push(originalOptions[i]);
                } else {
                    console.warn(`⚠️ 變體題目檢測到重複選項，已移除: "${originalOptions[i]}"`);
                }
            }
            
            if (uniqueOptions.length < originalOptions.length) {
                console.warn(`⚠️ 變體題目選項去重：從 ${originalOptions.length} 個減少到 ${uniqueOptions.length} 個`);
            }
            
            aiResult.options = uniqueOptions;
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