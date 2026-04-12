import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface OperationsDashboardProps {
    isLoading?: boolean;
    onRefresh?: () => void;
}

export default function OperationsDashboard({ isLoading, onRefresh }: OperationsDashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/operations?days=30');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError(json.error || '無法載入營運數據');
            }
        } catch (e: any) {
            setError(e.message || '網路錯誤');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        fetchData();
        if (onRefresh) onRefresh();
    };

    const isBusy = isLoading || loading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">營運監控看板 (API、成本、失敗率)</h3>
                <button
                    onClick={handleRefresh}
                    disabled={isBusy}
                    className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
                >
                    重新整理
                </button>
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-600 font-bold">
                    {error}
                </div>
            )}

            {isBusy && !data && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
                    載入中...
                </div>
            )}

            {!isBusy && !data && !error && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
                    暫無營運數據。
                </div>
            )}

            {data && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className={`bg-white p-4 rounded-xl border ${data.failureRate > 10 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                            <div className="text-xs text-slate-500">整體失敗率</div>
                            <div className={`text-2xl font-bold ${data.failureRate > 10 ? 'text-red-600' : 'text-slate-800'}`}>
                                {data.failureRate.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-500">
                                失敗 {data.errorCount} / 總呼叫 {data.totalCalls}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-xs text-slate-500">估算成本 (30天)</div>
                            <div className="text-2xl font-bold text-amber-600">
                                ${data.estimatedCostUsd?.toFixed(4) || '0.0000'}
                            </div>
                            <div className="text-xs text-slate-500">單位: USD (Gemini 2.0 Flash)</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-xs text-slate-500">Token 消耗總量</div>
                            <div className="text-2xl font-bold text-indigo-600">
                                {(data.totalTokens / 1000).toFixed(1)}K
                            </div>
                            <div className="text-xs text-slate-500">
                                含 Prompt 與 Completion
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <div className="text-xs text-slate-500">配額超限警示 (Quota Exceeded)</div>
                            <div className={`text-2xl font-bold ${data.quotaExceededCount > 0 ? 'text-orange-500' : 'text-slate-800'}`}>
                                {data.quotaExceededCount} 次
                            </div>
                            <div className="text-xs text-slate-500">近 30 天內觸發 429</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-700 mb-3">API 呼叫與失敗趨勢</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.trendData || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} name="總呼叫" />
                                        <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="失敗" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-700 mb-3">Token 消耗趨勢</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={data.trendData || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="tokens" stroke="#10b981" strokeWidth={2} name="Tokens消耗" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-700 mb-3">最近系統錯誤紀錄（最多 20 筆）</h4>
                        {data.recentErrors && data.recentErrors.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-xs text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="py-2 px-3 font-semibold text-slate-600">時間</th>
                                            <th className="py-2 px-3 font-semibold text-slate-600">錯誤訊息</th>
                                            <th className="py-2 px-3 font-semibold text-slate-600">模型</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.recentErrors.map((err: any) => (
                                            <tr key={err.id} className="hover:bg-slate-50">
                                                <td className="py-2 px-3 whitespace-nowrap text-slate-500">
                                                    {new Date(err.timestamp).toLocaleString('zh-HK')}
                                                </td>
                                                <td className="py-2 px-3 text-red-600 font-medium">
                                                    {err.error || '未知錯誤'}
                                                    {err.isQuotaExceeded && <span className="ml-2 bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-[10px]">配額超限</span>}
                                                </td>
                                                <td className="py-2 px-3 text-slate-500">
                                                    {err.model || 'unknown'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg border border-slate-100">
                                太棒了！近期沒有嚴重錯誤。
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
