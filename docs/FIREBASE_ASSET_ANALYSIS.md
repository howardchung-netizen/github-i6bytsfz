# Firebase 共享題目庫儲存策略分析報告

> **分析日期**：2026-01-08  
> **目標**：分析當前 Firebase 儲存實現，評估實現「共享題目庫」策略的可行性  
> **範圍**：`app/lib/rag-service.js` 和 `app/lib/ai-service.js` 的儲存邏輯

---

## 執行摘要

**當前狀態**：✅ **已具備共享基礎，但需要增強查詢能力**

**關鍵發現**：
1. ✅ 題目已儲存在**公開路徑**，理論上所有用戶都可以訪問
2. ⚠️ 缺少 `subject` 欄位直接儲存，需要從 `topic_id` 推斷
3. ⚠️ 沒有追蹤「用戶使用記錄」，無法查詢「User B 未做過的題目」
4. ✅ 數據結構支持基本查詢，但需要添加索引以優化性能

**推薦行動**：
1. 添加 `subject` 欄位到儲存結構
2. 創建用戶使用記錄集合（追蹤哪些用戶做過哪些題目）
3. 在 Firebase Console 創建複合索引
4. 實現「直接重用查詢」函數

---

## 1. 儲存位置與可訪問性

### 1.1 當前儲存路徑

**完整路徑**：
```
artifacts/{APP_ID}/public/data/past_papers
```

**代碼位置**：`app/lib/rag-service.js` 第 75 行

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

### 1.2 可訪問性分析

**結論**：✅ **題目已儲存在公開路徑**

**分析**：
- 路徑包含 `public` 關鍵字，表示這是**公開集合**
- 所有用戶（User A、User B、User C）都可以訪問這個集合
- **不需要**用戶特定的路徑（如 `users/{uid}/questions`）

**對比其他數據結構**：
- **用戶私有數據**：`artifacts/{APP_ID}/users/{uid}/mistakes`（錯題本）
- **用戶私有數據**：`artifacts/{APP_ID}/users/{uid}/logs`（學習日誌）
- **公開數據**：`artifacts/{APP_ID}/public/data/past_papers`（題目庫）✅

**結論**：當前儲存策略**已經支持共享**，User B 可以訪問 User A 生成的題目。

---

## 2. 數據結構與索引

### 2.1 當前儲存的欄位

**題目物件結構**（從 `ai-service.js` 分析）：

```typescript
{
    // 從 AI 返回的原始欄位
    question: string,           // 題目文字
    answer: string | number,    // 正確答案
    options?: string[],        // 選項陣列（選擇題）
    explanation?: string,       // 解題步驟
    hint?: string,             // 提示
    type?: string,             // 題型：'mcq' | 'text' | 'geometry'
    topic?: string,            // 主題名稱（從 activeSeed 獲取）
    shape?: string,            // 圖形類型（可選）
    params?: object,           // 圖形參數（可選）
    mapData?: object,          // 地圖數據（可選）
    
    // 系統添加的欄位
    id: number,                // 題目 ID（時間戳）
    source: 'ai_next_api',     // 來源標記
    is_seed: false,            // 非種子題目標記
    
    // saveGeneratedQuestion 添加的欄位
    grade: string,              // 年級：'P1' | 'P2' | ... | 'P6'
    topic_id: string | null,    // 主題 ID（如 'p4_division'）
    created_at: string         // ISO 時間戳
}
```

### 2.2 關鍵欄位分析

#### ✅ 已存在的查詢欄位

| 欄位 | 類型 | 用途 | 查詢能力 |
|------|------|------|----------|
| `grade` | string | 年級過濾 | ✅ 支持 `where("grade", "==", "P4")` |
| `topic_id` | string | 主題過濾 | ✅ 支持 `where("topic_id", "==", "p4_division")` |
| `source` | string | 來源過濾 | ✅ 支持 `where("source", "==", "ai_next_api")` |
| `type` | string | 題型過濾 | ⚠️ 存在但未在查詢中使用 |
| `topic` | string | 主題名稱 | ⚠️ 存在但未在查詢中使用 |

#### ❌ 缺失的關鍵欄位

