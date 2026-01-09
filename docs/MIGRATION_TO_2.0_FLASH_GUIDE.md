# 遷移到 Gemini 2.0 Flash 完整指南

**日期**: 2024-12  
**目標**: 將應用程式從 Gemini 1.5 Flash 遷移到 Gemini 2.0 Flash

---

## ✅ 已完成的代碼更改

### 1. 統一模型配置系統

**文件**: `app/lib/constants.js`

已添加統一的模型配置：
```javascript
export const CURRENT_MODEL_NAME = "gemini-2.0-flash-exp"; // 主要用於文字生成
export const CURRENT_VISION_MODEL_NAME = "gemini-2.0-flash-exp"; // 用於 Vision API
```

**優點**:
- 所有模型名稱集中管理
- 未來切換模型只需修改一個地方
- 避免硬編碼模型名稱

---

### 2. 更新的 API 路由

以下文件已更新為使用統一的模型配置：

#### ✅ `app/api/chat/route.ts`
- **更改**: 從 `gemini-flash-latest` 改為使用 `CURRENT_MODEL_NAME`
- **用途**: 題目生成的主要 API

#### ✅ `app/api/vision/route.ts`
- **更改**: 從 `gemini-1.5-flash` 改為使用 `CURRENT_VISION_MODEL_NAME`
- **用途**: 圖像題目識別 API

#### ✅ `app/api/test-google-api/route.ts`
- **更改**: 從 `gemini-flash-latest` 改為使用 `CURRENT_MODEL_NAME`
- **用途**: API 連線測試端點

#### ✅ `app/api/check-quota/route.ts`
- **更改**: 從 `gemini-flash-latest` 改為使用 `CURRENT_MODEL_NAME`
- **額外**: 更新配額提示文字（1,500 請求/天）
- **用途**: 配額檢查端點

---

## 📋 需要手動完成的步驟

### 步驟 1: 驗證代碼更改

1. **檢查所有文件是否正確更新**:
   ```bash
   # 在項目根目錄執行
   grep -r "gemini-flash-latest" app/api/
   grep -r "gemini-1.5-flash" app/api/
   ```
   
   應該**沒有**找到任何結果（所有引用都應已更新）

2. **檢查導入是否正確**:
   ```bash
   grep -r "CURRENT_MODEL_NAME" app/api/
   ```
   
   應該找到 4 個文件都導入了 `CURRENT_MODEL_NAME`

---

### 步驟 2: 本地測試

1. **啟動開發服務器**:
   ```bash
   npm run dev
   ```

2. **測試 API 端點**:
   - 訪問 `http://localhost:3000/api/test-google-api`
   - 應該返回成功訊息（如果 API Key 正確）

3. **測試題目生成**:
   - 登入應用程式
   - 嘗試生成一道題目
   - 檢查是否正常工作

4. **測試 Vision API**（如果有圖像上傳功能）:
   - 上傳一張圖像題目
   - 確認識別功能正常

---

### 步驟 3: Vercel 環境變數檢查（重要！）

#### 3.1 檢查 Vercel 環境變數

1. **登入 Vercel Dashboard**:
   - 前往 https://vercel.com/dashboard
   - 選擇您的專案

2. **檢查環境變數**:
   - 進入專案 → Settings → Environment Variables
   - 確認 `GOOGLE_GEMINI_API_KEY` 已設置
   - **不需要**添加新的環境變數（模型名稱在代碼中配置）

#### 3.2 確認 API Key 權限

