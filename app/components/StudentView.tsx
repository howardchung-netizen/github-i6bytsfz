"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Clock, TrendingUp, AlertCircle, Home } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function StudentView({ setView, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendRangeDays, setTrendRangeDays] = useState(30);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.id && !user?.uid) return;
      setLoading(true);
      try {
        const data = await DB_SERVICE.getStudentLearningStats(user.uid || user.id, trendRangeDays);
        setStats(data);
      } catch (e) {
        console.error("Load student stats error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user, trendRangeDays]);

  const accuracyRate = useMemo(() => {
    if (!stats || stats.totalQuestions === 0) return 0;
    return Math.round((stats.correctAnswers / stats.totalQuestions) * 100);
  }, [stats]);

  const chartData = useMemo(() => {
    if (!stats?.dailyActivity) return [];
    return Object.entries(stats.dailyActivity)
      .map(([date, data]) => ({
        date,
        questions: data.questions || 0,
        correct: data.correct || 0,
        wrong: data.wrong || 0,
        timeMinutes: Math.round((data.timeSpent || 0) / 60000)
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [stats]);

  const subjectDistribution = useMemo(() => {
    if (!stats?.subjects) return [];
    return [
      { name: '數學', value: stats.subjects.math || 0 },
      { name: '中文', value: stats.subjects.chi || 0 },
      { name: '英文', value: stats.subjects.eng || 0 }
    ];
  }, [stats]);

  const mistakeDistribution = useMemo(() => {
    if (!stats?.mistakes) return [];
    const map = {};
    stats.mistakes.forEach((m) => {
      const key = m.category || m.topic || '未分類';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [stats]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-slate-600 font-bold">載入中...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-slate-500">
        暫無學習數據
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black flex items-center gap-2 text-slate-800">
          <BarChart3 className="text-indigo-600" size={32} /> 學生學習數據
        </h2>
        <button
          onClick={() => setView('dashboard')}
          className="text-slate-500 hover:text-slate-800 font-bold transition flex items-center gap-2"
        >
          <Home size={18} /> 返回
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <BookOpen size={24} />
            <span className="text-3xl font-black">{stats.totalQuestions}</span>
          </div>
          <p className="text-sm text-indigo-100">總題數（30天）</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} />
            <span className="text-3xl font-black">{accuracyRate}%</span>
          </div>
          <p className="text-sm text-green-100">正確率</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock size={24} />
            <span className="text-3xl font-black">
              {Math.round(stats.totalTimeSpent / 1000 / 60)}
            </span>
          </div>
          <p className="text-sm text-blue-100">學習時間（分鐘）</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={24} />
            <span className="text-3xl font-black">{stats.mistakes.length}</span>
          </div>
          <p className="text-sm text-purple-100">錯題數</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">學習趨勢（近 {trendRangeDays} 天）</h3>
            <select
              value={trendRangeDays}
              onChange={(e) => setTrendRangeDays(Number(e.target.value))}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              <option value={7}>近 7 天</option>
              <option value={14}>近 14 天</option>
              <option value={30}>近 30 天</option>
            </select>
          </div>
          {chartData.length === 0 ? (
            <p className="text-slate-500">暫無學習資料</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="questions" stroke="#6366f1" strokeWidth={2} name="題數" />
                <Line type="monotone" dataKey="correct" stroke="#10b981" strokeWidth={2} name="答對" />
                <Line type="monotone" dataKey="wrong" stroke="#ef4444" strokeWidth={2} name="答錯" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">每日學習時長（分鐘）</h3>
          {chartData.length === 0 ? (
            <p className="text-slate-500">暫無學習資料</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="timeMinutes" stroke="#6366f1" strokeWidth={2} name="分鐘" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">科目分佈</h3>
        {subjectDistribution.length === 0 ? (
          <p className="text-slate-500">暫無科目資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={subjectDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                {subjectDistribution.map((_, index) => (
                  <Cell key={`subject-${index}`} fill={['#6366f1', '#fb7185', '#f59e0b'][index % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">錯題清單（最近）</h3>
        {stats.mistakes.length === 0 ? (
          <p className="text-slate-500">暫無錯題資料</p>
        ) : (
          <div className="space-y-3">
            {stats.mistakes.slice(0, 8).map((m, idx) => (
              <div key={m.id || idx} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="bg-slate-100 px-2 py-0.5 rounded">{m.category || m.topic || '未分類'}</span>
                  {m.subject && <span>{m.subject}</span>}
                </div>
                <div className="text-sm text-slate-800 font-semibold">
                  {m.question || '（題目內容未儲存）'}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  正確答案：{m.answer || '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-4">錯題分類分佈</h3>
        {mistakeDistribution.length === 0 ? (
          <p className="text-slate-500">暫無錯題資料</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={mistakeDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                {mistakeDistribution.map((_, index) => (
                  <Cell key={`mistake-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
