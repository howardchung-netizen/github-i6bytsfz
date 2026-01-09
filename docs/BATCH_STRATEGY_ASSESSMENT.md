# 「Batch of 3」生成策略可行性評估報告

> **評估日期**：2026-01-08  
> **目標**：評估將 `generateQuestion` 函數重構為「Batch of 3」策略（請求 3 題，使用 1 題，緩存 2 題）的可行性  
> **評估範圍**：`app/lib/ai-service.js` 和 `app/page.tsx` 的代碼分析

---

## 執行摘要

**總體可行性**：✅ **可行，但需要謹慎處理三個關鍵風險點**

**關鍵發現**：
1. ✅ 當前架構支持批量生成，但需要處理預加載機制的衝突
2. ⚠️ 主題一致性是最大風險，必須實現精確的緩存鍵機制
3. ✅ 錯誤處理邏輯可重用，但需要擴展以支持陣列解析

**推薦實施順序**：
1. 先實現緩存鍵機制和緩存無效化邏輯
2. 然後實現批量解析和錯誤處理
3. 最後調整預加載機制以與批量緩存協同工作

---

## 1. 與現有預加載機制的交互分析

### 1.1 當前預加載機制概述

**觸發點 1**：`startPracticeSession` 函數（第 416-423 行）
```typescript
// 啟用預加載功能：在背景生成下一題（偷跑模式）
if (count > 1 && !quotaExceeded) {
    setTimeout(() => {
        preloadNextQuestion(selectedTopicIds);
    }, MIN_REQUEST_INTERVAL_MS + 1000); // 間隔時間 + 1秒緩衝
}
```

**觸發點 2**：`generateNewQuestion` 函數（第 563-569 行）
```typescript
// 啟用預加載功能：在背景生成下一題（偷跑模式）
if (sessionStats.current < sessionStats.total && !quotaExceeded) {
    setTimeout(() => {
        preloadNextQuestion();
    }, MIN_REQUEST_INTERVAL_MS + 1000); // 間隔時間 + 1秒緩衝
}
```

**預加載函數**：`preloadNextQuestion`（第 427-485 行）
```typescript
const preloadNextQuestion = async (selectedTopicIds) => {
    // ... 速率限制檢查 ...
    const q = await AI_SERVICE.generateQuestion(user.level, 'normal', topicIds, topics, null, user);
    setPreloadedQuestion(q);
}
```

### 1.2 風險分析

#### ⚠️ 風險 1：過度獲取（Over-fetching）

**問題描述**：
- 當前 `preloadNextQuestion` **直接調用** `AI_SERVICE.generateQuestion`
- 如果實現 Batch of 3，每次調用都會：
  1. 檢查緩存 → 如果命中，返回 1 題，緩存 2 題 ✅
  2. 如果未命中 → 調用 API 獲取 3 題，返回 1 題，緩存 2 題 ✅
- **但是**：如果緩存中已經有題目，預加載仍然會調用 `generateQuestion`，這可能導致：
  - **不必要的 API 調用**（如果緩存已滿 2 題，不需要預加載）
  - **緩存溢出**（如果預加載觸發新的批次，但緩存中已有題目，可能造成浪費）

**具體場景**：
```
時間線：
T0: 用戶開始練習，調用 generateQuestion → 獲取 3 題，使用 1 題，緩存 2 題
T1: 用戶回答第一題
T2: preloadNextQuestion 被觸發 → 檢查緩存，發現有 2 題 ✅ 應該跳過
    但如果實現不當，可能仍會調用 generateQuestion → 又獲取 3 題 ❌
T3: 用戶回答第二題，使用緩存中的 1 題
T4: preloadNextQuestion 再次被觸發 → 緩存中還有 1 題 ✅ 應該跳過
```

#### ⚠️ 風險 2：預加載與批量緩存的協同問題

**問題描述**：
- `preloadNextQuestion` 的目的是「提前準備下一題」以提升用戶體驗
- **Batch of 3 策略**的目的也是「提前準備下一題」（通過緩存）
- 兩者功能**重疊**，可能導致：
  1. **雙重預加載**：預加載函數調用批量生成，批量生成內部也有緩存機制
  2. **邏輯衝突**：如果緩存未命中，預加載會觸發 API 調用；如果緩存命中，預加載會「浪費」一次調用機會

### 1.3 推薦方案

