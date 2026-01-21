import { AUDITOR_MODEL_NAME } from './constants';

/**
 * 構建審計提示詞（針對 Pro 模型優化）
 * 
 * 重要：Pro 模型不是 Thinking 模型，需要明確的推理指令
 */
export function buildAuditorPrompt(question, logicSupplement) {
    return `
Role: Strict Math Validator (JSON Mode).
Target: Audit Math Questions.

Question JSON:
${JSON.stringify(question, null, 2)}

Logic Supplement:
${logicSupplement || '（無邏輯補充要求）'}

Task:
1. Verify logic & answer correctness.
2. Check for typos/OCR errors.
3. Classify 'topic'/'subTopic'.

Output Rules:
- JSON ONLY. NO Markdown. NO Explanations.
- Field "reason":
  - PASS -> "" (Empty string)
  - FAIL -> Max 15 chars (Traditional Chinese).

JSON Structure:
{
  "status": "PASS" | "FAIL" | "FIXED",
  "confidence": 0.95,
  "correctedAnswer": "...",
  "suggestedTopic": "...",
  "suggestedSubTopic": "...",
  "reason": "..."
}
`.trim();
}

export function buildUploadAuditorPrompt(question) {
    return `
Role: Strict Math Validator (JSON Mode).
Target: Audit Math Questions.

Question JSON:
${JSON.stringify(question, null, 2)}

Task:
1. Verify logic & answer correctness.
2. Check for typos/OCR errors.
3. Classify 'topic'/'subTopic'.

Output Rules:
- JSON ONLY. NO Markdown. NO Explanations.
- Field "reason":
  - PASS -> "" (Empty string)
  - FAIL -> Max 15 chars (Traditional Chinese).

JSON Structure:
{
  "status": "PASS" | "FAIL" | "FIXED",
  "confidence": 0.95,
  "correctedAnswer": "...",
  "suggestedTopic": "...",
  "suggestedSubTopic": "...",
  "reason": "..."
}
`.trim();
}

/**
 * 解析審計結果（處理 JSON 清理）
 */
const buildFallbackAudit = (reason = '解析錯誤') => ({
    status: 'FAIL',
    confidence: 0,
    correctedAnswer: '',
    suggestedTopic: '',
    suggestedSubTopic: '',
    reason
});

const isWeakAuditResult = (result) => {
    if (!result) return true;
    const status = String(result.status || '').toUpperCase();
    const reason = String(result.reason || '').trim();
    const hasFix = Boolean(result.correctedAnswer || result.suggestedTopic || result.suggestedSubTopic);
    if (status === 'FAIL' && !reason && !hasFix) return true;
    if (reason === '解析錯誤' || reason === '無回覆') return true;
    return false;
};

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
        return buildFallbackAudit('解析錯誤');
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

    const origin = options.origin || question?.origin || null;
    const prompt = origin === 'SEED'
        ? buildUploadAuditorPrompt(question)
        : buildAuditorPrompt(question, logicSupplement || null);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${AUDITOR_MODEL_NAME}:generateContent?key=${apiKey}`;

    const callGemini = async (generationConfig) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig
            }),
            signal: AbortSignal.timeout(55000)
        });
        const data = await response.json();
        if (!response.ok) {
            console.error("❌ 審計 API 錯誤：", data.error?.message);
            throw new Error(data.error?.message || 'Audit API error');
        }
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.find((p) => typeof p?.text === 'string')?.text || '';
        return text;
    };

    console.log(`🔍 開始審計題目：${question.id || 'unknown'}`);

    try {
        // 優先使用 JSON mode（速度快、格式穩定）
        let text = await callGemini({
            temperature: 0.0,
            maxOutputTokens: 200,
            responseMimeType: "application/json"
        });

        if (!text) {
            // fallback：移除 responseMimeType，增加輸出空間
            text = await callGemini({
                temperature: 0.0,
                maxOutputTokens: 400
            });
        }

        if (!text) {
            return buildFallbackAudit('無回覆');
        }

        let auditResult = parseAuditResult(text);
        if (isWeakAuditResult(auditResult)) {
            // JSON 解析失敗，嘗試 fallback 版本
            const retryText = await callGemini({
                temperature: 0.0,
                maxOutputTokens: 400
            });
            if (retryText) {
                auditResult = parseAuditResult(retryText);
            }
        }

        console.log(`✅ 審計完成：${auditResult.status}`);
        return auditResult;
    } catch (error) {
        console.error("❌ 審計服務錯誤：", error);

        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('Request timeout. The auditor model may need more time to process.');
        }
        throw error;
    }
}
