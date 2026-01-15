# 常見問題與修復紀錄

> **用途**：集中顯示常見問題與修復方案。  
> **更新日期**：2026年1月15日

---

## 1) 題目顯示問題（LaTeX / 字型 / 溢出）

**問題**：
- LaTeX 顯示錯誤（如 `\350`、`\38`）
- 字型不一致
- 文字溢出容器

**修復重點**：
- 清理錯誤反斜線轉義（`\350` → `350`）
- 僅匹配合法 `$...$` LaTeX
- 加入 `break-words`、`overflow-wrap`、`max-w-full`
- LaTeX 與普通字型分別處理

**相關檔案**：
- `app/components/PracticeView.tsx`
- `app/components/CommonViews.tsx`
- `app/lib/ai-service.js`（Prompt 限制普通數字不包 `$`）
