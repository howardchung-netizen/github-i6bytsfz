import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export interface AnalyticsViewProps {
  analyticsData: any;
  isLoadingAnalytics: boolean;
  onRefresh: () => void;
}

export default function AnalyticsView({ analyticsData, isLoadingAnalytics, onRefresh }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">開發者後台總覽</h3>
        <button
          onClick={onRefresh}
          disabled={isLoadingAnalytics}
          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
        >
          重新整理
        </button>
      </div>

      {isLoadingAnalytics && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
          載入中...
        </div>
      )}

      {!isLoadingAnalytics && !analyticsData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
          暫無數據，請稍後再試。
        </div>
      )}

      {!isLoadingAnalytics && analyticsData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">造訪數</div>
              <div className="text-2xl font-bold">{analyticsData.visits?.total || 0}</div>
              <div className="text-xs text-slate-500">Web {analyticsData.visits?.web || 0} / 平板 {analyticsData.visits?.tablet || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">下載率（暫以註冊代替）</div>
              <div className="text-2xl font-bold">
                {((analyticsData.signups?.download_rate || 0) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500">
                近 30 日註冊 {analyticsData.signups?.total || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">新帳號申請（近 30 日）</div>
              <div className="text-2xl font-bold">
                {analyticsData.users?.new_30d || 0}
              </div>
              <div className="text-xs text-slate-500">
                Web {analyticsData.signups?.web || 0} / 平板 {analyticsData.signups?.app || 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">每月訂閱人數（目前）</div>
              <div className="text-2xl font-bold">
                {analyticsData.users?.premium_total || 0}
              </div>
              <div className="text-xs text-slate-500">近 30 日新增 {analyticsData.users?.premium_new_30d || 0}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              帳號總數：{analyticsData.users?.total || 0}
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              生成量：{analyticsData.generation?.gen_count || 0}（失敗 {analyticsData.generation?.gen_fail_count || 0}）
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              平台比例：Web {analyticsData.visits?.web || 0} / 平板 {analyticsData.visits?.tablet || 0}
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              註冊率（Web / 平板）：{((analyticsData.signups?.web_rate || 0) * 100).toFixed(1)}% / {((analyticsData.signups?.app_rate || 0) * 100).toFixed(1)}%
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
              DAU / WAU / MAU：{analyticsData.active_users?.dau || 0} / {analyticsData.active_users?.wau || 0} / {analyticsData.active_users?.mau || 0}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">近 30 日造訪趨勢</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">近 30 日註冊趨勢</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analyticsData.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="web_signups" stroke="#10b981" strokeWidth={2} name="Web 註冊" />
                    <Line type="monotone" dataKey="app_signups" stroke="#f59e0b" strokeWidth={2} name="平板註冊" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">平台分佈</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Web', value: analyticsData.visits?.web || 0 },
                        { name: '平板', value: analyticsData.visits?.tablet || 0 }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      <Cell fill="#6366f1" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-3">角色分佈</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(analyticsData.users?.roles_total || analyticsData.roles || {}).map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {Object.keys(analyticsData.users?.roles_total || analyticsData.roles || {}).map((_, index) => (
                        <Cell key={`role-${index}`} fill={['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
