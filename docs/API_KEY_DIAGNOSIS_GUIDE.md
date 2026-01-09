# API Key 診斷指南

## 🔍 問題描述

自從 2 天前晚上出現 API 用量到達上限後，問題一直沒解決。懷疑是 API Key 的問題。

---

## 📋 診斷步驟

### 步驟 1: 檢查 API Key 是否存在

#### 1.1 檢查本地環境變數文件

**文件位置**: 項目根目錄下的 `.env.local`

**檢查方法**:
```bash
# 在項目根目錄執行
cat .env.local
# 或
type .env.local  # Windows PowerShell
```

**應該看到**:
```
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**如果文件不存在**:
- 創建 `.env.local` 文件
- 添加 `GOOGLE_GEMINI_API_KEY=your_api_key_here`
- 重啟開發服務器

---

#### 1.2 檢查 API Key 是否被正確讀取

**測試方法**: 訪問測試端點
```
http://localhost:3000/api/test-google-api
```

**如果看到**:
```json
{
  "success": false,
  "error": "API Key not configured",
  "message": "請在環境變數中設置 GOOGLE_GEMINI_API_KEY"
}
```

**表示**: API Key 沒有被讀取到

**解決方法**:
1. 確認 `.env.local` 文件在項目根目錄（與 `package.json` 同級）
2. 確認文件內容格式正確（沒有多餘空格、引號等）
3. **重啟開發服務器**（重要！環境變數只在啟動時讀取）

---

### 步驟 2: 驗證 API Key 是否有效

#### 2.1 使用 Google AI Studio 測試

1. **前往**: https://aistudio.google.com/
2. **登入** Google 帳號
3. **檢查 API Key**:
   - 點擊右上角設置圖標
   - 查看 "API keys"
   - 確認 API Key 是否存在且有效

#### 2.2 直接測試 API Key

**使用 curl 測試**（在終端執行）:
```bash
# 替換 YOUR_API_KEY 為實際的 API Key
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "回覆：測試成功"
      }]
    }]
  }'
