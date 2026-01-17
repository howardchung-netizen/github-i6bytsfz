# 專案功能架構與待辦整合總覽

> **用途**：提供完整的「已完成功能架構 + To-Do + 後續建議」，可直接交給另一個 AI 進行技術分析。  
> **更新日期**：2026年1月15日  
> **專案路徑**：`C:\ai totur\github-i6bytsfz`

---

## 1) 已完成功能架構（可供技術分析）

### 1.1 前端 UI 架構（Views / Components）

- **DashboardView**：學生儀表板、能力雷達圖、科目切換、分數顯示 `(50/100)`
- **PracticeView**：練習流程核心（題目呈現、作答、答案檢查、下一題、完成試卷）
- **CommonViews**：通用視圖（題目選擇、錯題本、題目列表）
- **DailyTaskView**：每日任務入口與限制
- **TeacherView**：教師控制台（種子題目上傳、派卷整合、班級管理部分功能）
- **ParentView**：家長視圖（基礎 UI）
- **DeveloperView / ChineseDeveloperView / EnglishDeveloperView**：開發者工具
- **SubscriptionView**：訂閱方案頁面
- **RegisterView**：登入/註冊流程
- **page.tsx**：主入口與全局流程協調（題目生成、完成試卷後能力計分）

### 1.2 API 路由層（Next.js API）

- `/api/chat`：AI 題目生成（Gemini 2.0 Flash）
- `/api/vision`：圖像題識別與結構化輸出（Vision API）
- `/api/payment`、`/api/webhooks/stripe`：Stripe 支付與 Webhook
- `/api/check-env`、`/api/check-quota`、`/api/test-google-api`：環境檢測、配額檢測
- `/api/audit/single`：審計手動觸發（單題審計，含 `maxDuration` / `dynamic`）

### 1.3 服務層（lib）

- `ai-service.js`：題目生成、提示詞建構、JSON 清理與解析
- `db-service.js`：Firestore 讀寫（題目、回饋、作業、能力分數、審計狀態）
- `auditor-service.js`：審計員核心（prompt、JSON 解析、審計更新）
- `ability-scoring.js`：能力評分計算（完成試卷後更新）
- `ability-mapping.js`：單元/子單元 → 能力維度映射
- `mock-data-generator.js`：模擬學生/班級數據
- `constants.js`：模型配置（Creator / Auditor / Vision）

### 1.4 主要業務流程

**A. 題目生成流程**
1. 使用者選單元 → 觸發 `startPracticeSession`
2. `ai-service` 組裝 prompt（含種子題/回饋）
3. `/api/chat` 生成題目 JSON
4. UI 顯示並進入練習流程

**B. 練習流程**
1. 題目呈現（支援 LaTeX 與幾何圖形）
2. 使用者作答 → 即時檢查正誤
3. 完整試卷完成後 → `ability-scoring` 計算並存入 Firestore

**C. 種子題目上傳**
- 教師端統一上傳介面
- 自動判斷純文字題（不走 Vision）或圖像題（走 Vision）

**D. 審計流程（手動）**
1. 呼叫 `/api/audit/single?questionId=xxx`
2. `auditor-service` 使用 `gemini-2.5-pro`
3. 回寫 `audit_status/audit_report/audit_score/...`

### 1.5 資料庫結構（核心集合）

- **past_papers**：題目主集合  
  - 審計欄位：`audit_status`, `audit_report`, `audit_score`, `auditor_model_used`, `audit_issues`, `audit_timestamp`
  - `logic_supplement`：開發者注入邏輯  
- **developer_feedback**：開發者回饋（可影響生成或審計）
- **ability_scores**：能力評分儲存
- **logs / mistakes**：練習與錯題

---

## 2) 整合 To-Do List（待辦事項）

### 2.0 近期優先（P0 / P1）

**P0**
- **個人檔案入口**：登入後可進入個人資料介面（已修）
- **練習 / 試卷模式驗證**：整體流程已完成，待完整驗證（已完成）

**P1**
- **老師回饋通知欄（後台整合）**：先完成通知欄與資料流，再做回饋轉生題指令
- **老師回饋 → 生題指令轉換**：依通知欄資料格式建立 prompt/指令模板

**需等四年級單元設定完成後再做（提醒）**
- 雲端題目分類儲存測試（影響能力評分）
- 生題邏輯整理 + 分類 → 能力評分連動
- 邏輯補充 / 老師回饋功能測試

### 2.1 審計系統測試（待做）

- 手動審計 API 的完整測試
- JSON 格式與審計報告品質檢查
- `logic_supplement` 遵守度驗證
- 正確性/格式/難度判定精度
- 超時、API 錯誤、題目不存在、解析失敗處理
- 性能與並發壓力測試

### 2.2 系統未完成 / 部分完成項目（依你補充）

- **開發者後台資料檢視**：下載率、每月訂閱人數、新帳號申請、各帳號登錄數量
- **老師/家長/學生資料檢視格式**：增添學習數據、時間紀錄、作答時間
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
- `docs/OPS_API_AND_QUOTA.md`：API Key 與配額操作
- `docs/DEPLOYMENT_AND_TESTING.md`：部署與測試
- `docs/OPTIMIZATION_AND_SCALE.md`：效能與擴展
- `docs/FIREBASE_SETUP.md`：Firebase 索引與設定
- `docs/VISION_API.md`：圖像題處理
- `docs/PAYMENT_STRIPE.md`：Stripe 支付
- `docs/ABILITY_SCORING_LOGIC.md`：能力評分邏輯
- `docs/TROUBLESHOOTING_AND_FIXES.md`：常見問題與修復
