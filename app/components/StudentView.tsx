"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Clock, TrendingUp, AlertCircle, Home } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentView({ setView, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.id && !user?.uid) return;
      setLoading(true);
      try {
        const data = await DB_SERVICE.getStudentLearningStats(user.uid || user.id, 30);
        setStats(data);
      } catch (e) {
        console.error("Load student stats error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [user]);

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
          <h3 className="text-xl font-bold text-slate-800 mb-4">學習趨勢（近 30 天）</h3>
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
    </div>
  );
}
