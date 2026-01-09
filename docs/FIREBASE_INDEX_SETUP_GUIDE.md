# Firebase 複合索引創建指南

> **目的**：為 1 萬用戶規模優化查詢性能  
> **分類邏輯**：年級 > 科目 > 單元 > 子單元  
> **創建日期**：2026-01-08

---

## 📋 需要創建的索引

### 索引 1：`grade_subject_topic_id_source`（主要查詢索引）

**用途**：支持 `fetchUnusedQuestion` 的服務器端過濾查詢

**查詢場景**：
```javascript
query(
    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
    where("grade", "==", "P4"),
    where("subject", "==", "math"),
    where("topic_id", "==", "p4_division"),
    where("source", "==", "ai_next_api"),
    limit(50)
)
```

**索引配置**：
- **集合 ID**：`past_papers`
- **欄位 1**：`grade` (Ascending)
- **欄位 2**：`subject` (Ascending)
- **欄位 3**：`topic_id` (Ascending)
- **欄位 4**：`source` (Ascending)
- **查詢範圍**：Collection

---

### 索引 2：`grade_source_created_at`（時間排序索引）

**用途**：支持按創建時間排序查詢（獲取最新題目）

**查詢場景**：
```javascript
query(
    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
    where("grade", "==", "P4"),
    where("source", "==", "ai_next_api"),
    orderBy("created_at", "desc"),
    limit(50)
)
```

**索引配置**：
- **集合 ID**：`past_papers`
- **欄位 1**：`grade` (Ascending)
- **欄位 2**：`source` (Ascending)
- **欄位 3**：`created_at` (Descending)
- **查詢範圍**：Collection

---

### 索引 3：`subject_topic_id_grade`（科目優先索引，可選）

**用途**：支持跨年級查詢（例如：查詢所有年級的「除法」題目）

**查詢場景**：
```javascript
query(
    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
    where("subject", "==", "math"),
    where("topic_id", "==", "p4_division"),
    where("grade", "==", "P4"),
    limit(50)
)
```

**索引配置**：
- **集合 ID**：`past_papers`
- **欄位 1**：`subject` (Ascending)
- **欄位 2**：`topic_id` (Ascending)
- **欄位 3**：`grade` (Ascending)
- **查詢範圍**：Collection
- **優先級**：可選（如果不需要跨年級查詢，可以不創建）

---

## 🔧 創建步驟（Firebase Console）

### 方法 1：通過 Firebase Console 手動創建

1. **登入 Firebase Console**
   - 訪問：https://console.firebase.google.com/
   - 選擇您的專案

2. **導航到 Firestore**
   - 左側選單 → **Firestore Database**
   - 點擊 **索引** 標籤

3. **創建索引 1**：`grade_subject_topic_id_source`
   - 點擊 **創建索引**
   - **集合 ID**：`past_papers`
   - **欄位**：
     - `grade` → Ascending
     - `subject` → Ascending
     - `topic_id` → Ascending
     - `source` → Ascending
   - **查詢範圍**：Collection
   - 點擊 **創建**

4. **創建索引 2**：`grade_source_created_at`
   - 點擊 **創建索引**
   - **集合 ID**：`past_papers`
   - **欄位**：
     - `grade` → Ascending
     - `source` → Ascending
     - `created_at` → Descending
   - **查詢範圍**：Collection
   - 點擊 **創建**

5. **等待索引構建完成**
   - 索引構建可能需要幾分鐘到幾小時（取決於數據量）
   - 構建完成後，狀態會顯示為 **已啟用**

---

### 方法 2：通過 Firebase CLI（推薦，可版本控制）

1. **安裝 Firebase CLI**（如果尚未安裝）
   ```bash
   npm install -g firebase-tools
   ```

2. **初始化 Firebase**（如果尚未初始化）
   ```bash
   firebase init firestore
   ```

3. **創建 `firestore.indexes.json` 文件**

在專案根目錄創建或更新 `firestore.indexes.json`：

