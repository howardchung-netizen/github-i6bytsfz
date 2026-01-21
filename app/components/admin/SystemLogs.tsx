import React from 'react';

export interface SystemLogsProps {
  logs?: any[];
  isLoading?: boolean;
}

export default function SystemLogs({ logs = [], isLoading = false }: SystemLogsProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
        載入中...
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
        暫無日誌資料。
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4">系統日誌</h3>
      <div className="space-y-2 text-xs text-slate-600">
        {logs.map((log, idx) => (
          <div key={idx} className="border border-slate-100 rounded p-2 bg-slate-50">
            {typeof log === 'string' ? log : JSON.stringify(log)}
          </div>
        ))}
      </div>
    </div>
  );
}
