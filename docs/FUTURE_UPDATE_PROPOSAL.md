# Future Update Proposal: AI Question Generation Optimization
# 未來更新提案：AI 生成題目效能優化

## 1. Background / 背景與痛點
**English:** Currently, the AI Math Tutor relies on real-time synchronous LLM (Google Gemini) generation when a student requests a question. This results in an inherent latency (3-8 seconds), which heavily degrades the fast-paced user experience. 

**Hong Kong Chinese:** 目前的 AI Math Tutor 系統喺學生要求題目時，會即時啟動 LLM (Google Gemini) 生成題目。呢種做法會造成大概 3 至 8 秒嘅延遲，對於需要快速答題嘅 App 嚟講，非常影響用戶體驗 (User Experience)。

---

## 2. Proposed Solutions / 改善方案建議

### Solution B: Global "Topic Pools" with Real-time Fallback (Primary Architecture)
### 方案 B：全系統大題庫 + 實時生成 (主架構)

**English:** 
1. Admins/Teachers upload a Seed question, and a background script generates 100+ variations, storing them in `topics/{topic_id}/question_bank`.
2. When a student requests a question, the system pulls from this massive pool.
3. **500-Record Memory:** To prevent repetition, we track the user's last 500 answered question IDs in Firebase.
4. **Session De-duplication:** We enforce strict client-side tracking to guarantee no duplicate questions appear within the exact same practice session.
5. **Real-time Fallback:** If the pool runs dry, the system falls back to generating questions via Google Gemini (tolerating a 3-5s latency).

**Hong Kong Chinese:**
1. Admin 上載 Seed (種子) 題目之後，系統透過 Script 叫 AI 預先生成大量變化題，放入大題庫 `topics/{topic_id}/question_bank`。
2. 學生做練習嗰陣，系統就喺題庫入面抽題目。
3. **500 題防撞庫存：** 為咗防止學生做到重複嘅題目，系統會記錄學生最近做過嘅 500 條題目 ID，確保長遠唔會撞題。
4. **單次練習防撞：** 喺同一次練習 (Session) 裡面，加入絕對防重覆機制，保證同一版面唔會出現兩條一樣嘅題目。
5. **AI 即時補底：** 萬一題庫抽乾咗，系統就會自動呼叫 Gemini 即時生成（用家可以接受呢度有 3-5 秒嘅 Loading Time）。

---

### Solution C: Real-time "Mistake" Generation (Future Backup Feature)
### 方案 C：錯題針對性即時生成 (未來備用功能)

**English:**
*   This is marked as a future expansion. When a student makes a mistake, the system will use real-time Gemini to generate a hyper-personalized remedial question based on their exact error.

**Hong Kong Chinese:**
*   呢個方案將列為未來版本嘅備用功能。當學生答錯題目，系統先至 Call Gemini 即時生成一條完完全全針對佢個錯處嘅「補底題」。

---

## 3. Real-life Implementation Analysis (Proposal B) / 方案 B 實作可行性分析

**1. 500-Record Tracking in Firebase (Firestore Limits)**
*   **English:** Tracking 500 IDs per user is perfectly viable. A single Firestore document can hold up to 1MB of data. 500 string IDs (e.g., `q_123456789`) will consume less than 10KB. We can safely store an array of `used_questions: []` inside the user's profile document without crashing the database.
*   **Hong Kong Chinese:** Firebase 單一 Document 容量上限係 1MB。記低 500 條題目 ID 大概只需要 10KB 空間，所以完全冇壓力。我哋可以喺 User Profile 裡面直接加一個 `used_questions` Array，每答一題就 push 入去，超過 500 就洗走最舊嗰個 (FIFO)。

**2. Session De-duplication**
*   **English:** Easily solved by maintaining a `Set` of used IDs in the React/Next.js memory state (`PracticeView.tsx`) during the active test.
*   **Hong Kong Chinese:** 喺同一次練習入面防重覆非常簡單。只需要喺 Frontend (React State) 建立一個暫時嘅 `Set`，抽中咩題目就記低，保證同一次考試絕不重覆。

