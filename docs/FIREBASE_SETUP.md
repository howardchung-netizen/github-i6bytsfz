# Firebase 設定與索引

> **用途**：整合 Firebase 索引與資產配置說明。  
> **更新日期**：2026年1月15日

---

## 1) 複合索引（past_papers）

**索引 1**：`grade_subject_topic_id_source`  
用途：主查詢過濾

**索引 2**：`grade_source_created_at`  
用途：按時間排序

**索引 3**（可選）：`subject_topic_id_grade`  
用途：跨年級查詢

---

## 2) 建議流程

1. Firebase Console → Firestore → 索引  
2. 依照查詢場景建立  
3. 等待索引建置完成
