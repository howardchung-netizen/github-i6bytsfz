# 當前題目生成邏輯技術分析報告

> **生成日期**：2026-01-08  
> **目的**：分析當前「題目生成」功能的架構，為遷移到「批量生成與種子變異」策略做準備

---

## 1. 觸發點（Input）

### 1.1 前端觸發位置

**主要入口**：`app/components/CommonViews.tsx` → `TopicSelectionView` 組件

**觸發按鈕**：
```84:96:app/components/CommonViews.tsx
            <button 
              onClick={async () => {
                if (selected.length === 0) return;
                // 先設置 loading 狀態並切換到 practice view，顯示「題目生成中」畫面
                if (setLoading) setLoading(true);
                setView('practice');
                // 然後開始生成題目
                await startPracticeSession(selected);
              }} 
              disabled={selected.length === 0} 
              className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              開始練習 ({selected.length})
            </button>
```

**其他入口**：
- `app/components/DashboardView.tsx`：點擊「開始 AI 試卷」按鈕 → 導航到 `TopicSelectionView`
- `app/components/DailyTaskView.tsx`：每日任務模式，直接調用 `startPracticeSession`（可選主題或自動偵測）

### 1.2 輸入數據

**用戶輸入**：
- **主題選擇**：用戶從預定義的主題列表中選擇一個或多個主題（`selectedTopicIds`）
- **主題來源**：`app/lib/constants.js` 中的 `INITIAL_TOPICS` 陣列（硬編碼）
- **主題結構**：
  ```javascript
  {
    id: 'p4_division_custom',
    name: '除法',
    term: '上學期',
    grade: 'P4',
    subject: 'math',
    type: 'arithmetic',
    lang: 'zh-HK',
    subTopics: ['三位數除法']
  }
  ```

**函數簽名**：
```337:337:app/page.tsx
  const startPracticeSession = async (selectedTopicIds = [], count = 10, subjectHint = null) => {
```

**參數說明**：
- `selectedTopicIds`：選中的主題 ID 陣列（可為空，會自動偵測科目）
- `count`：預設生成 10 題（目前未在 UI 中暴露）
- `subjectHint`：科目提示（'math'、'chi'、'eng'），用於自動偵測模式

**自動偵測邏輯**：
- 如果 `selectedTopicIds` 為空，系統會：
  1. 從 `subjectHint` 判斷科目
  2. 如果沒有 `subjectHint`，從該年級的所有主題中隨機選擇一個科目
  3. 從該科目的所有單元中隨機選擇一個主題

---

## 2. Prompt 構建（Logic）

### 2.1 Prompt 構建位置

**主要文件**：`app/lib/ai-service.js`

**函數**：`AI_SERVICE.generateQuestion`（第 28-272 行）

### 2.2 Prompt 結構

**完整 Prompt 模板**（數學題目）：

```109:150:app/lib/ai-service.js
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
        ${isMathSubject ? '6. For Math questions, you MUST create a multiple-choice question (MCQ) with exactly 8 options: 1 correct answer and 7 plausible distractors (wrong answers that are mathematically reasonable).\n   CRITICAL: All options must be UNIQUE. Do NOT include duplicate values (e.g., "$72" and "$72.00" are the same - only include one). Normalize all numeric options to the same format (either all with decimals or all without, but be consistent).' : '6. If creating a multiple-choice question, include 4 options: 1 correct answer and 3 plausible distractors.\n   CRITICAL: All options must be UNIQUE. Do NOT include duplicate values.'}
        ${relevantFeedback.length > 0 ? `\n\n開發者回饋（請嚴格遵守）：\n${relevantFeedback.map((fb, idx) => `${idx + 1}. [題型：${fb.questionType?.join('、') || '通用'}，分類：${fb.category || '通用'}] ${fb.feedback}`).join('\n')}\n\n請在生成題目時參考以上回饋，確保題目質量符合要求。` : ''}
        
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
        
        Output JSON Schema: ${isMathSubject ? 
            '{ "question": "string", "type": "mcq", "options": ["option1", "option2", ..., "option8"] (exactly 8 options), "answer": "string/number" (must match one of the options exactly), "explanation": "string", "hint": "string", "shape": "string (optional: rectangle, square, triangle, circle, trapezoid, parallelogram, irregular, composite, map_grid)", "params": "object (optional: for geometry shapes, e.g. {w: 5, h: 3} for rectangle, {radius: 4} for circle, {base: 6, height: 4} for triangle, {top: 4, bottom: 8, height: 5} for trapezoid, {points: [{x: -2, y: -1}, {x: 2, y: -1}, {x: 3, y: 2}, {x: -1, y: 2}]} for irregular)", "mapData": "object (optional: for map_grid type, e.g. {gridSize: {rows: 5, cols: 5}, startPos: {row: 2, col: 2}, path: [{direction: "north", steps: 2}, {direction: "east", steps: 3}], landmarks: [{row: 1, col: 1, label: "學校"}]})" }' :
            '{ "question": "string", "answer": "string/number", "explanation": "string", "hint": "string", "params": null }'
        }
    `;
