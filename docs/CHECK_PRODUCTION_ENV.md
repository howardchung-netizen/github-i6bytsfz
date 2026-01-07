# 如何檢查環境是否為 Production

## 📋 方法

### 方法 1：在代碼中檢查（最常用）

#### 在 API 路由中（Server-side）
```typescript
// app/api/example/route.ts
export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // 生產環境的邏輯
    console.log('運行在生產環境');
  } else {
    // 開發環境的邏輯
    console.log('運行在開發環境');
  }
  
  return NextResponse.json({ 
    environment: process.env.NODE_ENV,
    isProduction 
  });
}
```

#### 在客戶端組件中（Client-side）
```typescript
// app/components/Example.tsx
"use client";

export default function Example() {
  // 注意：在客戶端，NODE_ENV 會被 Next.js 自動處理
  const isProduction = process.env.NODE_ENV === 'production';
  
  return (
    <div>
      {isProduction ? (
        <p>生產環境</p>
      ) : (
        <p>開發環境</p>
      )}
    </div>
  );
}
```

### 方法 2：在 Vercel Dashboard 檢查

1. **登入 Vercel**
   - 前往 https://vercel.com
   - 登入您的帳號

2. **查看部署環境**
   - 選擇您的專案
   - 進入 **Deployments** 標籤
   - 查看部署列表
   - **Production** 部署會顯示在頂部，通常有特殊的標記

3. **檢查環境變數**
   - 進入 **Settings** → **Environment Variables**
   - 查看每個變數的環境範圍
   - Production 環境的變數會標記為 **Production**

### 方法 3：通過 URL 判斷

**Vercel 部署 URL 格式：**
- **Production**: `https://your-project.vercel.app`（主域名）
- **Preview**: `https://your-project-git-branch-username.vercel.app`（分支部署）

### 方法 4：創建測試端點

創建一個 API 端點來檢查環境：

```typescript
// app/api/check-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    vercelEnv: process.env.VERCEL_ENV, // Vercel 專用
    vercelUrl: process.env.VERCEL_URL, // Vercel 部署 URL
    nodeEnv: process.env.NODE_ENV
  });
}
```

然後訪問：`https://your-project.vercel.app/api/check-env`

---

## 🔍 實際應用示例

### 示例 1：根據環境顯示不同的錯誤訊息

```typescript
// app/api/chat/route.ts
const errorDetails = process.env.NODE_ENV === 'development' 
  ? error.stack 
  : undefined; // 生產環境不顯示詳細錯誤
```

### 示例 2：根據環境使用不同的 API Key

```typescript
const apiKey = process.env.NODE_ENV === 'production'
  ? process.env.GOOGLE_GEMINI_API_KEY_PROD
  : process.env.GOOGLE_GEMINI_API_KEY_DEV;
```

### 示例 3：根據環境啟用/禁用功能

```typescript
const enableDebugMode = process.env.NODE_ENV !== 'production';
```

---

## 📝 環境變數說明

### Next.js 自動設置的環境變數

- `NODE_ENV`:
  - 開發環境：`development`
  - 生產環境：`production`
  - 測試環境：`test`

### Vercel 專用環境變數

- `VERCEL_ENV`:
  - `production` - 生產環境
  - `preview` - 預覽環境（分支部署）
  - `development` - 本地開發

- `VERCEL_URL` - 當前部署的 URL

---

## ✅ 快速檢查清單

- [ ] 在 Vercel Dashboard 查看部署狀態
- [ ] 檢查 URL 是否為主域名（production）
- [ ] 訪問 `/api/check-env` 端點（如果創建了）
- [ ] 檢查 `process.env.NODE_ENV` 的值

---

**提示**：在 Vercel 上，`NODE_ENV` 在構建時會自動設置為 `production`。
