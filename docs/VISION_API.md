# Vision API（圖像題處理）

> **用途**：整合圖像題處理流程與成本概覽。  
> **更新日期**：2026年1月15日

---

## 1) 工作流程

```
圖像題 → Base64 → /api/vision → 結構化 JSON → past_papers
```

---

## 2) 成本概覽（摘要）

- 建議使用 Flash 模型以降低成本  
- 圖像大小與 tokens 成本成正比  
- 可透過壓縮/緩存降低成本  

---

## 3) 相關實作

- API：`app/api/vision/route.ts`
- 上傳整合：`TeacherView`（統一上傳介面）
