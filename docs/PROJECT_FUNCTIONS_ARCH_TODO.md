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

### 2.1 審計系統測試（待做）

- 手動審計 API 的完整測試
- JSON 格式與審計報告品質檢查
- `logic_supplement` 遵守度驗證
- 正確性/格式/難度判定精度
- 超時、API 錯誤、題目不存在、解析失敗處理
- 性能與並發壓力測試

### 2.2 系統未完成 / 部分完成項目

- **家長視圖**：缺統計、趨勢分析、AI 評語
- **教師視圖**：派卷與數據分析不完整
- **ADHD 模式**：高亮、語音讀題、專注力報告
- **訂閱權限鎖定**：免費/付費功能分流
- **AI 雙週報告生成器**：訂閱核心功能
- **錯題本增強**：分類、複習計畫、舉一反三
- **數據統計增強**：學習路徑建議、弱點分析

### 2.3 依賴條件

- 審計系統測試需等「種子題目上傳完成」

---

## 3) 後續開發建議（排序）

### 近期（1–2 週）

- 完成 **審計系統測試**（手動）
- 完成 **訂閱權限鎖定**（功能控管）
- 完成 **家長 / 教師視圖** 基礎報表

### 中期（2–4 週）

- **審計自動化**（Cron + worker）
- **錯題本強化**（分類/複習）
- **ADHD 功能落地**（高亮/語音/報告）

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
