# 技術實作路徑與風險評估報告（Auto-Generation & Auditing System）

> **用途**：評估「自動化生題與審核系統」的技術路徑、風險與緩解策略。  
> **更新日期**：2026年1月20日  
> **適用範圍**：混合型試卷（純文字 + 圖像題）上傳、生成、審核、人工確認。

---

## 0) 現況對照（與現有系統對齊）
- **生題者**：`/api/chat` + `ai-service.js`（Gemini 2.0 Flash）
- **審題者**：`/api/audit/single` + `auditor-service.js`（Gemini 2.5 Pro）
- **圖像題處理**：`/api/vision`（Vision API）
- **種子上傳**：TeacherView 統一上傳（圖片 / JSON）

> 本報告以下方案，均以「不破壞現有流程」為前提，逐步擴增。

---

## 1) 混合內容自動分類機制（Auto-Classification）

### 1.1 需求
用戶上傳 PDF/圖片，系統自動拆解並分類為：
- **Type A：Pure Text**（純文字題）
- **Type B：Image Reuse**（需沿用原圖：地圖/複雜圖表）
- **Type C：Image Redrawable**（可嘗試重繪的簡單幾何）

### 1.2 技術方案（實作路徑）
1. **PDF/圖片統一入口**
   - PDF 先轉成圖片（每頁一張）→ 交給 Vision 進行版面分析。
2. **Vision 版面分析（Layout Analysis）**
   - 偵測題號區塊、段落、圖像區塊、表格區塊。
   - 輸出「題目區塊」的 bounding boxes + 文字段落 + 圖像裁切。
3. **區塊級分類**
   - **Type A**：文字占比高、無圖像或圖像非常小。
   - **Type B**：大面積圖像/圖表/地圖且不可幾何化。
   - **Type C**：圖形簡單、具明顯幾何形狀（矩形/三角形/圓）。
4. **結果輸出**
   - 每題生成標準化資料：
     - `question_text`
     - `image_reference`（Base64 或 Storage URL）
     - `classification`: A/B/C
     - `layout_meta`（box 座標、頁碼、信心分數）

### 1.3 風險評估與對策
- **風險：題目與圖片排版緊密，切割錯誤率高**  
  - 對策：加入「信心閾值 + 人工分頁裁切」後備流程。  
  - 對策：若無法切割，整題以「Image Reuse」處理。
- **風險：多題同頁、題號辨識失敗**  
  - 對策：以「題號模式 + 間距」輔助切割，並允許人工修正。
- **風險：Type C 誤判（應重繪卻不適合）**  
  - 對策：保守策略優先回落至 Type B。

---

### 1.4 混合調度策略（Hybrid Dispatch Strategy）

**核心路徑**
- **路徑 A：純文字題（TEXT）**
  1. 先查 `Pool` 中 `TEXT` 且 `NOT IN UserHistory`
  2. 有貨 → 直接回傳
  3. 缺貨 → 立即觸發 Generator（Flash）即時生題  
     - 當下回傳（零延遲感）  
     - 非同步寫入 Pool（成為他人存貨）

- **路徑 B：圖形/圖片題（IMAGE_STATIC / IMAGE_CANVAS）**
  1. 先查 `Pool` 中 `IMAGE_*` 且 `NOT IN UserHistory`
  2. 有貨 → 直接回傳（優先給新題）
  3. 缺貨 → **禁止即時生題**  
     - 進入回收模式（Recycle）  
     - 從 Pool 隨機抽既有優質圖片題（允許重複）

### 1.5 資料結構（滿足去重與分類）

**A. User History**
- 目的：記錄 user 已做題目，支援去重（De-dup）
- 路徑：`artifacts/{APP_ID}/users/{userId}/question_usage/{questionId}`
- 關鍵欄位：`questionId`, `usedAt`, `isCorrect`, `timeSpentMs`

**B. Question Pool**
- 目的：分類題目類型以支援調度策略
- 建議欄位：`poolType`（或 `type`）
  - `TEXT` | `IMAGE_STATIC` | `IMAGE_CANVAS`
- 備註：為避免與既有題型 `type` 衝突，實作上可用 `poolType` 存放調度類型

---

## 2) 「生題者」的準確度優化（Cost Optimization）

### 2.1 需求
生題者錯誤過多會浪費審核成本與 Token。

### 2.2 技術方案（實作路徑）
1. **Few-Shot Prompting**
   - 內建「優良範例」與「常見錯誤示例」。
   - 每科/題型分別維護範例，避免泛化錯誤。