- 確認您的 Google Cloud API Key 有權限使用 Gemini 2.0 Flash
- 如果遇到錯誤，可能需要：
  1. 前往 [Google AI Studio](https://aistudio.google.com/)
  2. 確認 API Key 可以訪問 2.0 Flash 模型
  3. 檢查配額限制（RPM 15, RPD 1,500）

---

### 步驟 4: 部署到 Vercel

1. **提交代碼更改**:
   ```bash
   git add .
   git commit -m "Migrate to Gemini 2.0 Flash: Update all API routes to use unified model configuration"
   git push origin main
   ```

2. **等待 Vercel 自動部署**:
   - Vercel 會自動檢測 GitHub push
   - 等待部署完成（通常 2-3 分鐘）

3. **檢查部署日誌**:
   - 在 Vercel Dashboard 查看部署狀態
   - 確認沒有編譯錯誤

---

### 步驟 5: 生產環境測試

#### 5.1 測試 API 端點

1. **測試連線**:
   ```
   GET https://your-app.vercel.app/api/test-google-api
   ```
   應該返回成功訊息

2. **檢查配額**:
   ```
   GET https://your-app.vercel.app/api/check-quota
   ```
   應該顯示配額狀態

#### 5.2 測試應用功能

1. **題目生成測試**:
   - 登入應用程式
   - 生成幾道題目
   - 確認質量是否正常

2. **Vision API 測試**（如果使用）:
   - 上傳圖像題目
   - 確認識別功能正常

3. **監控錯誤**:
   - 檢查 Vercel 日誌是否有錯誤
   - 檢查瀏覽器 Console 是否有錯誤

---

## 🔍 驗證清單

完成遷移後，請確認以下項目：

- [ ] 所有 API 路由已更新為使用 `CURRENT_MODEL_NAME`
- [ ] 本地開發環境測試通過
- [ ] Vercel 部署成功
- [ ] 生產環境 API 測試通過
- [ ] 題目生成功能正常
- [ ] Vision API 功能正常（如果使用）
- [ ] 沒有錯誤日誌

---

## ⚠️ 常見問題

### Q1: 遇到 "Model not found" 錯誤

**可能原因**:
- API Key 沒有權限訪問 2.0 Flash
- 模型名稱錯誤

**解決方法**:
1. 確認模型名稱是 `gemini-2.0-flash-exp`（不是 `gemini-2.0-flash`）
2. 檢查 Google AI Studio 中 API Key 的權限
3. 確認使用的是最新的 API Key

---

### Q2: Vision API 不工作

**可能原因**:
- 2.0 Flash 可能對 Vision API 的支持不同

**解決方法**:
1. 如果 Vision API 失敗，可以暫時改回 1.5 Flash：
   ```javascript
   // 在 constants.js 中
   export const CURRENT_VISION_MODEL_NAME = "gemini-1.5-flash";
   ```
2. 或者檢查 Google 文檔確認 2.0 Flash 的 Vision API 支持

---

### Q3: 配額錯誤

**確認配額**:
- **RPM**: 15 請求/分鐘
- **RPD**: 1,500 請求/天

**如果遇到配額錯誤**:
1. 檢查 Google Cloud Console 的使用情況
2. 確認配額是否已用完
3. 等待配額重置（每天香港時間下午 4:00）

---

### Q4: 題目質量下降

**可能原因**:
- 2.0 Flash 的推理能力可能與 1.5 Flash 不同

**解決方法**:
- 考慮實施審計報告中提到的三個策略：
  1. Strategy I: Seed DNA Imitation
  2. Strategy II: Tag-Based Constraint Injection
  3. Strategy III: COT Verification

---

## 📊 遷移後的配額對比

| 項目 | 1.5 Flash | 2.0 Flash | 狀態 |
|------|-----------|-----------|------|
| RPM | 15 | 15 | ✅ 相同 |
| RPD | 1,500 | 1,500 | ✅ 相同 |
| 穩定性 | 正式版 | 實驗版 | ⚠️ 需注意 |
| Vision API | ✅ 支持 | ✅ 支持 | ✅ 相同 |

---

## 🔄 回滾方案

如果遷移後遇到嚴重問題，可以快速回滾：

### 方法 1: 修改 constants.js

```javascript
// 在 app/lib/constants.js 中
export const CURRENT_MODEL_NAME = "gemini-flash-latest"; // 回滾到 1.5 Flash
export const CURRENT_VISION_MODEL_NAME = "gemini-1.5-flash";
```

然後重新部署。

### 方法 2: Git 回滾

```bash
git revert HEAD
git push origin main
```

---

## 📝 後續建議

1. **監控使用情況**:
   - 定期檢查 Vercel 日誌
   - 監控 API 錯誤率
   - 追蹤配額使用情況

2. **優化 Prompt**:
   - 考慮實施審計報告中的三個策略
   - 測試不同 prompt 格式的效果

3. **文檔更新**:
   - 更新項目文檔中的模型版本信息
   - 記錄任何發現的問題或最佳實踐

---

## ✅ 完成確認

遷移完成後，請確認：

- [ ] 所有代碼更改已提交
- [ ] Vercel 部署成功
- [ ] 生產環境測試通過
- [ ] 沒有錯誤日誌
- [ ] 功能正常運作

**遷移完成！** 🎉

如有任何問題，請參考審計報告 (`docs/AI_MODEL_MIGRATION_AUDIT_REPORT.md`) 或檢查 Vercel 日誌。