**3. The 3-5s Loading Time Tolerance**
*   **English:** Because the user tolerates 3-5 seconds of loading, we do not need to over-engineer complex asynchronous background queues (Proposal A). A simple hybrid system—pulling instantly from the pool, and waiting 5 seconds for Gemini if the pool is exhausted—drastically reduces development time while meeting business needs.
*   **Hong Kong Chinese:** 既然用家可以接受 3-5 秒 Loading，我哋就唔需要花大量時間去寫極度複雜嘅「背景個人專屬佇列」。系統平時可以秒速喺題庫抽題，真係乾塘先俾學生等 5 秒睇 AI 即時生成。咁樣開發成本最低，但效果已經好好。

---

## 4. Implementation Recommendation / 總結建議
**English:** We will proceed with **Solution B (Global Pools with 500-track limit and 5s Fallback)** as the core architectural upgrade. It strikes the perfect balance between database cost-efficiency and user experience.

**Hong Kong Chinese:** 我哋將會落實 **方案 B** 作為核心升級架構。呢個方案既可以控制 Firebase 成本，又可以保證 500 題不重複，開發效率最高。

---

## 5. Architectural Fix for the "Missing Options" Bug / 徹底解決 AI 漏出選項的架構方案

**Background:** 
LLMs occasionally fail to brainstorm 7 distractors, outputting only 2 options instead of 8. Our current safety net pads the rest with empty strings `""`, which the UI filters out, resulting in a UI glitch (only 2 buttons displayed).

### Deep Solution Framework / 深度解決方案：

**Level 1: Native Structured Outputs (Gemini 1.5/2.0 Feature)**
*   **English:** Instead of relying on text prompts (`"Generate 8 options"`), we must enforce a strict JSON Schema at the Google Gemini API connection level using the `response_schema` parameter. We explicitly set the `minItems` and `maxItems` constraints to 8 for the `options` array. The Gemini API will automatically retry internally until it perfectly fulfills the JSON structure before it ever returns the data to our server.
*   **Hong Kong Chinese:** 唔好淨係係 Prompt 度叫 AI 出 8 個選項。下個版本要喺呼叫 `fetch('/api/chat')` 時，直接傳遞 `response_schema`，強制鎖死 `options` 陣列長度 `minItems: 8`。如果 AI 出唔夠，API 內部會自己打回重做，確保回傳俾我哋嘅必定係完美嘅 JSON。

**Level 2: Deterministic Mathematical Fallback (The Ultimate Safety Net)**
*   **English:** If the AI still fails or the schema validation drops an option due to duplication, we should NOT send empty strings to the frontend. Instead, we insert a lightweight Node.js algorithm in `ai-service.js`. If the correct answer is `72`, the algorithm automatically calculates algorithmic variations: `[72, 72+1, 72-1, 72*10, 72/10, 72+10, 72-10, 27]`. It then fills the empty `""` slots with these mathematically sound, unique distractors so the student always sees 8 logical choices.
*   **Hong Kong Chinese:** 有時 AI 就算俾足 8 個，但當中有兩個選項係一模一樣（例如 `72` 數字同 `$72`），我哋後台去重 (De-duplication) 之後又會變返 7 個。為咗徹底解決，我哋要寫一個「數學兜底演算法」。如果標準答案係 `72`，系統發現選項唔夠 8 個，就會自動用程式計算出常見盲點（例如加減一、乘十除十、位數掉轉 `27`）去填補空缺。咁樣 100% 保證前端一定有 8 個選項，並且全部都係合理嘅「誘答項」(Distractors)。

---

## 6. Zero-Latency Engine: Template Dataification / 終極零延遲引擎：題型範本數據化 (Solution D)

**Background:** 
Instead of caching thousands of fully generated questions, or relying on Gemini to generate questions on-the-fly, we can directly store dynamic mathematical "Templates" in Firebase. This is the ultimate architecture for solving calculation-based mathematics with zero AI latency.

### Implementation Blueprint / 具體執行計劃：

