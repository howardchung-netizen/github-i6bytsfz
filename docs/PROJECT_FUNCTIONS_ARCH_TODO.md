# 專案功能架構與待辦整合總覽

> **用途**：提供完整的「已完成功能架構 + To-Do + 後續建議」，可直接交給另一個 AI 進行技術分析。  
> **更新日期**：2026年1月24日  
> **專案路徑**：`C:\ai totur\github-i6bytsfz`

---

## 最新更新紀錄（2026-01-24）

- **模型配置**：生題 `gemini-2.5-flash`；審核/Vision/報告 `gemini-3-flash-preview`
- **JSON 模式**：生題(temperature=0.7)、審核(0.0)、Vision(0.1) 全面加 `responseMimeType: "application/json"`
- **審核原因欄位**：審核 prompt 強制輸出 `error_report`/`report`，UI 直接可讀
- **Vision 重構**：只萃取文字 JSON；`explanation` 改為可選；移除 `shape/params` 依賴
- **imageUrl 流程**：上傳先存 Storage 拿 `imageUrl`，DB 只存 `imageUrl + JSON`；前端顯示優先 `imageUrl`，fallback 舊 `image`
- **相容性**：舊庫存仍可讀 `image`（base64），不影響既有題目
- **題庫清理頁**：新增「2.5 題庫清理」分頁（獨立管理介面）
  - 查詢支援 seed/past、狀態/來源/年級/科目/單元/子單元
  - PUBLISHED 查詢包含舊資料（status 為空）
  - 支援批量勾選刪除
  - 支援「只顯示格式不全」與一鍵選取不完整

---

## 1) 已完成功能架構（可供技術分析）

### 1.0 核心生題與調度策略（Smart Dispatcher）

**最高原則（永久規範）**
- **文字題（TEXT）**：追求無限不重複；允許即時生成補庫存。
- **圖片題（IMAGE）**：追求絕對穩定；前台嚴禁即時生成，只能讀取已發布庫存。

**調度路徑**
- **路徑 A：文字題（TEXT）**
  1. 查 `QuestionPool` 中 `TEXT` 且 `NOT IN UserHistory`
  2. 命中 → 直接回傳
  3. 未命中 → 即時生成（Flash），回傳給用戶並寫入 Pool
- **路徑 B：圖片題（IMAGE_STATIC / IMAGE_CANVAS）**
  1. 查 `QuestionPool` 中 `IMAGE_*` 且 `NOT IN UserHistory`
  2. 命中 → 直接回傳
  3. 未命中 → **禁止即時生成**，啟動回收模式（Recycle）

**生產線分工**
- **前台/API**：文字題可即時生成；圖片題唯讀、僅讀 `status=PUBLISHED`
- **後台 Job**：負責圖片題生產與嚴格審核（Generate → Audit → Publish）

### 1.1 前端 UI 架構（Views / Components）

- **DashboardView**：主儀表板與入口導覽（練習/考題入口、錯題本、學習數據、作業通知）
- **PracticeView**：練習/考題流程核心（作答、正誤判斷、ADHD 高亮、語音/翻譯輔助、圖形題圖像放大）
  - ADHD 語音：退出練習會停止播放、移除語音清單 debug UI
  - 行為數據採集：計時器 / 提示次數 / 重試次數
- **CommonViews**：通用視圖（題目選擇、錯題本、成績表 Summary、個人檔案、數學語言選擇）
  - 練習/試卷題目選擇支援子單元篩選
- **DailyTaskView**：每日任務入口與限制（練習模式啟動）
- **TeacherView**：教師控制台（種子題上傳、派卷、班級/作業分析、排名與篩選、回饋提交）
  - 種子題上傳支援 PDF 轉圖（批次轉頁 → Vision 解析）
  - 種子題上傳支援指定子單元（不指定則 AI 分類）
- **ParentView**：家長視圖（子女切換、趨勢圖、AI 報告、錯題分佈、多子女比較/排行）
  - AI 報告支援「老師/醫生」雙模式，一鍵生成兩份報告
  - 醫生報告包含醫師參考紀錄（medicalRecord）區塊
- **StudentView**：學生學習數據視圖（趨勢、分佈、弱項、平均用時、近期錯題）
- **DeveloperView / ChineseDeveloperView / EnglishDeveloperView**：開發者工具（題庫管理、回饋通知、後台總覽）
  - 課程單元管理：既有單元可改名/刪除/新增與改名子單元，所有變更即時同步 Firestore
  - 單元格式修正：數學/中文/英文科皆可一鍵補齊舊資料欄位（createdAt/updatedAt/type/lang/subTopics）
  - 後台輸入欄採深色底反白字（含 select/textarea/file input）
  - 工廠模式（Factory）：生產控制台 + 審核隊列（DRAFT→AUDITED/PUBLISHED）
  - 數據熟成度監控：行為樣本累積進度條（達標提示）
  - 種子進貨檢驗：上傳種子寫入 `seed_questions` 並標記 origin=SEED，審核通過後複製到 `past_papers`
  - 統一上傳補齊 status/origin/poolType/source/auditMeta，避免「幽靈資料」無法進待審核
  - 種子檢驗工作台：Split View（原圖/表單）+ 子單元編輯 + 答案存疑 Badge
  - 審核後修正流程：FAIL 題可修正/再審/套用 AI 建議後再入庫
  - 審核後自動修正：AI 審核後自動寫回建議分類/答案並標記 FIXED
  - 種子上傳支援指定子單元，寫入 `subTopic` 便於後續分類
  - 圖像種子上傳加入 Vision 解析逾時保護與提示
  - PDF 上傳轉圖支援 worker fallback 與錯誤提示
  - 已入庫分類檢視：年級/科目/單元/子單元題數
    - 以資料庫已入庫題目實際欄位聚合（含未分類）
    - 一鍵修正分類（依 syllabus 回填 grade/subject/topic）
    - 顯示用單元名稱正規化（去除無效/重複/undefined）
  - 已拆分子元件：`FactoryDashboard`（工廠/上傳/審核）、`AnalyticsView`、`SystemLogs`、`SyllabusView`
  - 後台重構完成：DeveloperView 拆分為獨立子元件，降低維護成本
