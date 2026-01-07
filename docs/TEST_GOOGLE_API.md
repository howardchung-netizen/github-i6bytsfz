# 測試 Google API 連線指南

## 問題：404 NOT_FOUND

如果您訪問 `/api/test-google-api` 時收到 404 錯誤，請按照以下步驟排查：

## 解決方案

### 1. 確認文件存在
測試端點文件應該位於：`app/api/test-google-api/route.ts`

### 2. 重新啟動開發服務器

如果是在本地測試：
```bash
# 停止當前服務器（Ctrl+C）
# 然後重新啟動
npm run dev
```

### 3. 清除 Next.js 緩存

```bash
# 刪除 .next 目錄
rm -rf .next

# 重新啟動
npm run dev
```

### 4. 檢查路由結構

確保文件結構正確：
```
app/
  api/
    test-google-api/
      route.ts  ← 必須存在
```

### 5. 如果已部署到 Vercel

1. **檢查部署日誌**：
   - 前往 Vercel Dashboard
   - 查看最新部署的日誌
   - 確認是否有編譯錯誤

2. **重新部署**：
   ```bash
   git add .
   git commit -m "Add test API endpoint"
   git push origin main
   ```

3. **等待部署完成**後再訪問測試端點

## 替代測試方法

如果測試端點無法使用，可以使用現有的 `/api/chat` 端點測試：

### 方法 1：使用瀏覽器開發者工具

1. 打開瀏覽器開發者工具（F12）
2. 進入 Console 標籤
3. 執行以下代碼：

```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: '測試' })
})
.then(res => res.json())
.then(data => console.log('結果:', data))
.catch(err => console.error('錯誤:', err));
```

### 方法 2：使用 curl（本地）

```bash
curl http://localhost:3000/api/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"測試"}'
```

### 方法 3：直接測試應用功能

最簡單的方法：
1. 啟動應用
2. 嘗試生成一道題目
3. 如果成功，表示可以訪問 Google API

## 預期結果

### 成功情況
```json
{
  "success": true,
  "message": "Google API 連線成功！",
  "response": "測試成功",
  "timestamp": "2024-01-XX...",
  "serverLocation": "Vercel/部署平台"
}
```

### 失敗情況（API Key 未設置）
```json
{
  "success": false,
  "error": "API Key not configured",
  "message": "請在環境變數中設置 GOOGLE_GEMINI_API_KEY"
}
```

### 失敗情況（網路問題）
```json
{
  "success": false,
  "error": "Network Connection Error",
  "isNetworkError": true,
  "message": "無法連線到 Google API 伺服器。這可能是網路問題或地區限制。"
}
```

## 常見問題

### Q: 為什麼會出現 404？
A: 可能是：
- 文件路徑不正確
- Next.js 緩存問題
- 需要重新構建

### Q: 本地可以訪問，但部署後不行？
A: 檢查：
- Vercel 環境變數是否設置
- 部署日誌是否有錯誤
- 路由文件是否正確提交到 Git

### Q: 如何確認 Vercel 可以訪問 Google API？
A: 最可靠的方法是：
1. 部署到 Vercel
2. 在實際應用中嘗試生成題目
3. 如果成功，表示可以訪問

---

**提示**：如果測試端點無法使用，直接測試應用功能是最簡單的方法。