**1. Data Structure Paradigm Shift (Firebase Schema)**
*   **English:** We will convert string-based seeds into JSON objects with built-in mathematical formulas. For example, setting dynamic variables like `"total": "randomInt(40, 99)"` and tying the answer logic directly to `"Math.floor(total / kids)"` in the database.
*   **Hong Kong Chinese:** 將原本嘅純文字種子題目 (Seed Questions) 升級為包含數學公式嘅 JSON 範本。我哋可以直接喺 Firebase 設定變數，例如 `randomInt(40, 99)`，同埋設定答案嘅計算公式。

**2. The Local Template Engine (`template-engine.ts`)**
*   **English:** We will build a lightweight JavaScript evaluator inside the Next.js backend. When a student requests practice, it reads the template, rolls the random numbers, and calculates the exact answer and distractors instantly in roughly `~5ms`.
*   **Hong Kong Chinese:** 喺 Next.js 後台寫一個 `template-engine.ts`。當學生做練習時，引擎會直接讀取 JSON 範本，用 JavaScript 秒速「骰」啲隨機數字出嚟，並自己計埋標準答案同時填補 7 個誘答錯誤選項，過程只需 `5ms`。

**3. Hybrid Dispatcher Routing (`question-dispatcher.ts`)**
*   **English:** The existing Question Dispatcher will be upgraded. If it detects `isTemplate: true` on a fetched seed, it completely bypasses the Google Gemini API and routes to our new Zero-Latency Engine. If it's a standard text seed (like English or Chinese reading comprehension), it securely falls back to Gemini.
*   **Hong Kong Chinese:** 升級現有嘅派題系統。如果抽到嘅題目有 `isTemplate: true` 嘅標籤，系統會完美飛起 Gemini API，改用我哋嘅零延遲引擎自己計算題目出嚟。如果抽到嘅係中文或英文等文字種子，就自動轉用返 Gemini，達成完美雙軌制 (Hybrid) 系統！

---

## 7. Scaffolded Learning UI (Progressive CoT Hints) / 鷹架式漸進提示教學系統

**Background:**
To guide students through complex visual reasoning (e.g. Geometry), we need an interactive step-by-step logic interface rather than just a static question and answer.

### Implementation Blueprint / 具體執行計劃：

**1. JSON Schema Upgrade (Chain-of-Thought)**
*   **English:** Force the LLM to output a `hints` array containing progressive logic steps (Heavy hint -> Light hint) *before* it calculates the answer. This vastly improves the LLM's mathematical accuracy.
*   **Hong Kong Chinese:** 強制要求 AI 喺得出答案之前，先生成一系列漸進式提示 (鷹架式教學)。呢個做法不單止可以引導學生，仲可以令 AI 透過「Chain-of-Thought」思考，大幅提高數學計算嘅準確度。

**2. The Scaffolded UI Component (`<ScaffoldedQuestion />`)**
*   **English:** Build a dynamic React component that parses the JSON hints and renders them progressively (e.g., clicking "Need a hint?" reveals step 1). It will support injected SVG geometries and mapping tables.
*   **Hong Kong Chinese:** 開發一個全新嘅 React 互動組件。學生唔識做嗰陣，撳「需要提示」就可以逐個步驟解鎖提示。配合圖形及對應表格，做到好似老師逐步拆解題目一樣。

---

## 8. Marketing Prototype (Offline Demo Mode) / 行銷專用離線展示模式

**Background:**
For investor pitches and marketing presentations, relying on live cloud databases and AI generation is risky (due to potential Wi-Fi drops or API timeouts). We need a perfectly stable, 0ms latency "Dummy Version" of the app.

### Implementation Blueprint / 具體執行計劃：

**1. The `DEMO_MODE` Environment Switch**
*   **English:** Introduce a `NEXT_PUBLIC_DEMO_MODE=true` environment variable. When active, the entire application bypasses Firebase and Google Gemini completely.
*   **Hong Kong Chinese:** 加入一個環境變數開關。開啟後，整個系統會完全切斷與 Firebase 同埋 AI 嘅連線，進入「單機展示模式」。

**2. Hardcoded Perfect Database (`demo-data.json`)**
*   **English:** Create a local JSON file containing 20-50 hand-crafted, beautifully formatted, error-free math questions and fake, visually impressive student analytics. The UI will instantly read from this file, dropping load times from 5 seconds to 0.001 seconds.
*   **Hong Kong Chinese:** 喺系統入面寫死一個包含 50 條完美題目同埋超靚學生數據嘅 JSON 檔案。演講嗰陣，系統會秒速讀取呢個檔案，確保展示過程 100% 零延遲、零甩漏。