#### 方案 A：禁用前端預加載，依賴服務層批量緩存（推薦）⭐⭐⭐

**優點**：
- ✅ 邏輯更清晰：單一預加載機制（服務層緩存）
- ✅ 減少代碼複雜度：不需要維護兩套預加載邏輯
- ✅ 更好的性能：批量獲取 3 題，後續 2 題從緩存中獲取，無需額外 API 調用
- ✅ 遵守 RPM 限制：每次 API 調用獲取 3 題，相當於「一次性預加載 2 題」

**缺點**：
- ⚠️ 如果用戶快速連續答題，緩存可能會在預加載完成前耗盡（但這種情況很少見）
- ⚠️ 失去「背景預加載」的即時性（但 Batch of 3 已經提供了類似功能）

**實施步驟**：
1. 在 `AI_SERVICE.generateQuestion` 內部實現批量緩存機制
2. 修改 `preloadNextQuestion` 函數，改為檢查緩存狀態，而不是直接調用 API
3. 或者完全移除 `preloadNextQuestion` 函數，依賴批量緩存的自然工作流程

#### 方案 B：保留前端預加載，但讓它「感知」批量緩存 ⭐⭐

**優點**：
- ✅ 保留現有的預加載邏輯架構
- ✅ 可以在緩存即將耗盡時主動預加載

**缺點**：
- ❌ 需要維護兩套預加載邏輯（前端 + 服務層）
- ❌ 邏輯更複雜，需要精確協調

**實施步驟**：
1. 在 `AI_SERVICE` 中添加 `getCacheStatus()` 方法，返回緩存中剩餘題目數量
2. 修改 `preloadNextQuestion`，在調用 `generateQuestion` 前檢查緩存狀態
3. 只有在緩存少於 1 題時才觸發預加載

```typescript
const preloadNextQuestion = async (selectedTopicIds) => {
    const cacheStatus = AI_SERVICE.getCacheStatus(user.level, selectedTopicIds);
    
    // 如果緩存中還有題目，跳過預加載
    if (cacheStatus.count > 0) {
        console.log(`✅ 緩存中還有 ${cacheStatus.count} 題，跳過預加載`);
        return;
    }
    
    // 緩存即將耗盡，觸發預加載
    const q = await AI_SERVICE.generateQuestion(...);
}
```

#### 方案 C：混合策略（不推薦）⭐

**描述**：保留前端預加載，但限制它只在特定條件下觸發（例如緩存完全耗盡時）

**缺點**：
- ❌ 邏輯最複雜
- ❌ 難以調試和維護

### 1.4 最終推薦

**推薦方案 A**：完全禁用前端 `preloadNextQuestion`，依賴服務層的 Batch of 3 緩存機制。

**理由**：
1. **功能重疊**：兩者都實現了「提前準備下一題」的功能
2. **簡化架構**：單一預加載機制更容易維護和調試
3. **性能優勢**：Batch of 3 一次性獲取 3 題，比多次單題預加載更高效
4. **RPM 限制友好**：減少 API 調用次數（每次獲取 3 題而非 1 題）

**實施細節**：
- 在 `generateQuestion` 返回後，如果緩存中有剩餘題目，前端不需要主動預加載
- 用戶點擊「下一題」時，`generateNewQuestion` 會先檢查緩存，如果命中則直接返回，如果未命中則觸發新的批次

---

## 2. 主題一致性與緩存失效機制

### 2.1 當前參數結構分析

**`generateQuestion` 函數簽名**：
```typescript
generateQuestion: async (
    level,                    // 年級：'P1' | 'P2' | ... | 'P6'
    difficulty,               // 難度：'normal' | 'hard' | ...
    selectedTopicIds = [],    // 主題 ID 陣列（可為空）
    allTopicsList,            // 所有主題列表（用於查詢）
    subjectHint = null,       // 科目提示：'math' | 'chi' | 'eng' | null
    user = null               // 用戶物件（包含 institutionName 等）
)
```

**關鍵發現**：
1. **`selectedTopicIds`** 可能是：
   - 空陣列 `[]`：系統會自動偵測科目並隨機選擇主題
   - 單個 ID `['p4_division']`：固定主題
   - 多個 ID `['p4_division', 'p4_perimeter']`：多個主題（系統會從中選擇一個）

