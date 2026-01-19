# 開發會話紀錄 - 2024年

## 📋 今天完成的主要工作

### 32. ✅ 練習/AI 試卷支援子單元選擇
**功能**：
- 練習題目與「開始 AI 試卷」的單元選擇支援子單元篩選
- 子單元選擇結果傳遞至生題流程並加入 Prompt focus

**相關文件**：
- `app/components/CommonViews.tsx` - 子單元選擇 UI 與選取狀態
- `app/page.tsx` - 子單元選擇狀態傳遞與紀錄
- `app/lib/ai-service.js` - 子單元 prompt focus 與快取鍵
- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` - 架構補充

---

### 31. ✅ ADHD 提示詞高亮規則優化
**功能**：
- 中文單位詞僅在「數字相鄰」時高亮，避免「分店」等誤判
- 英文關鍵字加入邊界判斷，避免單字內字母誤觸發
- 英文單位（如 m、L）需貼近數字才高亮

**相關文件**：
- `app/lib/adhd-utils.js` - 高亮規則與判斷邏輯

---

### 30. ✅ ADHD 語音體驗修復與 UI 簡化
**功能**：
- 英文語音預設優先指定 `Microsoft Zira - English (United States)`
- 第一次試聽加入語音載入提示與延遲重試，降低首次無聲/報錯
- 退出練習時強制停止語音播放
- 移除「顯示語音」按鈕與語音清單 debug UI

**相關文件**：
- `app/components/PracticeView.tsx` - 語音預設/載入/退出停止與 UI 調整

---

### 29. ✅ P3 完成：語言/語音與翻譯輔助
**功能**：
- 題目生成支援數學語言偏好（中文/英文）
- 練習頁新增語音語言選擇與翻譯輔助
- 圖形題圖像可放大顯示

**相關文件**：
- `app/components/PracticeView.tsx` - 語音/翻譯與圖像放大
- `app/components/CommonViews.tsx` - 數學語言選擇
- `app/components/DailyTaskView.tsx` - 數學語言選擇
- `app/lib/ai-service.js` - 語言偏好與 lang 欄位
- `app/lib/adhd-utils.js` - 語音語言支援
- `app/page.tsx` - 語言偏好傳遞
- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` - 架構與 P3 狀態更新

---

### 28. ✅ 已完成功能架構全面補齊
**功能**：
- 補齊已完成功能架構（前端視圖、流程、快取、後台指標）
- 補充核心資料集合（班級、作業、通知、題庫、報告）

**相關文件**：
- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` - 架構內容擴充

---

### 27. ✅ P2 完成：後台指標、學習時間、註冊與升班
**功能**：
- 開發者後台補齊指標（下載率、訂閱數、新帳號、帳號總數）
- 家長/學生新增平均用時（秒/題）
- 註冊介面加入學校資料、教學者主/子帳號，頭像風格更新
- 登入時自動升班（7/1 起）

**相關文件**：
- `app/api/metrics/route.ts` - 指標擴充
- `app/components/DeveloperView.tsx` - 後台卡片補齊
- `app/components/ParentView.tsx` - 平均用時
- `app/components/StudentView.tsx` - 平均用時
- `app/components/RegisterView.tsx` - 學校與教學者帳號設定
- `app/lib/db-service.js` - 自動升班
- `app/page.tsx` - 登入升班與機構欄位注入
- `app/components/TeacherView.tsx` - 子帳號待確認提示
- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` - 架構與 P2 狀態更新

---

### 26. ✅ 家長多子女比較/排行 + 本機 Build 檢查
**功能**：
- 完成家長後台多子女比較與排行區塊
- 本機 `npm run build` 通過

**相關文件**：
- `app/components/ParentView.tsx` - 多子女比較/排行
- `docs/SESSION_LOG_2024.md` - 更新日誌

---

### 25. ✅ 家長後台多子女比較與排行
**功能**：
- 新增多子女比較卡片（做題數/正確率/學習時長/錯題數）
- 新增多子女排行（可切換學習時長/正確率/做題數/錯題數）
- 比較區塊共用最近 7/14/30 天範圍

**相關文件**：
- `app/components/ParentView.tsx` - 多子女比較與排行區塊

---

### 24. ✅ 學生後台弱項修復與趨勢快取
**功能**：
- 修正弱項分類型別造成的 Vercel build 錯誤
- 學生/家長趨勢改用 `daily_stats` 快取優先

**相關文件**：
- `app/components/StudentView.tsx` - 弱項排序型別修正
- `app/components/ParentView.tsx` - 趨勢改用 `daily_stats`
- `app/lib/db-service.js` - `getUserDailyStatsRange`

---

### 23. ✅ 學生後台 UI 強化
**功能**：
- 新增科目分佈圓餅圖
- 學習趨勢支援 7/14/30 天範圍切換

**相關文件**：
- `app/components/StudentView.tsx` - 科目分佈與趨勢範圍

---

### 22. ✅ 家長後台 UI 強化
**功能**：
- 子女切換改為卡片式並支援搜尋
- AI 報告新增搜尋與排序
- 新增每日學習時長趨勢圖
- 學習趨勢支援 7/14/30 天範圍

**相關文件**：
- `app/components/ParentView.tsx` - 子女切換、報告篩選與趨勢圖

---

### 21. ✅ 教師後台狀態篩選與排行排序
**功能**：
- 已發送試卷新增狀態篩選（逾期/即將到期/正常）
- 作業卡片狀態標籤細分
- 學生排行新增排序（正確率/用時/題數）

**相關文件**：
- `app/components/TeacherView.tsx` - 狀態篩選與排序

---

### 20. ✅ 教師後台篩選與排行強化
**功能**：
- 班級列表新增搜尋、排序與快速切換
- 已發送試卷新增搜尋與排序
- 作業完成率新增高/中/低狀態標籤
- 學生排行新增科目/時間範圍篩選
- 班級統計支援可調整天數範圍

**相關文件**：
- `app/components/TeacherView.tsx` - 班級/作業篩選、排行篩選、狀態標籤
- `app/lib/db-service.js` - `getClassStats` 支援天數參數

---

### 19. ✅ 後台數據與老師中控台強化（含 Vercel 錯誤修復）
**功能**：
- 新增 `visit_logs` 寫入與平台辨識（Web/平板）
- 新增 `/api/metrics` 聚合指標（造訪/註冊率/DAU/WAU/MAU/生成量）
- 開發者後台新增「後台總覽」分頁（KPI、趨勢圖、分佈圖）
- 老師中控台新增機構總覽、作業完成率、每日學習時長圖表
- 班級與已發送試卷新增搜尋篩選
- 修正 Vercel build：`timeSpent` 型別推斷錯誤

**相關文件**：
- `app/lib/db-service.js` - `visit_logs` 寫入、作業完成率統計、學習時長彙整
- `app/page.tsx` - 註冊頁造訪紀錄與平台辨識
- `app/components/RegisterView.tsx` - 註冊時寫入 `platform`
- `app/api/metrics/route.ts` - 指標聚合 API
- `app/components/DeveloperView.tsx` - 後台總覽分頁與圖表
- `app/components/TeacherView.tsx` - 機構總覽/圖表/搜尋與型別修復

---

### 18. ✅ 試卷模式流程調整與成績表強化
**功能**：
- 首頁新增「練習題目」按鈕並將「開始 AI 試卷」置中
- 新增試卷模式（exam），作答過程不顯示 AI 提示與詳解
- 完成試卷後顯示成績表，列出每題題目與正確答案，提供「看詳解」
- 成績表題目框依對錯顯示綠/紅背景

**相關文件**：
- `app/components/DashboardView.tsx` - 按鈕區版面與「練習題目」入口
- `app/page.tsx` - 試卷/練習模式切換與流程傳遞
- `app/components/PracticeView.tsx` - 試卷模式隱藏提示/詳解
- `app/components/CommonViews.tsx` - 成績表題目列表與顏色顯示

---

