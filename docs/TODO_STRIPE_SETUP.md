# Stripe 支付設置待辦事項

## ⚠️ 重要提醒
**此任務必須在公司成立後完成！** 目前應用已部署到 Vercel，但支付功能暫時停用。當公司成立並申請 Stripe 帳號後，請按照以下步驟完成設置。

## 📋 當前狀態
- ✅ Stripe 依賴已安裝 (`stripe` 和 `@stripe/stripe-js`)
- ✅ 支付功能代碼已完成並有錯誤處理
- ✅ 應用已部署到 Vercel（無 Stripe 配置）
- ⏳ **等待公司成立後申請 Stripe 帳號**

## 🔄 待完成事項

### 1. 申請 Stripe 帳號
- [ ] 前往 [Stripe 官網](https://stripe.com) 註冊帳號
- [ ] 完成帳號驗證（需要提供公司/個人資料）
- [ ] 獲取 API Keys：
  - [ ] Publishable key (pk_test_...)
  - [ ] Secret key (sk_test_...)

### 2. 在 Vercel 配置環境變數（生產環境）
**重要：** 部署到 Vercel 後，需要在 Vercel Dashboard 設置環境變數，而不是 `.env.local`

步驟：
1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇專案 `github-i6bytsfz`
3. 進入 **Settings** → **Environment Variables**
4. 添加以下環境變數（選擇 **Production** 環境）：

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**注意：**
- 使用 `pk_live_...` 和 `sk_live_...`（生產環境）
- `NEXT_PUBLIC_APP_URL` 應設置為實際的 Vercel 部署 URL
- 添加後，Vercel 會自動重新部署

### 3. 設置 Webhook（生產環境）
- [ ] 在 Stripe Dashboard 中進入 **Developers** → **Webhooks**
- [ ] 點擊 **Add endpoint**
- [ ] 設置 Webhook URL：`https://your-project.vercel.app/api/webhooks/stripe`
  - **注意：** 將 `your-project.vercel.app` 替換為實際的 Vercel 部署域名
- [ ] 選擇要監聽的事件：
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
- [ ] 複製 **Signing secret**（格式：`whsec_...`）
- [ ] 將 Signing secret 添加到 Vercel 環境變數 `STRIPE_WEBHOOK_SECRET`

### 4. 測試支付流程
- [ ] 使用測試卡號測試支付
- [ ] 驗證 webhook 事件處理
- [ ] 確認用戶訂閱狀態更新

### 5. 驗證部署
- [ ] 確認 Vercel 環境變數已正確設置
- [ ] 確認 Vercel 已自動重新部署（或手動觸發 Redeploy）
- [ ] 訪問應用並測試訂閱功能
- [ ] 確認支付流程正常運作
- [ ] 確認 Webhook 事件能正常接收和處理

## 📝 注意事項

- **當前狀態：** 支付功能代碼已完整，但需要 Stripe 帳號才能使用
- **用戶體驗：** 在未配置 Stripe 時，點擊訂閱會顯示「支付服務尚未配置，請聯繫管理員或稍後再試」（這是正常的）
- **代碼準備：** 所有相關代碼文件已準備就緒，無需修改：
  - `app/api/payment/create-checkout/route.ts` ✅
  - `app/api/webhooks/stripe/route.ts` ✅
  - `app/components/SubscriptionView.tsx` ✅
  - `app/subscription/success/page.tsx` ✅

## 🔔 提醒時機

**當以下情況發生時，請完成 Stripe 設置：**
- ✅ 公司已正式成立
- ✅ 已獲得商業登記證書
- ✅ 準備開始接受付費用戶
- ✅ 需要啟用訂閱功能

**設置完成後，請：**
1. 測試支付流程
2. 確認 Webhook 正常運作
3. 更新用戶文檔（如有需要）

## 📚 參考文檔

詳細設置指南請查看：`docs/PAYMENT_INTEGRATION_GUIDE.md`