2. **主題選擇邏輯**（第 43-52 行）：
```typescript
// 如果 selectedTopicIds 為空，從該科目的所有單元中隨機選擇
let finalTopicIds = selectedTopicIds;
if (finalTopicIds.length === 0 && targetSubject) {
    const subjectTopics = allTopicsList.filter(t => t.subject === targetSubject && t.grade === level);
    if (subjectTopics.length > 0) {
        const randomTopic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
        finalTopicIds = [randomTopic.id];
    }
}
```

3. **種子題目查詢**（第 55 行）：
```typescript
const seedQuestion = await RAG_SERVICE.fetchSeedQuestion(level, finalTopicIds, allTopicsList, user);
```
- 種子題目可能來自主資料庫或教學者機構庫（如果 `user.institutionName` 存在）

### 2.2 緩存鍵設計方案

#### ⚠️ 風險：緩存鍵不完整會導致主題不一致

**問題場景**：
```
場景 1：主題切換
- 用戶先練習「數學 - 除法」，緩存中存有 2 題除法題目
- 用戶切換到「數學 - 周界」，調用 generateQuestion
- 如果緩存鍵只包含 level，可能返回除法題目 ❌

場景 2：科目切換
- 用戶先練習「數學」，緩存中存有 2 題數學題目
- 用戶切換到「中文」，調用 generateQuestion
- 如果緩存鍵不包含科目，可能返回數學題目 ❌

場景 3：機構庫切換
- 教學者 A 的機構庫有專用種子題目
- 教學者 B 登錄，調用 generateQuestion
- 如果緩存鍵不包含 institutionName，可能返回教學者 A 的題目 ❌
```

#### ✅ 推薦緩存鍵結構

**方案 1：精確緩存鍵（推薦）⭐⭐⭐**

```typescript
// 緩存鍵組成
const cacheKey = {
    level: string,                    // 'P4'
    topicIds: string[],               // ['p4_division'] 或 []（空陣列表示自動偵測）
    subjectHint: string | null,       // 'math' | 'chi' | 'eng' | null
    institutionName: string | null,   // 機構名稱（如果用戶是教學者）
    difficulty: string                // 'normal' | 'hard'
}

// 轉換為字符串鍵（用於 Map/Set）
const cacheKeyString = JSON.stringify([
    cacheKey.level,
    cacheKey.topicIds.sort().join(','), // 排序以確保一致性
    cacheKey.subjectHint || 'auto',
    cacheKey.institutionName || 'public',
    cacheKey.difficulty
]);
```

**優點**：
- ✅ 涵蓋所有可能影響題目生成的參數
- ✅ 確保主題、科目、機構一致性
- ✅ 支持空陣列（自動偵測）的場景

**缺點**：
- ⚠️ 緩存鍵較長，但對性能影響可忽略

#### ⚠️ 方案 2：簡化緩存鍵（不推薦）⭐

**描述**：只使用 `level` 和 `subjectHint`

**缺點**：
- ❌ 無法處理多主題選擇的情況
- ❌ 無法區分機構庫
- ❌ 主題切換時可能返回錯誤的題目

### 2.3 緩存失效機制

#### 場景 1：主題切換

**觸發條件**：
- 用戶在 UI 中選擇了不同的主題
- `selectedTopicIds` 參數改變

**處理方式**：
```typescript
// 在 generateQuestion 函數開始處
const currentCacheKey = generateCacheKey(level, selectedTopicIds, subjectHint, user, difficulty);
const cachedQuestions = questionCache.get(currentCacheKey);

// 如果緩存鍵不匹配，清空舊緩存
if (lastCacheKey && lastCacheKey !== currentCacheKey) {
    console.log(`🔄 主題切換，清空舊緩存 (${lastCacheKey} → ${currentCacheKey})`);
    questionCache.delete(lastCacheKey);
    lastCacheKey = currentCacheKey;
}
```

#### 場景 2：年級切換

**觸發條件**：
- 用戶切換年級（例如從 P4 切換到 P5）

**處理方式**：
- 年級是緩存鍵的一部分，自動導致緩存未命中
- 但為了清理舊緩存，建議在年級切換時清空所有相關緩存

#### 場景 3：會話結束

**觸發條件**：
- 用戶返回 Dashboard 或退出練習

**處理方式**：
```typescript
// 在 startPracticeSession 開始處，清空舊緩存
const clearOldCache = () => {
    questionCache.clear();
    lastCacheKey = null;
};
```