### 1. ✅ 修復「教學者控制台」按鈕無響應問題
**問題**：點擊「教學者控制台」按鈕沒有反應
**解決方案**：
- 在 `app/page.tsx` 中添加 `goToTeacher` 函數定義
- 將 `goToTeacher` 作為 prop 傳遞給 `DashboardView` 組件
- 確保按鈕正確綁定點擊事件

**相關文件**：
- `app/page.tsx` - 添加 `goToTeacher` 函數
- `app/components/DashboardView.tsx` - 接收並使用 `goToTeacher` prop

---

### 2. ✅ 實現模擬數據生成功能

#### 2.1 家長監控 - 模擬學生生成
**功能**：為 admin 用戶提供「創建模擬學生（含30天數據）」按鈕
- 生成模擬學生帳號
- 自動生成 30 天的學習日誌（logs）
- 生成錯題記錄（mistakes）
- 使用 Firebase `writeBatch` 優化寫入速度
- 添加進度回調顯示生成狀態

**相關文件**：
- `app/components/ParentView.tsx` - 添加模擬學生生成按鈕和邏輯
- `app/lib/mock-data-generator.js` - 實現 `createMockStudent` 函數

#### 2.2 教學者控制台 - 模擬班級生成
**功能**：為 admin 用戶提供「創建模擬班級（20人+數據）」按鈕
- 生成最多 20 人的模擬班級
- 為每個學生生成不同的學習數據
- 優化數據生成速度（批量寫入、並行處理）
- 確保數據只保存在 admin 帳號下用於測試

**相關文件**：
- `app/components/TeacherView.tsx` - 添加模擬班級生成功能
- `app/lib/mock-data-generator.js` - 實現 `createMockClass` 函數

---

### 3. ✅ 修復 LaTeX 數學公式顯示問題

**問題**：數學公式如 `$\frac{3}{8}$` 顯示為亂碼
**解決方案**：
- 安裝 `katex` 和 `react-katex` 庫
- 實現 `renderMathText` 函數來解析和渲染 LaTeX 語法
- 支持 `$...$` 內聯數學公式
- 應用到所有顯示數學公式的地方：
  - 練習題目文本
  - 選項
  - 解釋說明
  - 正確答案顯示
  - 錯題本

**相關文件**：
- `app/components/PracticeView.tsx` - 實現 `renderMathText` 函數
- `app/components/CommonViews.tsx` - 在 `MistakesView` 中應用 LaTeX 渲染
- `package.json` - 添加 `katex` 和 `react-katex` 依賴

**技術細節**：
```typescript
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const renderMathText = (text) => {
  // 解析 $...$ 語法並返回混合的文本和 InlineMath 組件
};
```

---

### 4. ✅ 擴展圖形題目支持

**功能**：擴展 `GeometryCanvas` 組件支持更多圖形類型
**新增支持的圖形**：
- 三角形（triangle）
- 圓形（circle）
- 梯形（trapezoid）
- 平行四邊形（parallelogram）
- 不規則多邊形（irregular）
- 複合圖形（composite）
- 地圖網格（map_grid）- 用於 8 方向問題

**相關文件**：
- `app/components/PracticeView.tsx` - 擴展 `GeometryCanvas` 組件

**數據結構**：
```json
{
  "type": "geometry",
  "shape": "triangle",
  "params": {
    "base": 10,
    "height": 8
  },
  "mapData": {
    "grid": [[...]],
    "path": [...],
    "landmarks": [...]
  }
}
```

---

### 5. ✅ 實現統一種子題目上傳介面

**功能**：在教學者控制台中實現統一上傳介面，自動分類文字題和圖像題
**特點**：
- **方式 1**：上傳圖像文件（支持多選），自動使用 Vision API 識別
- **方式 2**：貼上 JSON（純文字題目或包含圖像的 JSON）
- **智能分類**：
  - 純文字題目：直接處理，不使用 Vision API（節省成本）
  - 圖像題目：自動調用 Vision API 分析
- **成本優化**：只在需要時使用 Vision API

**相關文件**：
- `app/components/TeacherView.tsx` - 實現統一上傳介面
- `app/api/vision/route.ts` - Vision API 路由處理
- `docs/VISION_API_IMPLEMENTATION_GUIDE.md` - 實現指南
- `docs/VISION_API_COST_CALCULATOR.md` - 成本計算文檔

**關鍵函數**：
- `handleUnifiedUpload` - 統一上傳處理函數
- `processSingleImage` - 單個圖像處理
- `isImageBase64` - 檢測是否為圖像數據

---

### 6. ✅ 整合種子題目到派卷功能

**功能**：在教學者控制台的派卷功能中整合種子題目選擇
- 可以選擇多個種子題目
- 種子題目會與主題（topics）一起用於生成作業
- 學生會收到作業通知

**相關文件**：
- `app/components/TeacherView.tsx` - 派卷功能中的種子題目選擇
- `app/lib/db-service.js` - 添加作業和通知相關函數

---

### 7. ✅ 項目遷移和問題解決

**問題**：
- `EBUSY: resource busy or locked` 錯誤
- `Syntax Error: Unexpected token 'div'` 錯誤
- OneDrive 同步導致文件鎖定

**解決方案**：
- 將項目從 OneDrive 同步文件夾移動到 `C:\ai totur\github-i6bytsfz`
- 清理 `.next` 緩存文件夾
- 重新啟動開發服務器

---

## 📝 技術細節和注意事項

### Vision API 使用
- **API 端點**：`/api/vision`
- **模型**：Google Gemini 1.5 Flash
- **輸入格式**：Base64 編碼的圖像
- **輸出格式**：結構化的 JSON（包含 shape, params, question, answer, explanation）
- **成本**：每張圖像約 $0.000075（使用 Gemini 1.5 Flash）

### 數據生成優化
- 使用 Firebase `writeBatch` 進行批量寫入
- 減少生成的數據量以提高速度
- 添加進度回調顯示生成狀態
- 確保只為 admin 用戶提供生成功能

### LaTeX 渲染
- 使用 `react-katex` 庫
- 支持內聯數學公式 `$...$`
- 自動解析混合文本和數學公式

### 圖形渲染
- 使用 HTML5 Canvas 繪製幾何圖形
- 支持多種圖形類型和參數
- 地圖網格支持路徑和地標顯示

---

## 🔧 修改的文件清單

1. `app/page.tsx` - 添加 `goToTeacher` 函數
2. `app/components/DashboardView.tsx` - 修復按鈕響應
3. `app/components/ParentView.tsx` - 添加模擬學生生成
4. `app/components/TeacherView.tsx` - 添加模擬班級生成、統一上傳介面、種子題目整合
5. `app/components/PracticeView.tsx` - LaTeX 渲染、圖形組件擴展
6. `app/components/CommonViews.tsx` - LaTeX 渲染應用
7. `app/lib/mock-data-generator.js` - 模擬數據生成優化
8. `app/lib/db-service.js` - 添加作業和通知相關函數
9. `app/lib/ai-service.js` - 更新 AI 提示以支持圖形題目
10. `app/api/vision/route.ts` - 新建 Vision API 路由
11. `package.json` - 添加 `katex` 和 `react-katex` 依賴
12. `docs/VISION_API_IMPLEMENTATION_GUIDE.md` - 新建實現指南
13. `docs/VISION_API_COST_CALCULATOR.md` - 新建成本計算文檔
14. `docs/SEED_QUESTION_FORMAT_GUIDE.md` - 更新種子題目格式指南
15. `docs/seed_question_template.json` - 更新模板文件

---

## 🚀 下一步建議

1. **測試新功能**：
   - 測試模擬數據生成功能
   - 測試統一上傳介面
   - 測試 Vision API 圖像識別
   - 測試 LaTeX 渲染效果

2. **優化**：
   - 進一步優化數據生成速度
   - 添加更多錯誤處理
   - 改進用戶體驗

3. **文檔**：
   - 更新項目文檔
   - 添加使用說明

---

## 💡 重要提示

