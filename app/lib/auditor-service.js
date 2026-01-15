import { AUDITOR_MODEL_NAME } from './constants';

/**
 * 構建審計提示詞（針對 Pro 模型優化）
 * 
 * 重要：Pro 模型不是 Thinking 模型，需要明確的推理指令
 */
export function buildAuditorPrompt(question, logicSupplement) {
    const template = `
你是一位嚴格的題目審計員，負責檢查 AI 生成的題目是否符合質量標準。

## 題目信息

題目內容：
${JSON.stringify(question, null, 2)}

題目類型：${question.type || 'text'}
科目：${question.subject || 'math'}
年級：${question.grade || 'P4'}
單元：${question.topic || question.category || '未知'}

## 邏輯補充要求（Logic Supplement）

${logicSupplement || '（無邏輯補充要求）'}

## 審計任務

請嚴格檢查以下方面：

1. **邏輯補充遵守度**（最重要）
   - 題目是否嚴格遵守 logic_supplement 中的要求？
   - 是否有任何違反或忽略的情況？
   - 如果 logic_supplement 為空，則跳過此項。

2. **題目正確性**（必須驗證）
   - **CRITICAL: 在生成最終 JSON 判決之前，你必須嚴格模擬學生解題的過程**
   - 在內部思考過程中，逐步驗證答案是否真正正確：
     * 閱讀題目，理解題意
     * 識別題目類型和解題方法
     * 執行計算或推理步驟
     * 檢查是否有邏輯漏洞
     * 檢查是否有計算錯誤
     * 檢查題目描述是否有歧義
   - 驗證答案是否與題目要求一致
   - 檢查計算過程是否合理
   - 題目描述是否清晰無歧義

3. **格式和規範**
   - 是否符合科目和年級的格式要求？
   - 是否使用了正確的 LaTeX 格式（數學題）？
   - 選項是否唯一且合理（MCQ）？

4. **難度適配**
   - 難度是否適合目標年級？
   - 是否過於簡單或過於困難？

## 輸出格式

請以 JSON 格式返回審計結果：

{
  "status": "verified" | "flagged",
  "score": 0-100,
  "issues": ["問題1", "問題2", ...],
  "report": "詳細審計報告（中文）",
  "logic_supplement_compliance": {
    "compliant": true | false,
    "details": "遵守情況說明"
  },
  "correctness": {
    "is_correct": true | false,
    "details": "正確性說明（必須包含你的驗證過程）"
  },
  "format": {
    "is_valid": true | false,
    "details": "格式說明"
  },
  "difficulty": {
    "is_appropriate": true | false,
    "details": "難度說明"
  }
}

## 評分標準

- 90-100 分：優秀，完全符合要求
- 70-89 分：良好，有輕微問題但不影響使用
- 50-69 分：一般，有明顯問題需要改進
- 0-49 分：不合格，需要重新生成

## 嚴格要求

- 如果 logic_supplement 存在但題目未遵守，必須標記為 "flagged"
- 如果答案錯誤，必須標記為 "flagged"
- 如果格式嚴重不符合要求，必須標記為 "flagged"
- 請提供詳細的審計報告，說明每個問題的具體情況
- **必須在 correctness.details 中說明你的驗證過程（模擬學生解題的步驟）**
`;

    return template;
}

/**
 * 解析審計結果（處理 JSON 清理）
 */
export function parseAuditResult(text) {
    try {
        // 移除 markdown 代碼塊
        let cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // 提取 JSON 對象
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleanJson = jsonMatch[0];
        }
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("❌ Parse Audit Result Error:", error);
        console.error("原始響應前 500 字符:", text.substring(0, 500));
        
        // 返回默認結果
        return {
            status: 'flagged',
            score: 0,
            issues: ['審計結果解析失敗'],
            report: '無法解析審計結果',
            logic_supplement_compliance: {
                compliant: false,
                details: '解析錯誤'
            },
            correctness: {
                is_correct: false,
                details: '解析錯誤'
            },
            format: {
                is_valid: false,
                details: '解析錯誤'
            },
            difficulty: {
                is_appropriate: false,
                details: '解析錯誤'
            }
        };
    }
}

/**
 * 審計單個題目
 * 
 * @param {Object} question - 題目對象
 * @param {string|null} logicSupplement - 邏輯補充指令
 * @returns {Promise<Object>} 審計結果
 */
export async function auditQuestion(question, logicSupplement) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('API Key not configured');
    }

    // 構建提示詞
    const prompt = buildAuditorPrompt(question, logicSupplement || null);

    // 構建 API URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AUDITOR_MODEL_NAME}:generateContent?key=${apiKey}`;

    console.log(`🔍 開始審計題目：${question.id || 'unknown'}`);

    try {
        // 發送請求到 Google Gemini API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            }),
            signal: AbortSignal.timeout(55000) // 55秒超時（留5秒緩衝）
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("❌ 審計 API 錯誤：", data.error?.message);
            throw new Error(data.error?.message || 'Audit API error');
        }

        // 解析響應
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('No response from auditor model');
        }

        // 解析審計結果
        const auditResult = parseAuditResult(text);

        console.log(`✅ 審計完成：${auditResult.status} (${auditResult.score}分)`);

        return auditResult;

    } catch (error) {
        console.error("❌ 審計服務錯誤：", error);
        
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timeout. The auditor model may need more time to process.');
        }
        
        throw error;
    }
}