---

## 9. Priority Action Plan / 開發優先順序總覽

經過全面代碼審查，我們整理出以下技術債與系統漏洞，並根據「對系統穩定性與使用者體驗的影響程度」排序，作為接下來的主要開發藍圖。

### 🔴 P0 Level: Core Security & System Stability / 核心安全與系統穩定
這部分直接威脅商業機密或導致伺服器崩潰，必須在產品上線前首要解決。

**1. 🚫 API Route Authorization & Rate Limiting (`/api/chat`)**
*   **English:** Endpoints lack Firebase Auth checking and IP rate limiting. Malicious actors could DDoS the local LLM. **Fix:** Implement Firebase Admin Auth and Upstash Redis Rate Limiter.
*   **Hong Kong Chinese:** 接口欠缺登入驗證及 IP 頻率限制，隨時被黑客癱瘓伺服器。**修復：**加入 Auth 驗證及限制每分鐘請求數。

**2. 🔐 Firebase Security Rules**
*   **English:** Lock down `question_bank` to prevent bulk-downloading of the proprietary 10,000+ question database.
*   **Hong Kong Chinese:** 鎖定數據庫權限，防止競爭對手寫 Script 一秒鐘偷走過萬條獨家題目。

**3. ⏱️ Vercel Execution Timeout (`/api/chat`)**
*   **English:** Missing `export const maxDuration = 60;` causes 504 Gateway Timeouts.
*   **Hong Kong Chinese:** 欠缺 Vercel 運行時間設定，導致超時斷線。**修復：**加回 maxDuration 宣告。

**4. 🔥 Firebase Batch Limit Crash (`db-service.js`)**
*   **English:** Deleting an account triggers a single `batch.delete()` transaction. If >500 items, the server crashes. **Fix:** Chunk batches by 500.
*   **Hong Kong Chinese:** 刪除帳號時若記錄大於 500 條會導致死機。**修復：**將刪除動作分批處理。

---

### 🟠 P1 Level: Core Architecture & Performance / 核心架構與效能優化
實行「零延遲」與「防重複」的核心商業邏輯，並解決嚴重拖慢前端渲染速度的效能瓶頸。

**1. 🏛️ Solution B Implementation (Global Pools + 500 Limit)**
*   **English:** Build the background generator and strictly enforce the 500-track limit and active session de-duplication in React State.
*   **Hong Kong Chinese:** 實作大題庫架構，並加入「最近 500 題」防重覆機制及單次練習防撞邏輯。

**2. 🐌 The 1-Second Global Re-render Lag (`PracticeView.tsx`)**
*   **English:** A root-level `setInterval` runs every second, forcing the entire student interface to re-render. **Fix:** Extract timer into a micro `<Timer />` component.
*   **Hong Kong Chinese:** 最頂層的計時器導致整個畫面每秒強制重新繪製。**修復：**獨立抽離計時器組件。

**3. 🏗️ The SPA Anti-Pattern (`app/page.tsx`)**
*   **English:** All views (Teacher, Student, Parent) are bundled into one file. **Fix:** Refactor into Next.js URL routing (`/teacher`, `/practice`).
*   **Hong Kong Chinese:** 所有龐大頁面塞進同一個檔案，拖慢載入。**修復：**切換為正規 Next.js 路由。

**4. 💀 The "God Component" Monolith (`TeacherView.tsx`)**
*   **English:** A 3,000-line file with 35+ `useState` hooks causes massive UI lag. **Fix:** Break into smaller Tabs.
*   **Hong Kong Chinese:** 3,000 行的怪獸組件，打字引發圖表重劃。**修復：**分拆檔案。

---

### 🟡 P2 Level: UX Flow & Memory Optimization / 使用者流程與記憶體優化
解決介面流程的不順暢及潛在的記憶體洩漏問題。

