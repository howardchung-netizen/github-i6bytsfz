AI Math Tutor - Project Bible (v2.0)
1. 專案背景 (Project Context)
🎯 核心目標
本專案為一款 針對小學生的全方位智能學習 App (AI Math Tutor)。 核心賣點在於利用 AI 生成技術 (AIGC) 實現「無限試題」與「個人化家教體驗」，解決傳統練習題枯燥重複、缺乏針對性解說的痛點。並針對特殊需求學生（如需要學習輔助）提供輔助介面。

👥 目標用戶與權限體系
系統分為三種用戶模式與兩個主要介面層級：

A. 用戶模式 (User Roles)
免費用戶 (Free User)：

基本練習功能。

有限的每日生成題數。

訂閱用戶 (Subscriber / Premium)：

AI 老師跟進：每 2 週生成進度報告，並自動制訂下一階段的客製化課程。

學習輔助模式：

介面優化（高亮關鍵字、減少干擾）。

TTS 語音讀題。

可匯出供醫生/學校參考的詳細專注力與進度報告。

無限生成題目。

教學者用戶 (Teacher/Educator)：

班級管理：自行組班，將學生帳號納入管理。

派卷功能：統一發出試題（功課/測驗）。

數據中控台：檢視全班成績分佈、個別學生進度。

種子試題庫：上傳「種子題目 (Seed)」，AI 自動轉化生成變體題目。

B. 介面層級 (Interface Views)
學生介面：

練習主畫面。

能力值雷達圖 (Octagonal Chart)：8 個維度分析強弱項。

錯題本 (Mistake Review)：重做歷史錯題。

家長介面：

全數據監控：學習時間、做題量、成績趨勢、AI 評語。

2. 當前進度 (Current Status)
從 StackBlitz 遷移至 Cursor，目前版本：v2.0 Stable

[x] 核心 AI 引擎：已串接 Google Gemini API，實現「種子 -> 變體題目」的生成邏輯。

[x] 出題系統：支援文字題、選擇題 (MCQ) 自動生成 (數學科 8 選項 + 誘答項，其他科目 4 選項 + 誘答項)。

[x] 效能優化：實作「預加載 (Pre-loading)」機制，實現無感秒開下一題。

[x] 資料庫架構：Firebase Firestore 串接完成 (Users, Topics, PastPapers, Mistakes)。

[x] 開發者後台 (Admin/Teacher Prototype)：

單元管理 (Syllabus)。

種子試題上傳 (Seed Upload)。

AI 生成測試台。

[x] 學生儀表板 (Dashboard)：

基本 UI (Tailwind CSS)。

能力雷達圖 (Recharts)。

ADHD 模式開關 (初步 UI 變更)。

[ ] 待開發功能 (Next Steps)：

家長專屬介面 (目前數據僅在學生 Dashboard 顯示)。

教學者介面完整化 (需從 Developer Console 獨立出來，加入班級管理)。

AI 雙週報告生成器 (訂閱用戶核心功能)。

ADHD 模式深度優化 (關鍵字高亮算法、語音合成)。

支付與訂閱權限鎖定。

3. 技術架構 (Tech Stack)
Frontend Framework: Next.js 14+ (App Router)

Language: TypeScript

Styling: Tailwind CSS, Lucide React (Icons)

Charts: Recharts (用於能力雷達圖)

Backend / Database: Google Firebase (Firestore, Auth)

AI Model: Google Gemini 2.0 Flash / 1.5 Flash (via Next.js API Routes)

State Management: React Hooks (useState, useEffect, useContext)

Deployment: Vercel (Recommended)

4. 關鍵業務邏輯 (Business Logic Rules)
AI 出題規則 (AI Service Constraints)
JSON Output: 所有回應必須是嚴格的 JSON 格式。

選擇題機制:

數學科選擇題：
- 必須包含 options 陣列 (長度 8)。
- 必須包含 7 個「合理的錯誤答案 (Distractors)」。
- answer 必須完全匹配 options 中的一項。

其他科目選擇題：
- 必須包含 options 陣列 (長度 4)。
- 必須包含 3 個「合理的錯誤答案 (Distractors)」。
- answer 必須完全匹配 options 中的一項。

種子變體 (Seed Variation):

維持原題難度與考點 (Logic & Concept)。

更改數字、場景、人名 (Context)。

詳解 (Explanation): 必須限制在 30 字以內以確保生成速度。

錯題機制 (Mistakes Handling)
答錯時，將題目完整 Snapshot 存入 users/{uid}/mistakes。

學生可在錯題本中「重練」，此時應觸發 AI 根據該錯題生成「舉一反三」的新題目（待實作）。

ADHD 輔助模式 (ADHD Mode specs)
UI: 隱藏不必要的裝飾、背景簡化、字體放大、對比度增加。

功能: 題目中的數字、單位、關鍵動作（如：買了、剩下、平均）需進行 高亮顯示。

5. 資料庫結構參考 (Firestore Schema)
artifacts/{APP_ID}/public/data/users: 用戶資料 (包含 role: 'student' | 'parent' | 'teacher' | 'admin', isPremium: boolean).

artifacts/{APP_ID}/public/data/syllabus: 課程大綱 (Grade, Subject, Topic, Sub-topics).

artifacts/{APP_ID}/public/data/past_papers: 種子試題庫 (Source Questions).

artifacts/{APP_ID}/users/{UID}/mistakes: 個人錯題紀錄.

artifacts/{APP_ID}/users/{UID}/logs: 學習歷程 (Time, Score, Action).

6. 重要備註 (Notes for Developer/AI)
安全性: API Key 必須透過 .env.local 讀取，嚴禁寫死在代碼中。

效能: 任何新的 AI 功能開發，必須考慮回應時間。若預計超過 3 秒，必須實作「預加載 (Pre-loading)」或「背景排程」。

遷移歷程:

專案初期因地區限制無法使用 Gemini，現已透過 API Key + 指定 Model 解決。

曾發生 Tailwind 樣式衝突導致 UI 跑版 (Bullet points)，已強制修復。

目前代碼庫狀況: page.tsx 整合了預加載邏輯，ai-service.js 整合了選擇題邏輯。

🚀 給 Cursor 的指令 (Instruction)
當你開始工作時，請優先讀取此檔案。 所有新功能的開發，請嚴格遵守 Section 1 的核心目標 與 Section 4 的業務邏輯。 若是修改 UI，請保持目前的紫色/現代化風格 (Tailwind)。