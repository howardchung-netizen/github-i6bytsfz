# 方案 B：Base64 圖像 + Vision API 實現指南

## 📋 目錄
1. [方案概述](#方案概述)
2. [Google Gemini Vision API 成本計算](#成本計算)
3. [實現步驟](#實現步驟)
4. [代碼實現](#代碼實現)
5. [使用示例](#使用示例)
6. [優缺點分析](#優缺點分析)

---

## 🎯 方案概述

### 工作流程
```
PDF 試卷 
  ↓
提取圖像 → Base64 編碼 → 存入 JSON
  ↓
上傳到系統 → 調用 Vision API → AI 理解圖像
  ↓
自動提取圖形信息 → 生成結構化數據 → 保存到數據庫
```

### 核心優勢
- ✅ **自動化處理**：無需手動提取圖形參數
- ✅ **批量處理**：可一次性處理大量帶圖像的題目
- ✅ **智能識別**：AI 自動識別圖形類型和參數

---

## 💰 Google Gemini Vision API 成本計算

### 定價結構（2024年最新）

#### Gemini 1.5 Flash（推薦用於 Vision）
- **免費額度**：每月 15 RPM（每分鐘請求數）
- **付費定價**：
  - **輸入**：$0.075 / 1M tokens（約 $0.000075 / 1K tokens）
  - **輸出**：$0.30 / 1M tokens（約 $0.0003 / 1K tokens）
  - **圖像處理**：每張圖像計入輸入 tokens

#### Gemini 1.5 Pro（更高精度）
- **免費額度**：每月 2 RPM
- **付費定價**：
  - **輸入**：$1.25 / 1M tokens（約 $0.00125 / 1K tokens）
  - **輸出**：$5.00 / 1M tokens（約 $0.005 / 1K tokens）

### Token 計算方式

#### Base64 圖像 Token 計算
- **圖像大小**：Base64 編碼後的字符數
- **Token 估算**：約 1 token = 4 字符（Base64）
- **實際計算**：Google 使用更複雜的算法，但大致為：
  ```
  圖像 tokens ≈ (圖像寬度 × 圖像高度) / 512
  ```

#### 示例計算

**場景 1：處理 1000 道帶圖像的題目**

假設每道題目：
- 圖像大小：800×600 像素
- Base64 編碼後：約 200KB
- 圖像 tokens：約 800×600/512 ≈ 938 tokens
- 文字 prompt：約 500 tokens
- 總輸入 tokens：約 1,438 tokens/題目
- 輸出 tokens：約 200 tokens（結構化 JSON）

**使用 Gemini 1.5 Flash：**
```
輸入成本 = 1,438 tokens × 1,000 題目 × $0.000075 / 1K tokens
         = 1,438,000 tokens × $0.000075 / 1K
         = 1,438 × $0.000075
         = $0.108

輸出成本 = 200 tokens × 1,000 題目 × $0.0003 / 1K tokens
         = 200,000 tokens × $0.0003 / 1K
         = 200 × $0.0003
         = $0.06

總成本 = $0.108 + $0.06 = $0.168（約 HK$1.31）
```

**場景 2：每月處理 10,000 道題目**
```
總成本 ≈ $1.68（約 HK$13.10）
```

**場景 3：每月處理 100,000 道題目**
```
總成本 ≈ $16.80（約 HK$131）
```

### 成本優化建議

1. **批量處理**：一次處理多張圖像，減少 API 調用次數
2. **圖像壓縮**：上傳前壓縮圖像，減少 tokens
3. **緩存結果**：相同圖像只處理一次
4. **使用 Flash 模型**：Flash 比 Pro 便宜約 16 倍

---

## 🛠️ 實現步驟

### 步驟 1：修改上傳組件支持圖像

在 `DeveloperView.tsx` 中添加圖像上傳功能。

### 步驟 2：創建 Vision API 路由

創建新的 API 路由 `/api/vision` 處理圖像識別。

### 步驟 3：修改種子題目處理邏輯

在 `rag-service.js` 中添加圖像處理邏輯。

### 步驟 4：更新數據庫結構

支持存儲 Base64 圖像和識別結果。

---

## 💻 代碼實現

### 1. 創建 Vision API 路由

**文件：`app/api/vision/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageBase64, prompt } = await request.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured' 
      }, { status: 500 });
    }

    // 使用 Gemini 1.5 Flash（支持 Vision）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt || `請分析這張數學題目的圖像，提取以下信息：
1. 圖形類型（rectangle, square, triangle, circle, trapezoid, parallelogram, irregular, composite, map_grid）
2. 圖形參數（如長度、寬度、半徑等）
3. 題目文字內容
4. 答案

請以 JSON 格式返回：
{
  "shape": "圖形類型",
  "params": {參數對象},
  "question": "題目文字",
  "answer": "答案",
  "explanation": "解釋"
}`
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Vision API Error:", data);
      return NextResponse.json({ 
        error: `Google Vision API Error: ${data.error?.message || 'Unknown error'}`,
        details: data 
      }, { status: response.status });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // 嘗試解析 JSON
    try {
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json({ result: parsed, raw: text });
    } catch (e) {
      return NextResponse.json({ result: null, raw: text });
    }

  } catch (error) {
    console.error("Vision API Server Error:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error.message 
    }, { status: 500 });
  }
}
```

### 2. 修改上傳組件支持圖像

**文件：`app/components/DeveloperView.tsx`**（部分修改）

```typescript
// 添加狀態
const [imageFiles, setImageFiles] = useState<File[]>([]);
const [isProcessingImages, setIsProcessingImages] = useState(false);

// 圖像轉 Base64
const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// 處理圖像識別
const handleProcessImages = async () => {
  if (imageFiles.length === 0) {
    alert("請先選擇圖像文件");
    return;
  }

  setIsProcessingImages(true);
  const results = [];

  try {
    for (const file of imageFiles) {
      const base64 = await convertImageToBase64(file);
      
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64,
          prompt: "請分析這張數學題目的圖像，提取圖形類型和參數，返回 JSON 格式"
        })
      });

      const data = await response.json();
      if (data.result) {
        results.push(data.result);
      }
    }

    // 將結果轉換為 JSON 格式
    const jsonResult = JSON.stringify(results, null, 2);
    setPaperJson(jsonResult);
    alert(`成功處理 ${results.length} 張圖像！`);
  } catch (e) {
    alert("處理失敗：" + e.message);
  } finally {
    setIsProcessingImages(false);
  }
};

// 在 JSX 中添加圖像上傳 UI
<div className="mb-4">
  <label className="block text-xs font-bold text-slate-700 mb-2">
    上傳題目圖像（支持批量）
  </label>
  <input
    type="file"
    accept="image/*"
    multiple
    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
    className="w-full text-sm"
  />
  <button
    onClick={handleProcessImages}
    disabled={isProcessingImages || imageFiles.length === 0}
    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg disabled:opacity-50"
  >
    {isProcessingImages ? '處理中...' : `處理 ${imageFiles.length} 張圖像`}
  </button>
</div>
```

### 3. 修改數據庫服務支持圖像

**文件：`app/lib/db-service.js`**（添加函數）

```javascript
// 處理帶圖像的種子題目
processImageQuestion: async (questionData) => {
  try {
    // 如果包含圖像，先調用 Vision API
    if (questionData.image) {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: questionData.image,
          prompt: "提取圖形信息和題目內容"
        })
      });
      
      const visionResult = await response.json();
      if (visionResult.result) {
        // 合併 Vision API 結果
        return {
          ...questionData,
          ...visionResult.result,
          imageProcessed: true,
          processedAt: new Date().toISOString()
        };
      }
    }
    return questionData;
  } catch (e) {
    console.error("Process image question error:", e);
    return questionData;
  }
}
```

---

## 📝 使用示例

### 示例 1：單張圖像處理

```javascript
// 1. 用戶選擇圖像文件
const file = document.querySelector('input[type="file"]').files[0];

// 2. 轉換為 Base64
const reader = new FileReader();
reader.onload = async () => {
  const base64 = reader.result;
  
  // 3. 調用 Vision API
  const response = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      imageBase64: base64,
      prompt: "分析這張數學題目的圖像"
    })
  });
  
  const result = await response.json();
  console.log(result.result);
  // 輸出：
  // {
  //   "shape": "rectangle",
  //   "params": { "w": 5, "h": 3 },
  //   "question": "計算這個長方形的面積",
  //   "answer": "15"
  // }
};
reader.readAsDataURL(file);
```

### 示例 2：批量處理 JSON

```json
[
  {
    "question": "計算這個圖形的面積",
    "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
    "answer": "15",
    "topic": "面積"
  }
]
```

系統會自動：
1. 識別圖像中的圖形類型
2. 提取圖形參數
3. 生成完整的結構化數據

---

## ⚖️ 優缺點分析

### ✅ 優點

1. **自動化程度高**
   - 無需手動提取圖形參數
   - 批量處理效率高

2. **準確性較好**
   - AI 識別圖形類型準確
   - 自動提取參數減少錯誤

3. **處理複雜圖像**
   - 可處理不規則圖形
   - 可識別地圖、圖表等

4. **擴展性好**
   - 未來可支持更多圖像類型
   - 可集成 OCR 識別文字

### ❌ 缺點

1. **成本較高**
   - 每張圖像需要 API 調用
   - 大量處理時成本累積

2. **處理時間長**
   - API 調用需要時間
   - 批量處理可能較慢

3. **依賴網絡**
   - 需要穩定的網絡連接
   - API 服務中斷會影響功能

4. **JSON 文件大**
   - Base64 編碼增加文件大小
   - 存儲成本增加

5. **識別準確性**
   - 複雜圖像可能識別錯誤
   - 需要人工校對

---

## 💡 混合方案建議

### 推薦：方案 A + 方案 B 混合

1. **簡單圖形**：使用方案 A（手動添加參數）
   - 成本低
   - 速度快
   - 準確性高

2. **複雜圖像**：使用方案 B（Vision API）
   - 自動識別
   - 處理不規則圖形
   - 批量處理

### 實現策略

```javascript
// 判斷是否需要 Vision API
const needsVisionAPI = (question) => {
  // 如果已經有 shape 和 params，不需要 Vision API
  if (question.shape && question.params) {
    return false;
  }
  
  // 如果有圖像但沒有結構化數據，需要 Vision API
  if (question.image && !question.shape) {
    return true;
  }
  
  return false;
};
```

---

## 📊 成本對比表

| 方案 | 1000題 | 10000題 | 100000題 | 處理時間 |
|------|--------|---------|----------|----------|
| **方案 A（手動）** | $0 | $0 | $0 | 慢（人工） |
| **方案 B（Vision）** | ~$0.17 | ~$1.68 | ~$16.80 | 快（自動） |
| **混合方案** | ~$0.05 | ~$0.50 | ~$5.00 | 中等 |

---

## 🚀 實施建議

1. **初期**：使用方案 A 處理簡單題目
2. **中期**：引入方案 B 處理複雜圖像
3. **優化**：實現混合方案，自動判斷使用哪種方法

需要我幫您實現這個功能嗎？
