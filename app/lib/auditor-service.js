import { AUDITOR_MODEL_NAME } from './constants';

/**
 * 構建審計提示詞（針對 Pro 模型優化）
 * 
 * 重要：Pro 模型不是 Thinking 模型，需要明確的推理指令
 */
export function buildAuditorPrompt(question, logicSupplement, options = {}) {
    const allowedTopics = Array.isArray(options.allowedTopics) && options.allowedTopics.length > 0
        ? `Allowed Topics: ${JSON.stringify(options.allowedTopics)}\n`
        : '';
    const allowedSubTopics = Array.isArray(options.allowedSubTopics) && options.allowedSubTopics.length > 0
        ? `Allowed SubTopics: ${JSON.stringify(options.allowedSubTopics)}\n`
        : '';
    return `
Role: Math Logic Validator.
Input: ${JSON.stringify(question, null, 2)}

Logic Supplement:
${logicSupplement || '（無邏輯補充要求）'}

${allowedTopics}${allowedSubTopics}
Task:
1. Analysis: Briefly solve the problem step-by-step (Max 100 chars).
2. Verification: Compare your result with provided_answer.
3. Classification: If needed, suggest Topic/SubTopic from allowed list ONLY. If none fits, return empty string.
4. Output: JSON only.

Unit handling:
- If the question/answer involves measurement units (e.g., cm, m, mm, kg, g, L, mL, cm², m²), compare values with unit normalization.
- Do NOT fail solely because the answer includes a unit or uses an equivalent unit.
- If provided_answer is correct but missing the proper unit or uses a different but equivalent unit, set status="FIXED" and return correctedAnswer with the expected unit.
- If options mix units, ensure only one option is actually correct after unit conversion.

Output JSON Structure:
{
  "analysis": "string",
  "status": "PASS" | "FAIL" | "FIXED",
  "confidence": 0.95,
  "correctedAnswer": "string",
  "suggestedTopic": "string",
  "suggestedSubTopic": "string",
  "error_report": "string (MANDATORY if FAIL, Traditional Chinese)",
  "report": "string (optional summary when PASS/FIXED)"
}
`.trim();
}

export function buildUploadAuditorPrompt(question, options = {}) {
    const allowedTopics = Array.isArray(options.allowedTopics) && options.allowedTopics.length > 0
        ? `Allowed Topics: ${JSON.stringify(options.allowedTopics)}\n`
        : '';
    const allowedSubTopics = Array.isArray(options.allowedSubTopics) && options.allowedSubTopics.length > 0
        ? `Allowed SubTopics: ${JSON.stringify(options.allowedSubTopics)}\n`
        : '';
    return `
Role: Math Logic Validator.
Input: ${JSON.stringify(question, null, 2)}

${allowedTopics}${allowedSubTopics}
Task:
1. Analysis: Briefly solve the problem step-by-step (Max 100 chars).
2. Verification: Compare your result with provided_answer.
3. Classification: If needed, suggest Topic/SubTopic from allowed list ONLY. If none fits, return empty string.
4. Output: JSON only.

Unit handling:
- If the question/answer involves measurement units (e.g., cm, m, mm, kg, g, L, mL, cm², m²), compare values with unit normalization.
- Do NOT fail solely because the answer includes a unit or uses a different but equivalent unit.
- If provided_answer is correct but missing the proper unit or uses a different but equivalent unit, set status="FIXED" and return correctedAnswer with the expected unit.
- If options mix units, ensure only one option is actually correct after unit conversion.

Output JSON Structure:
{
  "analysis": "string",
  "status": "PASS" | "FAIL" | "FIXED",
  "confidence": 0.95,
  "correctedAnswer": "string",
  "suggestedTopic": "string",
  "suggestedSubTopic": "string",
  "error_report": "string (MANDATORY if FAIL, Traditional Chinese)",
  "report": "string (optional summary when PASS/FIXED)"
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
        
        const result = JSON.parse(cleanJson);
        const baseReason = result?.error_report || result?.reason || result?.report || "";
        let finalReason = baseReason;
        if (result?.analysis) {
            finalReason = `【AI 驗算】${result.analysis}\n\n${finalReason}`;
        }

        return {
            ...result,
            error_report: result?.error_report || '',
            report: result?.report || '',
            reason: String(finalReason).trim() || "OK (無詳細報告)"
        };
    } catch (error) {
        console.error("❌ JSON Parse Failed:", error);
        console.log("Raw Text:", text);
        return {
            status: 'FAIL',
            confidence: 0,
            reason: `系統解析錯誤: 無法讀取 AI 回覆。\n原始回覆片段: ${text.substring(0, 100)}...`
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

    const origin = options.origin || question?.origin || null;
    const prompt = origin === 'SEED'
        ? buildUploadAuditorPrompt(question, options)
        : buildAuditorPrompt(question, logicSupplement || null, options);
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
            maxOutputTokens: 1000,
            responseMimeType: "application/json"
        });

        if (!text) {
            // fallback：移除 responseMimeType，增加輸出空間
            text = await callGemini({
                temperature: 0.0,
                maxOutputTokens: 1000,
                responseMimeType: "application/json"
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
                maxOutputTokens: 1000,
                responseMimeType: "application/json"
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
