# 專案文件自動更新守則 (Agent Auto-Update Rule for Documentation)

**適用專案:** `c:\ai totur\github-i6bytsfz`
**核心文件:** `docs/PROJECT_FUNCTIONS_ARCH_TODO.md`

## 行為準則 (Core Behavior)

身為開發代理 (AI Assistant)，你**必須**在每一次完成一項功能開發、Bug 修復、或任何架構改動（包含 API、UI、DB 結構）後，**主動且自動地**去更新 `docs/PROJECT_FUNCTIONS_ARCH_TODO.md` 這個主文檔。不需要等待使用者的提示。

## 更新規範 (Update Protocol)

每次更新時，必須遵循以下三個步驟：
1. **更新最新紀錄 (Update Changelog):** 
   - 尋找 `## 最新更新紀錄` 區段。
   - 依照日期補上最新的開發項目與異動摘要。
2. **更新待辦清單 (Update To-Do List):** 
   - 尋找 `## 2) 整合 To-Do List（待辦事項）` 區段。
   - 將剛完成的項目標註為 `（已完成）` 或更新其進度。
3. **更新系統規格與架構 (Update System Specs):** 
   - 若此次開發涉及新增 API、變更資料庫集合 (`Firestore`)、或變更了資料結構 (如新增 `visit_logs`)，必須同步到對應的 `1.X` 說明區段中。

確保這份文件永遠是這個專案的 **Single Source of Truth (SSOT)**。
