import { NextResponse } from 'next/server';
import { auditQuestion } from '../../../lib/auditor-service';
import { getAdminDb } from '../../../lib/firebase-admin';
import { APP_ID, AUDITOR_MODEL_NAME } from '../../../lib/constants';

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

        // 1. 獲取題目 (Try past_papers first, then seed_questions)
        const adminDb = getAdminDb();
        const pastRef = adminDb.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('past_papers').doc(questionId);
        let qSnap = await pastRef.get();
        let collectionType = 'past_papers';

        if (!qSnap.exists) {
            const seedRef = adminDb.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('seed_questions').doc(questionId);
            qSnap = await seedRef.get();
            collectionType = 'seed_questions';
        }

        if (!qSnap.exists) {
            return NextResponse.json({
                error: 'Question not found',
                message: `找不到 ID 為 ${questionId} 的題目`
            }, { status: 404 });
        }

        const question = { id: qSnap.id, ...(qSnap.data() || {}) } as any;

        // 2. 獲取邏輯補充
        const logicSupplement = question?.logic_supplement || null;

        if (logicSupplement) {
            console.log(`💡 找到邏輯補充：${logicSupplement.substring(0, 50)}...`);
        } else {
            console.log(`ℹ️ 無邏輯補充要求`);
        }

        // 3. 執行審計
        const auditResult = await auditQuestion(question, logicSupplement, { origin: question?.origin });

        // 4. 更新數據庫
        const mappedStatus = auditResult.status === 'FIXED' ? 'FIXED' : auditResult.status;
        const nextStatus = mappedStatus === 'FAIL' ? 'REJECTED' : 'AUDITED';

        const auditReport = {
            ...(auditResult || {}),
            report: auditResult.reason || '（無內容）'
        };

        const reportRef = await adminDb
            .collection('artifacts')
            .doc(APP_ID)
            .collection('public')
            .doc('data')
            .collection('audit_reports')
            .add({
                questionId,
                auditResult: auditReport,
                model: AUDITOR_MODEL_NAME,
                createdAt: new Date().toISOString()
            }).then(ref => ref.id);

        const updatePayload: any = {
            status: nextStatus,
            auditMeta: {
                status: mappedStatus,
                confidence: auditResult.confidence,
                reportRef,
                autoFixed: Boolean(auditResult.correctedAnswer),
            },
            audit_status: auditReport?.status || null,
            audit_report: JSON.stringify(auditReport || {}),
            auditor_model_used: AUDITOR_MODEL_NAME,
            audit_timestamp: new Date().toISOString(),
            audit_issues: auditReport?.error_report ? [auditReport.error_report] : [],
            updatedAt: new Date().toISOString()
        };

        if (auditResult.correctedAnswer) {
            updatePayload.answer = auditResult.correctedAnswer;
        }
        if (auditResult.suggestedTopic) {
            updatePayload.topic = auditResult.suggestedTopic;
        }
        if (auditResult.suggestedSubTopic) {
            updatePayload.subTopic = auditResult.suggestedSubTopic;
        }

        try {
            await adminDb.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection(collectionType).doc(questionId).update(updatePayload);
        } catch (dbError) {
            console.warn(`⚠️ 審計完成但更新數據庫失敗：${questionId}`, dbError);
        }

        // 5. 返回結果
        return NextResponse.json({
            success: true,
            questionId: questionId,
            auditResult: auditResult,
            message: `審計完成：${auditResult.status}`
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
