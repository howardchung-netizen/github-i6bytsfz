# 開發會話紀錄 - 2024年

## 📋 今天完成的主要工作

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

**最後更新**：2024年12月
**項目路徑**：`C:\ai totur\github-i6bytsfz`
