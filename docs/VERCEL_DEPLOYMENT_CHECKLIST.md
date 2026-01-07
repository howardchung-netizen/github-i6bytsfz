# Vercel 部署檢查清單

## 1. 確認 Vercel 可以訪問 Google API

### 測試方法

#### 方法 A：使用測試端點（推薦）
1. **本地測試**：
   ```bash
   # 確保開發服務器正在運行
   npm run dev
   
   # 訪問測試端點
   http://localhost:3000/api/test-google-api
   ```

2. **部署後測試**：
   - 將專案部署到 Vercel
   - 訪問：`https://your-project.vercel.app/api/test-google-api`
   - 如果看到 `{"success": true}`，表示可以正常訪問 Google API

#### 方法 B：測試實際功能
1. 將專案部署到 Vercel
2. 訪問部署後的網站
3. 嘗試生成一道題目
4. 檢查是否成功（無需 VPN）

#### 方法 C：使用 Vercel CLI 測試
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel
vercel login

# 部署到預覽環境
vercel

# 測試 API 端點
curl https://your-project.vercel.app/api/test-google-api
```

### 預期結果
- ✅ **成功**：API 正常回應，可以生成題目
- ❌ **失敗**：如果 Vercel 也無法訪問，需要考慮：
  - 使用其他部署平台（AWS、GCP）
  - 或使用代理服務

### 技術說明
- Vercel 的伺服器位於全球多個地區
- 通常可以正常訪問 Google API
- 如果遇到問題，可能是：
  - API Key 配置錯誤
  - 網路暫時問題
  - 配額已用完

---

## 2. Firebase 數據存儲地區

### 問題說明
Firestore 的地區設置在**創建專案時就確定了**，之後無法更改。

### 檢查當前地區
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇您的專案
3. 進入 **Firestore Database**
4. 查看頂部顯示的地區（如 "us-central" 或 "asia-east1"）

### 如果已經是美國地區
#### 選項 A：接受現狀（推薦）
- ✅ **優點**：無需重新創建
- ⚠️ **缺點**：延遲可能稍高（通常 < 200ms，可接受）
- 💡 **建議**：對於教育應用，延遲影響不大

#### 選項 B：創建新專案（如果必須）
1. 創建新的 Firebase 專案
2. **選擇地區時選擇**：`asia-east1` (台灣) 或 `asia-southeast1` (新加坡)
3. 遷移數據（需要編寫遷移腳本）

### 建議
**對於香港用戶**：
- 美國地區的延遲通常可接受（< 200ms）
- 重新創建專案和遷移數據的成本較高
- **建議保持現狀**，除非延遲問題明顯影響用戶體驗

---

## 3. API Key 管理 - Vercel 環境變數設置

### 步驟 1：準備環境變數清單

需要設置的環境變數：
```env
# Google Gemini API
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase (如果需要)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe (如果已設置)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 步驟 2：在 Vercel Dashboard 設置

1. **登入 Vercel**
   - 前往 https://vercel.com
   - 登入您的帳號

2. **選擇專案**
   - 點擊您的專案
   - 或導入 GitHub 專案

3. **設置環境變數**
   - 進入 **Settings** → **Environment Variables**
   - 點擊 **Add New**
   - 輸入變數名稱和值
   - 選擇環境（Production, Preview, Development）

4. **重要設置**
   - ✅ **Production**：生產環境使用
   - ✅ **Preview**：預覽環境使用（可選）
   - ✅ **Development**：本地開發使用（可選）

### 步驟 3：更新代碼以使用環境變數

#### 檢查 `app/lib/firebase.js`
```javascript
// 應該使用環境變數（如果有的話）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD2AJPlXwzoQ41nCHz6D7I7pEa53hzpgsc",
  // ... 其他配置
};
```

#### 檢查 `app/api/chat/route.ts`
```typescript
// 已經正確使用環境變數
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
```

### 步驟 4：重新部署

設置環境變數後，需要重新部署：
```bash
# 方法 A：通過 Git 推送觸發
git push origin main

# 方法 B：通過 Vercel CLI
vercel --prod
```

### 步驟 5：驗證

1. 部署完成後，檢查 Vercel 日誌
2. 確認沒有環境變數相關錯誤
3. 測試 API 端點是否正常工作

### 安全建議

1. **不要提交 `.env.local` 到 Git**
   - ✅ 已加入 `.gitignore`

2. **使用不同的 API Key**
   - 開發環境：測試 Key
   - 生產環境：正式 Key

3. **定期輪換 API Key**
   - 每 3-6 個月更換一次
   - 發現異常立即撤銷

---

## 4. 用戶資料刪除功能

### 什麼是用戶資料刪除功能？

根據**香港個人資料（私隱）條例（PDPO）**，用戶有權：
- ✅ 要求刪除個人資料
- ✅ 撤回同意
- ✅ 要求停止使用其資料

### 需要刪除的資料

1. **Firebase Authentication 帳號**
2. **Firestore 用戶資料**：
   - 用戶個人資料 (`users/{uid}`)
   - 學習歷程 (`users/{uid}/logs`)
   - 錯題記錄 (`users/{uid}/mistakes`)
   - 學習統計 (`users/{uid}/stats`)

### 實作建議

#### 步驟 1：完善 `deleteUserAccount` 函數

需要刪除所有相關資料，而不只是 Auth 帳號。

#### 步驟 2：添加 UI 按鈕

在用戶設置頁面添加「刪除帳號」按鈕。

#### 步驟 3：確認流程

刪除前需要：
- 確認用戶身份（重新輸入密碼）
- 顯示警告訊息
- 確認刪除操作

---

## 快速檢查清單

### 部署前
- [ ] 準備所有環境變數
- [ ] 確認 API Key 有效
- [ ] 檢查 Firebase 配置
- [ ] 測試本地環境

### 部署後
- [ ] 在 Vercel 設置環境變數
- [ ] 重新部署
- [ ] 測試 API 端點
- [ ] 測試用戶註冊/登入
- [ ] 測試題目生成功能
- [ ] 檢查錯誤日誌

### 生產環境
- [ ] 使用生產環境的 API Key
- [ ] 啟用 HTTPS
- [ ] 設置監控和告警
- [ ] 準備回滾計劃

---

**最後更新**：2024-01-XX
