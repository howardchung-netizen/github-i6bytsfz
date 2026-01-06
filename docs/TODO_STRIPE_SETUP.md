# Stripe 支付設置待辦事項

## 📋 狀態
- ✅ Stripe 依賴已安裝 (`stripe` 和 `@stripe/stripe-js`)
- ⏳ 等待新公司成立後再申請 Stripe 帳號

## 🔄 待完成事項

### 1. 申請 Stripe 帳號
- [ ] 前往 [Stripe 官網](https://stripe.com) 註冊帳號
- [ ] 完成帳號驗證（需要提供公司/個人資料）
- [ ] 獲取 API Keys：
  - [ ] Publishable key (pk_test_...)
  - [ ] Secret key (sk_test_...)

### 2. 配置環境變數
在 `.env.local` 文件中添加：
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 設置 Webhook（生產環境）
- [ ] 在 Stripe Dashboard 中設置 Webhook endpoint
- [ ] URL: `https://yourdomain.com/api/webhooks/stripe`
- [ ] 監聽事件：
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### 4. 測試支付流程
- [ ] 使用測試卡號測試支付
- [ ] 驗證 webhook 事件處理
- [ ] 確認用戶訂閱狀態更新

### 5. 生產環境部署
- [ ] 切換到 Stripe Live mode
- [ ] 使用 `pk_live_...` 和 `sk_live_...` keys
- [ ] 設置生產環境的 webhook

## 📝 注意事項

- 目前支付功能代碼已完整，但需要 Stripe 帳號才能使用
- 在未配置 Stripe 時，訂閱按鈕會顯示錯誤（這是正常的）
- 所有相關代碼文件已準備就緒：
  - `app/api/payment/create-checkout/route.ts`
  - `app/api/webhooks/stripe/route.ts`
  - `app/components/SubscriptionView.tsx`
  - `app/subscription/success/page.tsx`

## 📚 參考文檔

詳細設置指南請查看：`docs/PAYMENT_INTEGRATION_GUIDE.md`