```

### 2.3 Prompt 組成要素

1. **種子題目（Seed）**：
   - 來源：`RAG_SERVICE.fetchSeedQuestion()` 從 Firebase 查詢
   - 查詢範圍：主資料庫（開發者上傳）+ 教學者機構庫（如果用戶是教學者）
   - 如果找不到種子，使用預設 fallback

2. **回饋整合**：
   - 查詢相關的開發者回饋和已審核的教學者回饋
   - 將回饋內容插入到 Prompt 中

3. **輸出格式**：
   - **嚴格要求 JSON 格式**
   - 數學題：8 個選項（1 正確 + 7 誘答）
   - 非數學題：4 個選項（1 正確 + 3 誘答）

4. **特殊要求**：
   - Chain of Thought (CoT) 推理
   - LaTeX 格式化（數學表達式）
   - 選項唯一性驗證

### 2.4 輸出格式

**結構化 JSON**，包含以下欄位：
- `question`：題目文字
- `type`：題型（'mcq' 或 'text'）
- `options`：選項陣列（數學題 8 個，其他 4 個）
- `answer`：正確答案（必須與某個選項完全匹配）
- `explanation`：解題步驟（CoT 格式）
- `hint`：提示
- `shape`、`params`、`mapData`：可選的幾何圖形參數

---

## 3. API 調用（Execution）

### 3.1 API 路由

**文件位置**：`app/api/chat/route.ts`

**HTTP 方法**：`POST`

**端點**：`/api/chat`

### 3.2 模型配置

**當前模型**：`gemini-2.0-flash`

**配置位置**：`app/lib/constants.js`

```1:6:app/lib/constants.js
// Gemini Model Configuration
// 統一管理模型名稱，方便切換不同版本
// 當前使用：Gemini 2.0 Flash（免費版，RPM 15, RPD 1,500）
// 注意：如果遇到 limit: 0 錯誤，表示 API Key 對 2.0 Flash 沒有免費層配額，需要升級到付費方案
export const CURRENT_MODEL_NAME = "gemini-2.0-flash"; // 主要用於文字生成（2.0 Flash 免費版）
export const CURRENT_VISION_MODEL_NAME = "gemini-2.0-flash"; // 用於 Vision API（2.0 Flash 支持 Vision）
```

**API URL 構建**：
```19:19:app/api/chat/route.ts
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL_NAME}:generateContent?key=${apiKey}`;
```

### 3.3 請求格式

**請求體結構**：
```36:44:app/api/chat/route.ts
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: message }
                ]
              }
            ]
          }),
```

**特點**：
- **無歷史記錄**：每次請求都是獨立的，不包含 `messages` 陣列
- **單次請求**：只發送一個 `contents` 物件，包含完整的 Prompt
- **Stateless**：不維護對話上下文

### 3.4 錯誤處理與重試