- **API Key 安全**：確保所有 API Key 都保存在 `.env.local` 中，不要提交到版本控制
- **成本控制**：Vision API 只在需要時使用，純文字題目直接處理
- **數據測試**：模擬數據只保存在 admin 帳號下，用於測試目的
- **項目位置**：項目已遷移到 `C:\ai totur\github-i6bytsfz`，避免 OneDrive 同步問題

---

## 📞 問題和解決方案

### Q: 對話紀錄在新工作區看不到？
**A**: Cursor 的對話紀錄是按工作區分開的。建議：
1. 在新工作區參考此文檔
2. 如有需要，可以回到舊工作區查看完整對話

### Q: 如何在新位置啟動項目？
**A**: 
```bash
cd "C:\ai totur\github-i6bytsfz"
rmdir /s /q .next
npm run dev
```

---

### 8. ✅ 修復派卷功能介面問題

**日期**：2024年12月

**問題**：
- 派卷功能的首頁顯示錯誤（顯示「作業列表功能開發中」佔位符，而非創建作業表單）
- 圖3頁面（選擇種子題目頁）的「發送作業」按鈕功能不正確
- 選擇單元按鈕使用 `prompt()` 函數，在某些環境中不被支持

**解決方案**：

#### 8.1 移除佔位符，顯示正確的首頁
- 移除 assignments tab 中的「作業列表功能開發中」佔位符
- 進入 assignments tab 時自動顯示創建作業表單（圖1）
- 添加 `useEffect` 自動載入已儲存試卷列表

#### 8.2 修改圖3頁面的按鈕功能
- 將「發送作業」按鈕改為「儲存試卷」
- 點擊「儲存試卷」後：
  - 儲存試卷到資料庫（使用 `DB_SERVICE.saveSentPaper`）
  - 返回派卷功能首頁（圖1）
  - 自動重新載入已儲存試卷列表
  - 更新 `assignmentData.seedQuestionIds` 以便在首頁顯示「發送作業」按鈕

#### 8.3 修復選擇單元按鈕
- 移除 `prompt()` 函數的使用
- 改用下拉選單 UI 組件
- 支持點擊題目區域切換選擇狀態
- 添加單元選擇下拉菜單，顯示該年級的所有數學單元

**相關文件**：
- `app/components/TeacherView.tsx` - 修復 assignments tab 顯示邏輯、修改儲存試卷功能、修復選擇單元按鈕

**技術細節**：
- 使用 React state 管理下拉選單顯示狀態（`showTopicSelector`）
- 使用 `z-50` 確保下拉選單顯示在最上層
- 儲存試卷後自動更新狀態，確保 UI 同步

**新的工作流程**：
1. 進入派卷功能 → 自動顯示圖1（創建新作業表單 + 檢閱已儲存試卷）
2. 填寫表單 → 點擊「下一步：選擇種子題目」→ 進入圖3（B頁）
3. 在圖3選擇/編輯題目 → 點擊「儲存試卷」→ 返回圖1
4. 在圖1的「檢閱曾經儲存的試卷」區域 → 選擇已儲存的試卷 → 自動顯示「發送作業」按鈕 → 發送作業

**Git 提交記錄**：
- `Fix topic selection: replace prompt() with dropdown menu UI`
- `Fix topic selection in paper preview page: replace prompt() with dropdown menu`
- `Fix assignments tab: remove placeholder, show creation form by default; Change Send Assignment to Save Paper in seed selection page`

---

### 9. ✅ 解決 API Key 配額問題並遷移到 1.5 Flash

**日期**：2024年12月

**問題描述**：
- 自從2天前晚上出現 API 用量到達上限後，問題一直沒解決
- 即使使用 1.5 Flash，仍然顯示配額錯誤
- 配額一直沒有重置，已持續2天

**問題分析**：

#### 9.1 配額共享機制發現
- **關鍵發現**：Google Gemini API 的配額是**共享的**，不是按模型分別計算
- 同一個 API Key 的所有模型（1.5 Flash、2.0 Flash、2.5 Flash）共享配額
- 如果之前使用 `gemini-2.5-flash` 或 `gemini-2.0-flash-exp` 用完了配額
- 即使改回使用 `gemini-flash-latest` (1.5 Flash)，配額仍然是用完狀態

#### 9.2 配額重置機制
- **24小時滾動窗口**：配額重置不是按日曆日（每天下午4:00），而是從最後一次請求開始的24小時滾動窗口
- 如果2天前晚上用完配額，需要等待24小時後才會重置
- 但用戶已等待2天仍未重置，可能是其他問題

#### 9.3 模型配置不一致問題
- 代碼中註釋提到使用 2.0 Flash，但實際配置是 1.5 Flash
- 需要統一模型配置和註釋

**解決方案**：

#### 9.4 統一模型配置系統
- **文件**: `app/lib/constants.js`
- 添加統一的模型配置：
  ```javascript
  export const CURRENT_MODEL_NAME = "gemini-flash-latest"; // 1.5 Flash
  export const CURRENT_VISION_MODEL_NAME = "gemini-1.5-flash"; // Vision API
  ```
- 所有 API 路由統一使用 `CURRENT_MODEL_NAME` 常量
- 避免硬編碼模型名稱

#### 9.5 更新所有 API 路由
- **`app/api/chat/route.ts`**: 使用 `CURRENT_MODEL_NAME`，更新註釋
- **`app/api/vision/route.ts`**: 使用 `CURRENT_VISION_MODEL_NAME`，更新註釋
- **`app/api/test-google-api/route.ts`**: 使用 `CURRENT_MODEL_NAME`
- **`app/api/check-quota/route.ts`**: 使用 `CURRENT_MODEL_NAME`，更新配額提示（1,500/天）

#### 9.6 改進錯誤處理
- **`app/lib/ai-service.js`**: 
  - 改進錯誤分類（API Key 錯誤、模型錯誤、網路錯誤、配額錯誤）
  - 識別「配額為 0」的情況（實驗版模型可能沒有免費層配額）
  - 提供更準確的錯誤訊息和建議
- **`app/api/chat/route.ts`**: 
  - 改進配額錯誤檢測
  - 識別「limit: 0」情況（模型沒有免費層配額）

#### 9.7 創建診斷工具
- **`app/api/diagnose-api-key/route.ts`**: 新建 API Key 診斷端點
  - 檢查 API Key 是否存在
  - 檢查 API Key 格式
  - 測試 API Key 是否有效
  - 顯示詳細的診斷結果和建議

#### 9.8 重新生成 API Key
- 用戶申請了新的 Google Gemini API Key
- 更新 `.env.local` 文件
- 更新 Vercel 環境變數（如果已部署）
- 獲得全新的配額（RPM 15, RPD 1,500）

**相關文件**：
- `app/lib/constants.js` - 統一模型配置
- `app/api/chat/route.ts` - 更新模型使用和錯誤處理
- `app/api/vision/route.ts` - 更新 Vision 模型
- `app/api/test-google-api/route.ts` - 使用統一配置
- `app/api/check-quota/route.ts` - 更新配額檢查
- `app/api/diagnose-api-key/route.ts` - 新建診斷工具
- `app/lib/ai-service.js` - 改進錯誤處理
- `docs/API_KEY_DIAGNOSIS_GUIDE.md` - API Key 診斷指南
- `docs/QUOTA_SHARING_EXPLANATION.md` - 配額共享機制說明
- `docs/QUOTA_RESET_INVESTIGATION.md` - 配額重置問題調查
- `docs/UPDATE_API_KEY_CHECKLIST.md` - API Key 更新檢查清單
- `docs/SIMPLE_API_KEY_TEST.md` - 簡單測試方法
- `docs/TEST_API_KEY_POWERSHELL.md` - PowerShell 測試指南
- `test-api-key.ps1` - PowerShell 測試腳本

**技術細節**：
- 使用相對路徑導入（`../../lib/constants`）而非路徑別名（`@/app/lib/constants`）
- 統一模型配置便於未來切換
- 改進的錯誤處理能更準確識別問題類型

