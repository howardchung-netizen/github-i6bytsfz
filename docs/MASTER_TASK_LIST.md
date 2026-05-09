# AI Math Tutor: Master Implementation Task List / 開發任務總覽

Based on the newly reorganized `FUTURE_UPDATE_PROPOSAL.md`, here is the exact chronological task list for execution. 
根據最新修訂的提案，以下是按優先順序排列的開發任務清單。

## Phase 1: 🔴 P0 Core Security & System Stability / 核心安全與系統穩定
*We must secure the endpoints before commercial launch to prevent DDoS and logic theft.*
*必須在商業發佈前鎖定所有接口，防止 DDoS 攻擊及代碼被盜。*

### Task 1.1: Lock down API Routes (`/api/chat`) / 鎖定 API 接口
- [ ] Add Firebase Admin token verification logic to `/api/chat/route.ts`. (加入 Firebase 驗證)
- [ ] Configure `export const maxDuration = 60;` in Vercel API routes to fix 504 timeouts. (修復 Vercel 超時)
- [ ] Implement IP Rate Limiting (e.g., Upstash Redis) to prevent malicious actors from spamming the local LLM. (實作 IP 頻率限制)

### Task 1.2: Firebase Security & Stability / Firebase 安全與穩定性
- [ ] Provide Firebase Security Rules for the `question_bank` collection to prevent bulk downloading. (設定安全規則防止大量下載)
- [ ] Refactor `deleteUserAccount` in `db-service.js` to process deletions in chunks of 400 (bypassing the 500-batch Firebase limit crash). (將刪除帳號動作分批處理以防死機)

## Phase 2: 🟠 P1 Core Architecture & Performance / 核心架構與效能優化
*Implementing the actual Zero-Latency & Anti-duplication logic.*
*實作零延遲題庫及防重覆邏輯。*

### Task 2.1: Solution B Implementation (Global Topic Pools) / 實作方案 B 大題庫
- [ ] Refactor `question-dispatcher.ts` to pull from the Global Pool first. (優先從題庫抽題)
- [ ] Implement the `used_questions` array (500 limit tracking) in `db-service.js`. (實作 500 題防重覆追蹤)
- [ ] Implement a local React `Set` in `PracticeView.tsx` to prevent exact-session duplicates. (加入單次練習防撞機制)
- [ ] Create the fallback logic to trigger the LLM only when the pool is completely empty. (實作題庫抽乾時的 AI 補底機制)

### Task 2.2: Fix the "1-Second Global Re-render Lag" / 修復 1 秒全局重繪卡頓
- [ ] Extract the root `setInterval` timer in `PracticeView.tsx`. (抽離頂層計時器)
- [ ] Create a micro `<Timer />` component to isolate re-renders. (建立獨立計時組件)

### Task 2.3: SPA Anti-Pattern & Monolith Breaking / 拆解單頁應用與怪獸組件
- [ ] Break `app/page.tsx` into native Next.js routes (`/practice`, `/dashboard`, `/teacher`) to enable bundle splitting. (拆分 Next.js 路由)
- [ ] Refactor the 3000-line `TeacherView.tsx` into smaller sub-components (e.g., `TeacherAnalytics`, `TeacherClassManager`). (拆解 3000 行的老師視圖組件)

### Task 2.4: Scaffolded Learning UI (Progressive CoT Hints) / 鷹架式漸進提示教學系統
- [ ] Update LLM JSON schema in `ai-service.js` to enforce generation of a `hints` array (Chain-of-Thought logic) for every math question. (更新 JSON 架構，強制 AI 生成漸進提示)
- [ ] Build a new React component `<ScaffoldedQuestion />` that progressively reveals these hints (heavy hint -> light hint) before showing the answer. (建立逐步解鎖提示的 UI 組件)

### Task 2.5: Marketing Prototype (Offline Demo Mode) / 行銷專用離線展示模式
- [ ] Add `NEXT_PUBLIC_DEMO_MODE` flag to environment variables. (加入展示模式環境變數)
- [ ] Create `demo-data.json` with 20+ perfect hardcoded questions and fake analytics. (建立包含完美題目及數據的本地 JSON)
- [ ] Update dispatcher and analytics fetchers to bypass Firebase/Gemini when Demo Mode is active. (設定系統在展示模式下跳過真實 API 及數據庫)

## Phase 3: 🟡 P2 UX Flow & Memory Optimization / 使用者流程與記憶體優化
*Fixing bugs that hurt the flow or cause memory bloat.*
*修復影響流暢度及導致記憶體滿載的漏洞。*

### Task 3.1: Fix Waterfall Auth Loading Lag / 修復瀑布式登入延遲
- [ ] Wrap new `page.tsx` routes in React `<Suspense>` Skeletons for instant initial loading. (加入骨架屏實現秒開畫面)

### Task 3.2: Fix the "Unused Question" Deadlock / 修復「冇題目」隨機抽題死結
- [ ] Update `rag-service.js` local filter to use database pagination cursors instead of a hard limit of 50. (改用分頁讀取，解決假性無題目問題)

### Task 3.3: Silent Map Cache Bloat / 修復 Map 緩存記憶體洩漏
- [ ] Replace the infinite `Map()` in `ai-service.js` with an LRU (Least Recently Used) eviction cache. (加入 LRU 自動清理機制)

## Phase 4: 🟢 P3 Commercial Polish & UX Details / 商業級介面打磨
*Final quality assurance for the UI interactions.*
*最後的介面交互質量保證。*

### Task 4.1: Replace Native Browser Alerts / 替換原生瀏覽器警告
- [ ] Install `react-hot-toast` or similar notification library. (安裝 Toast 通知套件)
- [ ] Replace all 130+ `window.alert()` and `window.confirm()` calls across `TeacherView.tsx` and `ParentView.tsx` with non-blocking toasts. (全面替換原生 Alert)

### Task 4.2: UX/UI Quality of Life / 介面微調與體驗提升
- [ ] Add `onSubmit` or `onKeyDown` listeners to `RegisterView.tsx` for Enter-key submission. (加入 Enter 鍵提交功能)
- [ ] Refactor `DashboardView.tsx` P1-P6 selection from a button cycle to a native `<select>` dropdown. (將年級切換改為下拉式選單)
- [ ] Map Firebase `error.code` to precise, user-friendly error messages in `RegisterView.tsx`. (顯示精準登入錯誤訊息)
- [ ] Add Tailwind Skeletons to `StudentView.tsx` charts to fix Cumulative Layout Shift (CLS). (加入圖表骨架屏防止畫面跳動)
- [ ] Fix Language Dropdown hover glitch in `DashboardView.tsx`. (修復語言選單懸浮消失問題)
- [ ] Remove black focus outline from Radar Chart in `StudentView.tsx`. (移除雷達圖黑色點擊邊框)
- [ ] Upgrade the static "重點加強" (Weakness Focus) widget into an actionable link to start a specific practice session. (將「重點加強」升級為可點擊的專項練習連結)
- [ ] Standardize the "Return/Back" button placement across all views globally. (統一全域返回按鈕位置)
