# PowerShell 測試 API Key 指南

## 🚀 快速測試（推薦）

### 使用測試腳本（最簡單）

1. **運行測試腳本**：
   ```powershell
   .\test-api-key.ps1
   ```

   腳本會自動：
   - 從 `.env.local` 讀取 API Key
   - 測試 API Key 是否有效
   - 顯示詳細的錯誤訊息（如果有）

---

## 🔧 手動測試命令

### 方法 1: 使用 Invoke-WebRequest（推薦）

**替換 `YOUR_API_KEY` 為實際的 API Key**

```powershell
$apiKey = "YOUR_API_KEY"
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=$apiKey"
$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "回覆：測試成功"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body $body
$response.Content
```

### 方法 2: 使用 Invoke-RestMethod（更簡單）

```powershell
$apiKey = "YOUR_API_KEY"
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=$apiKey"
$body = @{
    contents = @(
        @{
            parts = @(
                @{
                    text = "回覆：測試成功"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body
$response | ConvertTo-Json -Depth 10
```

### 方法 3: 一行命令（最簡單）

```powershell
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" -Method POST -ContentType "application/json" -Body '{"contents":[{"parts":[{"text":"測試"}]}]}'
```

---

## 📝 使用步驟

### 步驟 1: 獲取 API Key

1. 打開 `.env.local` 文件
2. 複製 `GOOGLE_GEMINI_API_KEY` 的值（不要包含引號）

### 步驟 2: 在 PowerShell 中執行

**推薦使用方法 3（最簡單）**：

```powershell
# 替換 YOUR_API_KEY 為實際的 API Key
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=YOUR_API_KEY" -Method POST -ContentType "application/json" -Body '{"contents":[{"parts":[{"text":"測試"}]}]}'
```

### 步驟 3: 查看結果

**如果成功**：
- 會返回 JSON 格式的響應
- 包含 `candidates[0].content.parts[0].text` 字段

**如果失敗**：
- 會顯示錯誤訊息
- 例如：配額錯誤、API Key 無效等

---

## 🔍 常見錯誤和解決方法

### 錯誤 1: "API Key not valid"

**解決**：
- 確認 API Key 正確（沒有多餘空格）
- 前往 Google AI Studio 重新生成 API Key

### 錯誤 2: "Quota exceeded"

**解決**：
- 等待配額重置（每天香港時間下午 4:00）
- 或升級到付費方案

### 錯誤 3: 網路超時

**解決**：
- 檢查 VPN 連線
- 確認可以訪問 Google API
- 嘗試更換 VPN 節點

---

## 💡 提示

- PowerShell 中使用單引號 `'...'` 或雙引號 `"..."` 都可以
- JSON 字符串中的引號需要轉義，或使用單引號包裹整個 JSON
- 如果 API Key 包含特殊字符，使用雙引號包裹