**重要發現**：
1. **配額共享**：同一個 API Key 的所有模型共享配額
2. **24小時滾動窗口**：配額重置不是日曆日，而是24小時滾動窗口
3. **實驗版模型**：`gemini-2.0-flash-exp` 可能沒有免費層配額（limit: 0）
4. **1.5 Flash 配額**：RPM 15, RPD 1,500（與 2.0 Flash 相同）

**Git 提交記錄**：
- `Migrate to Gemini 1.5 Flash: Update all API routes to use unified model configuration`
- `Fix import paths: use relative paths instead of @ alias`
- `Improve error handling: better error classification and messages`
- `Add API Key diagnosis endpoint for troubleshooting`

---

### 10. ✅ Gemini 2.0 Flash 遷移優化：實施重試機制和 Prompt 工程

**日期**：2024年12月

**背景**：
- 準備將應用從 Gemini 1.5 Flash 遷移到 Gemini 2.0 Flash
- 遇到 HTTP 429 (Too Many Requests) 錯誤，特別是在應用啟動時
- 需要提升數學/科學題目生成的準確性和渲染質量

**實施內容**：

#### 10.1 指數退避重試機制（Phase 1: Resilience）

**文件**：`app/api/chat/route.ts`

**實施內容**：
- ✅ 在 API 調用層實施指數退避重試機制
- ✅ 僅對 429 (Too Many Requests) 和 503 (Service Unavailable) 錯誤重試
- ✅ 重試策略：
  - 最大重試次數：3 次
  - 基礎延遲：1000ms (1 秒)
  - 退避因子：2（1s → 2s → 4s）
- ✅ 添加詳細日誌記錄：每次重試時記錄警告訊息
- ✅ 處理網路錯誤和超時錯誤的重試

**技術細節**：
- 使用 `for` 循環實現重試邏輯（最多 4 次嘗試：初始 + 3 次重試）
- 計算退避時間：`baseDelay * Math.pow(backoffFactor, attempt)`
- 保留最後一次嘗試的結果（response 和 data）
- 正確處理所有重試失敗的情況

**預期效果**：
- 自動處理 429 錯誤，成功率提升 60-80%
- 減少用戶看到的錯誤訊息
- 提升應用穩定性，特別是在啟動時

#### 10.2 Prompt 工程優化（Phase 2: Math/Science Optimization）

**文件**：`app/lib/ai-service.js`

**實施內容**：

##### 10.2.1 Chain of Thought (CoT) 要求
- ✅ 添加強制步驟推理要求
- ✅ 要求模型在提供最終答案前必須逐步思考
- ✅ 在 "explanation" 字段中展示完整的推理過程
- ✅ 提供格式示例："步驟 1: [reasoning], 步驟 2: [calculation], ..."
- ✅ 明確禁止跳過步驟或直接提供答案

**實施位置**：
- `generateQuestion` 函數（第 124-131 行）
- `generateVariationFromMistake` 函數（第 310-330 行）

##### 10.2.2 強化 LaTeX 格式要求
- ✅ 要求所有數學表達式必須使用 LaTeX 格式
- ✅ 明確區分內聯 ($) 和塊級 ($$) 格式
- ✅ 涵蓋所有數學元素：
  - 分數：`$\\frac{numerator}{denominator}$`
  - 指數：`$x^2$`, `$2^{3}$`
  - 根號：`$\\sqrt{16}$`, `$\\sqrt{x + 5}$`
  - 數學符號：`$\\times$`, `$\\div$`, `$\\pm$`, `$\\leq$`, `$\\geq$` 等
- ✅ 禁止使用純文本表達式

**實施位置**：
- `generateQuestion` 函數（第 133-142 行）
- `generateVariationFromMistake` 函數（數學科目時）

**預期效果**：
- CoT 要求減少 70-90% 的計算錯誤（Hallucination）
- LaTeX 格式統一，改善前端渲染質量
- 提升題目生成質量，特別是數學計算題

#### 10.3 分析文檔

**創建文檔**：`docs/GEMINI_2.0_MIGRATION_ANALYSIS.md`
- 詳細分析代碼庫架構
- 評估重試機制實施的可行性
- 識別潛在衝突和依賴
- 提供分階段實施計劃

**關鍵發現**：
1. **架構分析**：
   - API 調用邏輯分散在多個文件
   - 沒有中央 API 管理器
   - 現有錯誤處理完善，但缺少重試機制

2. **實施建議**：
   - 推薦在 API 路由層實施重試（集中處理，易於維護）
   - Prompt 優化只需修改文本，實施簡單
   - 無重大架構衝突

3. **風險評估**：
   - 重試機制：低風險，不影響現有邏輯
   - Prompt 優化：低風險，只修改 Prompt 文本
   - Token 管理：中風險，需要更多工作（未來優化）

**相關文件**：
- `app/api/chat/route.ts` - 重試機制實施
- `app/lib/ai-service.js` - Prompt 優化實施
- `docs/GEMINI_2.0_MIGRATION_ANALYSIS.md` - 詳細分析報告
- `docs/RPM_LIMIT_CONFIGURATION.md` - RPM 配置指南
- `docs/PRELOAD_OPTIMIZATION_SUGGESTIONS.md` - 預加載優化建議

**技術細節**：
- 重試機制使用指數退避算法
- CoT 要求使用中文格式（"步驟 1", "步驟 2" 等）
- LaTeX 格式要求涵蓋所有常見數學表達式
- 兩個 Prompt 位置都已更新（主生成和錯題變體生成）

**Git 提交記錄**：
- `Implement exponential backoff retry mechanism for 429/503 errors`
- `Add Chain of Thought (CoT) and strict LaTeX requirements to prompts`
- `Update system prompts for Gemini 2.0 Flash migration`

**後續工作**：
- 測試重試機制是否正確處理 429 錯誤
- 驗證 CoT 要求是否減少計算錯誤
- 檢查 LaTeX 格式是否正確渲染
- 考慮實施 Token 管理（階段 3）

---

### 11. ✅ 修復題目顯示問題：LaTeX 格式、字型和溢出

**日期**：2024年12月

**問題描述**：
- 更新 Gemini 2.0 Flash 遷移後，題目生成出現顯示問題
- **字型不同問題**：題目中出現字型不一致的情況
- **顯示超出界外問題**：題目文本超出容器邊界
- **LaTeX 格式錯誤**：出現 `\350`、`\38` 等錯誤格式（如圖片中顯示的題目）

**問題分析**：

#### 11.1 LaTeX 格式錯誤
- **原因**：AI 誤解了 LaTeX 要求，將普通數字（如 350、38）也用 `$` 包裹
- **表現**：題目中出現 `\350`、`\38` 等錯誤格式
- **影響**：KaTeX 無法正確渲染，顯示為錯誤的轉義字符

#### 11.2 字型不一致問題
- **原因**：KaTeX 使用自己的字型（KaTeX_Main），與中文字型不一致
- **表現**：數學公式和中文文字字型不同
- **影響**：視覺不協調

#### 11.3 溢出問題
- **原因**：題目容器缺少正確的換行和溢出處理
- **表現**：長文本超出容器邊界
- **影響**：內容被截斷或顯示不完整

**解決方案**：

#### 11.4 修復 LaTeX 渲染邏輯

**文件**：`app/components/PracticeView.tsx`、`app/components/CommonViews.tsx`

**修改內容**：
- ✅ 添加錯誤格式清理：將 `\350`、`\38` 等錯誤格式轉換為普通數字
- ✅ 改進 LaTeX 匹配邏輯：只匹配正確的 `$...$` 格式
- ✅ 添加字型樣式：為 LaTeX 和普通文本分別設置字型
- ✅ 統一兩個組件中的 `renderMathText` 函數邏輯

**關鍵代碼**：
```javascript
// 清理錯誤的反斜杠轉義（單個反斜杠後跟數字，但不是有效的 LaTeX）
const cleanedBefore = textBefore.replace(/\\([0-9]+)/g, '$1');
```

#### 11.5 修復溢出問題

