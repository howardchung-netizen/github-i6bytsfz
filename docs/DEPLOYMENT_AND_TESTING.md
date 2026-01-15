# 部署與測試指南（Vercel）

> **用途**：整合部署步驟、環境變數與本地測試。  
> **更新日期**：2026年1月15日

---

## 1) 必要環境變數

**Gemini**：
```
GOOGLE_GEMINI_API_KEY=your_api_key_here
```

**Firebase（如需）**：
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

**Stripe（如需）**：
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 2) Vercel 部署流程（Dashboard）

1. 推送至 GitHub  
2. Vercel → Import Project  
3. Framework 選 Next.js  
4. 設置環境變數  
5. Deploy

---

## 3) 本地測試

```bash
npm install
npm run dev
```

測試端點：
- `/api/test-google-api`
- `/api/check-quota`

---

## 4) 常見問題

- **環境變數不生效**：重啟 dev server
- **API Key 錯誤**：確認 Google AI Studio 中 Key 權限
