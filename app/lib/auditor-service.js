import { AUDITOR_MODEL_NAME } from './constants';

/**
 * 構建審計提示詞（針對 Pro 模型優化）
 * 
 * 重要：Pro 模型不是 Thinking 模型，需要明確的推理指令
 */
export function buildAuditorPrompt(question, logicSupplement) {
    return `
你是一位嚴格的題目審計員，負責檢查 AI 生成的題目是否符合質量標準。

## 題目信息
${JSON.stringify(question, null, 2)}

題目類型：${question.type || 'text'}
科目：${question.subject || 'math'}
年級：${question.grade || 'P4'}
單元：${question.topic || question.category || '未知'}

## 邏輯補充要求（Logic Supplement）
${logicSupplement || '（無邏輯補充要求）'}

## 審計任務
1. **邏輯補充遵守度**（最重要）
2. **題目正確性**（必須驗證，需模擬解題）
3. **格式和規範**
4. **難度適配**

## 輸出格式（JSON）
{
  "status": "verified" | "flagged",
  "score": 0-100,
  "issues": ["問題1", "問題2", ...],
  "report": "詳細審計報告（中文）",
  "logic_supplement_compliance": { "compliant": true | false, "details": "..." },
  "correctness": { "is_correct": true | false, "details": "..." },
  "format": { "is_valid": true | false, "details": "..." },
  "difficulty": { "is_appropriate": true | false, "details": "..." }
}
`.trim();
}

export function buildUploadAuditorPrompt(question) {
    return `
你是一位嚴格的題目審計員，負責檢查「人工上傳種子題目」的品質與正確性。

## 題目信息
${JSON.stringify(question, null, 2)}

## 審計任務
1. **可解性 (Solvability)**：題目條件是否充足？是否有邏輯矛盾？
2. **答案正確性 (Answer Check)**：請你自行計算或推理，忽略 provided_answer，計算出 AI_answer。
3. **OCR/格式錯誤**：亂碼、缺字、單位錯誤、符號錯誤或排版問題？
4. **分類正確性**：年級/科目/單元/子單元是否合理？
5. **不當內容**：是否包含個資、不當資訊？

## 輸出格式（JSON）
{
  "status": "verified" | "flagged",
  "score": 0-100,
  "issues": ["問題1", "問題2", ...],
  "report": "詳細審計報告（中文）",
  "ai_answer": "AI 計算出的答案",
  "correctness": { "is_correct": true | false, "details": "..." },
  "format": { "is_valid": true | false, "details": "..." }
}
`.trim();
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
export async function auditQuestion(question, logicSupplement, options = {}) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('API Key not configured');
    }

    // 構建提示詞
    const origin = options.origin || question?.origin || null;
    const prompt = origin === 'SEED'
        ? buildUploadAuditorPrompt(question)
        : buildAuditorPrompt(question, logicSupplement || null);

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
