# 背景審計員系統（AI-as-a-Judge）

> **用途**：統一審計系統的設計、實施、測試與操作說明。  
> **狀態**：已完成「手動觸發」版本；自動化待後續。  
> **更新日期**：2026年1月15日

---

## 1) 系統目標與流程

**目標**：用更強推理模型審查題目品質，特別是 `logic_supplement` 的遵守度。  
**流程**：
```
生成題目 (Creator)
→ 寫入 past_papers (audit_status: unchecked)
→ 手動觸發審計 (Auditor)
→ 更新 audit_status / audit_report / audit_score / audit_issues
```

---

## 2) 雙模型架構

- **Creator 模型**：`gemini-2.0-flash`  
- **Auditor 模型**：`gemini-2.5-pro`  

> Auditor 使用更強推理能力，審查正確性與邏輯補充遵守度。

---

## 3) 數據庫字段（past_papers）

```javascript
{
  audit_status: 'unchecked' | 'verified' | 'flagged',
  audit_report: string | null,
  auditor_model_used: string | null,
  audit_timestamp: string | null,
  audit_issues: string[] | null,
  audit_score: number | null,
  logic_supplement: string | null
}
```

> 可選：建立 `audit_logs` 集合保存審計歷史（非必須）。

---

## 4) Prompt 設計（核心要求）

審計模型須嚴格檢查：
1. **邏輯補充遵守度**（最重要）
2. **題目正確性**（模擬學生解題）
3. **格式/規範**
4. **難度適配**

**關鍵指令**（已加入 `auditor-service` prompt）：
```
Before generating the final JSON verdict, strictly simulate a student trying to solve the problem step-by-step in your internal thought process to verify if the answer key is truly correct. Check for logic gaps, calculation errors, and ambiguity.
```

---

## 5) 手動觸發 API

**路徑**：`/api/audit/single`  
**方式**：
- GET：`/api/audit/single?questionId=xxx`
- POST：`{ "questionId": "xxx" }`

**Vercel 防超時配置**（已設定）：
```ts
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
```

**限制**：每次只審計一題。

---

## 6) 測試清單（待做）

### 6.1 基礎功能
- 手動觸發端點回應正確
- JSON 結構完整（status/score/issues/report/各子欄位）

### 6.2 審計品質
- `logic_supplement` 遵守度檢查
- 正確性驗證（答案正確/錯誤）
- 格式檢查（LaTeX、選項唯一）
- 難度評估合理性

### 6.3 數據更新
- `audit_status`、`audit_report`、`audit_score`、`auditor_model_used`

### 6.4 錯誤處理
- 題目不存在（404）
- 超時處理（504）
- API Key 錯誤
- JSON 解析異常

---

## 7) 後續自動化（待做）

- 建立背景 worker（批次抓 `unchecked` 題目）
- Vercel Cron Jobs 或外部排程
- 審計統計與監控面板

---

## 8) 相關實作檔案

- `app/lib/auditor-service.js`
- `app/lib/db-service.js`
- `app/api/audit/single/route.ts`
- `scripts/verify-thinking-model.js`