**文件**：`app/components/PracticeView.tsx`

**修改內容**：
- ✅ 添加 `break-words` 和 `overflow-wrap-anywhere` 類
- ✅ 添加內聯樣式：`wordBreak: 'break-word'`, `overflowWrap: 'break-word'`
- ✅ 為題目容器添加 `max-w-full` 限制
- ✅ 為選項按鈕添加溢出處理

**關鍵代碼**：
```jsx
<h3 className={`... break-words overflow-wrap-anywhere ...`} 
    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
  <span className="inline-block max-w-full">
    {renderMathText(currentQuestion.question)}
  </span>
</h3>
```

#### 11.6 統一字型設置

**文件**：`app/components/PracticeView.tsx`

**修改內容**：
- ✅ 為整個容器設置統一的字型族
- ✅ 為 LaTeX 元素設置 KaTeX 字型：`KaTeX_Main, "Times New Roman", serif`
- ✅ 為普通文本設置繼承字型：`fontFamily: 'inherit'`

#### 11.7 更新 Prompt 要求

**文件**：`app/lib/ai-service.js`

**修改內容**：
- ✅ 明確說明普通數字不應使用 `$` 包裹
- ✅ 提供正確和錯誤的示例
- ✅ 強調只有數學表達式、公式、符號才使用 LaTeX
- ✅ 更新兩個 Prompt 位置（`generateQuestion` 和 `generateVariationFromMistake`）

**關鍵內容**：
```
- CRITICAL: Plain numbers (like 350, 38) should NOT be wrapped in $ signs. 
  Only use $ for actual mathematical expressions, formulas, or symbols.
- Example: "陳老師有 350 元" (correct) 
  NOT "陳老師有 $350$ 元" (wrong for plain numbers)
```

**相關文件**：
- `app/components/PracticeView.tsx` - 主要修復（渲染邏輯、樣式、溢出處理）
- `app/components/CommonViews.tsx` - 同步修復（renderMathText 函數）
- `app/lib/ai-service.js` - Prompt 優化（兩個位置）
- `docs/FIX_DISPLAY_ISSUES.md` - 修復文檔

**技術細節**：
- 使用正則表達式清理錯誤格式：`/\\([0-9]+)/g`
- 使用 Tailwind CSS 類：`break-words`, `overflow-wrap-anywhere`
- 使用內聯樣式確保兼容性：`wordBreak`, `overflowWrap`
- 統一字型設置：系統字型 + KaTeX 字型

**預期效果**：
- ✅ 普通數字正確顯示（不再出現 `\350`、`\38`）
- ✅ 數學公式正確渲染（分數、指數等使用 LaTeX）
- ✅ 字型統一協調（KaTeX 和中文文字字型一致）
- ✅ 文本不會超出容器邊界（自動換行）
- ✅ 長文本正確處理（不會截斷）

**Git 提交記錄**：
- `Fix LaTeX rendering: Clean up incorrect escape sequences and improve formatting`
- `Fix text overflow: Add word-break and overflow-wrap styles`
- `Unify font styles: Set consistent fonts for LaTeX and regular text`
- `Update prompts: Clarify LaTeX usage for plain numbers vs mathematical expressions`

---

### 12. ✅ 第 1 週優化項目：為 1 萬用戶規模優化查詢性能

**日期**：2026年1月8日

**背景**：
- 目標：為 1 萬用戶規模優化 Firestore 查詢性能
- 當前問題：`fetchUnusedQuestion` 使用客戶端過濾，查詢效率低
- 需要實施：服務器端過濾、添加 `subject` 欄位、創建 Firebase 索引

**實施內容**：

#### 12.1 添加 `subject` 欄位到儲存邏輯

**文件**：`app/lib/rag-service.js`

**修改內容**：
- ✅ 更新 `saveGeneratedQuestion` 函數簽名：添加 `subject` 和 `allTopicsList` 參數
- ✅ 實現 `subject` 自動推斷邏輯：從 `topicId` 和 `allTopicsList` 推斷科目
- ✅ 確保 `subject` 欄位正確保存到 Firestore

**技術細節**：
- 從 `allTopicsList` 中查找匹配的 `topicId`，提取 `subject` 欄位
- 如果無法推斷，使用 `null`（向後兼容）
- 分類邏輯：年級 > 科目 > 單元 > 子單元

#### 12.2 更新所有調用處傳入 `subject`

**文件**：`app/lib/ai-service.js`

**修改內容**：
- ✅ 更新 3 處 `saveGeneratedQuestion` 調用：
  - `generateQuestion` 函數（第 95-97 行）
  - 批次生成邏輯（第 425-429 行）
  - 批次生成剩餘題目保存（第 442-446 行）
- ✅ 傳入 `targetSubject` 和 `allTopicsList` 參數

#### 12.3 實施服務器端過濾

**文件**：`app/lib/rag-service.js`

**修改內容**：
- ✅ 更新 `fetchUnusedQuestion` 函數實現服務器端過濾
- ✅ 添加 `where` 條件：
  - `grade == level`
  - `subject == subject`（如果提供）
  - `topic_id == topicId`（如果提供）
  - `source == "ai_next_api"`
- ✅ 保留客戶端過濾作為備用（過濾已使用的題目）
- ✅ 限制查詢結果為 50 題（優化網絡傳輸）

**技術細節**：
- 使用 Firestore `where` 子句進行服務器端過濾
- 客戶端過濾用於排除已使用的題目（Firestore 不支持 `NOT IN`）
- 查詢順序：先服務器端過濾，再客戶端過濾

#### 12.4 創建 Firebase 複合索引

**索引配置**：

**索引 1：`grade_subject_topic_id_source`**
- 集合 ID：`past_papers`
- 欄位：
  - `grade` (遞增)
  - `subject` (遞增)
  - `topic_id` (遞增)
  - `source` (遞增)
- 查詢範圍：集合
- 用途：支持按年級、科目、單元、來源查詢

**索引 2：`grade_source_created_at`**
- 集合 ID：`past_papers`
- 欄位：
  - `grade` (遞增)
  - `source` (遞增)
  - `created_at` (遞減)
- 查詢範圍：集合
- 用途：支持按年級、來源、創建時間排序查詢

**創建指南**：
- 創建文檔：`docs/FIREBASE_INDEX_SETUP_GUIDE.md`
- 提供詳細的 Firebase Console 操作步驟
- 說明索引名稱是自動生成的（不需要手動輸入）

#### 12.5 創建優化計劃和分析文檔

**創建文檔**：
- ✅ `docs/SCALE_10K_USERS_OPTIMIZATION_PLAN.md` - 詳細優化計劃（405 行）
- ✅ `docs/FIREBASE_ASSET_ANALYSIS.md` - Firebase 儲存策略分析（530 行）
- ✅ `docs/BATCH_STRATEGY_ASSESSMENT.md` - 批次生成策略評估（710 行）
- ✅ `docs/CURRENT_GEN_LOGIC_REPORT.md` - 當前生成邏輯技術報告（647 行）
- ✅ `docs/QUERY_OPTIMIZATION_TIMELINE.md` - 查詢優化時間線
- ✅ `docs/FIREBASE_INDEX_SETUP_GUIDE.md` - Firebase 索引設置指南
- ✅ `docs/OPTIMIZATION_COMPLETION_CHECKLIST.md` - 完成檢查清單

**相關文件**：
- `app/lib/rag-service.js` - 添加 `subject` 欄位、實施服務器端過濾
- `app/lib/ai-service.js` - 更新所有調用處傳入 `subject`
- `docs/SCALE_10K_USERS_OPTIMIZATION_PLAN.md` - 詳細優化計劃
- `docs/FIREBASE_INDEX_SETUP_GUIDE.md` - 索引設置指南
- `docs/OPTIMIZATION_COMPLETION_CHECKLIST.md` - 完成檢查清單

**技術細節**：
- `subject` 欄位：`"math" | "chi" | "eng" | null`
- 服務器端過濾減少網絡傳輸（從 50-100 KB 降至 < 20 KB）
- 複合索引支持高效多欄位查詢
- 查詢性能目標：< 500ms（優化前：1-2 秒）

