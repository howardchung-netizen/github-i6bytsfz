# DeveloperView Refactor Assessment

> Scope: Pre-refactoring assessment for splitting `app/components/DeveloperView.tsx` into
> `admin/FactoryDashboard.tsx`, `admin/AnalyticsView.tsx`, and `admin/SystemLogs.tsx`.

## 1) 狀態管理分析 (State Management Analysis)

### 目前跨 Tab 共用的狀態
- `activeTab`：切換 Tabs 的核心狀態，影響資料載入與畫面渲染。
- `user` / `isFirebaseReady`：權限與資料載入的關鍵條件。
- `topics`, `setTopics`：課程單元資料，廣泛用於上傳、分類、Factory 監控。
- `analyticsData` / `isLoadingAnalytics`：Analytics 區塊會使用，但現在在父層。
- `pendingTeacherFeedbackCount` / `isLoadingTeacherFeedbackCount`：全頁頂部通知用途。

### 建議保留在父組件 (DeveloperView)
- `activeTab`（控制路由與顯示）
- `user`, `isFirebaseReady`, `topics`, `setTopics`
- 全域通知類狀態：`pendingTeacherFeedbackCount`
- `paperCount`（若頂部跨 Tab 顯示）

### 建議下放到子組件
**FactoryDashboard**
- `factory*` 相關：`factoryQueue`, `factoryStats`, `factorySelections`, `factorySeedImages`,
  `factoryAuditLoading`, `factoryPublishLoading`, `factoryDiscardLoading`,
  `factoryPoolType`, `factorySource`, `factoryEdits`, `isFixingStock`,
  `factoryStockMap`, `factoryStockTree`, `behaviorSampleCount`
- 圖像/PDF 上傳相關：`imageFiles`, `pdfPages`, `isPreparingPdf`, `isProcessingImages`,
  `imageProcessingProgress`, `paperJson`, `paperMeta`, `isUploading`
- Seed Inspection/分類相關：`unclassifiedQueue`、分類修正流程

**AnalyticsView**
- `analyticsData`, `isLoadingAnalytics`
- `loadAnalytics` 與圖表設定

**SystemLogs**
- 若包含日誌查詢/顯示，應獨立維護其載入狀態與查詢參數

### useEffect 相依性風險
高風險相依鏈：
- `useEffect` 依賴 `activeTab`、`isFirebaseReady` 觸發 `loadFactoryQueue/loadFactoryStock`
- `factory` 相關狀態更新後會觸發多個 reload（審核、發布、丟棄、修正分類）

建議：
- 將 `loadFactoryQueue` / `loadFactoryStock` 及其依賴集中在 `FactoryDashboard` 內，
  避免父層與子層競態更新。
- 將 `loadAnalytics` 完整搬到 `AnalyticsView`，避免父層不必要的 re-render。

---

## 2) 風險評估 (Risk Assessment)

### High Risk
- **工廠模式即時庫存更新**：`loadFactoryQueue` 與 `loadFactoryStock` 被多個 action 呼叫，
  拆分後容易遺漏刷新、導致狀態不同步。
- **Seed Upload / PDF 轉圖流程**：影像處理 + Vision API 解析 + DRAFT 入庫流程
  步驟多，拆分易破壞流程順序或上傳狀態同步。
- **Seed Inspection UI**：未分類區塊 + 手動分類 + 驗證/發布流程，交錯狀態多。

### Props Drilling
高機率出現：
- `topics`, `setTopics`, `isFirebaseReady`, `user`、以及 `DB_SERVICE` 的使用。

建議：
- 可引入 Context（如 `AdminContext`）統一提供 `user / topics / isFirebaseReady`，
  減少跨層 props 傳遞。

---

## 3) 相依性檢查 (Dependency Check)

### 必須移動的 Helper Functions
**FactoryDashboard 專屬**
- `loadFactoryQueue`, `loadFactoryStock`
- `handleFactoryGenerate`, `handleFactoryAudit`, `handleFactoryVerify`,
  `handleFactoryPublish`, `handleFactoryDiscard`
- `handleSeedSavePublish`, `handleSeedSaveClassification`, `handleFixPublishedMetadata`
- `convertImageToBase64`, `convertPdfToImages`
- `parseAuditReport`, `getTopicIdFromName`, `normalizeTopicName`
- `unclassifiedQueue` / `classifiedQueue` 計算與分類 UI

**AnalyticsView 專屬**
- `loadAnalytics` 與圖表資料處理

### 潛在循環引用風險
低風險但需注意：
- 子組件若 import `DeveloperView` 內 helper（而 DeveloperView 又 import 子組件）
  會造成循環引用。

建議：
- 將共用 helper 抽到 `app/lib/admin-utils.ts` 或 `services/admin/*`。

---

## 4) 建議實作步驟 (Implementation Roadmap)

1. **Step 1：搬 SystemLogs**
   - 最少依賴，風險最低，先拆出獨立功能。
2. **Step 2：搬 AnalyticsView**
   - 主要依賴 `analyticsData` 和 `loadAnalytics`，邏輯清晰。
3. **Step 3：搬 FactoryDashboard**
   - 最複雜：Factory + Seed Upload + Seed Inspection + Inventory Monitor，
     最後處理可降低風險。

---

## 結論
拆分可大幅降低維護成本，但 **Factory 模組風險最高**，需優先確保
「審核後刷新」與「Seed Upload Pipeline」在拆分後仍保持一致的狀態流。