#### 場景 4：機構切換（教學者）

**觸發條件**：
- 教學者切換機構或登出

**處理方式**：
- 機構名稱是緩存鍵的一部分，自動導致緩存未命中
- 建議在登出時清空緩存

### 2.4 實施建議

**步驟 1**：實現緩存鍵生成函數
```typescript
const generateCacheKey = (level, selectedTopicIds, subjectHint, user, difficulty) => {
    const topicIdsStr = selectedTopicIds.length > 0 
        ? selectedTopicIds.sort().join(',') 
        : 'auto';
    const institutionName = user?.institutionName || 'public';
    
    return JSON.stringify({
        level,
        topicIds: topicIdsStr,
        subjectHint: subjectHint || 'auto',
        institutionName,
        difficulty
    });
};
```

**步驟 2**：實現緩存檢查和失效邏輯
```typescript
// 在 generateQuestion 開始處
const currentCacheKey = generateCacheKey(level, selectedTopicIds, subjectHint, user, difficulty);

// 如果緩存鍵改變，清空舊緩存
if (lastCacheKey && lastCacheKey !== currentCacheKey) {
    console.log(`🔄 緩存鍵改變，清空舊緩存`);
    if (questionCache.has(lastCacheKey)) {
        questionCache.delete(lastCacheKey);
    }
    lastCacheKey = currentCacheKey;
}

// 檢查當前緩存
if (!questionCache.has(currentCacheKey)) {
    questionCache.set(currentCacheKey, []);
}
const cache = questionCache.get(currentCacheKey);
```

**步驟 3**：在適當的時機清空緩存
- 會話開始時（`startPracticeSession`）
- 用戶登出時
- 年級/主題/科目切換時（通過緩存鍵比較自動處理）

---

## 3. 錯誤處理與回退邏輯

### 3.1 當前解析邏輯分析

**當前實現**（第 183-196 行）：
```typescript
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

**關鍵發現**：
1. ✅ 當前邏輯支持清理 Markdown 代碼塊（```json ... ```）
2. ✅ 有基本的錯誤處理（try-catch）
3. ❌ **只處理單個 JSON 物件**，不支持陣列
4. ❌ 如果解析失敗，會回退到 `data.data`，但這可能不存在

### 3.2 批量解析擴展方案

#### 方案 1：陣列優先，單物件回退（推薦）⭐⭐⭐

```typescript
let aiResult = data;
if (data.response && typeof data.response === 'string') {
    try {
        const cleanJson = data.response.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        // 檢查是否為陣列
        if (Array.isArray(parsed)) {
            aiResult = parsed;
            console.log(`✅ 解析成功：獲取 ${parsed.length} 題`);
        } else if (typeof parsed === 'object' && parsed !== null) {
            // 單個物件，包裝為陣列（向後兼容）
            aiResult = [parsed];
            console.warn(`⚠️ AI 返回單個物件而非陣列，已包裝為陣列`);
        } else {
            throw new Error('Invalid JSON format: expected array or object');
        }
    } catch (e) {
        console.warn("JSON Parse from API text failed", e);
        throw new Error(`Failed to parse AI response: ${e.message}`);
    }
} else if (data.data) {
    // 處理 data.data 的情況
    if (Array.isArray(data.data)) {
        aiResult = data.data;
    } else if (typeof data.data === 'object' && data.data !== null) {
        aiResult = [data.data];
    } else {
        throw new Error('Invalid data format: expected array or object');
    }
} else {
    throw new Error('No valid response data found');
}
```

**優點**：
- ✅ 支持陣列和單物件兩種格式（向後兼容）
- ✅ 清晰的錯誤訊息
- ✅ 記錄日誌以便調試

#### 方案 2：嚴格陣列要求（不推薦）⭐

**描述**：只接受陣列格式，單物件視為錯誤

**缺點**：
- ❌ 如果 AI 偶爾返回單物件，會導致題目生成失敗
- ❌ 不夠靈活

### 3.3 陣列長度驗證

**問題場景**：
- AI 應該返回 3 題，但只返回 2 題或 1 題
- AI 返回了 4 題或更多（超出預期）

**處理方案**：
```typescript
// 驗證陣列長度
const BATCH_SIZE = 3;
if (Array.isArray(aiResult)) {
    if (aiResult.length === 0) {
        throw new Error('AI returned empty array');
    }
    
    if (aiResult.length < BATCH_SIZE) {
        console.warn(`⚠️ AI 返回 ${aiResult.length} 題，少於預期的 ${BATCH_SIZE} 題`);
        // 可以選擇：
        // 1. 接受較少的題目（更寬鬆）
        // 2. 重試（更嚴格）
        // 建議：接受較少的題目，記錄警告
    }
    
    if (aiResult.length > BATCH_SIZE) {
        console.warn(`⚠️ AI 返回 ${aiResult.length} 題，多於預期的 ${BATCH_SIZE} 題，將截斷`);
        aiResult = aiResult.slice(0, BATCH_SIZE);
    }
}
```

### 3.4 每題驗證與處理

**問題場景**：
- 陣列中的某一題格式錯誤（缺少必要欄位）
- 某一題的選項重複（之前已實現的驗證邏輯）

**處理方案**：
```typescript
// 驗證和處理每一題
const validatedQuestions = [];
for (let i = 0; i < aiResult.length; i++) {
    try {
        const question = aiResult[i];
        
        // 1. 驗證必要欄位
        if (!question.question || !question.answer) {
            console.warn(`⚠️ 第 ${i + 1} 題缺少必要欄位，跳過`);
            continue;
        }
        
        // 2. 選項去重（重用現有邏輯）
        if (question.options && Array.isArray(question.options)) {
            // ... 重用現有的選項去重邏輯 ...
        }
        
        // 3. 構建題目物件
        const validatedQ = {
            ...question,
            id: Date.now() + i, // 確保每題有不同的 ID
            source: 'ai_next_api',
            type: activeSeed.type || 'text',
            topic: activeSeed.topic,
            is_seed: false
        };
        
        validatedQuestions.push(validatedQ);
        
    } catch (e) {
        console.error(`❌ 第 ${i + 1} 題處理失敗:`, e);
        // 跳過該題，繼續處理下一題
    }
}

