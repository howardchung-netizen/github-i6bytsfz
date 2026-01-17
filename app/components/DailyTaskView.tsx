"use client";
import React from 'react';
import { ArrowLeft, Target, CheckCircle, Clock, BookOpen, Sparkles } from 'lucide-react';

export default function DailyTaskView({ subject, dailyTasks, setView, startPracticeSession, user, setLoading }) {
  const subjectNames = {
    math: { name: '數學', color: 'indigo', icon: '🔢' },
    chi: { name: '中文', color: 'rose', icon: '📖' },
    eng: { name: '英文', color: 'amber', icon: '📚' }
  };

  const subjectInfo = subjectNames[subject] || subjectNames.math;
  const task = dailyTasks[subject] || { used: 0, limit: 20 };
  const progress = (task.used / task.limit) * 100;
  const remaining = task.limit - task.used;

  // 處理開始練習（自動偵測/隨機）
  const handleStartPractice = async () => {
    if (remaining <= 0) {
      alert('今日任務已完成！');
      return;
    }
    // 先設置 loading 狀態並切換到 practice view，顯示「題目生成中」畫面
    if (setLoading) setLoading(true);
    setView('practice');
    // 傳入空數組和 subject 參數，讓 AI 自動偵測/隨機生成該科目的題目
    await startPracticeSession([], 10, subject, 'practice');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      {/* 返回按鈕 */}
      <button 
        onClick={() => setView('dashboard')} 
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-bold transition"
      >
        <ArrowLeft size={18} /> 返回首頁
      </button>

      {/* 標題區域 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{subjectInfo.icon}</div>
          <div>
            <h1 className="text-3xl font-black mb-1">{subjectInfo.name}每日任務</h1>
            <p className="text-white/80 text-sm">完成每日任務，提升學習能力</p>
          </div>
        </div>

        {/* 進度顯示 */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">今日進度</span>
            <span className="text-lg font-black">
              {task.used} / {task.limit}
            </span>
          </div>
          <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all ${
                progress >= 100 ? 'bg-red-400' : progress >= 75 ? 'bg-yellow-400' : 'bg-green-400'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div className="mt-2 text-xs text-white/80">
            {remaining > 0 ? `還剩 ${remaining} 題可完成` : '今日任務已完成！🎉'}
          </div>
        </div>
      </div>

      {/* 任務詳情卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <Target size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">每日目標</h3>
              <p className="text-2xl font-black text-indigo-600">{task.limit} 題</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">已完成</h3>
              <p className="text-2xl font-black text-green-600">{task.used} 題</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">剩餘</h3>
              <p className="text-2xl font-black text-blue-600">{remaining} 題</p>
            </div>
          </div>
        </div>
      </div>

      {/* 自動偵測說明 */}
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg flex-shrink-0">
            <BookOpen size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-indigo-900 mb-2">自動偵測模式</h3>
            <p className="text-indigo-700 text-sm">
              系統將根據您的年級（{user.level}）自動偵測適合的{subjectInfo.name}題目，或從題庫中隨機抽取題目，無需手動選擇單元。
            </p>
          </div>
        </div>
      </div>

      {/* 開始練習按鈕 */}
      {remaining > 0 && (
        <button
          onClick={handleStartPractice}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black py-4 px-6 rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center justify-center gap-2"
        >
          <Sparkles size={20} /> 開始{subjectInfo.name}練習（自動偵測）
        </button>
      )}

      {/* 提示信息 */}
      {task.used >= task.limit && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h3 className="font-bold text-yellow-800 mb-1">今日任務已完成！</h3>
          <p className="text-yellow-700 text-sm">明天再來挑戰新的任務吧！</p>
        </div>
      )}
    </div>
  );
}