**1. 💧 Waterfall Auth Loading Lag (`app/page.tsx`)**
*   **English:** Waits sequentially for Auth -> Database -> UI, causing a 3+ second blank screen. **Fix:** Use React `<Suspense>` Skeletons.
*   **Hong Kong Chinese:** 瀑布式載入導致 3 秒空白畫面。**修復：**加入骨架屏 (Skeleton UI)。

**2. 🔒 The "Unused Question" Deadlock (`rag-service.js`)**
*   **English:** Local filter yields 0 despite thousands of questions remaining. **Fix:** Add pagination cursor.
*   **Hong Kong Chinese:** 隨機抽題過濾邏輯錯誤導致死結。**修復：**加入分頁邏輯。

**3. 🧠 Silent Map Cache Bloat (`ai-service.js`)**
*   **English:** The JS `Map()` cache has no size cap. **Fix:** Add LRU eviction.
*   **Hong Kong Chinese:** 緩存系統無容量上限，長期使用會爆 RAM。**修復：**加入 LRU 清理。

---

### 🟢 P3 Level: Commercial Polish & UX Details / 商業級介面打磨
最後的「質量保證」(QA) 階段，解決反直覺的介面互動，提升產品專業感。

**1. 🚫 Replace Native Browser Alerts (`TeacherView.tsx`)**
*   **English:** Over 130 actions trigger `window.alert()`, freezing the thread. **Fix:** Implement `react-hot-toast`.
*   **Hong Kong Chinese:** 系統大量使用原生 alert 鎖死網頁。**修復：**全面替換為 Toast 彈跳通知。

**2. ⌨️ Missing Enter-Key Submission (`RegisterView.tsx`)**
*   **English:** Login inputs lack `onSubmit` or `onKeyDown`. **Fix:** Add form wrappers.
*   **Hong Kong Chinese:** 登入頁面無法按 Enter 鍵提交。**修復：**加入表單提交機制。

**3. 🌊 Cumulative Layout Shift (CLS) (`StudentView.tsx`)**
*   **English:** Massive 500px tall graphs load suddenly, violently shifting the UI. **Fix:** Use Tailwind Skeletons.
*   **Hong Kong Chinese:** 圖表載入時畫面強烈跳動。**修復：**為圖表預留固定高度骨架屏。

**4. 😕 Vague Login Error Messages (`RegisterView.tsx`)**
*   **English:** Form swallows Firebase errors. **Fix:** Parse `error.code` accurately.
*   **Hong Kong Chinese:** 登入錯誤訊息太籠統。**修復：**精準顯示錯誤代碼。

**5. 🔄 Frustrating P1-P6 Grade Selection (`DashboardView.tsx`)**
*   **English:** Cycle button forces repeated clicking. **Fix:** Replace with `<select>` dropdown.
*   **Hong Kong Chinese:** 切換年級按鈕反直覺。**修復：**改為下拉式選單。

**6. 🌐 Language Dropdown Hover Glitch (`DashboardView.tsx`)**
*   **English:** The language dropdown disappears immediately when the mouse leaves the button, making it impossible to click options. **Fix:** Add padding to the hover safe-area or use an `onClick` state instead of `:hover`.
*   **Hong Kong Chinese:** 語言切換選單只要滑鼠一離開按鈕就消失，無法點擊選項。**修復：**加闊懸浮觸發區或改為點擊展開。

**7. 🎯 Radar Chart Focus Outline (`StudentView.tsx`)**
*   **English:** Clicking the radar chart creates an ugly black focus border. **Fix:** Apply `outline-none` or `focus:outline-none` CSS.
*   **Hong Kong Chinese:** 點擊雷達圖時會出現礙眼的黑色邊框。**修復：**移除 CSS 點擊外框。

**8. 🚀 Weakness Actionable Widget (`StudentView.tsx`)**
*   **English:** The "重點加強" (Weakness Focus) widget is static. **Fix:** Make the weakness text a clickable link that automatically generates a practice session for that specific topic.
*   **Hong Kong Chinese:** 「重點加強」板塊目前只是純文字提示。**修復：**加入點擊功能，一按即自動生成針對該弱點的練習題。