- **FeedbackReviewView**：教學者回饋審核與批准/拒絕
- **SubscriptionView**：訂閱方案頁面（Stripe Checkout）
- **RegisterView**：登入/註冊流程（平台辨識、學校資料、教學者主/子帳號）
- **page.tsx**：主入口與全局流程協調（題目生成、能力計分、訪問紀錄、登入自動升班）

### 1.2 API 路由層（Next.js API）

- `/api/chat`：AI 題目生成（gemini-2.5-flash）
- `/api/factory/generate`：工廠生產線（批量產生 DRAFT 題目）
- `/api/factory/audit`：工廠審核線（gemini-3-flash-preview）
  - 改用 Admin SDK 讀寫 `past_papers` / `audit_reports`，避免權限阻擋造成審核找不到 DRAFT
  - 審核並發：每批 5 題 Promise.all，加速審核
  - 審核分類限制：AI 建議的 Topic/SubTopic 只允許 syllabus 內既有範圍
- `/api/factory/publish`：工廠發布（DRAFT/AUDITED → PUBLISHED）
- `/api/dispatch`：混合調度（TEXT 即時生題 / IMAGE 回收）
- `/api/vision`：圖像題識別與結構化輸出（Vision API）
- `/api/payment`、`/api/webhooks/stripe`：Stripe 支付與 Webhook
- `/api/check-env`、`/api/check-quota`、`/api/test-google-api`：環境檢測、配額檢測
- `/api/audit/single`：審計手動觸發（單題審計，含 `maxDuration` / `dynamic`）
- `/api/metrics`：後台指標聚合（訪問/註冊/活躍/生成量/平台分佈）

### 1.3 服務層（lib）

- `ai-service.js`：題目生成、提示詞建構、JSON 清理與解析（含教學者回饋指令）
  - `fetchQuestionBatch`：前端批次調度（3 題並行呼叫 `/api/dispatch`）
- `services/question-dispatcher.ts`：混合調度策略（TEXT 即時生題 / IMAGE 回收）
- `services/report-generator.ts`：雙週學習報告生成核心（Educator/Observer）
  - 報告模型改用 `gemini-3-flash-preview`（JSON 模式）
  - AI 報告改為 JSON 結構輸出並具解析容錯
  - 老師報告：正常學生評估 + 下 2 週課程安排
  - 醫生報告：學習困難/專注力假設 + 醫師參考學習紀錄
- `app/lib/logic-rules.js`：規則文件載入器（docs/rules → 功能邏輯）
  - 能力評分規則：`docs/rules/ability-scoring-rules.json`
  - 單元/子單元 → 能力映射：`docs/rules/unit-ability-mapping.json`
  - AI 老師/醫生報告提示詞：`docs/rules/report-generation-rules.json`
  - AI 老師練習學程提示詞：`docs/rules/teacher-practice-plan-rules.json`
- **規則文件 → 邏輯連動（可查）**
  - 能力評分已吃規則檔：`app/lib/ability-scoring.js` + `app/lib/ability-mapping.js`
  - 報告提示詞已吃規則檔：`services/report-generator.ts`（含 `buildPracticePlanPrompt`）
  - 審核分類限制：`app/api/factory/audit/route.ts` 以 syllabus 白名單驗證建議分類，不在清單則拒絕並寫入 `auditMeta.classificationWarning`
  - 前端套用建議也會檢查：`app/components/admin/FactoryDashboard.tsx` 自動修正/套用建議時阻擋不存在子單元
  - **注意**：規則檔屬文件驅動，修改後需重新 build/deploy；若需即時生效可改為 Firestore + 後台編輯
- `question-schema.ts` / `types.ts`：Question 型別、normalizeQuestion、Zod 驗證（處理欄位飄移與標準化）
- `vitest.config.ts` / `app/lib/__tests__/ai-service.test.ts`：Vitest 單元測試（涵蓋標準、alias、容錯案例）
- `db-service.js`：Firestore 讀寫（題目、回饋、作業、能力分數、審計狀態、訪問紀錄、daily_stats 快取、年級自動升班）
  - 課程單元更新採 `setDoc(..., { merge: true })`，可將預設單元同步到 Firestore 並避免更新失敗
  - `normalizeSyllabusDocs`：補齊舊 syllabus 文件欄位並統一格式
  - 新增 lastError 供前端顯示 Firestore 實際錯誤
  - `uploadPastPaperBatch` 寬容寫入：保留擴充欄位並補齊 status/origin/poolType/auditMeta/source
  - 種子入庫拆分：`seed_questions`（上傳/審核）→ `publishSeedToPool` 複製入 `past_papers`
  - 新增 `fetchSeedQueue` / `updateSeedQuestionStatus` / `deleteSeedQuestion` 支援種子審核流程
- `auditor-service.js`：審計員核心（prompt、JSON 解析、審計更新）
  - 審核 JSON 模式：Prompt 加入 `analysis` 驗算流程，`generationConfig`（temperature=0.0、maxOutputTokens=1000）
  - `parseAuditResult`：analysis 併入 reason，解析失敗回傳原始片段供除錯
