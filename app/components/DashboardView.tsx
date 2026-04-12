"use client";
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Calculator, Award, AlertCircle, RefreshCw, User, LogOut, Sparkles, BookOpen, Settings, Accessibility, Edit3, Languages, BookType, Crown, Bell, FileText, BarChart3, Globe
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function DashboardView({ user, setUser, stats, mistakes, goToSelection, goToPracticeSelection, goToExamSelection, adhdMode, toggleAdhdMode, goToDeveloper, goToMistakes, goToParent, goToTeacher, goToSubscription, goToDailyTask, handleLogout, dailyTasks = { math: { used: 0, limit: 20 }, chi: { used: 0, limit: 20 }, eng: { used: 0, limit: 20 } }, goToProfile, goToStudent }) {
  const { language, setLanguage, t } = useLanguage();
  // 👇 修改判定：只要是 Admin 角色或是該 Email 都算管理員
  const isAdmin = user.role === 'admin' || user.email === 'admin@test.com';
  const [activeTab, setActiveTab] = useState('math');

  // 👇 新增：切換年級的邏輯
  const toggleGrade = () => {
    if (!isAdmin) return;
    const grades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
    const currentIndex = grades.indexOf(user.level);
    // 找不到就從頭開始，否則往後跳一級
    const nextIndex = (currentIndex === -1) ? 0 : (currentIndex + 1) % grades.length;
    // 更新使用者狀態
    setUser(u => ({ ...u, level: grades[nextIndex] }));
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'math': return stats.math;
      case 'chi': return stats.chi;
      case 'eng': return stats.eng;
      default: return stats.math;
    }
  };

  const getActiveColor = () => {
    switch (activeTab) {
      case 'math': return { stroke: '#4F46E5', fill: '#6366F1' };
      case 'chi': return { stroke: '#E11D48', fill: '#FB7185' };
      case 'eng': return { stroke: '#D97706', fill: '#F59E0B' };
      default: return { stroke: '#4F46E5', fill: '#6366F1' };
    }
  };

  const chartColor = getActiveColor();

  // 載入學生通知
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user.role === 'student' && (user.uid || user.id)) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const { DB_SERVICE } = await import('../lib/db-service');
      const studentUid = user.uid || user.id;
      const notifs = await DB_SERVICE.getStudentNotifications(studentUid);
      setNotifications(notifs);
    } catch (e) {
      console.error("Load notifications error:", e);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const { DB_SERVICE } = await import('../lib/db-service');
      await DB_SERVICE.markNotificationAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (e) {
      console.error("Mark notification read error:", e);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* 作業通知（學生） */}
      {user.role === 'student' && notifications.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={24} className="animate-pulse" />
              <div>
                <h3 className="font-bold text-lg">您有 {notifications.length} 個新作業</h3>
                <p className="text-sm text-blue-100">點擊查看詳情</p>
              </div>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-bold transition"
            >
              {showNotifications ? '收起' : '查看'}
            </button>
          </div>

          {showNotifications && (
            <div className="mt-4 space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-white/10 rounded-lg p-3 flex items-center justify-between hover:bg-white/20 transition cursor-pointer"
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} />
                    <div>
                      <p className="font-bold">{notif.title}</p>
                      <p className="text-xs text-blue-100">
                        {new Date(notif.createdAt).toLocaleDateString('zh-HK')}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                    標記已讀
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 頂部歡迎卡片 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* 標題區域 */}
        <div className="mb-4">
          <h1 className="text-3xl font-black tracking-tight mb-1">AI Math Tutor</h1>
          <p className="text-sm text-white/80 font-medium">Beta v2.2 (Full Restore)</p>
        </div>

        {/* 右上角導航按鈕與語言切換 */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          {/* 語言切換選單 */}
          <div className="relative group">
            <button className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 flex items-center gap-1 cursor-pointer">
              <Globe size={14} />
              {language === 'zh-HK' ? '繁體中文' : language === 'zh-CN' ? '簡體中文' : 'English'}
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg py-1 border border-slate-100 hidden group-hover:block z-50">
              <button onClick={() => setLanguage('zh-HK')} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${language === 'zh-HK' ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>繁體中文</button>
              <button onClick={() => setLanguage('zh-CN')} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${language === 'zh-CN' ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>簡體中文</button>
              <button onClick={() => setLanguage('en-US')} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition ${language === 'en-US' ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>English</button>
            </div>
          </div>

          <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 cursor-pointer">
            {t('logout', { defaultValue: '登出' })}
          </button>
          {(user.role === 'student' || !user.role) && (
            <button onClick={goToStudent} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 cursor-pointer flex items-center gap-1">
              <BarChart3 size={12} /> 學習數據
            </button>
          )}
          {(user.role === 'parent' || user.role === 'admin') && (
            <button onClick={goToParent} className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 cursor-pointer">
              家長監控
            </button>
          )}
          {(user.role === 'teacher' || user.role === 'admin') && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (goToTeacher) goToTeacher();
              }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 cursor-pointer"
            >
              教學者控制台
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goToDeveloper();
              }}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition backdrop-blur-sm border border-white/10 cursor-pointer"
            >
              Developer
            </button>
          )}
        </div>

        {/* 用戶信息區域 */}
        <div className="flex items-center gap-4 mt-6 relative z-0">
          <button
            type="button"
            onClick={() => goToProfile && goToProfile()}
            className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white hover:scale-105 transition shadow-lg flex-shrink-0"
            aria-label="開啟個人檔案"
          >
            <img src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} alt="avatar" className="w-full h-full" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 tracking-tight">{t('welcome', { name: user.name })}</h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10">
                Level: {user.level} {isAdmin ? '(Unlocked)' : ''}
              </span>
              {/* 👇 新增：切換年級按鈕 (只顯示給 Admin) */}
              {isAdmin && (
                <button onClick={toggleGrade} className="bg-white text-indigo-600 text-xs font-bold px-2 py-1 rounded hover:bg-indigo-50 transition flex items-center gap-1 shadow-sm">
                  <RefreshCw size={12} /> 切換年級
                </button>
              )}
              {/* 👇 測試用：角色切換 (只顯示給 Admin) */}
              {isAdmin && (
                <button
                  onClick={() => {
                    const roles = ['admin', 'student', 'parent', 'teacher'];
                    const currentIndex = roles.indexOf(user.role || 'admin');
                    const nextIndex = (currentIndex + 1) % roles.length;
                    setUser(u => ({ ...u, role: roles[nextIndex] }));
                  }}
                  className="bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded hover:bg-purple-50 transition flex items-center gap-1 shadow-sm"
                  title="測試用：切換角色"
                >
                  <User size={12} /> 角色: {user.role || 'admin'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 功能按鈕區 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <button onClick={goToPracticeSelection || goToSelection} className="bg-white text-indigo-700 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-indigo-50 transition flex items-center justify-center gap-2 transform active:scale-95 group">
            <div className="bg-indigo-100 p-2 rounded-full group-hover:bg-indigo-200 transition"><Sparkles size={20} className="text-indigo-600" /></div>
            {t('go_to_practice')}
          </button>
          <button onClick={goToExamSelection || goToSelection} className="bg-white text-indigo-700 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-indigo-50 transition flex items-center justify-center gap-2 transform active:scale-95 group">
            <div className="bg-indigo-100 p-2 rounded-full group-hover:bg-indigo-200 transition"><Sparkles size={20} className="text-indigo-600" /></div>
            {t('take_exam')}
          </button>
          <button onClick={goToMistakes} className="bg-indigo-800/40 text-white font-bold py-4 px-6 rounded-xl border border-indigo-400/30 hover:bg-indigo-800/60 transition flex items-center justify-center gap-2 backdrop-blur-md">
            <BookOpen size={20} /> {t('mistakes_book')} ({mistakes.length})
          </button>
        </div>

        {/* 每日任務顯示（所有用戶） */}
        <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl relative z-10">
          <h4 className="text-indigo-800 font-bold mb-3 flex items-center gap-2">
            <Sparkles size={18} /> {t('daily_tasks')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 數學 - 可點擊按鍵 */}
            <button
              onClick={() => goToDailyTask('math')}
              className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-105 hover:shadow-md ${dailyTasks.math.used >= dailyTasks.math.limit ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700">數學</span>
                <span className={`text-xs font-bold ${dailyTasks.math.used >= dailyTasks.math.limit ? 'text-red-600' : 'text-indigo-600'}`}>
                  {dailyTasks.math.used} / {dailyTasks.math.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${dailyTasks.math.used >= dailyTasks.math.limit ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((dailyTasks.math.used / dailyTasks.math.limit) * 100, 100)}%` }}
                ></div>
              </div>
            </button>

            {/* 中文 - 可點擊按鍵 */}
            <button
              onClick={() => goToDailyTask('chi')}
              className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-105 hover:shadow-md ${dailyTasks.chi.used >= dailyTasks.chi.limit ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700">中文</span>
                <span className={`text-xs font-bold ${dailyTasks.chi.used >= dailyTasks.chi.limit ? 'text-red-600' : 'text-indigo-600'}`}>
                  {dailyTasks.chi.used} / {dailyTasks.chi.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${dailyTasks.chi.used >= dailyTasks.chi.limit ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((dailyTasks.chi.used / dailyTasks.chi.limit) * 100, 100)}%` }}
                ></div>
              </div>
            </button>

            {/* 英文 - 可點擊按鍵 */}
            <button
              onClick={() => goToDailyTask('eng')}
              className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-105 hover:shadow-md ${dailyTasks.eng.used >= dailyTasks.eng.limit ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700">英文</span>
                <span className={`text-xs font-bold ${dailyTasks.eng.used >= dailyTasks.eng.limit ? 'text-red-600' : 'text-indigo-600'}`}>
                  {dailyTasks.eng.used} / {dailyTasks.eng.limit}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${dailyTasks.eng.used >= dailyTasks.eng.limit ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((dailyTasks.eng.used / dailyTasks.eng.limit) * 100, 100)}%` }}
                ></div>
              </div>
            </button>
          </div>

          {/* 訂閱提示（僅免費用戶顯示） */}
          {!user.isPremium && (
            <div className="mt-3 pt-3 border-t border-indigo-200">
              <div className="flex items-center justify-between">
                <p className="text-indigo-700 text-sm">{t('upgrade_now')}</p>
                <button
                  onClick={goToSubscription}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center gap-2 text-sm"
                >
                  <Crown size={16} /> {t('upgrade_now')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 裝飾背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* 學習輔助模式開關 - 所有用戶可用 */}
      <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between ${adhdMode ? 'bg-yellow-50 border-yellow-400 shadow-md' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${adhdMode ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
            <Accessibility size={24} />
          </div>
          <div>
            <h3 className={`font-bold ${adhdMode ? 'text-yellow-800' : 'text-slate-700'}`}>{t('adhd_mode')}</h3>
            <p className="text-xs text-slate-500">{t('adhd_mode_desc')}</p>
          </div>
        </div>
        <button onClick={toggleAdhdMode} className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${adhdMode ? 'bg-yellow-400' : 'bg-slate-300'}`}>
          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${adhdMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
      </div>

      {/* 儀表板主要內容 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 能力雷達圖 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <Award className="text-yellow-500" size={24} /> {t('radar_chart')}
            </h3>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button onClick={() => setActiveTab('math')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'math' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Calculator size={16} /> {t('math', { defaultValue: '數學' })}
            </button>
            <button onClick={() => setActiveTab('chi')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'chi' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Languages size={16} /> {t('chinese', { defaultValue: '中文' })}
            </button>
            <button onClick={() => setActiveTab('eng')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'eng' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <BookType size={16} /> {t('english', { defaultValue: '英文' })}
            </button>
          </div>

          <div className="h-[300px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getActiveData()}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                  tickFormatter={(value, index) => {
                    const data = getActiveData();
                    const item = data[index];
                    return `${value}\n(${item.A}/100)`;
                  }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="能力值" dataKey="A" stroke={chartColor.stroke} fill={chartColor.fill} fillOpacity={0.4} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => `${value}/100`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 重點加強 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
            <AlertCircle className="text-red-500" size={24} /> 重點加強
          </h3>
          <ul className="space-y-4 list-none m-0 p-0">
            <li className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-100 group hover:bg-red-100 transition cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-red-200 text-red-600 flex items-center justify-center font-bold">1</div>
              <div>
                <span className="block font-bold text-red-800 group-hover:text-red-900">幾何圖形：周界計算</span>
                <span className="text-xs text-red-600/70">錯誤率: 45% • 建議練習: 10 題</span>
              </div>
            </li>
            <li className="flex items-center gap-4 p-4 bg-orange-50 rounded-xl border border-orange-100 group hover:bg-orange-100 transition cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-600 flex items-center justify-center font-bold">2</div>
              <div>
                <span className="block font-bold text-orange-800 group-hover:text-orange-900">應用題：雙步驟解題</span>
                <span className="text-xs text-orange-600/70">錯誤率: 32% • 建議練習: 5 題</span>
              </div>
            </li>
            <li className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100 group hover:bg-blue-100 transition cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-blue-200 text-blue-600 flex items-center justify-center font-bold">3</div>
              <div>
                <span className="block font-bold text-blue-800 group-hover:text-blue-900">中文：修辭辨析</span>
                <span className="text-xs text-blue-600/70">近期新增弱項</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}