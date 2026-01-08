# 修復題目顯示問題

## 📋 問題描述

更新 Gemini 2.0 Flash 遷移後，題目生成出現以下問題：
1. **字型不同問題**：題目中出現字型不一致的情況
2. **顯示超出界外問題**：題目文本超出容器邊界
3. **LaTeX 格式錯誤**：出現 `\350`、`\38` 等錯誤格式

## 🔍 問題分析

### 1. LaTeX 格式問題
- **原因**：AI 誤解了 LaTeX 要求，將普通數字（如 350、38）也用 `$` 包裹
- **表現**：題目中出現 `\350`、`\38` 等錯誤格式
- **影響**：KaTeX 無法正確渲染，顯示為錯誤的轉義字符

### 2. 字型不一致問題
- **原因**：KaTeX 使用自己的字型（KaTeX_Main），與中文字型不一致
- **表現**：數學公式和中文文字字型不同
- **影響**：視覺不協調

### 3. 溢出問題
- **原因**：題目容器缺少正確的換行和溢出處理
- **表現**：長文本超出容器邊界
- **影響**：內容被截斷或顯示不完整

## ✅ 修復方案

### 1. 修復 LaTeX 渲染邏輯

**文件**：`app/components/PracticeView.tsx`、`app/components/CommonViews.tsx`

**修改內容**：
- 添加錯誤格式清理：將 `\350`、`\38` 等錯誤格式轉換為普通數字
- 改進 LaTeX 匹配邏輯：只匹配正確的 `$...$` 格式
- 添加字型樣式：為 LaTeX 和普通文本分別設置字型

**關鍵代碼**：
```javascript
// 清理錯誤的反斜杠轉義（單個反斜杠後跟數字，但不是有效的 LaTeX）
const cleanedBefore = textBefore.replace(/\\([0-9]+)/g, '$1');
```

### 2. 修復溢出問題

**文件**：`app/components/PracticeView.tsx`

**修改內容**：
- 添加 `break-words` 和 `overflow-wrap-anywhere` 類
- 添加內聯樣式：`wordBreak: 'break-word'`, `overflowWrap: 'break-word'`
- 為題目容器添加 `max-w-full` 限制

**關鍵代碼**：
```jsx
<h3 className={`... break-words overflow-wrap-anywhere ...`} 
    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
  <span className="inline-block max-w-full">
    {renderMathText(currentQuestion.question)}
  </span>
</h3>
```

### 3. 統一字型設置

**文件**：`app/components/PracticeView.tsx`

**修改內容**：
- 為整個容器設置統一的字型族
- 為 LaTeX 元素設置 KaTeX 字型
- 為普通文本設置繼承字型

**關鍵代碼**：
```jsx
<div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, ...' }}>
  {/* LaTeX */}
  <InlineMath style={{ fontFamily: 'KaTeX_Main, "Times New Roman", serif' }} />
  {/* 普通文本 */}
  <span style={{ fontFamily: 'inherit' }}>{text}</span>
</div>
```

### 4. 更新 Prompt 要求

**文件**：`app/lib/ai-service.js`

**修改內容**：
- 明確說明普通數字不應使用 `$` 包裹
- 提供正確和錯誤的示例
- 強調只有數學表達式、公式、符號才使用 LaTeX

**關鍵內容**：
```
- CRITICAL: Plain numbers (like 350, 38) should NOT be wrapped in $ signs. 
  Only use $ for actual mathematical expressions, formulas, or symbols.
- Example: "陳老師有 350 元" (correct) 
  NOT "陳老師有 $350$ 元" (wrong for plain numbers)
```

## 📝 修改的文件

1. **`app/components/PracticeView.tsx`**
   - 更新 `renderMathText` 函數
   - 修復題目容器樣式
   - 添加溢出處理
   - 統一字型設置

2. **`app/components/CommonViews.tsx`**
   - 更新 `renderMathText` 函數（與 PracticeView 保持一致）

3. **`app/lib/ai-service.js`**
   - 更新兩個 Prompt 的 LaTeX 要求
   - 添加普通數字處理說明

## 🎯 預期效果

### 修復後
- ✅ 普通數字正確顯示（350、38 等）
- ✅ 數學公式正確渲染（分數、指數等）
- ✅ 字型統一協調
- ✅ 文本不會超出容器邊界
- ✅ 長文本自動換行

### 測試建議
1. 生成包含普通數字的題目（如 "陳老師有 350 元"）
2. 生成包含數學公式的題目（如 "計算 $\\frac{3}{8}$"）
3. 測試長文本題目是否正確換行
4. 檢查字型是否一致

## ⚠️ 注意事項

1. **LaTeX 格式**：
   - 普通數字：`350`（正確）❌ `$350$`（錯誤）
   - 數學公式：`$\\frac{3}{8}$`（正確）✅

2. **字型設置**：
   - KaTeX 元素使用 KaTeX_Main 字型
   - 普通文本使用系統字型

3. **溢出處理**：
   - 使用 `break-words` 和 `overflow-wrap-anywhere`
   - 設置 `max-w-full` 限制寬度

---

**修復日期**：2024年12月  
**狀態**：✅ 已完成
