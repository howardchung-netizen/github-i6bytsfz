# 簡單的 API Key 測試方法

## 🎯 最簡單的方法：使用瀏覽器測試

### 方法 1: 使用診斷端點（推薦）

1. **確保開發服務器正在運行**：
   ```powershell
   npm run dev
   ```

2. **在瀏覽器訪問**：
   ```
   http://localhost:3000/api/diagnose-api-key
   ```

   這會自動：
   - 讀取 `.env.local` 中的 API Key
   - 測試 API Key 是否有效
   - 顯示詳細的診斷結果

---

### 方法 2: 使用測試 API 端點

訪問：
```
http://localhost:3000/api/test-google-api
```

這會測試 API 連線是否正常。

---

## 🔧 PowerShell 手動測試（如果瀏覽器方法不行）

### 步驟 1: 讀取 API Key

在 PowerShell 中執行：

```powershell
# 讀取 .env.local 文件中的 API Key
$envContent = Get-Content .env.local
$apiKey = ($envContent | Where-Object { $_ -match "GOOGLE_GEMINI_API_KEY=(.+)" }) -replace "GOOGLE_GEMINI_API_KEY=", "" -replace '"', '' -replace "'", ""
$apiKey = $apiKey.Trim()
Write-Host "API Key: $($apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)))..." -ForegroundColor Green
```

### 步驟 2: 測試 API Key

```powershell
# 測試 API Key
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=$apiKey"
$body = '{"contents":[{"parts":[{"text":"測試"}]}]}'

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body -TimeoutSec 30
    Write-Host "✅ 成功！" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ 錯誤：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    
    # 顯示詳細錯誤
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        Write-Host "詳細錯誤：" -ForegroundColor Yellow
        Write-Host $errorBody -ForegroundColor White
    }
}
```

---

## 📋 完整的一鍵測試命令

複製以下命令到 PowerShell（一行執行）：

```powershell
$apiKey = ((Get-Content .env.local) | Where-Object { $_ -match "GOOGLE_GEMINI_API_KEY=(.+)" }) -replace "GOOGLE_GEMINI_API_KEY=", "" -replace '"', '' -replace "'", "" | ForEach-Object { $_.Trim() }; $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=$apiKey"; $body = '{"contents":[{"parts":[{"text":"測試"}]}]}'; try { $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body -TimeoutSec 30; Write-Host "✅ 成功！" -ForegroundColor Green; $response | ConvertTo-Json -Depth 10 } catch { Write-Host "❌ 錯誤：" -ForegroundColor Red; Write-Host $_.Exception.Message -ForegroundColor Yellow; if ($_.Exception.Response) { $stream = $_.Exception.Response.GetResponseStream(); $reader = New-Object System.IO.StreamReader($stream); $errorBody = $reader.ReadToEnd(); $reader.Close(); Write-Host "詳細錯誤：" -ForegroundColor Yellow; Write-Host $errorBody -ForegroundColor White } }
```

---

## 💡 推薦方法

**最簡單**：使用瀏覽器訪問 `http://localhost:3000/api/diagnose-api-key`

這會自動處理所有細節，並顯示詳細的診斷結果。
