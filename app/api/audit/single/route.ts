import { NextResponse } from 'next/server';
import { DB_SERVICE } from '../../../lib/db-service';
import { AUDITOR_MODEL_NAME } from '../../../lib/constants';
import { auditQuestion } from '../../../lib/auditor-service';

/**
 * Vercel Serverless Function 配置
 * 
 * maxDuration: 60 秒（Pro 模型需要更長時間處理）
 * dynamic: 'force-dynamic' 確保每次請求都重新執行
 */
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST /api/audit/single
 * 
 * 手動觸發單個題目的審計
 * 
 * 請求體：
 * {
 *   "questionId": "題目ID"
 * }
 * 
 * 響應：
 * {
 *   "success": true,
 *   "questionId": "題目ID",
 *   "auditResult": { ... },
 *   "message": "審計完成"
 * }
 */
export async function POST(request: Request) {
    try {
        const { questionId } = await request.json();

        // 驗證輸入
        if (!questionId) {
            return NextResponse.json({ 
                error: 'questionId is required',
                message: '請提供題目 ID'
            }, { status: 400 });
        }

        console.log(`🔍 開始審計題目：${questionId}`);

        // 1. 獲取題目
        const question = await DB_SERVICE.fetchQuestionById(questionId);

        if (!question) {
            return NextResponse.json({ 
                error: 'Question not found',
                message: `找不到 ID 為 ${questionId} 的題目`
            }, { status: 404 });
        }

        console.log(`📋 題目信息：${question.question?.substring(0, 50)}...`);

        // 2. 獲取邏輯補充
        const logicSupplement = await DB_SERVICE.getLogicSupplementForQuestion(question);

        if (logicSupplement) {
            console.log(`💡 找到邏輯補充：${logicSupplement.substring(0, 50)}...`);
        } else {
            console.log(`ℹ️ 無邏輯補充要求`);
        }

        // 3. 執行審計
        const auditResult = await auditQuestion(question, logicSupplement);

        // 4. 更新數據庫
        const updated = await DB_SERVICE.updateQuestionAuditStatus(
            questionId,
            auditResult,
            AUDITOR_MODEL_NAME
        );

        if (!updated) {
            console.warn(`⚠️ 審計完成但更新數據庫失敗：${questionId}`);
            // 即使更新失敗，也返回審計結果
        }

        // 5. 返回結果
        return NextResponse.json({ 
            success: true,
            questionId: questionId,
            auditResult: auditResult,
            message: `審計完成：${auditResult.status} (${auditResult.score}分)`
        });

    } catch (error: any) {
        console.error("❌ 審計端點錯誤：", error);

        // 處理超時錯誤
        if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.message.includes('timeout')) {
            return NextResponse.json({ 
                error: 'Request timeout',
                message: '審計請求超時。Pro 模型需要更長時間處理，請稍後重試。'
            }, { status: 504 });
        }

        // 處理 API Key 錯誤
        if (error.message.includes('API Key')) {
            return NextResponse.json({ 
                error: 'API Key error',
                message: 'API Key 配置錯誤，請檢查環境變數設置'
            }, { status: 500 });
        }

        // 其他錯誤
        return NextResponse.json({ 
            error: error.message || 'Internal server error',
            message: `審計失敗：${error.message}`
        }, { status: 500 });
    }
}

/**
 * GET /api/audit/single?questionId=xxx
 * 
 * 也可以通過 GET 請求觸發（用於測試）
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const questionId = searchParams.get('questionId');

        if (!questionId) {
            return NextResponse.json({ 
                error: 'questionId is required',
                message: '請在 URL 參數中提供 questionId，例如：/api/audit/single?questionId=xxx'
            }, { status: 400 });
        }

        // 轉發到 POST 處理邏輯
        const mockRequest = {
            json: async () => ({ questionId })
        } as any;

        return POST(mockRequest);
    } catch (error: any) {
        return NextResponse.json({ 
            error: error.message || 'Internal server error',
            message: `審計失敗：${error.message}`
        }, { status: 500 });
    }
}