// 確保至少返回 1 題
if (validatedQuestions.length === 0) {
    throw new Error('All questions in batch failed validation');
}

return validatedQuestions;
```

### 3.5 錯誤回退邏輯重用

**當前錯誤處理**（第 261-321 行）：
- ✅ 分類錯誤類型（配額、API Key、模型、網路）
- ✅ 提供用戶友好的錯誤訊息
- ✅ 返回 fallback 題目

**批量生成的錯誤處理**：
- ✅ **可以重用現有邏輯**，但需要調整返回格式
- ⚠️ 如果批量生成失敗，應該：
  1. 先嘗試回退到單題生成（如果 API 支持）
  2. 如果單題生成也失敗，返回 fallback 題目陣列（至少 1 題）

```typescript
catch (err) {
    console.error("AI Batch Generation Failed:", err);
    
    // 檢查是否為配額超限錯誤
    const isQuotaError = /* ... 重用現有邏輯 ... */;
    
    // 嘗試回退到單題生成（可選）
    // 注意：這會增加 API 調用，可能需要謹慎使用
    
    // 如果回退也失敗，返回至少 1 題 fallback
    return [{
        ...LOCAL_BRAIN.generateQuestion(level, difficulty, selectedTopicIds, allTopicsList),
        question: `(連線錯誤) 無法生成題目。\n\n錯誤訊息: ${errorMessage}${suggestionText}`,
        source: 'error_fallback'
    }];
}
```

### 3.6 儲存邏輯調整

**當前實現**（第 258 行）：
```typescript
// 儲存生成的題目
RAG_SERVICE.saveGeneratedQuestion(newQ, selectedTopicIds[0], level);
```

**批量生成的儲存邏輯**：
```typescript
// 儲存所有生成的題目（包括緩存中的）
const saveAllQuestions = async (questions, selectedTopicIds, level) => {
    for (const q of questions) {
        try {
            await RAG_SERVICE.saveGeneratedQuestion(q, selectedTopicIds[0] || null, level);
        } catch (e) {
            console.error(`Failed to save question ${q.id}:`, e);
            // 繼續儲存其他題目，不因單個失敗而中斷
        }
    }
};

