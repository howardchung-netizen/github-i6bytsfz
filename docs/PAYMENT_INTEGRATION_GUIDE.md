# 支付服務整合指南 - Stripe

本指南將幫助您整合 Stripe 支付服務到 AI Math Tutor 應用中。

## 📋 目錄
1. [Stripe 帳號設置](#1-stripe-帳號設置)
2. [安裝依賴](#2-安裝依賴)
3. [環境變數配置](#3-環境變數配置)
4. [創建支付 API](#4-創建支付-api)
5. [更新前端組件](#5-更新前端組件)
6. [測試支付](#6-測試支付)

---

## 1. Stripe 帳號設置

### 步驟 1.1：註冊 Stripe 帳號
1. 前往 [Stripe 官網](https://stripe.com)
2. 點擊「Sign up」註冊帳號
3. 完成帳號驗證（需要提供公司/個人資料）

### 步驟 1.2：獲取 API Keys
1. 登入 Stripe Dashboard
2. 進入「Developers」→「API keys」
3. 複製以下兩個 Key：
   - **Publishable key** (pk_test_...)：用於前端
   - **Secret key** (sk_test_...)：用於後端（**絕不**暴露給前端）

### 步驟 1.3：設置 Webhook（可選，用於生產環境）
1. 在 Stripe Dashboard 中進入「Developers」→「Webhooks」
2. 點擊「Add endpoint」
3. 設置 URL：`https://yourdomain.com/api/webhooks/stripe`
4. 選擇要監聽的事件：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

---

## 2. 安裝依賴

在專案根目錄執行：

```bash
npm install stripe @stripe/stripe-js
```

---

## 3. 環境變數配置

在 `.env.local` 文件中添加：

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Webhook Secret (用於驗證 webhook，生產環境需要)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# 應用 URL（用於支付成功後重定向）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**重要：**
- `.env.local` 已加入 `.gitignore`，不會被提交到 Git
- 生產環境請使用 `pk_live_...` 和 `sk_live_...`（真實環境的 Key）

---

## 4. 創建支付 API

### 4.1 創建 Checkout Session API

創建 `app/api/payment/create-checkout/route.ts`

這個 API 會創建 Stripe Checkout Session，用戶將被重定向到 Stripe 的支付頁面。

### 4.2 創建 Webhook Handler

創建 `app/api/webhooks/stripe/route.ts`

這個 API 處理 Stripe 發送的 webhook 事件，用於更新用戶訂閱狀態。

---

## 5. 更新前端組件

更新 `SubscriptionView.tsx` 以使用 Stripe Checkout。

---

## 6. 測試支付

### 測試卡號（Stripe 測試模式）
- **成功支付**：`4242 4242 4242 4242`
- **需要 3D Secure**：`4000 0025 0000 3155`
- **支付失敗**：`4000 0000 0000 0002`

所有測試卡：
- 到期日期：任何未來日期（如 12/34）
- CVC：任何 3 位數（如 123）
- ZIP：任何 5 位數（如 12345）

---

## 🔒 安全注意事項

1. **永遠不要**在前端代碼中暴露 Secret Key
2. **永遠**使用環境變數存儲敏感信息
3. **驗證**所有 webhook 請求的簽名
4. **使用 HTTPS**（生產環境）
5. **記錄**所有支付交易

---

## 📚 參考資源

- [Stripe 官方文檔](https://stripe.com/docs)
- [Stripe Checkout 指南](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Next.js + Stripe 範例](https://github.com/stripe-samples/nextjs-typescript-react-stripe-js)

---

## 🆘 常見問題

### Q: 如何切換到生產環境？
A: 在 Stripe Dashboard 中切換到「Live mode」，使用 `pk_live_...` 和 `sk_live_...`。

### Q: Webhook 在本地開發時如何測試？
A: 使用 [Stripe CLI](https://stripe.com/docs/stripe-cli) 轉發 webhook 到本地：
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Q: 如何處理支付失敗？
A: Stripe Checkout 會自動處理失敗情況，您可以通過 webhook 監聽 `checkout.session.async_payment_failed` 事件。