| 欄位 | 必要性 | 原因 |
|------|--------|------|
| `subject` | **高** | 當前需要從 `topic_id` 推斷科目（'math' | 'chi' | 'eng'），無法直接查詢 |
| `used_by` | **高** | 無法追蹤哪些用戶已經做過這題 |
| `used_count` | **中** | 無法統計題目被使用的次數 |
| `last_used_at` | **低** | 無法追蹤題目最後使用時間 |

### 2.3 當前查詢實現

**查詢種子題目**（`fetchSeedQuestion`）：

```24:34:app/lib/rag-service.js
    fetchSeedQuestion: async (level, selectedTopics, allTopicsList, user = null) => {
        try {
            const targetTopicObjs = allTopicsList.filter(t => selectedTopics.includes(t.id));
            const papers = [];
            
            // 1. 查詢主資料庫（開發者上傳的種子題目）
            const mainQuery = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), 
                where("grade", "==", level),
                limit(50)
            );
```

**查詢已生成的題目**（`fetchCachedGeneratedQuestion`）：

```7:14:app/lib/rag-service.js
    fetchCachedGeneratedQuestion: async (level, selectedTopics) => {
        try {
            const q = query(
                collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), 
                where("grade", "==", level),
                where("source", "in", ["ai_cloud", "ai_client_test", "ai_next_api"]), 
                limit(20)
            );
```

### 2.4 查詢能力評估

#### ✅ 當前支持的查詢

1. **按年級查詢**：`where("grade", "==", "P4")`
2. **按來源查詢**：`where("source", "in", ["ai_next_api"])`
3. **按主題 ID 查詢**：需要在客戶端過濾 `topic_id`

#### ❌ 當前不支持的查詢

1. **按科目直接查詢**：無法直接查詢 `subject == "math"`
2. **排除已做過的題目**：無法查詢「User B 未做過的題目」
3. **複合查詢**：無法同時查詢 `grade + subject + topic_id`（需要索引）

### 2.5 索引需求

**當前狀態**：未發現明確的複合索引配置

**推薦索引**（需要在 Firebase Console 創建）：

| 索引名稱 | 欄位組合 | 用途 |
|---------|---------|------|
| `grade_subject_topic_id` | `grade` (ASC) + `subject` (ASC) + `topic_id` (ASC) | 支持「P4 數學 除法」查詢 |
| `grade_source_created_at` | `grade` (ASC) + `source` (ASC) + `created_at` (DESC) | 支持「最新生成的題目」查詢 |
| `subject_topic_id_grade` | `subject` (ASC) + `topic_id` (ASC) + `grade` (ASC) | 支持「數學 除法 所有年級」查詢 |

---

## 3. 「未使用」題目的處理

### 3.1 當前批量儲存邏輯

**實現位置**：`app/lib/ai-service.js` 第 425-439 行

```425:439:app/lib/ai-service.js
        // 將剩餘題目存入緩存
        if (remainingQuestions.length > 0) {
            // 異步儲存剩餘題目到資料庫（不阻塞返回）
            remainingQuestions.forEach(async (q) => {
                try {
                    await RAG_SERVICE.saveGeneratedQuestion(q, selectedTopicIds[0] || null, level);
                } catch (e) {
                    console.error(`⚠️ 異步儲存緩存題目失敗:`, e);
                }
            });
            
            cache.push(...remainingQuestions);
            console.log(`💾 已將 ${remainingQuestions.length} 題存入緩存（緩存鍵: ${currentCacheKey.substring(0, 50)}...）`);
        }
```

### 3.2 儲存流程分析

**User A 生成 3 題的流程**：

```
1. AI_SERVICE.generateQuestion 被調用
   ↓
2. 調用 API，獲取 3 題
   ↓
3. 驗證和處理 3 題
   ↓
4. 第一題：
   - 立即儲存到 Firebase ✅
   - 返回給 User A ✅
   ↓
5. 剩餘 2 題：
   - 異步儲存到 Firebase ✅
   - 存入內存緩存 ✅
```

**結論**：✅ **所有 3 題都會被儲存到 Firebase**

### 3.3 問題：缺少使用追蹤

**當前狀態**：
- ✅ 題目已儲存到公開路徑
- ❌ **沒有標記「User A 已使用」**
- ❌ **沒有標記「User B 未使用」**

**影響**：
- User B 無法知道哪些題目是「新題目」（未做過的）
- 無法實現「直接重用查詢」：*"Get me a P4 Math question about Division that User B hasn't done yet"*

### 3.4 當前邏輯的區分