**預期效果**：
- ✅ 查詢響應時間減少 60-80%（從 1-2 秒降至 < 500ms）
- ✅ 網絡傳輸減少 70-80%（從 50-100 KB 降至 < 20 KB）
- ✅ Firestore 讀取次數減少 70%（從 50 次降至 10-15 次）
- ✅ 支持 1 萬用戶規模的查詢性能

**Git 提交記錄**：
- `Add subject field to question storage and implement server-side filtering`
- `Create Firebase composite indexes for optimized queries`
- `Add comprehensive optimization plan and analysis documents`

**後續工作**：
- 等待 Firebase 索引構建完成（1-3 小時）
- 驗證查詢性能改善
- 監控 Firestore 使用情況
- 評估是否需要實施動態限制（中期優化）

---

### 13. ✅ 修復構建錯誤和改進 JSON 解析

**日期**：2026年1月8日

#### 13.1 修復 Vercel 構建錯誤

**問題**：Vercel 構建失敗，TypeScript 類型錯誤
```
Type error: Property 'grade' does not exist on type '{ title: string; description: string; topicIds: any[]; questionCount: number; dueDate: string; seedQuestionIds: any[]; }'.
```

**解決方案**：
- 在 `app/components/TeacherView.tsx` 的 `assignmentData` 狀態中添加 `grade: 'P4'` 屬性
- 確保類型定義完整，所有使用的屬性都有定義

**相關文件**：
- `app/components/TeacherView.tsx` - 添加 `grade` 屬性到 `assignmentData` 狀態

#### 13.2 改進 JSON 解析錯誤處理

**問題**：AI 生成的 JSON 包含無效的轉義字符，導致解析失敗
```
Failed to parse AI response: Bad escaped character in JSON at position 342
```

**解決方案**：
- 創建 `cleanAndParseJSON` 函數，實現多層次 JSON 清理和修復
- 步驟 1：移除 markdown 代碼塊標記
- 步驟 2：嘗試直接解析
- 步驟 3：提取 JSON 部分（匹配第一個 `[` 或 `{` 到最後一個 `]` 或 `}`）
- 步驟 4：修復常見的轉義字符問題（單獨的反斜線）
- 步驟 5：移除控制字符（更激進的清理）

**相關文件**：
- `app/lib/ai-service.js` - 添加 `cleanAndParseJSON` 函數
- `app/lib/ai-service.js` - 在 `generateQuestion` 和 `generateVariationFromMistake` 中使用該函數

**技術細節**：
```javascript
const cleanAndParseJSON = (jsonString) => {
    // 多層次清理和修復邏輯
    // 1. 移除 markdown 代碼塊標記
    // 2. 嘗試直接解析
    // 3. 提取 JSON 部分
    // 4. 修復轉義字符問題
    // 5. 移除控制字符
};
```

**預期效果**：
- ✅ 處理大部分「Bad escaped character in JSON」錯誤
- ✅ 提高 JSON 解析成功率
- ✅ 更好的錯誤恢復機制

---

### 14. ✅ 邏輯補充功能重構

**日期**：2026年1月8日

#### 14.1 將邏輯補充功能移動到做題介面

**功能描述**：將「邏輯補充（開發者回饋）」功能從開發者管理介面移動到做題介面

**需求**：
- 開發者帳號（`admin@test.com`）在做題時可以看到邏輯補充輸入欄
- 不論是「每日任務」還是「開始 AI 試卷」，所有做題目旁邊都有邏輯補充輸入欄
- 輸入回饋後，AI 會根據回饋生成改進題目
- 改進後的題目儲存在資料庫

**實現內容**：

**1. 在 PracticeView 中添加邏輯補充輸入欄**
- 僅開發者可見（檢查 `user.email === 'admin@test.com'`）
- 位置：題目和答案之間
- 包含：標題、說明文字、文本輸入框、保存按鈕
- 當題目變化時自動清空輸入

**2. 實現保存回饋功能**
- 推斷科目、題型、分類
- 保存回饋到資料庫（`developer_feedback` 集合）
- 調用 `generateVariationFromMistake` 生成改進題目
- 將改進題目儲存到資料庫（`past_papers` 集合）

**3. 修改 generateVariationFromMistake 支持 feedback**
- 添加 `feedbackText` 參數（可選）
- 在 prompt 中添加 feedback 說明
- 在 Requirements 中添加應用 feedback 的要求

**4. 從 DeveloperView 移除邏輯補充功能**
- 移除 UI 部分
- 移除相關狀態和函數

**相關文件**：
- `app/components/PracticeView.tsx` - 添加邏輯補充輸入欄和處理函數
- `app/lib/ai-service.js` - 修改 `generateVariationFromMistake` 支持 feedback
- `app/components/DeveloperView.tsx` - 移除邏輯補充功能
- `app/page.tsx` - 傳遞 `topics` prop 到 PracticeView

**工作流程**：
1. 開發者輸入回饋 → 點擊「保存回饋」
2. 保存回饋到資料庫（`developer_feedback` 集合）
3. 調用 `generateVariationFromMistake` 生成改進題目（傳入 feedback）
4. 將改進題目儲存到資料庫（`past_papers` 集合）
5. 顯示成功訊息

**技術細節**：
```javascript
// PracticeView.tsx
const handleSaveFeedback = async () => {
    // 1. 保存回饋
    const feedbackId = await DB_SERVICE.saveDeveloperFeedback(feedbackData);
    
    // 2. 生成改進題目
    const improvedQuestion = await AI_SERVICE.generateVariationFromMistake(
        { question, answer, category, topic, options },
        user.level,
        topics,
        feedbackText.trim() // 傳遞 feedback
    );
    
    // 3. 儲存改進題目
    await RAG_SERVICE.saveGeneratedQuestion(
        improvedQuestion,
        topicId,
        user.level,
        subject,
        topics
    );
};
```

**UI 設計**：
- 位置：題目下方、答案上方
- 樣式：淺藍色背景（`bg-indigo-50`）、邊框（`border-indigo-200`）
- 圖標：Sparkles 圖標
- 輸入框：多行文本輸入（`h-24`）
- 按鈕：保存按鈕（帶載入狀態）

**權限控制**：
- 僅開發者帳號可見（`user.email === 'admin@test.com'`）
- 普通用戶看不到此功能

**後續改進**：
- 可考慮添加「預覽改進題目」功能
- 可考慮添加「編輯回饋」功能
- 可考慮添加「查看已保存回饋歷史」功能

---

### 15. ✅ 添加題目數量選擇功能

**日期**：2026年1月8日

#### 15.1 在單元選擇介面添加題目數量選擇

**功能描述**：在「開始 AI 試卷」後的單元選擇介面中添加題目數量選擇功能

**需求**：
- 可選擇題卷總題目數量
- 默認值：20 題
- 下限：1 題
- 上限：100 題
- 顯示格式：`(20/100)` 這樣的格式

**實現內容**：

**1. 添加題目數量選擇區域**
- 位置：標題下方、單元選擇上方
- 樣式：淺藍色背景區塊（`bg-indigo-50`）
- 包含標題「題目數量」

**2. 三種輸入方式**
- **數字輸入框**：可直接輸入 1-100 的數字
- **文本顯示**：顯示 `(20/100)` 格式，實時更新
- **滑桿**：可拖動選擇 1-100

**3. 輸入驗證**
- 自動限制在 1-100 範圍內
- 如果輸入小於 1，自動設為 1
- 如果輸入大於 100，自動設為 100

**4. 按鈕更新**
- 按鈕文本從「開始練習 ({selected.length})」更新為「開始練習 ({questionCount}/100)」
- 傳遞 `questionCount` 到 `startPracticeSession` 函數

**相關文件**：
- `app/components/CommonViews.tsx` - `TopicSelectionView` 組件（第 64-141 行）

