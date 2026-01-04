"use client";
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  Calculator, Award, AlertCircle, RefreshCw, User, LogOut, Sparkles, BookOpen, Settings, Accessibility, Edit3, Languages, BookType 
} from 'lucide-react';

export default function DashboardView({ user, setUser, stats, mistakes, goToSelection, adhdMode, toggleAdhdMode, goToDeveloper, goToMistakes, goToParent, handleLogout }) {
  // 👇 修改這行：只要是這個 Email，就算它是 Admin
const isAdmin = user.role === 'admin' || user.email === 'admin@test.com';
  const [activeTab, setActiveTab] = useState('math');

  const getActiveData = () => { 
      switch(activeTab) { 
          case 'math': return stats.math; 
          case 'chi': return stats.chi; 
          case 'eng': return stats.eng;
          default: return stats.math; 
      } 
  };
  
  const getActiveColor = () => { 
      switch(activeTab) { 
          case 'math': return { stroke: '#4F46E5', fill: '#6366F1' };
          case 'chi': return { stroke: '#E11D48', fill: '#FB7185' }; 
          case 'eng': return { stroke: '#D97706', fill: '#F59E0B' };
          default: return { stroke: '#4F46E5', fill: '#6366F1' }; 
      } 
  };
  
  const chartColor = getActiveColor();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* 頂部歡迎卡片 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        {/* 開發者按鈕 (只給 Admin) */}
        {isAdmin && (
             <button onClick={goToDeveloper} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition backdrop-blur-sm border border-white/10">
                <Settings size={12} /> Developer Console
             </button>
        )}
        
        <button onClick={handleLogout} className="absolute top-4 right-40 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition backdrop-blur-sm border border-white/10">
            <LogOut size={12} /> 登出
        </button>

        <div className="flex justify-between items-start mt-4 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-full border-4 border-white/30 overflow-hidden bg-white hover:scale-105 transition shadow-lg">
                 <img src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} alt="avatar" className="w-full h-full" />
             </div>
             <div>
                <h2 className="text-3xl font-bold mb-1 tracking-tight">Hi, {user.name}! 👋</h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10">
                        Level: {user.level} {isAdmin ? '(Admin)' : ''}
                    </span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm border border-white/10">
                        XP: {user.xp || 0}
                    </span>
                </div>
             </div>
          </div>
        </div>
        
        {/* 功能按鈕區 */}
        <div className="mt-8 flex gap-4 relative z-10">
          <button onClick={goToSelection} className="flex-1 bg-white text-indigo-700 font-bold py-4 px-6 rounded-xl shadow-lg hover:bg-indigo-50 transition flex items-center justify-center gap-2 transform active:scale-95 group">
              <div className="bg-indigo-100 p-2 rounded-full group-hover:bg-indigo-200 transition"><Sparkles size={20} className="text-indigo-600"/></div>
              開始 AI 試卷
          </button>
          <button onClick={goToMistakes} className="flex-1 bg-indigo-800/40 text-white font-bold py-4 px-6 rounded-xl border border-indigo-400/30 hover:bg-indigo-800/60 transition flex items-center justify-center gap-2 backdrop-blur-md">
              <BookOpen size={20} /> 錯題本 ({mistakes.length})
          </button>
        </div>

        {/* 裝飾背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500 opacity-20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* 專注模式開關 */}
      <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between ${adhdMode ? 'bg-yellow-50 border-yellow-400 shadow-md' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${adhdMode ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                <Accessibility size={24} />
            </div>
            <div>
                <h3 className={`font-bold ${adhdMode ? 'text-yellow-800' : 'text-slate-700'}`}>專注輔助模式 (ADHD Support)</h3>
                <p className="text-xs text-slate-500">啟用後將放大文字、隱藏干擾元素並提供語音輔助</p>
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
                  <Award className="text-yellow-500" size={24} /> 能力雷達圖
              </h3>
          </div>
          
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button onClick={() => setActiveTab('math')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'math' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Calculator size={16} /> 數學
            </button>
            <button onClick={() => setActiveTab('chi')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'chi' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Languages size={16} /> 中文
            </button>
            <button onClick={() => setActiveTab('eng')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'eng' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <BookType size={16} /> 英文
            </button>
          </div>
          
          <div className="h-[300px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getActiveData()}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="能力值" dataKey="A" stroke={chartColor.stroke} fill={chartColor.fill} fillOpacity={0.4} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  </RadarChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* 重點加強 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2 text-lg">
              <AlertCircle className="text-red-500" size={24} /> 建議重點加強
          </h3>
          // 👇 請找到這行，加入 list-none m-0 p-0
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