```

**如果成功**: 會返回 JSON 響應，包含 "測試成功"
**如果失敗**: 會返回錯誤訊息

---

### 步驟 3: 檢查 API Key 的配額狀態

#### 3.1 檢查配額使用情況

1. **前往**: https://aistudio.google.com/app/apikey
2. **點擊 API Key** 查看詳情
3. **檢查配額**:
   - 免費層配額：RPM 15, RPD 1,500
   - 查看當前使用量
   - 查看配額重置時間

#### 3.2 檢查配額重置時間

**配額重置時間**: 每天香港時間下午 4:00（PST 午夜）

**如果配額已用完**:
- 需要等待重置
- 或升級到付費方案

---

### 步驟 4: 檢查 API Key 權限

#### 4.1 檢查模型訪問權限

**可能問題**: API Key 可能沒有權限訪問某些模型

**檢查方法**:
1. 前往 Google Cloud Console: https://console.cloud.google.com/
2. 選擇對應的專案
3. 檢查 "APIs & Services" → "Enabled APIs"
4. 確認 "Generative Language API" 已啟用

#### 4.2 檢查 API Key 限制

**可能問題**: API Key 可能被限制只能訪問特定模型

**檢查方法**:
1. Google Cloud Console → "APIs & Services" → "Credentials"
2. 點擊您的 API Key
3. 檢查 "API restrictions"
4. 確認沒有過度限制

---

### 步驟 5: 檢查代碼中的 API Key 使用

#### 5.1 確認環境變數名稱正確

**檢查文件**: `app/api/chat/route.ts`

應該看到:
```typescript
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
```

**確認**:
- 變數名稱是 `GOOGLE_GEMINI_API_KEY`（不是其他名稱）
- 使用 `process.env` 讀取（不是硬編碼）

#### 5.2 確認環境變數在服務器端可用

**問題**: Next.js 中，只有服務器端代碼可以讀取 `process.env`

**檢查**: 確認 API 路由文件在 `app/api/` 目錄下（服務器端）

---

### 步驟 6: 檢查 Vercel 環境變數（如果已部署）

#### 6.1 檢查 Vercel 環境變數

1. **登入**: https://vercel.com/dashboard
2. **選擇專案** → Settings → Environment Variables
3. **確認**: `GOOGLE_GEMINI_API_KEY` 已設置
4. **檢查**: 
   - 環境變數值是否正確
   - 是否設置在正確的環境（Production/Preview/Development）

#### 6.2 重新部署（如果修改了環境變數）

**重要**: 修改環境變數後，需要重新部署才會生效

**方法**:
1. 在 Vercel Dashboard 點擊 "Redeploy"
2. 或推送新的 commit 觸發自動部署

---

## 🔧 常見問題和解決方案

### 問題 1: API Key 讀取不到

**症狀**: 
- 錯誤訊息: "API Key not configured"
- 測試端點返回失敗

**解決方案**:
1. 確認 `.env.local` 文件在項目根目錄
2. 確認文件格式正確（沒有引號、沒有多餘空格）
3. **重啟開發服務器**（必須！）
4. 確認變數名稱是 `GOOGLE_GEMINI_API_KEY`

---

### 問題 2: API Key 無效

**症狀**:
- 錯誤訊息: "API Key not valid" 或 "401 Unauthorized"

**解決方案**:
1. 前往 Google AI Studio 重新生成 API Key
2. 更新 `.env.local` 文件
3. 重啟開發服務器
4. 如果已部署，更新 Vercel 環境變數並重新部署

---

### 問題 3: 配額已用完

**症狀**:
- 錯誤訊息: "Quota exceeded" 或 "limit: 0"
- 錯誤代碼: 429

**解決方案**:
1. 檢查配額使用情況: https://aistudio.google.com/app/apikey
2. 等待配額重置（每天香港時間下午 4:00）
3. 或升級到付費方案

---

### 問題 4: API Key 沒有權限訪問模型

**症狀**:
- 錯誤訊息: "Model not found" 或 "403 Forbidden"
- 特定模型無法使用

**解決方案**:
1. 檢查 Google Cloud Console 中的 API 權限
2. 確認 "Generative Language API" 已啟用
3. 檢查 API Key 的限制設置

---

## 📝 診斷檢查清單

完成以下檢查：

- [ ] `.env.local` 文件存在且格式正確
- [ ] API Key 值正確（沒有多餘空格、引號）
- [ ] 開發服務器已重啟（修改環境變數後）
- [ ] 測試端點 `/api/test-google-api` 可以訪問
- [ ] Google AI Studio 中 API Key 有效
- [ ] 配額未用完（檢查使用量）
- [ ] Google Cloud Console 中 API 已啟用
- [ ] Vercel 環境變數已設置（如果已部署）

---

## 🚀 快速診斷命令

### 檢查環境變數文件
```bash
# Windows PowerShell
Get-Content .env.local

# Linux/Mac
cat .env.local
```

### 測試 API Key

#### Windows PowerShell（推薦）
```powershell
# 替換 YOUR_API_KEY 為實際的 API Key
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" -Method POST -ContentType "application/json" -Body '{"contents":[{"parts":[{"text":"測試"}]}]}'
```

#### Linux/Mac（使用 curl）
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"測試"}]}]}'
```

### 檢查 Node.js 環境變數（在代碼中）
```javascript
// 在 app/api/test-google-api/route.ts 中添加
console.log('API Key exists:', !!process.env.GOOGLE_GEMINI_API_KEY);
console.log('API Key length:', process.env.GOOGLE_GEMINI_API_KEY?.length);
// 注意：不要打印完整的 API Key（安全問題）
```

---

## 🆘 如果問題持續

1. **重新生成 API Key**:
   - 前往 Google AI Studio
   - 刪除舊的 API Key
   - 創建新的 API Key
   - 更新 `.env.local` 和 Vercel 環境變數

2. **檢查 Google Cloud 專案**:
   - 確認專案狀態正常
   - 確認帳單設置正確（即使使用免費層）

3. **聯繫支持**:
   - Google AI Studio 支持
   - 或查看文檔: https://ai.google.dev/gemini-api/docs

---

**完成診斷後，請告訴我檢查結果，我可以幫您進一步解決問題！**