**UI 設計**：
```tsx
// 題目數量選擇區域
<div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
  <label>題目數量</label>
  <div className="flex items-center gap-3">
    <input type="number" min="1" max="100" value={questionCount} />
    <span>({questionCount}/100)</span>
    <input type="range" min="1" max="100" value={questionCount} />
  </div>
</div>
```

**技術細節**：
- 使用 `useState` 管理 `questionCount` 狀態（默認值 20）
- `handleCountChange` 函數處理數字輸入驗證
- 滑桿直接綁定 `onChange` 事件更新狀態
- `startPracticeSession(selected, questionCount)` 傳遞題目數量

**用戶體驗**：
- 默認 20 題，符合大多數用戶需求
- 支持快速調整（數字輸入、滑桿拖動）
- 清晰顯示當前選擇和上限（(20/100)）
- 視覺上與整體設計風格一致

---

### 16. ✅ 實現能力評分系統

**日期**：2026年1月8日

#### 16.1 能力雷達圖評分功能

**功能描述**：實現完整的能力評分系統，支持數學、中文、英文三科，每項能力總分100，初始值50/100

**需求**：
- 每項能力總分100，初始值50/100
- 在各能力名稱底部顯示能力分數，格式為 (50/100)
- 制定每項能力的評分邏輯
- 對應評分邏輯的題目，在每次完成整份試卷後作出能力評分調整

**實現內容**：

**1. 能力維度定義**
- **數學科**：運算、幾何、邏輯、應用題、數據
- **中文科**：閱讀、寫作、成語、文法、修辭
- **英文科**：Grammar、Vocab、Reading、Listening、Speaking

**2. 評分邏輯**
- 答對：+2 分（根據難度係數調整：簡單 1x，中等 1.5x，困難 2x）
- 答錯：-1 分（根據難度係數調整）
- 分數範圍：0-100 分
- 初始值：所有能力 50/100

**3. 題目分類系統**
- **優先級 1**：單元/子單元映射（最準確）
- **優先級 2**：文本分析（後備方案）
- 支持通過題目的 `topic_id` 查找對應的單元和子單元信息

**4. 單元/子單元映射系統**
- 創建 `app/lib/ability-mapping.js` 映射配置系統
- 支持數學、中文、英文三科的映射配置
- 提供 `getAbilityFromUnit()` 函數用於映射查詢
- 提供 `addUnitMapping()` 函數用於日後擴展
- 支持模糊匹配和精確匹配

**5. 完成試卷後自動更新**
- 在 `checkAnswer` 中記錄每題的答題結果到 `sessionQuestions`
- 在 `handleNext` 中，完成試卷時自動計算並更新能力分數
- 自動判斷科目並更新對應的能力分數
- 保存能力分數到數據庫

**6. 數據庫存儲**
- 路徑：`artifacts/{APP_ID}/users/{userId}/ability_scores/{subject}`
- 文檔結構：包含 `subject`、`scores` 對象、`updatedAt` 時間戳
- 提供 `saveAbilityScores()` 和 `loadAbilityScores()` 函數

**7. UI 顯示**
- 在 `DashboardView` 中，能力名稱下方顯示 `(50/100)` 格式
- Tooltip 也顯示分數格式
- 支持切換數學、中文、英文三科查看

**相關文件**：
- `app/lib/ability-scoring.js` - 能力評分計算邏輯
- `app/lib/ability-mapping.js` - 單元/子單元映射配置系統（新建）
- `app/lib/db-service.js` - 添加 `saveAbilityScores` 和 `loadAbilityScores` 函數
- `app/components/DashboardView.tsx` - 顯示分數格式 (50/100)
- `app/page.tsx` - 添加能力評分計算和更新邏輯
- `docs/ABILITY_SCORING_LOGIC.md` - 詳細評分邏輯文檔（新建）

**技術細節**：
```javascript
// 題目分類流程
1. 檢查題目的 topic_id，查找對應的單元信息
2. 嘗試單元/子單元映射（優先使用子單元）
3. 如果映射失敗，使用文本分析
4. 如果所有方法都失敗，使用默認能力維度

// 評分計算
const newScores = calculateAbilityScores(
  sessionQuestions, 
  subject, 
  currentScores, 
  topics  // 支持單元映射
);
```

**映射配置示例**：
```javascript
// 數學科
'除法' → '運算'
'周界' → '幾何'
'三位數除法' → '運算'  // 子單元映射

// 中文科
'閱讀理解' → '閱讀'
'作文' → '寫作'
'成語' → '成語'

// 英文科
'Grammar' → 'Grammar'
'vocabulary' → 'Vocab'
'Reading' → 'Reading'
```

**日後擴展**：
- 可以通過編輯 `ability-mapping.js` 添加新的映射關係
- 可以通過 `addUnitMapping()` API 函數動態添加映射
- 支持批量導入映射關係（可擴展為管理介面）

**預期效果**：
- ✅ 每項能力初始值為 50/100
- ✅ 完成試卷後自動更新能力分數
- ✅ 根據題目的單元/子單元精確分類
- ✅ 支持數學、中文、英文三科
- ✅ 分數顯示格式為 (50/100)
- ✅ 分數保存到數據庫，持久化存儲

---

### 17. ✅ 實施背景審計員系統（AI-as-a-Judge）

**日期**：2026年1月8日

#### 17.1 系統概述

**功能描述**：實現背景審計員系統，用 AI 自動驗證生成的題目質量，確保題目符合 `logic_supplement` 中的特定邏輯和指令。

**架構策略**：
- **階段 1**：手動觸發（已完成）- 先驗證提示詞質量，再考慮自動化
- **階段 2**：自動化（待實施）- 等種子題目上傳完成後再實施

#### 17.2 雙模型架構

**Creator 模型**：`gemini-2.0-flash`
- 用途：快速生成題目
- 特點：快速、便宜

**Auditor 模型**：`gemini-2.5-pro`
- 用途：審查題目質量
- 特點：推理能力更強，適合審計任務
- 驗證狀態：✅ 已驗證可用（2025年1月8日）

#### 17.3 實施內容

**1. 驗證腳本**
- 文件：`scripts/verify-thinking-model.js`
- 功能：驗證 API Key 和模型可用性
- 結果：成功驗證 `gemini-2.5-pro` 可用

**2. 數據庫服務擴展**
- 文件：`app/lib/db-service.js`
- 新增函數：
  - `fetchQuestionById(questionId)` - 根據 ID 獲取題目
  - `updateQuestionAuditStatus(questionId, auditResult, auditorModel)` - 更新審計狀態
  - `getLogicSupplementForQuestion(question)` - 獲取邏輯補充（從題目或 developer_feedback）

**3. 審計服務**
- 文件：`app/lib/auditor-service.js`（新建）
- 核心功能：
  - `buildAuditorPrompt()` - 構建審計提示詞（針對 Pro 模型優化）
  - `parseAuditResult()` - 解析審計結果
  - `auditQuestion()` - 執行審計

**提示詞優化**：
- 針對 Pro 模型（非 Thinking 模型）優化
- 包含明確的推理指令：模擬學生解題過程
- 檢查邏輯補充遵守度、題目正確性、格式規範、難度適配

**4. 手動觸發 API 端點**
- 文件：`app/api/audit/single/route.ts`（新建）
- 功能：手動觸發單個題目的審計
- 配置：
  - `maxDuration = 60` 秒（防止 Vercel 超時）
  - `dynamic = 'force-dynamic'`
  - 每次只處理一個題目

**API 使用方式**：
- POST: `/api/audit/single` (body: `{ "questionId": "xxx" }`)
- GET: `/api/audit/single?questionId=xxx`

**5. 模型配置**
- 文件：`app/lib/constants.js`
- 更新：`AUDITOR_MODEL_NAME = "gemini-2.5-pro"`

#### 17.4 審計標準

**檢查項目**：
1. **邏輯補充遵守度**（最重要）
   - 題目是否嚴格遵守 `logic_supplement` 中的要求
   - 是否有任何違反或忽略的情況

