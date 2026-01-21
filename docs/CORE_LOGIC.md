# Core Logic & Architecture Strategy

## 1. 核心哲學：工廠模式 (Factory Pattern)
系統運作核心為「工廠生產線」，而非單純的 CRUD。所有試題（無論是人工上傳或 AI 生成）都必須經過標準化的生產流程：
**Raw Input (種子/上傳) -> Processing (標準化/視覺辨識) -> Staging (Draft) -> Audit (審核) -> Warehouse (Published)**

## 2. 資料流與狀態生命週期 (Data Lifecycle)
所有題目 (`past_papers` collection) 必須擁有明確的狀態流轉：

- **DRAFT (草稿/待審)**:
  - 來源：剛上傳的圖片/PDF、剛生成的 AI 變體。
  - 特徵：前台不可見，僅 `Admin` 可見。
  - 必要欄位：`origin`, `source`, `createdAt`。

- **AUDITED (已審核)**:
  - 來源：經過 AI 自動審核或人工初步檢視。
  - 特徵：附帶 `auditMeta` (信心分數、檢查報告)。

- **PUBLISHED (已發布)**:
  - 來源：人工按下「Approve」或 AI 高信心自動通過。
  - 特徵：`isPublic: true`，API 可讀取，學生可練習。

- **REJECTED (已駁回)**:
  - 來源：審核未通過。
  - 特徵：保留在資料庫供 AI 學習「什麼是爛題目」，但不顯示。

## 3. 調度策略 (Dispatcher Strategy)
前端請求題目時 (`/api/dispatch`)，不只是隨機撈取，而是依據以下優先級：
1. **Cache Hit**: 優先回傳 Redis/Memory Cache 中的熱門題目。
2. **Factory Stock**: 從 `PUBLISHED` 狀態的庫存中撈取。
3. **Just-in-Time (JIT) Gen**: 若庫存不足 (Low Stock)，觸發背景生成任務 (Background Job)，但不讓使用者等待，先回傳現有庫存或備用題目。

## 4. 題庫分類 (Pool Types)
- **TEXT**: 純文字題目，無圖片依賴。
- **IMAGE_STATIC**: 題目包含靜態圖片（如幾何圖形、圖表），圖片存於 Storage，DB 存 URL。
- **IMAGE_CANVAS**: 動態幾何題，由程式碼 (Canvas/SVG) 即時繪製（進階）。

## 5. 來源追蹤 (Provenance)
- `origin`: 'UPLOAD' (人工上傳) | 'AI_GEN' (AI 生成)
- `source`: 上傳檔名 (用於 UPLOAD) | Seed ID (用於 AI_GEN)