2. **推理輸出策略（避免外顯長鏈）**
   - 允許模型在內部推理，但輸出僅保留「Rationale Summary」。
   - 避免輸出完整 Chain-of-Thought，降低成本與風險。
3. **圖片引用機制**
   - 圖像題在 JSON 中強制寫入：
     - `original_image_reference`
     - `classification`（A/B/C）
   - 若為 Type B，生題時必須「沿用原圖」。
4. **結構化欄位強化**
   - 文字題與圖像題統一 schema；缺欄位由 normalize 補齊。

### 2.3 風險評估與對策
- **風險：大量錯題導致審核壓力升高**  
  - 對策：生題端加入「錯誤類型提示」與「格式守則」。
- **風險：圖像題與題幹不一致**  
  - 對策：要求 `original_image_reference` 必須存在並驗證有效。

---

## 3) 「審題者」的深度報告與修復（Auditor & Reporting）

### 3.1 需求
審題者需輸出可讀錯誤報告與可用修正方案。

### 3.2 `AuditResult` JSON Schema（建議）
```json
{
  "status": "PASS | FIXED | REJECT | NEEDS_REVIEW",
  "error_report": "string",
  "suggested_fix": {
    "before": { "question": "...", "answer": "...", "options": ["..."] },
    "after":  { "question": "...", "answer": "...", "options": ["..."] }
  },
  "confidence_score": 0.0
}
```

### 3.3 實作路徑
1. 擴充 `auditor-service` 產出符合 schema 的 JSON。
2. 若為 `FIXED` 或 `NEEDS_REVIEW`，必須保留 `before/after`。
3. 審計結果寫回資料庫並保留歷史紀錄（可選 `audit_logs`）。

### 3.4 風險評估與對策
- **風險：審計 JSON 解析失敗**  
  - 對策：Zod 驗證 + fallback（保留原題、標示需人工檢查）。
- **風險：審計修復造成新錯誤**  
  - 對策：低信心直接標為 `NEEDS_REVIEW`，不自動發布。

---

## 4) 人類決策介面流程（Human-in-the-Loop Workflow）

### 4.1 狀態流轉
```
GENERATED → AUDITED → PENDING_APPROVAL → PUBLISHED
```

### 4.2 觸發規則
- `PASS` → 直接 `PUBLISHED`
- `FIXED` → 進入 `PENDING_APPROVAL`
- `REJECT` → 不發布，標記原因
- `NEEDS_REVIEW` → 人工確認後才可發布

### 4.3 爭議處理（Instruction Input）
- UI 提供指令輸入欄（自然語言修正）
- 觸發二次審核（Auditor 再修一次）
- 保留原始題目與修改歷史

### 4.4 風險評估與對策
- **風險：人工審核負擔過高**  
  - 對策：設置信心閾值與批量核准功能。
- **風險：狀態與欄位不一致**  
  - 對策：資料庫層加上狀態校驗與遷移腳本。

---

## 5) 綜合風險評估（成本 / 延遲 / 幻覺）

### 5.1 API 成本預估（相對等級）
- **生題**：低（Flash）
- **審核**：高（Pro）
- **修復**：中-高（視錯誤率而定）

> 建議：先建立「錯誤率統計」與「審核通過率」儀表板，逐月調整成本策略。

### 5.2 延遲估計（100 題混合試卷）
- 圖像題分割合併 → 高延遲
- 審核需逐題處理 → 延遲高
- **風險**：大量題目需長時間等待
  - 對策：批次併行處理 + 分段提交 + 後台進度追蹤

### 5.3 幻覺風險（圖文不符）
- **最高風險區**：地圖題/複雜圖表題
- **防線**：
  1. Type B 一律沿用原圖
  2. 審題者必須驗證圖文一致
  3. 低信心必須人工確認

---

## 6) 建議分階段落地（降低風險）
1. **Phase 1（低風險）**：Type A / Type B 流程先落地
2. **Phase 2（中風險）**：導入 Type C（有限圖形集合）
3. **Phase 3（高風險）**：進階圖形重繪與自動修復優化

---

## 7) 關鍵結論（供決策）
- **可行，但需分階段**：先處理文字與可沿用圖像題，避免 Type C 過早上線。
- **成本控制關鍵**：生成錯誤率越低，審核成本越低。
- **Human-in-the-loop 必須保留**：圖文不符風險仍不可完全消除。