**指數退避重試機制**：
```21:91:app/api/chat/route.ts
    // 🔄 指數退避重試機制
    const maxRetries = 3;
    const baseDelay = 1000; // 1 秒
    const backoffFactor = 2;
    let lastError: any = null;
    let lastResponse: Response | null = null;
    let lastData: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: message }
                ]
              }
            ]
          }),
          // 設定超時時間（30秒）
          signal: AbortSignal.timeout(30000)
        });

        const data = await response.json();

        // 檢查是否需要重試（僅針對 429 或 503）
        if (!response.ok && (response.status === 429 || response.status === 503)) {
          lastError = null;
          lastResponse = response;
          lastData = data;

          // 如果還有重試機會
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(backoffFactor, attempt);
            console.warn(`⚠️ Hit ${response.status} (${response.status === 429 ? 'Too Many Requests' : 'Service Unavailable'}), retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
            
            // 等待退避時間
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // 重試
          } else {
            // 已達最大重試次數，跳出循環處理錯誤
            break;
          }
        }

        // 成功或非重試錯誤，直接處理
        lastResponse = response;
        lastData = data;
        break;

      } catch (error: any) {
        lastError = error;
        
        // 如果是超時或網路錯誤，且還有重試機會，可以考慮重試
        // 但這裡我們主要關注 429/503，所以只記錄錯誤
        if (attempt < maxRetries && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          const delay = baseDelay * Math.pow(backoffFactor, attempt);
          console.warn(`⚠️ Network/Timeout error, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 其他錯誤或已達最大重試次數，跳出循環
        break;
      }
    }
```

**重試策略**：
- 最多重試 3 次
- 延遲時間：1s → 2s → 4s（指數退避）
- 僅針對 `429`（Too Many Requests）和 `503`（Service Unavailable）重試

### 3.5 速率限制

**RPM 配置**：
```8:16:app/lib/constants.js
// RPM (Requests Per Minute) 速率限制配置
// 當前使用：Gemini 2.0 Flash 免費版（RPM 15）
export const RPM_LIMIT = 15; // 當前：2.0 Flash 免費版（RPM 15）
// export const RPM_LIMIT = 2000; // 付費版：如果升級到付費版，取消註釋此行並註釋上一行

// 根據 RPM 計算最小請求間隔（毫秒）
// 公式：60秒 / RPM = 每次請求間隔（秒）
// 保守起見，增加 10% 緩衝時間
export const MIN_REQUEST_INTERVAL_MS = Math.ceil((60 / RPM_LIMIT) * 1000 * 1.1);
```

**前端速率限制**：
```363:371:app/page.tsx
          // 速率限制：根據 RPM_LIMIT 動態計算間隔時間
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;
          
          if (lastRequestTime > 0 && timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
              const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
              console.log(`⏳ 速率限制（RPM ${RPM_LIMIT}）：等待 ${Math.ceil(waitTime/1000)} 秒後再生成第一題`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          setLastRequestTime(Date.now());
```

---

## 4. 輸出解析（Parsing）

### 4.1 響應處理位置

**文件**：`app/lib/ai-service.js`

**函數**：`AI_SERVICE.generateQuestion`（第 183-259 行）

### 4.2 解析邏輯

**步驟 1：提取響應文本**
```183:196:app/lib/ai-service.js
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
```

**解析策略**：
1. 檢查 `data.response` 是否為字串（AI 可能返回 Markdown 格式的 JSON）
2. 清理 Markdown 代碼塊標記（```json 和 ```）
3. 嘗試 `JSON.parse()` 解析
4. 如果失敗，回退到 `data.data`（如果存在）

**步驟 2：選項去重驗證**
```198:246:app/lib/ai-service.js
        // 驗證和清理選項（確保唯一性）
        if (aiResult.options && Array.isArray(aiResult.options)) {
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
            const originalOptions = [...aiResult.options]; // 保留原始選項
            
            for (let i = 0; i < originalOptions.length; i++) {
                const normalized = normalizeOption(originalOptions[i]);
                if (!seen.has(normalized)) {
                    seen.add(normalized);
                    uniqueOptions.push(originalOptions[i]); // 保留原始格式
                } else {
                    console.warn(`⚠️ 檢測到重複選項，已移除: "${originalOptions[i]}" (標準化後: "${normalized}")`);
                }
            }
            
            // 如果去重後選項數量不足，記錄警告
            if (uniqueOptions.length < originalOptions.length) {
                console.warn(`⚠️ 選項去重：從 ${originalOptions.length} 個選項減少到 ${uniqueOptions.length} 個`);
                // 如果數學題目需要 8 個選項，但去重後不足，可能需要重新生成
                // 但這裡我們先使用去重後的選項，避免完全失敗
            }
            
            aiResult.options = uniqueOptions;
            
            // 確保答案仍然在選項中（如果答案也被去重了，使用標準化後的答案匹配）
            if (aiResult.answer !== undefined) {
                const answerNormalized = normalizeOption(aiResult.answer);
                const answerInOptions = uniqueOptions.some(opt => normalizeOption(opt) === answerNormalized);
                if (!answerInOptions) {
                    console.warn(`⚠️ 答案 "${aiResult.answer}" 不在去重後的選項中，可能需要調整`);
                }
            }
        }
```

**去重邏輯**：
- 標準化選項（移除 `$`、空格，轉換為數值）
- 使用 `Set` 追蹤已見過的標準化選項
- 保留第一個出現的選項，移除重複項
- 驗證答案是否仍在選項中

**步驟 3：構建題目物件**
```248:259:app/lib/ai-service.js
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
```

### 4.3 存儲邏輯

**存儲位置**：Firebase Firestore

**存儲函數**：`RAG_SERVICE.saveGeneratedQuestion`

**存儲結構**：
```73:83:app/lib/rag-service.js
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
```

**存儲路徑**：
```
artifacts/{APP_ID}/public/data/past_papers
```

**存儲欄位**：
- 所有題目欄位（question, options, answer, explanation, hint, 等）
- `grade`：年級
- `topic_id`：主題 ID
- `source`：'ai_next_api'
- `created_at`：ISO 時間戳

**持久化**：
- ✅ **題目會保存到資料庫**
- ✅ **刷新頁面後不會消失**
- ✅ **可用於後續的種子查詢**（但會被過濾，因為 `source` 以 `ai_` 開頭）

---

## 5. 預加載機制（Preloading）

### 5.1 預加載觸發

**位置**：`app/page.tsx` → `startPracticeSession` 函數

**邏輯**：
```416:423:app/page.tsx
      // 啟用預加載功能：在背景生成下一題（偷跑模式）
      // 注意：預加載會遵守 RPM 限制，不會超過速率限制
      if (count > 1 && !quotaExceeded) {
          // 延遲預加載，確保第一題已顯示給用戶
          setTimeout(() => {
              preloadNextQuestion(selectedTopicIds);
          }, MIN_REQUEST_INTERVAL_MS + 1000); // 間隔時間 + 1秒緩衝
      }
```

### 5.2 預加載函數

**函數**：`preloadNextQuestion`

**實現**：
```426:485:app/page.tsx
  // --- 預加載下一題 ---
  const preloadNextQuestion = async (selectedTopicIds) => {
      // 如果配額超限，不進行預加載
      if (quotaExceeded) {
          console.log("⏸️ 配額超限，跳過預加載");
          return;
      }
      
      const topicIds = selectedTopicIds || sessionTopics;
      const subject = getSubjectFromTopics(topicIds);
      if (!checkDailyTaskLimit(subject)) return; // 如果已達限制，不預加載
      
      // 速率限制：根據 RPM_LIMIT 動態計算間隔時間
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      
      if (lastRequestTime > 0 && timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
          const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
          console.log(`⏳ 速率限制（RPM ${RPM_LIMIT}）：等待 ${Math.ceil(waitTime/1000)} 秒後再預加載`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      try {
          // 在發送請求前更新時間戳
          setLastRequestTime(Date.now());
          const q = await AI_SERVICE.generateQuestion(user.level, 'normal', topicIds, topics, null, user);
          
          // 檢查是否為錯誤回退（配額超限）
          if (q && q.source === 'error_fallback' && q.question.includes('配額')) {
              setQuotaExceeded(true);
              const retryMatch = q.question.match(/等待約 (\d+) 秒/);
              if (retryMatch) {
                  setQuotaRetryAfter(parseInt(retryMatch[1]));
              }
          } else if (q && q.source !== 'error_fallback') {
              // 成功生成題目，重置配額超限標記
              setQuotaExceeded(false);
              setQuotaRetryAfter(null);
              // 更新對應科目的任務計數
              setDailyTasks(prev => ({
                  ...prev,
                  [subject]: { ...prev[subject], used: prev[subject].used + 1 }
              }));
          }
          
          // 儲存預加載的題目
          setPreloadedQuestion(q);
          console.log("✅ 預加載完成，下一題已準備就緒");
      } catch (e) {
          console.error("預加載錯誤:", e);
          if (e.message && (e.message.includes('quota') || e.message.includes('配額'))) {
              setQuotaExceeded(true);
          }
      }
  };
```

**特點**：
- 在背景生成下一題，提升用戶體驗
- 遵守 RPM 限制
- 檢查配額和每日任務限制
- 將預加載的題目存儲在 `preloadedQuestion` 狀態中

---

## 6. 錯誤處理

### 6.1 錯誤分類

**配額超限錯誤**：
- 檢測：`429` 狀態碼或錯誤訊息包含 'quota'、'rate limit'、'exceeded'
- 處理：設置 `quotaExceeded` 標記，提取重試時間

**API Key 錯誤**：
- 檢測：`401`、`403` 或錯誤訊息包含 'api key'、'authentication'
- 處理：顯示用戶友好的錯誤訊息

**模型配置錯誤**：
- 檢測：`404` 或錯誤訊息包含 'model'、'not found'
- 處理：提示檢查模型名稱配置

**網路錯誤**：
- 檢測：`AbortError`、`TimeoutError`、`ECONNREFUSED`
- 處理：提示檢查網路連線或 VPN

### 6.2 錯誤回退

**Fallback 邏輯**：
```261:272:app/lib/ai-service.js
    } catch (err) {
        console.error("AI Generation Failed:", err);
        // 錯誤時回退到本地邏輯，顯示詳細錯誤訊息
        const errorMessage = err.message || '未知錯誤';
        
        // 檢查是否為配額超限錯誤
        const isQuotaError = errorMessage.toLowerCase().includes('quota') || 
                            errorMessage.toLowerCase().includes('rate limit') ||
                            errorMessage.toLowerCase().includes('exceeded') ||
                            errorMessage.toLowerCase().includes('配額');
        
        // ... 更多錯誤處理邏輯 ...
        
        // 返回錯誤回退題目
        return {
            id: Date.now(),
            question: `⚠️ ${errorMessage}${suggestionText}`,
            type: 'text',
            answer: 0,
            source: 'error_fallback',
            // ...
        };
    }
```

---

## 7. 總結

### 7.1 當前架構特點

1. **單次生成**：每次用戶需要新題目時，即時調用 AI API
2. **種子驅動**：基於 Firebase 中的種子題目生成變體
3. **無狀態 API**：每次請求都是獨立的，不維護對話歷史
4. **即時解析**：響應後立即解析 JSON，驗證並去重選項
5. **持久化存儲**：生成的題目保存到 Firebase，但不會被用作種子（因為 `source` 以 `ai_` 開頭）

### 7.2 潛在改進點（為批量生成做準備）

1. **批量生成**：一次生成多題，減少 API 調用次數
2. **種子變異策略**：更系統化的種子變異邏輯，確保題目多樣性
3. **緩存機制**：預生成題目池，減少用戶等待時間
4. **批次處理**：後台任務批量生成題目，不阻塞用戶操作

### 7.3 關鍵文件清單

- **前端觸發**：`app/components/CommonViews.tsx`、`app/page.tsx`
- **Prompt 構建**：`app/lib/ai-service.js`（`generateQuestion` 函數）
- **API 路由**：`app/api/chat/route.ts`
- **模型配置**：`app/lib/constants.js`
- **種子查詢**：`app/lib/rag-service.js`（`fetchSeedQuestion`）
- **題目存儲**：`app/lib/rag-service.js`（`saveGeneratedQuestion`）

---

**報告結束**
