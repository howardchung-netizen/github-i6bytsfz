# PowerShell 腳本：測試 Google Gemini API Key
# 使用方法：在 PowerShell 中執行此腳本

# 步驟 1: 從 .env.local 讀取 API Key（如果文件存在）
$envFile = ".env.local"
$apiKey = $null

if (Test-Path $envFile) {
    Write-Host "正在從 .env.local 讀取 API Key..." -ForegroundColor Yellow
    $content = Get-Content $envFile
    foreach ($line in $content) {
        if ($line -match "GOOGLE_GEMINI_API_KEY=(.+)") {
            $apiKey = $matches[1].Trim()
            Write-Host "✅ 找到 API Key（長度: $($apiKey.Length) 字符）" -ForegroundColor Green
            break
        }
    }
}

# 如果沒有從文件讀取到，提示用戶輸入
if (-not $apiKey) {
    Write-Host "⚠️ 無法從 .env.local 讀取 API Key" -ForegroundColor Yellow
    Write-Host "請手動輸入 API Key（或按 Ctrl+C 取消）：" -ForegroundColor Yellow
    $apiKey = Read-Host
}

if (-not $apiKey -or $apiKey -eq "YOUR_API_KEY") {
    Write-Host "❌ API Key 無效！請確認已設置正確的 API Key" -ForegroundColor Red
    exit 1
}

# 步驟 2: 構建請求
Write-Host "`n正在測試 API Key..." -ForegroundColor Cyan
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

# 步驟 3: 發送請求並處理錯誤
try {
    $response = Invoke-RestMethod -Uri $url -Method POST -ContentType "application/json" -Body $body -ErrorAction Stop
    
    Write-Host "`n✅ API Key 測試成功！" -ForegroundColor Green
    Write-Host "`n響應內容：" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    # 提取實際回應文本
    if ($response.candidates -and $response.candidates[0].content.parts[0].text) {
        Write-Host "`n📝 AI 回應：" -ForegroundColor Yellow
        Write-Host $response.candidates[0].content.parts[0].text -ForegroundColor White
    }
    
} catch {
    Write-Host "`n❌ API Key 測試失敗！" -ForegroundColor Red
    Write-Host "`n錯誤詳情：" -ForegroundColor Yellow
    
    # 嘗試解析錯誤響應
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        $reader.Close()
        
        try {
            $errorJson = $responseBody | ConvertFrom-Json
            Write-Host "錯誤訊息：" -ForegroundColor Red
            Write-Host ($errorJson | ConvertTo-Json -Depth 10) -ForegroundColor White
            
            # 檢查是否為配額錯誤
            if ($errorJson.error -and $errorJson.error.message) {
                $errorMsg = $errorJson.error.message
                if ($errorMsg -match "quota|exceeded|配額") {
                    Write-Host "`n💡 這是配額問題：" -ForegroundColor Yellow
                    Write-Host "   - 配額已用完" -ForegroundColor White
                    Write-Host "   - 等待重置（每天香港時間下午 4:00）" -ForegroundColor White
                    Write-Host "   - 或升級到付費方案" -ForegroundColor White
                } elseif ($errorMsg -match "API key|invalid|unauthorized") {
                    Write-Host "`n💡 這是 API Key 問題：" -ForegroundColor Yellow
                    Write-Host "   - API Key 可能無效或過期" -ForegroundColor White
                    Write-Host "   - 前往 Google AI Studio 重新生成" -ForegroundColor White
                }
            }
        } catch {
            Write-Host "原始錯誤響應：" -ForegroundColor Red
            Write-Host $responseBody -ForegroundColor White
        }
    } else {
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host "`n狀態碼：" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        Write-Host $_.Exception.Response.StatusCode.value__ -ForegroundColor White
    }
}

Write-Host "`n測試完成！" -ForegroundColor Cyan