**9. 🔙 Return Button Consistency (Global)**
*   **English:** The "Back/Return" buttons are placed inconsistently (some on the left, some on the right). **Fix:** Standardize a global `<BackButton />` component anchored to the top-left across all views.
*   **Hong Kong Chinese:** 各頁面的「返回」按鈕位置不統一。**修復：**統一放置於所有頁面的左上角。

---

## 10. Security & In-House LLM Migration Strategy / 資訊安全與私有模型遷移策略

### A. Local LLM Hardware Migration (M2 Max / M3 Ultra)
**Background:** Moving away from Google Gemini to an in-house LLM (e.g., Llama 3 or Mistral running via Ollama/LM Studio) hosted on Mac hardware eliminates API token costs and protects data privacy.

**Does this eliminate the need for Rate Limiting? / 仲需唔需要限制生成次數？**
*   **English:** YES, rate limiting is still strictly required. Even though we aren't paying per-token, local LLM inference is highly compute-heavy. If a malicious user sends 10,000 generation requests, the M2/M3 GPU will hit 100% utilization, creating a queue bottleneck that acts as a Denial of Service (DoS) for all other legitimate users.
*   **Hong Kong Chinese:** **絕對需要！** 就算我哋唔使用錢買 Token，但 M2/M3 顯示卡計數係需要時間嘅 (Inference time)。如果有黑客寫 Script 一次過要求生成 1 萬條題目，部 Mac 機就會 100% 滿載塞死晒，其他真實學生就會無法生成題目 (即係 DoS 攻擊)。
*   **The "Solution B" Advantage:** Because we are adopting Solution B (Global Topic Pools), normal students rarely hit the LLM directly. They read instantly from the pre-generated Firebase pool. Only the Admin/Teacher background script hits the Mac LLM heavily. This architectural design naturally absorbs 95% of the DDoS risk!

### B. Commercial Security Requirements / 商業級資安防禦清單
To prevent logic theft and malicious server overload, the following must be implemented before commercial launch:

**1. API Route Authorization (防止盜用接口)**
*   **English:** Currently, anyone with the URL can trigger `/api/chat`. We must implement Firebase Admin SDK verification on the server. If the request doesn't contain a valid logged-in user token, the server drops it instantly with a 401 Unauthorized.
*   **Hong Kong Chinese:** 目前任何人只要知道 API 網址，都可以無限 Call 我哋個伺服器。必須喺 Backend 加入 Firebase Token 驗證，未登入或者假冒嘅 Request 直接 Block 走。

**2. Firebase Security Rules (防止代碼與題庫被盜)**
*   **English:** Proper Firestore Rules ensure users can only read `question_bank` one question at a time. Without rules, a competitor could write a script to download your entire 10,000+ proprietary question database in 2 seconds.
*   **Hong Kong Chinese:** 必須鎖緊 Firebase 資料庫權限。如果唔鎖，同行對手可以寫幾行 Code，一秒鐘之內 Download 晒你辛苦用 AI 生成嘅一萬條獨家題目。 

**3. Strict IP Rate Limiting & WAF (防禦 DDoS 攻擊)**
*   **English:** Implement Cloudflare or Vercel Web Application Firewall (WAF) and Upstash Redis Rate Limiting. E.g., "Max 10 AI generation requests per IP per minute." This kills malicious scripts before they even reach the Mac LLM.
*   **Hong Kong Chinese:** 加入 IP 限制防護網 (Rate Limiting)。例如限制「每個 IP 一分鐘內最多只可以要求 AI 出題 10 次」。黑客用 Script 狂掃就會即刻被 Ban IP，完美保護公司部 Mac 機。

**4. Backend Logic Obfuscation (源代碼保護)**
*   **English:** Because we use Next.js, all core AI logic, prompt templates, and database interactions happen securely on the backend (Node.js). The client browser only downloads compiled, minified React UI code. Your secret AI "recipes" are already naturally protected from being stolen via the browser inspector.
*   **Hong Kong Chinese:** 因為系統用緊 Next.js 架構，所有 AI 核心 Prompt (提示詞指令) 同數據庫密碼都係留喺 Backend 執行。客戶端 (Browser) 只會收到已經加密混淆過 (Minified) 嘅 UI 介面，所以對手係絕對無法喺 F12 檢閱元素中偷走你嘅「核心商業邏輯」。
