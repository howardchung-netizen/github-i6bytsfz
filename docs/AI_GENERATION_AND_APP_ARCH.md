# 系統架構與題目生成流程

> **用途**：統一整理 App 架構與題目生成流程，便於技術分析。  
> **更新日期**：2026年1月15日

---

## 1) 專案結構概要

```
app/
├── api/                 # API 路由層
├── components/          # UI 組件層
├── lib/                 # 核心服務層
├── page.tsx             # 主入口
└── layout.tsx           # 應用佈局
```

---

## 2) 題目生成入口（前端）

**主要入口**：`TopicSelectionView`（`CommonViews.tsx`）  
**流程**：使用者選主題 → `startPracticeSession()`  
**其他入口**：`DashboardView`、`DailyTaskView`

---

## 3) 生成流程（後端/服務層）

1. `startPracticeSession()` 決定科目/主題/題數  
2. `ai-service.js` 組裝 Prompt  
3. `/api/chat` 呼叫 Gemini API  
4. JSON 解析 → 題目寫入 `past_papers`  

---

## 4) Prompt 組成要素

**主結構**（在 `app/lib/ai-service.js`）：
- 角色與任務
- 種子題目與主題
- JSON 輸出格式
- LaTeX 格式要求
- 選項唯一性（Math 8 選項 / 其他 4 選項）
- 開發者回饋整合（如有）

**輸出欄位**（核心）：
- `question`, `type`, `options`, `answer`, `explanation`, `hint`
- 幾何題可含 `shape`, `params`, `mapData`

---

## 5) 題目儲存結構（past_papers）

```javascript
{
  grade: "P4",
  subject: "math",
  topic_id: "p4_division",
  question: "...",
  options: [...],
  answer: "...",
  explanation: "...",
  source: "ai_next_api",
  created_at: "ISO"
}
```

---

## 6) 相關路徑與檔案

- `app/lib/ai-service.js`：Prompt 與生成邏輯  
- `app/api/chat/route.ts`：Gemini API 呼叫  
- `app/page.tsx`：`startPracticeSession` 與流程控制  
- `docs/SEED_QUESTION_FORMAT_GUIDE.md`：種子題格式  