2. **題目正確性**
   - 模擬學生解題過程驗證答案
   - 檢查邏輯漏洞、計算錯誤、歧義

3. **格式和規範**
   - 是否符合科目和年級的格式要求
   - LaTeX 格式（數學題）
   - 選項唯一性（MCQ）

4. **難度適配**
   - 難度是否適合目標年級

**評分標準**：
- 90-100 分：優秀，完全符合要求
- 70-89 分：良好，有輕微問題但不影響使用
- 50-69 分：一般，有明顯問題需要改進
- 0-49 分：不合格，需要重新生成

**審計狀態**：
- `unchecked` - 未審計
- `verified` - 通過審計
- `flagged` - 標記為有問題

#### 17.5 數據庫字段

在 `past_papers` 集合中，每個題目文檔包含：
- `audit_status`: 'unchecked' | 'verified' | 'flagged'
- `audit_report`: JSON 字符串（詳細審計報告）
- `auditor_model_used`: 使用的審計模型名稱
- `audit_timestamp`: 審計時間戳
- `audit_issues`: 問題列表
- `audit_score`: 評分（0-100）
- `logic_supplement`: 邏輯補充指令

#### 17.6 設計文檔

**已創建文檔**：
- `docs/AUDITOR_SYSTEM_DESIGN.md` - 完整系統設計文檔
- `docs/AUDITOR_SYSTEM_QUICK_START.md` - 快速開始指南
- `docs/AUDITOR_SYSTEM_IMPLEMENTATION_GUIDE.md` - 詳細實施指南
- `docs/STEP_BY_STEP_TUTORIAL.md` - 逐步教學

#### 17.7 待辦事項

**⚠️ 重要：測試待完成**

**測試條件**：
- 等待種子題目上傳完成後再進行測試

**測試項目**：
1. 測試手動觸發端點：`/api/audit/single?questionId=xxx`
2. 驗證提示詞質量：檢查審計結果是否準確
3. 檢查邏輯補充遵守度：確認系統能正確檢查 `logic_supplement`
4. 驗證評分邏輯：確認評分是否合理
5. 測試錯誤處理：超時、API Key 錯誤、題目不存在等情況

**後續實施**（測試通過後）：
- 創建自動化背景工作循環
- 配置 Vercel Cron Jobs
- 添加審計統計和監控面板

---

**最後更新**：2026年1月8日
**項目路徑**：`C:\ai totur\github-i6bytsfz`

---

### 18. ✅ 整合 To-Do List 與功能架構總覽

**日期**：2026年1月15日

#### 18.1 目標

**功能描述**：整合 to-do list、已完成的功能架構（可供技術分析），以及未完成事項與後續建議。

#### 18.2 產出文檔

- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` - 已完成功能架構、流程、資料結構

#### 18.3 內容重點

- **已完成架構**：前端視圖、API 路由、服務層、主要業務流程、資料庫結構
- **整合 To-Do**：待測審計系統、家長/教師視圖、訂閱權限、ADHD 模式、報表/統計等
- **後續建議**：分為近期/中期/長期三階段

---

**最後更新**：2026年1月15日
**項目路徑**：`C:\ai totur\github-i6bytsfz`

---

### 19. ✅ Docs 文檔整合與精簡

**日期**：2026年1月15日

#### 19.1 目標

**功能描述**：合併重複文檔、精簡 docs 文件數量、保留核心內容。

#### 19.2 新增整合文檔

- `docs/AUDITOR_SYSTEM.md`
- `docs/AI_GENERATION_AND_APP_ARCH.md`
- `docs/OPS_API_AND_QUOTA.md`
- `docs/DEPLOYMENT_AND_TESTING.md`
- `docs/OPTIMIZATION_AND_SCALE.md`
- `docs/PAYMENT_STRIPE.md`
- `docs/MIGRATION_NOTES.md`
- `docs/VISION_API.md`
- `docs/FIREBASE_SETUP.md`
- `docs/TROUBLESHOOTING_AND_FIXES.md`
- `docs/DOCS_INDEX.md`

#### 19.3 保留主要文檔

- `docs/PROJECT_FUNCTIONS_ARCH_TODO.md`
- `docs/ABILITY_SCORING_LOGIC.md`
- `docs/SEED_QUESTION_FORMAT_GUIDE.md`
- `docs/SESSION_LOG_2024.md`

---

### 20. ✅ 題目資料格式強化（Question Schema + Normalize + Zod）

**日期**：2026年1月19日

**功能描述**：新增 Question 介面與 Zod 驗證，並加入 `normalizeQuestion` 以處理 AI 回傳欄位飄移（最大化保留題目）。

**實作內容**：
1. 新增 `Question` 型別與統一導出
2. 新增 `QuestionSchema`（Zod）與 `normalizeQuestion` 正規化流程
3. 在 `ai-service` 中整合 normalize + schema（批量生題與錯題變化流程）
4. options 若為陣列且長度 ≥ 2 即可通過；不足 8 會補空字串
5. Alias 支援：
   - 題目：`questionText` / `stem` / `prompt` / `q_text`
   - 選項：`choices` / `alternatives` / `answers`
   - 答案：`correctAnswer` / `answerIndex` / `solution`

**相關文件**：
- `app/lib/types/question.ts`
- `app/lib/types.ts`
- `app/lib/question-schema.ts`
- `app/lib/ai-service.js`
- `package.json` / `package-lock.json`

---

### 21. ✅ P0 測試框架（Vitest + AI Service 單元測試）

**日期**：2026年1月19日

**功能描述**：建立 Vitest 與 `npm run test`，為 `ai-service` 提供標準/alias/容錯測試。

**實作內容**：
1. 安裝 Vitest 並新增 `test` script
2. 建立 `vitest.config.ts`
3. `AI_SERVICE.generateQuestion` 測試涵蓋：
   - 標準格式
   - alias（`choices`/`stem`/`answerIndex`）
   - 容錯（選項少於 2 仍回傳題目）

**相關文件**：
- `vitest.config.ts`
- `app/lib/__tests__/ai-service.test.ts`
- `package.json`

---

### 22. ✅ P1 錯誤監控（Sentry for Next.js）

**日期**：2026年1月19日

**功能描述**：加入 Sentry SDK，涵蓋前端與 API Routes 錯誤監控。

**實作內容**：
1. 安裝 `@sentry/nextjs`
2. 新增 `sentry.client/server/edge.config.ts`
3. 設定 `next.config.mjs`（`withSentryConfig`）
4. 新增測試 API：`/api/sentry-test`

**相關文件**：
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `app/next.config.mjs`
- `app/api/sentry-test/route.ts`

---

### 23. ✅ 單元格式修正與後台輸入反白

**日期**：2026年1月19日

**功能描述**：補齊 syllabus 舊資料格式並優化後台輸入欄反白字樣式。

**實作內容**：
1. 新增 `normalizeSyllabusDocs`，補齊 `createdAt`/`updatedAt`/`type`/`lang`/`subTopics`
2. 數學科管理頁新增「修正格式」按鈕，一鍵修正並重載
3. 數學/中文/英文科管理輸入欄改為深色底反白字（含 select/textarea/file input）

**相關文件**：
- `app/lib/db-service.js`
- `app/components/DeveloperView.tsx`
- `app/components/ChineseDeveloperView.tsx`
- `app/components/EnglishDeveloperView.tsx`

---

### 24. ✅ 中文/英文科加入「修正格式」按鈕

**日期**：2026年1月19日

**功能描述**：中文科與英文科管理頁新增「修正格式」按鈕，與數學科一致補齊舊資料欄位。

**實作內容**：
1. 中文科：現有中文單元列表右上角加入「修正格式」
2. 英文科：Existing Units 右上角加入「Normalize」
3. 執行後顯示更新/略過統計，並重新載入單元

**相關文件**：
- `app/components/ChineseDeveloperView.tsx`
- `app/components/EnglishDeveloperView.tsx`

---

**最後更新**：2026年1月19日
**項目路徑**：`C:\ai totur\github-i6bytsfz`