**檢查代碼**：`saveGeneratedQuestion` 函數

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

**結論**：❌ **沒有區分「已使用」vs「未使用」**

- 所有題目都以相同方式儲存
- 沒有 `used_by`、`used_count`、`last_used_at` 等欄位
- 沒有關聯的「用戶使用記錄」集合

---

## 4. 推薦方案

### 4.1 方案 A：增強現有結構（推薦）⭐⭐⭐

#### 步驟 1：添加 `subject` 欄位

**修改 `saveGeneratedQuestion`**：

```typescript
saveGeneratedQuestion: async (newQuestion, topicId, level, subject = null) => {
    try {
        // 如果沒有提供 subject，嘗試從 topicId 推斷
        let finalSubject = subject;
        if (!finalSubject && topicId) {
            // 從 allTopicsList 查找 topic，獲取 subject
            // 或者從 topicId 推斷（如 'p4_division' → 'math'）
        }
        
        await addDoc(collection(db, "artifacts", APP_ID, "public", "data", "past_papers"), {
            ...newQuestion,
            grade: level,
            topic_id: topicId,
            subject: finalSubject || 'math', // 添加 subject 欄位
            source: 'ai_next_api',
            created_at: new Date().toISOString()
        });
    } catch (e) { console.error("Save gen error", e); }
}
```

**修改調用處**（`ai-service.js`）：

```typescript
// 在 generateQuestion 中，獲取 targetSubject
const targetSubject = /* ... 現有邏輯 ... */;

// 儲存時傳入 subject
await RAG_SERVICE.saveGeneratedQuestion(
    firstQuestion, 
    selectedTopicIds[0] || null, 
    level,
    targetSubject  // 添加 subject 參數
);
```

#### 步驟 2：創建用戶使用記錄集合

**新集合路徑**：
```
artifacts/{APP_ID}/users/{uid}/question_usage/{questionId}
```

**數據結構**：
```typescript
{
    questionId: string,        // 題目 ID（對應 past_papers 集合的文檔 ID）
    questionRef: string,       // 完整路徑：artifacts/{APP_ID}/public/data/past_papers/{questionId}
    usedAt: string,           // ISO 時間戳
    isCorrect: boolean,       // 是否答對（可選）
    timeSpent: number         // 答題時間（毫秒，可選）
}
```

**實現函數**：

```typescript
// 在 DB_SERVICE 中添加
recordQuestionUsage: async (uid, questionId, isCorrect = null, timeSpent = null) => {
    try {
        await addDoc(
            collection(db, "artifacts", APP_ID, "users", uid, "question_usage"),
            {
                questionId,
                questionRef: `artifacts/${APP_ID}/public/data/past_papers/${questionId}`,
                usedAt: new Date().toISOString(),
                ...(isCorrect !== null && { isCorrect }),
                ...(timeSpent !== null && { timeSpent })
            }
        );
    } catch (e) {
        console.error("Record question usage error:", e);
    }
}
```

#### 步驟 3：實現「直接重用查詢」函數

**新函數**：`fetchUnusedQuestion`

```typescript
// 在 RAG_SERVICE 中添加
fetchUnusedQuestion: async (level, topicId, subject, userId) => {
    try {
        // 1. 查詢該用戶已做過的題目 ID
        const usageQuery = query(
            collection(db, "artifacts", APP_ID, "users", userId, "question_usage")
        );
        const usageSnap = await getDocs(usageQuery);
        const usedQuestionIds = new Set(usageSnap.docs.map(d => d.data().questionId));
        
        // 2. 查詢符合條件的題目
        const questionsQuery = query(
            collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
            where("grade", "==", level),
            where("subject", "==", subject),
            where("topic_id", "==", topicId),
            where("source", "==", "ai_next_api"),
            limit(50)
        );
        const questionsSnap = await getDocs(questionsQuery);
        
        // 3. 過濾出未做過的題目
        const unusedQuestions = [];
        questionsSnap.forEach(doc => {
            if (!usedQuestionIds.has(doc.id)) {
                unusedQuestions.push({ id: doc.id, ...doc.data() });
            }
        });
        
        // 4. 隨機返回一題
        if (unusedQuestions.length > 0) {
            return unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
        }
        
        return null;
    } catch (e) {
        console.error("Fetch unused question error:", e);
        return null;
    }
}
```

#### 步驟 4：在 Firebase Console 創建索引