- `ability-scoring.js`：能力評分計算（完成試卷後更新）
- `ability-mapping.js`：單元/子單元 → 能力維度映射
- `mock-data-generator.js`：模擬學生/班級數據
- `constants.js`：模型配置（Creator / Auditor / Vision）
- `adhd-utils.js`：ADHD 模式關鍵字/數字高亮
- `sentry.*.config.ts`：Sentry 前端/後端錯誤監控初始化（含 API routes）

### 1.6 自動化維運閉環（CI/CD + 監控）

- **Observer（Sentry）**：捕捉 Next.js 前後端錯誤（已配置 DSN）
- **Broker（GitHub Issues）**：Sentry 觸發 → 自動建立 Issue
- **Fixer（Ellipsis）**：自動修復與 PR（目前暫停）
- **Deployer（Vercel）**：GitHub main 更新 → 自動部署
- **協作規範**：每次新 Session/Commit/Push 前先 `git pull` 同步

### 1.4 主要業務流程

**A. 題目生成流程**
1. 使用者選單元 → 觸發 `startPracticeSession`
2. `ai-service` 組裝 prompt（含種子題/回饋）
3. `/api/chat` 生成題目 JSON（gemini-2.5-flash）
4. UI 顯示並進入練習流程

**B. 練習流程**
1. 題目呈現（支援 LaTeX 與幾何圖形）
2. 使用者作答 → 即時檢查正誤
3. 完整試卷完成後 → `ability-scoring` 計算並存入 Firestore

**B-1. 考題模式流程**
1. 題目作答期間不顯示 AI 提示/詳解
2. 完成後顯示成績表（題目 + 正確答案 + 查看詳解）
3. 正確題綠底、錯誤題紅底

**C. 種子題目上傳**
- 教師端統一上傳介面
- 自動判斷純文字題（不走 Vision）或圖像題（走 Vision）

**D. 審計流程（手動）**
1. 呼叫 `/api/audit/single?questionId=xxx`
2. `auditor-service` 使用 `gemini-3-flash-preview`（審核生成題）
3. 回寫 `audit_status/audit_report/audit_score/...`

**E. 後台回饋審核流程**
1. 教學者提交回饋 → 後台通知欄顯示待審核數量
2. 開發者審核（批准/拒絕）
3. 批准後納入題目生成指令

**F. 年級自動升班流程**
1. 每次登入判斷是否已過 7/1
2. 未升班且年級未滿 P6 → 自動升班並回寫

**G. 學習統計快取流程**
1. 作答寫入 `question_usage`
2. 同步更新 `daily_stats` 快取
3. 家長/學生趨勢圖優先讀取快取

**H. 後台指標匯總流程**
1. `/api/metrics` 聚合 visit/users/usage/past_papers
2. 開發者後台顯示 KPI、趨勢與分佈

**I. 語言/翻譯輔助流程**
1. 題目生成時依科目語言偏好指定輸出語言
2. 練習頁提供語音語言選擇與翻譯輔助

### 1.5 資料庫結構（核心集合）

- **past_papers**：題目主集合  
  - 工廠狀態欄位：`status`（DRAFT/AUDITED/PUBLISHED/REJECTED）
  - 調度欄位：`poolType`（TEXT/IMAGE_STATIC/IMAGE_CANVAS）
  - 審核摘要：`auditMeta`（status/confidence/reportRef）
  - 審計欄位：`audit_status`, `audit_report`, `audit_score`, `auditor_model_used`, `audit_issues`, `audit_timestamp`
  - `logic_supplement`：開發者注入邏輯  
- **seed_questions**：種子題庫（上傳/審核用，核准後複製到 `past_papers`）
  - 與 `past_papers` 同欄位結構，保留 `origin=SEED`
- **developer_feedback**：開發者回饋（可影響生成或審計）
- **teacher_feedback**：教學者回饋（待審核/已批准）
- **teacher_seed_questions/{institutionName}/questions**：機構題庫
- **classes**：班級資料（含機構欄位）
- **assignments**：作業/派卷
- **notifications**：學生作業通知
- **visit_logs**：訪問紀錄（平台/路徑/時間）
- **daily_stats**：每日快取（題數、正確/錯誤、時長）
- **ability_scores**：能力評分儲存
- **logs / mistakes**：練習與錯題
- **users/{uid}/question_usage**：作答歷程與時間
- **users/{uid}/reports**：AI 學習報告
- **users**（補充欄位）：
  - `school` / `institutionName`
  - `institutionRole` / `institutionStatus`
  - `lastPromotionYear` / `lastPromotedAt`

---

### 1.7 系統規格補充（整合其他 Docs）

#### 1.7.1 專案結構概要
```
app/
├── api/                 # API 路由層
├── components/          # UI 組件層
├── lib/                 # 核心服務層
├── page.tsx             # 主入口
└── layout.tsx           # 應用佈局
```

#### 1.7.2 題目生成入口與流程（補充）
- 入口：`TopicSelectionView`（`CommonViews.tsx`）、`DashboardView`、`DailyTaskView`
- 流程：`startPracticeSession()` → `ai-service.js` 組裝 prompt → `/api/chat` 生成 → 解析後寫入 `past_papers`

#### 1.7.3 Prompt 組成與輸出欄位（補充）
- 組成要素：
  - 角色與任務
  - 種子題與主題
  - JSON 輸出格式
  - LaTeX 格式要求
  - 選項唯一性（Math 8 選項 / 其他 4 選項）
  - 教學者回饋（如有）
- 核心輸出欄位：
  - `question`, `type`, `options`, `answer`, `explanation`, `hint`
  - 幾何題可包含 `shape`, `params`, `mapData`（僅手動建檔使用）

#### 1.7.4 題目儲存結構（示意）
```javascript
{
  grade: "P4",
  subject: "math",
  topic_id: "p4_division",
  question: "...",
  options: [...],
  answer: "...",
  explanation: "...",
  source: "ai_next_api",
  created_at: "ISO"
}
```