// 在返回題目前，先儲存所有題目
await saveAllQuestions(validatedQuestions, selectedTopicIds, level);
```

**注意**：
- ⚠️ 儲存所有題目（包括緩存中的）可能會增加資料庫寫入次數
- ✅ 但確保每題都被記錄，符合審計要求
- ✅ 可以考慮異步儲存，不阻塞題目返回

---

## 4. 實施優先級與建議

### 4.1 實施階段劃分

#### 階段 1：基礎架構（必須先完成）🔥

**任務**：
1. ✅ 實現緩存鍵生成函數
2. ✅ 實現緩存檢查和失效邏輯
3. ✅ 實現基本的緩存結構（Map 或物件）

**風險**：如果緩存鍵設計錯誤，會導致主題不一致的嚴重問題

#### 階段 2：批量解析（核心功能）🔥

**任務**：
1. ✅ 擴展 JSON 解析邏輯以支持陣列
2. ✅ 實現陣列長度驗證
3. ✅ 實現每題驗證和處理
4. ✅ 調整 Prompt 以要求返回 3 題

**風險**：如果解析邏輯不健壯，可能導致題目生成失敗

#### 階段 3：預加載機制調整（優化）⭐

**任務**：
1. ✅ 禁用或調整 `preloadNextQuestion`
2. ✅ 確保批量緩存與前端邏輯協同工作

**風險**：較低，主要是優化性能

#### 階段 4：儲存邏輯調整（完善）⭐

**任務**：
1. ✅ 確保所有題目（包括緩存中的）都被儲存
2. ✅ 考慮異步儲存以提升性能

**風險**：較低，主要是確保數據完整性

### 4.2 測試建議

#### 測試場景 1：基本批量生成
- 調用 `generateQuestion` 一次
- 驗證返回 1 題，緩存 2 題
- 連續調用 2 次，驗證從緩存中獲取

#### 測試場景 2：主題切換
- 先練習「數學 - 除法」，生成 3 題
- 切換到「數學 - 周界」，驗證緩存被清空
- 驗證新題目屬於「周界」主題

#### 測試場景 3：科目切換
- 先練習「數學」，生成 3 題
- 切換到「中文」，驗證緩存被清空
- 驗證新題目是中文題目

#### 測試場景 4：錯誤處理
- 模擬 AI 返回單物件（而非陣列）
- 模擬 AI 返回 2 題（少於預期）
- 模擬 AI 返回 4 題（多於預期）
- 模擬解析失敗

#### 測試場景 5：預加載機制
- 禁用 `preloadNextQuestion` 後，驗證題目生成流程正常
- 驗證緩存機制能夠滿足連續答題的需求

### 4.3 性能考量

**優勢**：
- ✅ 減少 API 調用次數（每次獲取 3 題而非 1 題）
- ✅ 更好的用戶體驗（後續 2 題從緩存中獲取，無需等待）
- ✅ 更高效地利用 RPM 配額

**潛在問題**：
- ⚠️ 內存使用增加（需要存儲緩存）
- ⚠️ 但如果緩存鍵設計合理，每個會話只會有一個緩存條目，影響可忽略

**建議**：
- 實施緩存大小限制（例如每個緩存鍵最多 5 題）
- 在會話結束時清空緩存

---

## 5. 總結與建議

### 5.1 可行性結論

**總體評估**：✅ **高度可行**

**關鍵成功因素**：
1. ✅ 正確實現緩存鍵機制（確保主題一致性）
2. ✅ 健壯的批量解析邏輯（處理各種邊緣情況）
3. ✅ 調整預加載機制以與批量緩存協同工作

### 5.2 風險矩陣

| 風險 | 嚴重性 | 可能性 | 緩解措施 |
|------|--------|--------|----------|
| 主題不一致 | 高 | 中 | 精確的緩存鍵設計 + 緩存失效機制 |
| 解析失敗 | 中 | 低 | 健壯的錯誤處理 + 向後兼容單物件格式 |
| 過度獲取 | 低 | 中 | 禁用前端預加載或讓它感知緩存狀態 |
| 緩存溢出 | 低 | 低 | 實施緩存大小限制 |

### 5.3 最終建議

1. **立即實施**：階段 1（緩存鍵機制）和階段 2（批量解析）
2. **後續優化**：階段 3（預加載調整）和階段 4（儲存邏輯）
3. **測試重點**：主題切換場景和錯誤處理場景
4. **監控指標**：API 調用次數、緩存命中率、題目生成失敗率

---

**報告結束**
