# 更新 API Key 檢查清單

## ✅ 已完成的項目

- [x] 申請新的 Google Gemini API Key
- [x] 更新 `.env.local` 文件

---

## 📋 需要檢查/更新的項目

### 1. Vercel 環境變數（如果已部署）⚠️ **重要！**

**如果您的應用已部署到 Vercel，必須更新 Vercel 的環境變數**

#### 步驟：

1. **登入 Vercel Dashboard**：
   - 前往：https://vercel.com/dashboard
   - 登入您的帳號

2. **選擇專案**：
   - 找到並點擊您的專案（`github-i6bytsfz`）

3. **進入環境變數設置**：
   - 點擊 **Settings**（設置）
   - 點擊 **Environment Variables**（環境變數）

4. **更新 API Key**：
   - 找到 `GOOGLE_GEMINI_API_KEY`
   - 點擊 **Edit**（編輯）或 **Delete**（刪除）後重新添加
   - 輸入新的 API Key 值
   - **重要**：選擇環境範圍
     - ✅ **Production**（生產環境）- 必須
     - ✅ **Preview**（預覽環境）- 建議
     - ⚠️ **Development**（開發環境）- 可選（本地開發用 `.env.local`）

5. **重新部署**：
   - 更新環境變數後，Vercel 會自動觸發重新部署
   - 或手動點擊 **Redeploy**（重新部署）

---

### 2. Firebase ⚠️ **不需要更新**

**Firebase 和 Google Gemini API 使用不同的 API Key**

- Firebase 使用自己的 API Key（`NEXT_PUBLIC_FIREBASE_API_KEY`）
- Google Gemini API 使用 `GOOGLE_GEMINI_API_KEY`
- **兩者是分開的，互不影響**

**結論**：Firebase 不需要更新 ✅

---

### 3. 本地開發環境

#### 已完成的項目：
- [x] 更新 `.env.local` 文件

#### 需要執行的操作：

1. **重啟開發服務器**：
   ```powershell
   # 停止當前服務器（按 Ctrl+C）
   # 然後重新啟動
   npm run dev
   ```

   **重要**：環境變數只在服務器啟動時讀取，修改後必須重啟！

2. **驗證更新**：
   - 訪問：`http://localhost:3000/api/diagnose-api-key`
   - 應該顯示新的 API Key 信息

---

### 4. Git 提交（可選）

**注意**：`.env.local` 文件不應該提交到 Git

檢查 `.gitignore` 是否包含 `.env.local`：
```bash
# 檢查 .gitignore
cat .gitignore | findstr ".env.local"
```

**如果沒有**，確保 `.env.local` 在 `.gitignore` 中，避免意外提交 API Key。

---

## 🔍 驗證步驟

### 步驟 1: 本地驗證

1. **重啟開發服務器**：
   ```powershell
   npm run dev
   ```

2. **測試 API Key**：
   - 訪問：`http://localhost:3000/api/diagnose-api-key`
   - 應該顯示新的 API Key 且測試成功

3. **測試題目生成**：
   - 登入應用程式
   - 嘗試生成一道題目
   - 應該可以成功生成

### 步驟 2: Vercel 驗證（如果已部署）

1. **確認環境變數已更新**：
   - Vercel Dashboard → Settings → Environment Variables
   - 確認 `GOOGLE_GEMINI_API_KEY` 是新值

2. **確認重新部署完成**：
   - 查看 Vercel Dashboard 的部署歷史
   - 確認最新部署已成功

3. **測試生產環境**：
   - 訪問生產環境 URL
   - 測試題目生成功能
   - 或訪問：`https://your-app.vercel.app/api/diagnose-api-key`

---

## 📝 檢查清單總結

完成以下所有項目：

### 本地開發環境
- [x] 更新 `.env.local` 文件
- [ ] 重啟開發服務器（`npm run dev`）
- [ ] 測試本地 API Key（訪問 `/api/diagnose-api-key`）
- [ ] 測試本地題目生成功能

### Vercel 生產環境（如果已部署）
- [ ] 登入 Vercel Dashboard
- [ ] 更新 `GOOGLE_GEMINI_API_KEY` 環境變數
- [ ] 確認選擇了 **Production** 環境
- [ ] 等待重新部署完成
- [ ] 測試生產環境 API Key
- [ ] 測試生產環境題目生成功能

### Firebase
- [x] **不需要更新**（使用不同的 API Key）

---

## 🚨 常見問題

### Q: 更新 Vercel 環境變數後需要做什麼？

**A**: 
- Vercel 會自動觸發重新部署
- 等待部署完成（通常 2-3 分鐘）
- 然後測試生產環境

### Q: 為什麼 Firebase 不需要更新？

**A**: 
- Firebase 和 Google Gemini API 是完全不同的服務
- 使用不同的 API Key
- Firebase API Key 用於 Firebase 服務（資料庫、認證等）
- Gemini API Key 用於 AI 功能（題目生成）

### Q: 如何確認環境變數已更新？

**A**: 
- 本地：訪問 `http://localhost:3000/api/diagnose-api-key`
- Vercel：訪問 `https://your-app.vercel.app/api/diagnose-api-key`
- 查看返回的 API Key 長度和測試結果

---

## ✅ 完成確認

更新完成後，請確認：

- [ ] 本地開發環境可以正常生成題目
- [ ] Vercel 生產環境可以正常生成題目（如果已部署）
- [ ] 沒有配額錯誤
- [ ] API Key 測試通過

**完成後，問題應該就解決了！** 🎉