**需要創建的複合索引**：

1. **`past_papers` 集合**：
   - 索引名稱：`grade_subject_topic_id_source`
   - 欄位：`grade` (ASC) + `subject` (ASC) + `topic_id` (ASC) + `source` (ASC)
   - 查詢範圍：Collection

2. **`question_usage` 集合**（可選，如果查詢需要）：
   - 索引名稱：`questionId_usedAt`
   - 欄位：`questionId` (ASC) + `usedAt` (DESC)
   - 查詢範圍：Collection group（如果需要在多個用戶子集合中查詢）

### 4.2 方案 B：使用子集合追蹤（替代方案）⭐⭐

**描述**：在題目文檔下創建子集合追蹤使用記錄

**結構**：
```
artifacts/{APP_ID}/public/data/past_papers/{questionId}
  └── usage/{uid}  (子集合，記錄每個用戶的使用情況)
```

**優點**：
- 使用記錄與題目緊密關聯
- 查詢時可以排除已使用的用戶

**缺點**：
- 需要查詢多個子集合才能知道「哪些用戶做過」
- 查詢「未做過的題目」需要先獲取所有題目，然後過濾

### 4.3 方案 C：添加使用統計欄位（簡單方案）⭐

**描述**：在題目文檔中添加 `used_by` 陣列欄位

**結構**：
```typescript
{
    // ... 現有欄位 ...
    used_by: string[],        // 用戶 UID 陣列
    used_count: number,       // 使用次數
    last_used_at: string      // 最後使用時間
}
```

**優點**：
- 實現簡單
- 查詢時可以直接過濾

**缺點**：
- Firestore 陣列欄位有大小限制（每個文檔最多 1MB）
- 如果題目被大量用戶使用，陣列會很大
- 無法追蹤詳細的使用記錄（時間、正確率等）

---

## 5. 實施優先級

### 階段 1：基礎增強（必須）🔥

1. ✅ 添加 `subject` 欄位到儲存結構
2. ✅ 修改 `saveGeneratedQuestion` 接受 `subject` 參數
3. ✅ 更新所有調用處傳入 `subject`

### 階段 2：使用追蹤（核心功能）🔥

1. ✅ 創建 `question_usage` 子集合
2. ✅ 實現 `recordQuestionUsage` 函數
3. ✅ 在用戶答題時記錄使用情況

### 階段 3：查詢優化（性能）⭐

1. ✅ 實現 `fetchUnusedQuestion` 函數
2. ✅ 在 Firebase Console 創建複合索引
3. ✅ 測試查詢性能

### 階段 4：統計與分析（可選）⭐

1. ⭐ 添加 `used_count` 欄位到題目文檔
2. ⭐ 實現題目熱度統計
3. ⭐ 實現題目推薦算法

---

## 6. 數據遷移建議

### 6.1 現有數據處理

**問題**：現有題目沒有 `subject` 欄位

**解決方案**：
1. **寫入時修復**：新題目自動添加 `subject`
2. **讀取時修復**：查詢時如果缺少 `subject`，從 `topic_id` 推斷
3. **批量遷移**（可選）：編寫腳本為現有題目添加 `subject` 欄位

### 6.2 向後兼容

**策略**：
- 查詢函數應該同時支持「有 `subject`」和「無 `subject`」的題目
- 如果題目沒有 `subject`，從 `topic_id` 或 `topic` 欄位推斷

---

## 7. 總結

### 7.1 當前狀態

| 項目 | 狀態 | 說明 |
|------|------|------|
| 儲存位置 | ✅ 公開 | 路徑包含 `public`，所有用戶可訪問 |
| 數據結構 | ⚠️ 部分支持 | 缺少 `subject` 欄位 |
| 使用追蹤 | ❌ 不支持 | 沒有追蹤用戶使用記錄 |
| 查詢能力 | ⚠️ 有限 | 無法查詢「未做過的題目」 |
| 索引配置 | ❌ 未配置 | 需要創建複合索引 |

### 7.2 實施建議

**立即實施**（階段 1）：
1. 添加 `subject` 欄位
2. 更新儲存邏輯

**後續實施**（階段 2-3）：
1. 創建使用記錄集合
2. 實現查詢函數
3. 創建 Firebase 索引

**長期優化**（階段 4）：
1. 統計與分析功能
2. 題目推薦算法

---

**報告結束**
