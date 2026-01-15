# Stripe 支付整合

> **用途**：整合 Stripe 支付設定與待辦。  
> **更新日期**：2026年1月15日

---

## 1) Stripe 帳號與 Keys

1. Stripe Dashboard → Developers → API keys  
2. 取得：
   - Publishable key (`pk_test_...`)
   - Secret key (`sk_test_...`)

---

## 2) 環境變數

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3) API 路由

- `app/api/payment/create-checkout/route.ts`
- `app/api/webhooks/stripe/route.ts`

---

## 4) 測試

**測試卡號**：
- 成功：`4242 4242 4242 4242`
- 需 3DS：`4000 0025 0000 3155`
- 失敗：`4000 0000 0000 0002`

---

## 5) 待辦

- 公司成立後啟用正式金鑰  
- 實作訂閱權限鎖定  
