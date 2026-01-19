# 系統架構與維運閉環

> **更新日期**：2026年1月19日  
> **專案路徑**：`C:\ai totur\github-i6bytsfz`

---

## 1) 自動化維運閉環（CI/CD + 監控）

### 1.1 監控端（Observer）
- **Sentry**
  - **職責**：捕捉 Next.js 前後端錯誤
  - **狀態**：已安裝 `@sentry/nextjs`，DSN 已配置（由 `NEXT_PUBLIC_SENTRY_DSN` 提供）

### 1.2 中轉站（Broker）
- **GitHub Issues**
  - **機制**：Sentry 偵測錯誤 → 自動建立 GitHub Issue

### 1.3 維修工（Fixer）
- **Ellipsis（暫停中）**
  - **職責**：讀取 Issue → 自動修復 → 提交 PR
  - **狀態**：目前暫停，避免開發期間干擾

### 1.4 部署端（Deployer）
- **Vercel**
  - **機制**：GitHub main 分支更新 → 自動部署
  - **狀態**：運作中

---

## 2) 協作規範（AI Agent 必遵守）

### 2.1 同步提醒
每次新 Session 或準備 Commit/Push 前，必須先執行：

> ⚠️ **「主人，請先執行 `git pull` 確保與雲端同步，避免版本衝突！」**

---

## 3) 當前自動化狀態

- **Sentry 監控**：運作中
- **Ellipsis 自動修復**：已暫停
- **Vercel 自動部署**：運作中