```json
{
  "indexes": [
    {
      "collectionGroup": "past_papers",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "grade",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "subject",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "topic_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "source",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "past_papers",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "grade",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "source",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "created_at",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "past_papers",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "subject",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "topic_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "grade",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

4. **部署索引**
   ```bash
   firebase deploy --only firestore:indexes
   ```

---

## ⚠️ 注意事項

### 1. 索引構建時間

- **小數據量**（< 1000 文檔）：幾分鐘
- **中等數據量**（1000-10,000 文檔）：10-30 分鐘
- **大數據量**（> 10,000 文檔）：1-3 小時

**建議**：提前創建索引，不要等到用戶增長後才創建。

### 2. 索引成本

- **創建索引**：免費
- **維護索引**：免費（Firestore 自動維護）
- **查詢使用索引**：按正常讀取計費

### 3. 索引限制

- **每個集合**：最多 200 個複合索引
- **每個索引**：最多 4 個欄位
- **查詢範圍**：Collection 或 Collection Group

### 4. 查詢順序必須匹配索引

**重要**：查詢的 `where` 條件順序必須與索引欄位順序一致（或前綴匹配）。

**正確示例**（匹配索引 1）：
```javascript
// ✅ 正確：順序匹配索引
where("grade", "==", "P4"),
where("subject", "==", "math"),
where("topic_id", "==", "p4_division"),
where("source", "==", "ai_next_api")
```

**錯誤示例**：
```javascript
// ❌ 錯誤：順序不匹配
where("subject", "==", "math"),  // 應該 grade 在前
where("grade", "==", "P4")
```

---

## 🧪 測試索引

### 測試查詢 1：基本查詢

```javascript
// 在 Firebase Console 的 Firestore 中測試
const testQuery = query(
    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
    where("grade", "==", "P4"),
    where("subject", "==", "math"),
    where("topic_id", "==", "p4_division"),
    where("source", "==", "ai_next_api"),
    limit(10)
);
```

**預期結果**：
- 如果索引已創建：查詢快速（< 500ms）
- 如果索引未創建：Firebase 會提示需要創建索引（並提供鏈接）

### 測試查詢 2：部分條件查詢

```javascript
// 只使用部分索引欄位（前綴匹配）
const testQuery2 = query(
    collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
    where("grade", "==", "P4"),
    where("subject", "==", "math"),
    limit(10)
);
```

**預期結果**：可以使用索引（前綴匹配）

---

## 📊 索引狀態檢查

### 在 Firebase Console 檢查

1. 導航到 **Firestore Database** → **索引** 標籤
2. 查看索引狀態：
   - **構建中**：索引正在構建
   - **已啟用**：索引可以使用
   - **錯誤**：索引創建失敗（檢查錯誤訊息）

### 通過 CLI 檢查

```bash
firebase firestore:indexes
```

---

## 🚨 常見問題

### 問題 1：查詢時提示需要索引

**錯誤訊息**：
```
The query requires an index. You can create it here: [鏈接]
```

**解決方案**：
1. 點擊錯誤訊息中的鏈接
2. Firebase Console 會自動填充索引配置
3. 點擊 **創建索引**

### 問題 2：索引構建失敗

**可能原因**：
- 欄位不存在於某些文檔中
- 數據類型不一致

**解決方案**：
1. 檢查 Firestore 數據，確保所有文檔都有對應欄位
2. 確保數據類型一致（例如：`grade` 都是字符串）
3. 重新創建索引

### 問題 3：查詢仍然很慢

**可能原因**：
- 索引未完全構建完成
- 查詢條件順序不匹配索引

**解決方案**：
1. 等待索引構建完成
2. 檢查查詢條件順序是否匹配索引
3. 檢查是否有足夠的數據（索引對小數據集可能不明顯）

---

## 📝 檢查清單

- [ ] 索引 1：`grade_subject_topic_id_source` 已創建
- [ ] 索引 2：`grade_source_created_at` 已創建
- [ ] 索引 3：`subject_topic_id_grade` 已創建（可選）
- [ ] 所有索引狀態為「已啟用」
- [ ] 測試查詢驗證索引正常工作
- [ ] 更新代碼使用服務器端過濾（已完成）

---

## 🎯 預期效果

**優化前**（客戶端過濾）：
- 查詢時間：500-1000ms
- 網絡傳輸：50-100 KB
- Firestore 讀取：50 次/查詢

**優化後**（服務器端過濾）：
- 查詢時間：200-400ms（提升 50-60%）
- 網絡傳輸：10-20 KB（減少 80%）
- Firestore 讀取：10-15 次/查詢（減少 70-80%）

---

**指南結束**