#### 1.7.5 種子題 JSON 格式指南（整合）
- **註**：現已棄用 AI 自動生成 `shape/params/mapData` 座標，全面改採 `imageUrl` 原圖顯示；以下內容僅供手動建檔參考。
- **基本格式**：JSON 必須是陣列，每個元素是一題
```json
[
  {
    "question": "題目文字",
    "answer": "答案",
    "topic": "單元名稱",
    "explanation": "解釋（選填）",
    "hint": "提示（選填）"
  }
]
```
- **幾何題加圖形欄位**：在題目物件加入 `shape` 與 `params`
```json
{
  "question": "計算這個長方形的面積。",
  "answer": "15",
  "topic": "面積",
  "type": "geometry",
  "shape": "rectangle",
  "params": { "w": 5, "h": 3 }
}
```
- **圖形類型與參數摘要**
  - `rectangle`: `{ "w": 5, "h": 3 }`
  - `square`: `{ "s": 8 }`
  - `triangle`: `{ "base": 6, "height": 4 }`
  - `circle`: `{ "radius": 5 }`
  - `trapezoid`: `{ "top": 4, "bottom": 8, "height": 5 }`
  - `parallelogram`: `{ "base": 8, "height": 4 }`
  - `irregular`: `{ "points": [{ "x": -2, "y": -1 }, ...] }`
  - `composite`: `{ "shapes": [{ "type": "rectangle", "params": {...}, "offset": {"x": 0, "y": 0} }, ...] }`
  - `map_grid`：使用 `mapData`（見下）
- **地圖/方向題（map_grid）**
```json
{
  "question": "從起點向北走 2 格，再向東走 3 格，你會到達哪裡？",
  "answer": "公園",
  "topic": "方向",
  "type": "geometry",
  "shape": "map_grid",
  "mapData": {
    "gridSize": { "rows": 5, "cols": 5 },
    "startPos": { "row": 2, "col": 2 },
    "path": [
      { "direction": "north", "steps": 2 },
      { "direction": "east", "steps": 3 }
    ],
    "landmarks": [
      { "row": 1, "col": 1, "label": "學校" },
      { "row": 4, "col": 4, "label": "公園" }
    ]
  }
}
```
- **操作步驟**
  1. 建立 `.json` 檔（整體為陣列）
  2. 有圖形題加 `shape/params`（手動建檔時）
  3. 使用 JSONLint 驗證格式
  4. 後台「試卷庫 & 種子管理」貼上 → 批量上傳
- **注意事項**
  - LaTeX 使用 `$...$`
  - 長度單位建議用 `cm`
  - 可選欄位：`explanation`, `hint`, `type`

#### 1.7.6 Vision API（圖像題處理）
- 流程：`圖像題 → Storage(imageUrl) → /api/vision(文字萃取) → JSON + imageUrl → seed_questions`
- 成本策略：優先 Flash、壓縮與快取降低成本
- 相關檔案：`app/api/vision/route.ts`、`TeacherView` 統一上傳

#### 1.7.7 能力評分邏輯（整合）
- **科目**：數學/中文/英文，每科 5 個能力維度，初始 50/100
- **分類優先順序**：
  1. 單元/子單元映射（最準確）
  2. 文本分析（後備）
- **數學能力維度**：
  - 運算：加減乘除/分數/小數/混合運算
  - 幾何：周界/面積/體積/角度/對稱
  - 邏輯：推理/模式/序列/比較/排序
  - 應用題：情境/多步驟/購物/時間/距離
  - 數據：統計/圖表/平均/概率
- **評分規則**：
  - 答對：+2；答錯：-1
  - 難度係數：簡單 1x / 中等 1.5x / 困難 2x
  - 多步驟題：2 步 1.2x、3 步以上 1.5x
- **更新時機**：完成整份試卷後更新
- **存儲位置**：`artifacts/{APP_ID}/users/{userId}/ability_scores`
- **中文科維度**：閱讀 / 寫作 / 成語 / 文法 / 修辭
- **英文科維度**：Grammar / Vocab / Reading / Listening / Speaking

#### 1.7.8 背景審計員系統（AI-as-a-Judge）
- 目標：審查正確性、`logic_supplement` 遵守度、格式一致性
- 流程：
  - 生成題 → `past_papers`（`audit_status=unchecked`）
  - 手動觸發審計 → 更新 `audit_status/audit_report/audit_score/...`
- 模型：
  - Creator：`gemini-2.5-flash`
  - Auditor：`gemini-3-flash-preview`
- 資料欄位：
```javascript
{
  audit_status: "unchecked" | "verified" | "flagged",
  audit_report: string | null,
  auditor_model_used: string | null,
  audit_timestamp: string | null,
  audit_issues: string[] | null,
  audit_score: number | null,
  logic_supplement: string | null
}
```
- 手動觸發 API：`/api/audit/single`（GET/POST 皆可）
- Vercel 防超時配置：`maxDuration = 60`, `dynamic = "force-dynamic"`
- 後續待做：背景批次審核、Cron、審計監控面板

#### 1.7.9 技術實作路徑與風險評估（摘要）
- **Auto-Classification**：PDF 轉圖 → Vision Layout Analysis → 題目區塊切割 → A/B/C 分類
  - 風險：題目與圖片排版緊密 → 需信心閾值與人工裁切後備
- **生題者成本優化**：Few-shot + Rationale Summary + 圖像引用機制
- **審題者報告**：輸出 `AuditResult` JSON（status/error_report/suggested_fix/confidence）
- **Human-in-the-loop**：`GENERATED → AUDITED → PENDING_APPROVAL → PUBLISHED`
  - `FIXED/NEEDS_REVIEW` 需人工確認
