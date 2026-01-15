# API Key / 配額 / 測試 操作總覽

> **用途**：整合 API Key 診斷、配額、測試與速率限制。  
> **更新日期**：2026年1月15日

---

## 1) API Key 設置與診斷

**檔案位置**：`.env.local`  
**必要變數**：
```
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**驗證 API Key 是否被讀取**：
- 訪問 `/api/test-google-api`
- 若顯示 `API Key not configured` → 檢查 `.env.local` 位置與格式，並**重啟 dev server**

**外部驗證**：
- Google AI Studio：https://aistudio.google.com
- curl 測試：  
```
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"回覆：測試成功"}]}]}'
```

---

## 2) 配額與重置

**重置時間**（常見）：
- PST 00:00（HKT 約 16:00 或 15:00 夏令）
- 可能是 24h 滾動窗口

**查看配額**：
1. AI Studio → Usage and Billing → Rate Limit  
2. 使用 `/api/check-quota` 端點  

**常見限制**：
- RPM / RPD 受模型與帳號方案影響  

---

## 3) 速率限制與 429

**目前**：前端 `MIN_REQUEST_INTERVAL_MS` 已有限流  
**建議**：在 API 路由層加入重試與指數退避  

---

## 4) 配額共享與限制說明

- 配額通常以 **API Key** 為單位  
- 同一 Key 被多個環境共用時，會共享 RPM/RPD  

---

## 5) 測試指令（PowerShell）

```powershell
node scripts/verify-thinking-model.js
```

```powershell
# 測試 API Key 是否可用
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" `
  -H "Content-Type: application/json" `
  -d "{""contents"":[{""parts"":[{""text"":""測試成功""}]}]}"
```
