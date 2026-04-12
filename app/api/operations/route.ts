import { NextResponse } from 'next/server';
import { getAdminDb } from '../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30', 10);

        // 計算查詢的起始日期
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 獲取 API 日誌
        const logsSnapshot = await db.collection('api_logs')
            .where('timestamp', '>=', startDate)
            .orderBy('timestamp', 'desc')
            .get();

        let totalCalls = 0;
        let successCount = 0;
        let errorCount = 0;
        let quotaExceededCount = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        // 按日期分組的數據 (用於圖表)
        const dailyStats: Record<string, { calls: number, success: number, errors: number, tokens: number }> = {};

        // 最近的錯誤日誌
        const recentErrors: any[] = [];

        logsSnapshot.forEach(doc => {
            const data = doc.data();
            const dateKey = data.timestamp.toDate().toISOString().split('T')[0];

            if (!dailyStats[dateKey]) {
                dailyStats[dateKey] = { calls: 0, success: 0, errors: 0, tokens: 0 };
            }

            totalCalls++;
            dailyStats[dateKey].calls++;

            if (data.status === 'success') {
                successCount++;
                dailyStats[dateKey].success++;

                const pt = data.promptTokens || 0;
                const ct = data.completionTokens || 0;

                totalPromptTokens += pt;
                totalCompletionTokens += ct;
                dailyStats[dateKey].tokens += (pt + ct);
            } else {
                errorCount++;
                dailyStats[dateKey].errors++;

                if (data.isQuotaExceeded) {
                    quotaExceededCount++;
                }

                if (recentErrors.length < 20) {
                    recentErrors.push({
                        id: doc.id,
                        timestamp: data.timestamp.toDate().toISOString(),
                        error: data.error,
                        model: data.model,
                        isQuotaExceeded: data.isQuotaExceeded || false
                    });
                }
            }
        });

        // 粗略估算成本 (Gemini Flash 約為 $0.075/1M Prompt, $0.30/1M Completion)
        const estimatedCostUsd = (totalPromptTokens / 1000000) * 0.075 + (totalCompletionTokens / 1000000) * 0.30;

        // 將 dailyStats 轉換為陣列並排序
        const trendData = Object.entries(dailyStats)
            .map(([date, stats]) => ({
                date,
                ...stats,
                failureRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            success: true,
            data: {
                totalCalls,
                successCount,
                errorCount,
                quotaExceededCount,
                failureRate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
                totalTokens: totalPromptTokens + totalCompletionTokens,
                estimatedCostUsd: Number(estimatedCostUsd.toFixed(4)),
                trendData,
                recentErrors
            }
        });

    } catch (error: any) {
        console.error('operations API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