- **綜合風險**：成本/延遲/幻覺（地圖/圖表題最高風險）
  - 防線：Type B 沿用原圖 + 低信心人工確認
- **分階段落地**：Phase 1（A/B）→ Phase 2（有限 C）→ Phase 3（進階重繪）

#### 1.7.10 維運 / 部署 / 配額
- **CI/CD 閉環**：
  - Observer：Sentry（已配置）
  - Broker：GitHub Issues（自動建立）
  - Fixer：Ellipsis（暫停）
  - Deployer：Vercel（自動部署）
- **必要環境變數**：
  - Gemini：`GOOGLE_GEMINI_API_KEY`
  - Firebase：`NEXT_PUBLIC_FIREBASE_*`
  - Stripe：`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- **Vercel 部署**：GitHub → Vercel Import → 設定環境變數 → Deploy
- **本地測試**：`npm run dev`；測試端點 `/api/test-google-api`, `/api/check-quota`
- **API 配額**：
  - `/api/test-google-api` 檢查 key
  - `/api/check-quota` 查看配額
  - 429 需加入 API 路由重試與退避
- **模型遷移重點**：
  - 模型名稱集中於 `constants.js`
  - API 路由層需統一重試/節流

#### 1.7.11 效能優化與擴展（摘要）
- 已完成：增加 `subject`、伺服器端過濾、複合索引建議
- 建議：伺服器端過濾優先、客戶端僅補不足
- 擴展：快取層、熱/冷資料分離、重試/併發控制

#### 1.7.12 Stripe 支付
- Keys：`pk_test_...` / `sk_test_...`
- Webhook：`STRIPE_WEBHOOK_SECRET`
- API Routes：
  - `app/api/payment/create-checkout/route.ts`
  - `app/api/webhooks/stripe/route.ts`
- 測試卡號：
  - 成功：`4242 4242 4242 4242`
  - 需 3DS：`4000 0025 0000 3155`
  - 失敗：`4000 0000 0000 0002`
- 待辦：正式金鑰、訂閱權限鎖定

#### 1.7.13 Troubleshooting（摘要）
- LaTeX 顯示錯誤：清理錯誤反斜線（`\350` → `350`）
- 文字溢出：`break-words` / `overflow-wrap` / `max-w-full`
- LaTeX 僅允許合法 `$...$` 片段
- 相關檔案：`PracticeView.tsx`、`CommonViews.tsx`、`ai-service.js`

#### 1.7.14 Firebase 索引
- `grade_subject_topic_id_source`（主查詢）
- `grade_source_created_at`（時間排序）
- `subject_topic_id_grade`（跨年級）

#### 1.7.15 DeveloperView 重構評估（摘要）
- 需拆出：`FactoryDashboard` / `AnalyticsView` / `SystemLogs`
- 高風險區：Factory 即時庫存更新、Seed Upload、Seed Inspection
- 建議：`loadFactoryQueue/loadFactoryStock` 下放至 `FactoryDashboard`
- 可考慮 `AdminContext` 降低 props drilling

---

## 2) 整合 To-Do List（待辦事項）

### 2.0 近期優先（P0 / P1 / P1.5）

**P0（立即）**
- **個人檔案入口**：登入後可進入個人資料介面（已修）→（已完成）
- **練習 / 試卷模式驗證**：整體流程已完成，待完整驗證（已完成）→（已完成）
- **課程單元子單元更新失敗修正**：預設單元改用 `setDoc` 合併寫入，避免不存在文件導致更新失敗 →（已完成）

**P1（核心品質）**
- **老師回饋通知欄（後台整合）**：先完成通知欄與資料流，再做回饋轉生題指令 →（已完成）
- **老師回饋 → 生題指令轉換**：依通知欄資料格式建立 prompt/指令模板（建立在通知欄之上）→（已完成）

**P1.5（等四年級單元設定完成後再做）**
- 雲端題目分類儲存測試（影響能力評分）→（待四年級單元完成）
- 生題邏輯整理 + 分類 → 能力評分連動 →（待四年級單元完成）
- 邏輯補充 / 老師回饋功能測試 →（待四年級單元完成）

### 2.0.1 產品完成度（P2 / P3 / P4）

**P2（完成度）**
- **開發者後台資料檢視介面**：下載率、每月訂閱人數、新帳號申請、各帳號數量 →（已完成）
- **老師 / 家長 / 學生資料檢視格式**：增加學習數據、時間紀錄、做題時間 →（已完成）
- **註冊介面整理 + 學校資料 + 自動升班**：7/1 自動升班、頭像美觀度 →（已完成）
- **帳號權限細緻分類**：與教育者帳號 / 機構綁定一起設計 →（已完成）

**P3（體驗 / 擴展）**
- **語言 / 語音選擇**：依學科分開 →（已完成）
- **翻譯輔助**：中英互譯 →（已完成）
- **數學圖形題後台排版**：可向下伸展 →（已完成）

**P4（商業化 / 規模）**
- **收費 / 訂價**
- **美化主介面**
- **微調ai學習報告人設**
- **壓測**
- **資助申請**
- **優惠條碼**：個人帳號介面入口
- **優化生題時間**
- **測試 ADHD 模式提示詞**
  - 方案 A：前端規則判斷（中文單位需貼近數字、英文關鍵字邊界）
  - 方案 B：同次生題輸出 `highlight_keywords` 欄位（不增加 API 次數）
  - 方案 C：額外 AI 呼叫抽提示詞（高成本，僅備用）(考慮審核題目時順便做)
- **未來擴充路線圖（2026-01-21）**
  - 原則：避免過早優化，資料量未達瓶頸前維持 Firebase 原生架構
  - 數據分析/倉儲：BigQuery（觸發：10k-50k 筆、跨集合統計需求）
    - 同步：Firebase Extension "Stream Firestore to BigQuery"
    - Backfill：`fs-bq-import-collection` 匯入歷史資料
    - 場景：深度報告、Looker/Data Studio 戰情室
  - 全文檢索/模糊搜尋：Typesense/Algolia（觸發：50k+、搜尋變慢/模糊需求）
    - 雙寫：Firestore 為主，Search Index 為輔
    - 同步：Cloud Function onCreate/onUpdate/onDelete
    - 成本：優先自架 Typesense（$5/mo VPS），Algolia 免費層可先試
  - 結論：現版本可支撐 5k+ 題，後續可無縫接軌升級

### 2.1 審計系統測試（待做）

- 手動審計 API 的完整測試
- JSON 格式與審計報告品質檢查
- `logic_supplement` 遵守度驗證
- 正確性/格式/難度判定精度
- 超時、API 錯誤、題目不存在、解析失敗處理
- 性能與並發壓力測試

### 2.2 系統未完成 / 部分完成項目（依你補充）

- **後台數據檢視與報表（整理版清單）**：
  - **開發者後台總覽**
    - 下載率（App/Web 來源拆分）
    - 每月訂閱人數（新訂、續訂、取消、流失）
    - 新帳號申請（依角色：學生/家長/老師/機構）
    - 活躍使用者（DAU/WAU/MAU）
    - 各帳號登入數量（角色/地區/平台）
    - 試題生成量（每日/每科/失敗率）
    - 題庫新增量（種子題/圖像題/文字題）
  - **老師後台（班級與作業）**
    - 班級總覽（人數、活躍率）
    - 作業發佈/完成率
    - 學生平均正確率、用時
    - 學生弱項分佈（能力維度）
    - 題型/單元命中率
  - **家長後台（個人/子女）**
    - 每日學習時長、連續天數
    - 作答數量、正確率、平均用時
    - 弱項/強項趨勢
    - ADHD 模式使用與成效（可選）
  - **學生後台（個人）**
    - 今日/本週進度與分數
    - 每科能力雷達變化
    - 題型錯誤分佈
    - 作答時間分佈（快/慢）
  - **營運監控（建議新增）**
    - API 配額使用率（Gemini / Vision）
    - 失敗率/錯誤碼統計
    - 審計通過率/標記率
    - 成本估算（每日/每科）
- **老師/家長/學生資料檢視格式**：增添學習數據、時間紀錄、作答時間

### 2.2.1 後台報表拆解（設計稿 / 資料結構 / 實作任務）

**A. 開發者後台總覽**
- 設計稿
  - 指標卡片區（註冊率：網站造訪→註冊、App 內註冊率、訂閱、DAU/WAU/MAU、題庫/生成量）
  - 趨勢折線（訂閱、生成量、錯誤率）
  - 分佈圖（角色比例、平台比例：Web/平板）
- 資料結構
  - `metrics_daily`：date, dau, wau, mau, new_users, visit_count, web_signup_count, app_signup_count, web_signup_rate, app_signup_rate, gen_count, gen_fail_count
  - `metrics_monthly`：month, subs_active, churn_rate, revenue_est, subs_new, subs_cancel
  - `metrics_error`：date, api_error_rate, audit_fail_rate, vision_fail_rate
- 補充：來源判斷
  - 裝置分類：登入時使用 userAgent 判斷（Web / 平板）
  - 造訪數來源：新增 `visit_logs`（Firebase）
- **模擬數據（參考版）**
  - 今日指標
    - 造訪數：2,480（Web 1,950 / 平板 530）
    - 網站造訪→註冊率：3.8%（註冊 74）
    - App 內註冊率：5.1%（註冊 27）
    - DAU / WAU / MAU：312 / 1,980 / 7,420
    - 題目生成量：1,260（失敗率 2.4%）
    - 題庫新增量：68（文字題 52 / 圖像題 16）
  - 近 30 日趨勢
    - 新帳號：1,320（學生 71% / 家長 18% / 老師 9% / 其他 2%）
    - 訂閱：新訂 86、續訂 212、取消 24、流失率 4.9%
    - 平台比例：Web 78% / 平板 22%
    - 審計通過率：93.5%（標記 6.5%）
  - 商業概覽（估算）
    - 付費活躍帳號：420
    - 月收入估算：HK$ 33,600
    - 平均客單價（ARPU）：HK$ 80
  - 風險/警示
    - 生成錯誤率 > 3% 時顯示警示
    - Vision API 使用量突增（> 平均 2 倍）提示

#### A-1. 開發者後台總覽：實作規格（V1）
**目標**
- 提供管理員即時掌握「註冊轉換、活躍、生成量、訂閱、錯誤率」與平台分佈。

**資料來源與收集**
- `visit_logs`（新增）：每次載入首頁或註冊頁時寫入
  - 欄位：`timestamp`, `platform`(web/tablet), `path`, `sessionId`, `ipHash?`(可選)
- `users`：註冊事件
  - 欄位：`createdAt`, `role`, `platform`(於註冊時寫入)
- `question_usage` / `past_papers`：生成與使用
- `subscriptions`（新增 placeholder）：未開通 Stripe 時先記錄 mock

**計算定義**
- 造訪數（visit_count）：`visit_logs` 當日筆數
- 網站造訪→註冊率：`web_signup_count / web_visit_count`
- App 內註冊率：`app_signup_count / app_visit_count`
- DAU/WAU/MAU：在 `question_usage` 或登入事件中去重 userId 計數
- 生成量：`past_papers` 當日新增數（或 `ai_service` 成功記錄）
- 生成失敗率：`gen_fail_count / gen_count`

**後台頁面區塊**
1. KPI 卡片：造訪、註冊率、DAU/WAU/MAU、生成量、訂閱
2. 趨勢圖：近 30 日註冊/生成/錯誤率
3. 分佈圖：角色比例、平台比例
4. 警示區：錯誤率/視覺 API 突增

**權限**
- 只允許 admin（`user.role === 'admin'` 或指定 email）

#### A-2. 任務清單（V1）
1. **新增 visit_logs 寫入**
   - 前端：首頁/註冊頁載入時寫入
   - 依 userAgent 判斷平台（web/tablet）
2. **新增 platform 記錄**
   - 註冊成功時寫入 `users.platform`
3. **新增 subscriptions placeholder**
   - 暫用 mock 寫入（待 Stripe 啟用）
4. **建立聚合 API（或雲端函數）**
   - 日/週/月統計快取（`metrics_daily`, `metrics_monthly`）
5. **前端 Dashboard View**
   - KPI 卡片 + 趨勢圖 + 分佈圖
6. **權限與錯誤處理**
   - 非 admin 顯示提示
- 實作任務
  - 後台 API：聚合統計/快取（區分 Web/平板）
  - 前端 Dashboard：卡片 + 圖表
  - 基本權限（僅 admin）

**B. 老師後台（班級與作業）**
- 設計稿
  - 班級概覽 + 作業完成率
  - 學生表格（正確率/時間/弱項）
  - 題型/單元命中率圖表
- 資料結構
  - `class_stats`：classId, activeRate, avgAccuracy, avgTime
  - `assignment_stats`：assignmentId, completionRate, avgScore, avgTime
  - `student_stats`：userId, subject, accuracy, timeSpent, weakSkills[]
- 實作任務
  - 聚合計算任務（每日/每週）
  - 班級與作業查詢 API（同機構合併視圖）
  - 權限：同機構老師可見

#### B-1. 老師後台：實作規格（V1）
**目標**
- 讓教學者可在「同機構範圍」查看班級/作業/學生學習成效與弱項分佈。

**資料來源與收集**
- `classes`：classId, institutionName, students[]
- `assignments` / `sent_papers`：作業與派卷資料
- `question_usage`：學生作答時間與正確率
- `ability_scores`：能力維度分數

**計算定義**
- 班級活躍率：近 7 日有作答學生 / 班級總人數
- 作業完成率：已交作業學生 / 應交學生
- 平均正確率：班級或作業的正確題數 / 總題數
- 每日總學習時長：同學當日作答 timeSpentMs 加總
- 弱項分佈：能力分數低於門檻（例如 < 50）的人數比例

**後台頁面區塊**
1. 機構總覽（班級數、學生數、活躍率）
2. 作業概覽（完成率、平均分）
3. 班級列表（可展開學生名單）
4. 學生排行（正確率/用時/弱項）
5. 題型/單元命中率圖表

**權限**
- 同機構老師可見所有班級
- 若只有單一帳號使用，仍可載入多班級

#### B-2. 任務清單（V1）
1. **資料結構補齊**
   - `classes` 增加 `institutionName`
   - `assignments` 增加 `classId`、`institutionName`
2. **統計聚合（每日/每週）**
   - 班級活躍率、作業完成率
   - 每日總學習時長（由 `question_usage` 聚合）
3. **後台 API**
   - 機構維度查詢（班級/作業/學生）
4. **UI 組件**
   - 機構總覽卡片
   - 班級列表 + 作業列表
   - 學生表格（正確率/用時/弱項）

**C. 家長後台（個人/子女）**
- 設計稿
  - 日/週學習時長、連續天數
  - 進步趨勢、弱項雷達
- 資料結構
  - `parent_reports`：parentId, childId, dailyMinutes[], streak
  - `learning_trends`：userId, subject, accuracyTrend[], timeTrend[]
- 實作任務
  - 子女綁定資料查詢
  - 報表 API
  - 權限：家長僅可見已綁定子女

#### C-1. 家長後台：實作規格（V1）
**目標**
- 讓家長快速掌握子女的學習時長、進度、弱項與趨勢變化。

**資料來源與收集**
- `parent_links`：parentId, childId, approvedAt
- `question_usage`：作答時間、正確率
- `ability_scores`：能力分數
- `learning_trends`（可新增）：每日/每週聚合

**計算定義**
- 每日學習時長：當日 timeSpentMs 加總
- 連續天數：近 n 日有作答的連續天數
- 正確率趨勢：每日正確題數 / 每日作答題數
- 弱項變化：能力分數低於門檻的維度與趨勢

**後台頁面區塊**
1. 子女切換器（多子女）
2. 今日概況（時長/正確率/題數）
3. 近 7/30 日趨勢（時長/正確率）
4. 弱項雷達/列表
5. ADHD 模式使用與成效（可選）

**權限**
- 家長只能查看已綁定子女

#### C-2. 任務清單（V1）
1. **子女綁定資料表**
   - `parent_links` 維護與查詢
2. **統計聚合**
   - 以 `question_usage` 計算每日/每週時長與正確率
3. **後台 API**
   - childId 維度查詢
4. **UI 組件**
   - 子女切換、趨勢圖、弱項顯示

**D. 學生後台（個人）**
- 設計稿
  - 今日/本週進度卡片
  - 能力雷達變化
  - 作答時間分佈
- 資料結構
  - `user_progress`：userId, subject, weeklyStats, dailyStats (dailyMinutes)
  - `ability_history`：userId, subject, scores[], updatedAt[]
- 實作任務
  - 個人進度 API
  - 視覺化呈現（雷達+趨勢）

#### D-1. 學生後台：實作規格（V1）
**目標**
- 提供學生即時掌握學習進度、弱項、時間分佈與能力成長。

**資料來源與收集**
- `question_usage`：作答時間、正確率
- `ability_scores` / `ability_history`：能力分數與歷史變化
- `mistakes`：錯題紀錄

**計算定義**
- 今日/本週學習時長：timeSpentMs 加總
- 平均用時：每題平均 timeSpentMs
- 題型錯誤分佈：依 questionType 統計錯題
- 能力成長：雷達分數變化趨勢

**後台頁面區塊**
1. 今日概況（時長/題數/正確率）
2. 近 7/30 日趨勢（時間/正確率）
3. 能力雷達（當前 vs 上週）
4. 錯題分佈（題型/單元）
5. 學習提醒（可選）

**權限**
- 僅個人帳號可見

#### D-2. 任務清單（V1）
1. **統計聚合**
   - 以 `question_usage` 計算日/週時長與正確率
2. **能力歷史**
   - 每次更新能力分數寫入 `ability_history`
3. **後台 API**
   - userId 維度查詢
4. **UI 組件**
   - 趨勢圖、雷達圖、錯題分佈圖

**E. 營運監控（建議新增）**
- 設計稿
  - API 配額卡片 + 成本預估
  - 失敗率與審計狀態圖
- 資料結構
  - `api_usage`：date, model, tokens, cost
  - `audit_metrics`：date, verified, flagged, error
- 實作任務
  - 日誌彙總任務
  - 監控看板（管理員）

#### E-1. 營運監控：實作規格（V1）
**目標**
- 讓管理員掌握 API 配額、成本、錯誤率與審計結果，及早發現異常。

**資料來源與收集**
- `api_usage`：模型、tokens、成本、錯誤碼
- `audit_metrics`：審計通過/標記/失敗
- `metrics_error`：API/審計/Vision 失敗率

**計算定義**
- API 成本：每日 tokens × 單價估算
- 失敗率：當日錯誤數 / 當日總請求數
- 審計通過率：verified / (verified + flagged)

**監控頁面區塊**
1. API 配額與成本卡片
2. 失敗率趨勢
3. 審計結果分佈
4. 異常警示（超閾值）

**權限**
- 僅 admin 可見

#### E-2. 任務清單（V1）
1. **記錄 API 使用**
   - 請求/回應記錄（成功/失敗）
   - 記錄 model、tokens、耗時
2. **記錄審計統計**
   - 審計結果寫入 `audit_metrics`
3. **聚合與快取**
   - 日/週/月統計快取
4. **前端看板**
   - 成本、失敗率、審計分佈視覺化

**訂閱系統備註**
- 目前訂閱來源為 Stripe（`/api/payment`）但尚未開通
- 建議新增 `subscriptions` 集合以便統計與報表（不影響現有編碼，可先寫入 mock/placeholder）
- **註冊介面整理**：頭像品質、美化介面
- **學校資料 + 自動升班**：每年 7/1 自動升班
- **帳號權限細緻分類**：角色/權限矩陣與資料存取規則
- **機構綁定（驗證碼）**：
  - 付費教學者主號可生成驗證碼
  - 子帳號輸入驗證碼後須主號確認
  - 主號可停用/重啟任何子號
- **語言 / 語音選擇**：
  - 介面中/英切換
  - 數學科可獨立中/英文顯示
  - ADHD 語音：中文科可選粵/普，英文科只英語，數學依語言選擇
- **翻譯輔助**：中文科英譯中、英文科中譯英
- **數學圖形題後台排版**：支援有圖表/地圖題目的版面向下延展
- **ADHD 報告/學習數據**：產出 ADHD 學習報告
- **練習模式 / 考題模式**：已完成，持續驗證
- **收費與訂價**：待核心功能完成後再做（P4）
- **大量上線壓力測試**：待做（P4）
- **申請資助**：待做（P4）
- **醫生/NGO 優惠條碼**：個人帳號介面內輸入（P4）

### 2.3 依賴條件

- 審計系統測試需等「種子題目上傳完成」
- 題目分類/能力評分連動需等「四年級中英數單元設定完成」

---

## 3) 後續開發建議（排序）

### 近期（1–2 週）

- 完成 **老師回饋通知欄（後台整合）**
- 完成 **老師回饋 → 生題指令轉換**
- 完成 **開發者/老師/家長/學生資料檢視增強**

### 中期（2–4 週）

- **審計系統測試**（手動）
- **ADHD 功能落地**（高亮/語音/報告）
- **語言/語音/翻譯輔助**

### 長期（1–2 月）

- **AI 雙週報告**
- **學習路徑建議引擎**
- **效能優化（快取/圖像/分段載入）**

---

## 4) 相關文檔索引

- `docs/SESSION_LOG_2024.md`：開發會話紀錄與變更摘要
- `docs/AI_GENERATION_AND_APP_ARCH.md`：系統架構與題目生成流程
- `docs/AUDITOR_SYSTEM.md`：審計系統（設計/實施/測試）
- `docs/CORE_LOGIC.md`：核心生題與調度策略（系統憲法）
- `docs/TECHNICAL_RISK_ASSESSMENT.md`：自動化生題與審核系統技術風險評估
- `docs/OPS_API_AND_QUOTA.md`：API Key 與配額操作
- `docs/DEPLOYMENT_AND_TESTING.md`：部署與測試
- `docs/OPTIMIZATION_AND_SCALE.md`：效能與擴展
- `docs/FIREBASE_SETUP.md`：Firebase 索引與設定
- `docs/VISION_API.md`：圖像題處理
- `docs/PAYMENT_STRIPE.md`：Stripe 支付
- `docs/ABILITY_SCORING_LOGIC.md`：能力評分邏輯
- `docs/rules/*.json`：可調整的生成/分類規則文件
- `docs/TROUBLESHOOTING_AND_FIXES.md`：常見問題與修復
