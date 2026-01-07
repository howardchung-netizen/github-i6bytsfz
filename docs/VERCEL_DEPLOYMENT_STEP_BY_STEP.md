# Vercel 部署步驟指南

## 📋 前置準備

### 1. 確認專案已推送到 GitHub

```bash
# 檢查 Git 狀態
git status

# 如果有未提交的變更，先提交
git add .
git commit -m "準備部署到 Vercel"
git push origin main
```

### 2. 準備環境變數清單

需要設置的環境變數：
- `GOOGLE_GEMINI_API_KEY`（必須）
- `NEXT_PUBLIC_FIREBASE_API_KEY`（可選，如果 Firebase 配置需要）
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`（可選）
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`（可選）
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`（可選）
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`（可選）
- `NEXT_PUBLIC_FIREBASE_APP_ID`（可選）
- `STRIPE_SECRET_KEY`（可選，如果已設置 Stripe）
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（可選）
- `STRIPE_WEBHOOK_SECRET`（可選）

---

## 🚀 部署步驟

### 方法 A：通過 Vercel Dashboard（推薦，最簡單）

#### 步驟 1：登入 Vercel
1. 前往 https://vercel.com
2. 點擊 **Sign Up** 或 **Log In**
3. 選擇使用 **GitHub** 帳號登入（推薦）

#### 步驟 2：導入專案
1. 登入後，點擊 **Add New...** → **Project**
2. 選擇您的 GitHub 帳號
3. 找到並選擇 `github-i6bytsfz` 專案
4. 點擊 **Import**

#### 步驟 3：配置專案
1. **Project Name**：可以保持默認或修改
2. **Framework Preset**：應該自動檢測為 **Next.js**
3. **Root Directory**：保持為 `./`（根目錄）
4. **Build Command**：保持默認 `npm run build`
5. **Output Directory**：保持默認 `.next`
6. **Install Command**：保持默認 `npm install`

#### 步驟 4：設置環境變數
1. 在配置頁面，找到 **Environment Variables** 區塊
2. 點擊 **Add** 添加每個環境變數：

**必須設置的環境變數：**
```
GOOGLE_GEMINI_API_KEY = your_gemini_api_key_here
```

**Firebase 環境變數（如果需要）：**
```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyD2AJPlXwzoQ41nCHz6D7I7pEa53hzpgsc
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = tutoring-classes-18476.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = tutoring-classes-18476
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = tutoring-classes-18476.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 472032482508
NEXT_PUBLIC_FIREBASE_APP_ID = 1:472032482508:web:abd2f38f702e79eb629e69
```

**Stripe 環境變數（如果已設置）：**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_...
STRIPE_SECRET_KEY = sk_live_...
STRIPE_WEBHOOK_SECRET = whsec_...
```

3. 為每個環境變數選擇環境：
   - ✅ **Production**（必須）
   - ✅ **Preview**（可選，用於預覽部署）
   - ✅ **Development**（可選，用於本地開發）

#### 步驟 5：部署
1. 點擊 **Deploy** 按鈕
2. 等待構建完成（通常 2-5 分鐘）
3. 部署完成後，會顯示部署 URL（如：`https://your-project.vercel.app`）

---

### 方法 B：使用 Vercel CLI（適合進階用戶）

#### 步驟 1：安裝 Vercel CLI
```bash
npm i -g vercel
```

#### 步驟 2：登入 Vercel
```bash
vercel login
```

#### 步驟 3：部署
```bash
# 在專案根目錄執行
cd "c:\ai totur\github-i6bytsfz"
vercel
```

#### 步驟 4：設置環境變數
```bash
# 設置環境變數
vercel env add GOOGLE_GEMINI_API_KEY production
# 輸入 API Key 值

# 設置其他環境變數...
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
```

#### 步驟 5：部署到生產環境
```bash
vercel --prod
```

---

## ✅ 部署後驗證

### 1. 檢查部署狀態
- 前往 Vercel Dashboard
- 查看最新部署的狀態
- 確認沒有錯誤

### 2. 測試應用
1. 訪問部署後的 URL（如：`https://your-project.vercel.app`）
2. 測試基本功能：
   - 註冊/登入
   - 生成題目（如果配額未用完）
   - 查看儀表板

### 3. 測試 API 端點
訪問測試端點：
```
https://your-project.vercel.app/api/test-google-api
```

預期結果：
- 如果配額未用完：`{"success": true, "message": "Google API 連線成功！"}`
- 如果配額已用完：`{"success": true, "connectionStatus": "✅ 連線成功", "quotaStatus": "❌ 配額已達上限"}`

---

## 🔧 常見問題

### Q1: 構建失敗怎麼辦？
**A:** 檢查：
1. 查看 Vercel 部署日誌中的錯誤訊息
2. 確認所有依賴都已安裝（`package.json` 完整）
3. 確認環境變數已正確設置
4. 檢查 TypeScript 編譯錯誤

### Q2: 環境變數在哪裡設置？
**A:** 
- 方法 A：在導入專案時設置，或之後在 **Settings** → **Environment Variables** 中設置
- 方法 B：使用 `vercel env add` 命令

### Q3: 如何更新環境變數？
**A:**
1. 前往 Vercel Dashboard
2. 選擇專案 → **Settings** → **Environment Variables**
3. 編輯或添加環境變數
4. 重新部署（或等待下次自動部署）

### Q4: 部署後如何更新代碼？
**A:**
- 推送到 GitHub 的 `main` 分支會自動觸發部署
- 或手動在 Vercel Dashboard 中點擊 **Redeploy**

### Q5: 如何查看部署日誌？
**A:**
1. 前往 Vercel Dashboard
2. 選擇專案
3. 點擊最新部署
4. 查看 **Build Logs** 和 **Function Logs**

### Q6: 如何設置自定義域名？
**A:**
1. 前往 **Settings** → **Domains**
2. 添加您的域名
3. 按照指示設置 DNS 記錄

---

## 📝 部署檢查清單

### 部署前
- [ ] 代碼已推送到 GitHub
- [ ] 所有環境變數已準備好
- [ ] 本地測試通過（`npm run build` 成功）

### 部署時
- [ ] 已登入 Vercel
- [ ] 已導入 GitHub 專案
- [ ] 已設置所有必要的環境變數
- [ ] 已選擇正確的框架（Next.js）

### 部署後
- [ ] 構建成功（無錯誤）
- [ ] 可以訪問部署後的網站
- [ ] 測試 API 端點正常
- [ ] 測試基本功能（註冊、登入等）

---

## 🎯 快速開始（最簡單方法）

1. **登入 Vercel**：https://vercel.com（使用 GitHub 帳號）
2. **點擊 "Add New Project"**
3. **選擇您的 GitHub 專案**
4. **設置環境變數**：`GOOGLE_GEMINI_API_KEY`
5. **點擊 Deploy**
6. **等待完成**（2-5 分鐘）
7. **訪問您的網站**！

---

## 💡 提示

- **免費方案**：Vercel 免費方案已足夠使用，包括：
  - 無限部署
  - 自動 HTTPS
  - 全球 CDN
  - 自動構建和部署

- **自動部署**：每次推送到 `main` 分支會自動觸發部署

- **預覽部署**：每次 Pull Request 會創建預覽部署，方便測試

---

**需要幫助？** 如果遇到問題，可以：
1. 查看 Vercel 部署日誌
2. 檢查 [Vercel 文檔](https://vercel.com/docs)
3. 或告訴我具體的錯誤訊息
