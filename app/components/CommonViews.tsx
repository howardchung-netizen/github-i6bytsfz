"use client";
import React, { useState } from 'react';
import { Sparkles, BookOpen, CheckCircle, RefreshCw, UserCog, Award, X, LogOut } from 'lucide-react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// 渲染包含 LaTeX 的文本（與 PracticeView 共享）
const renderMathText = (text) => {
  if (!text) return '';
  
  // 匹配 $...$ 格式的 LaTeX
  const mathRegex = /\$([^$]+)\$/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = mathRegex.exec(text)) !== null) {
    // 添加 LaTeX 前的文本
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // 添加 LaTeX 數學公式
    parts.push({ type: 'math', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩餘文本
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  // 如果沒有匹配到 LaTeX，直接返回原文本
  if (parts.length === 0) {
    return text;
  }
  
  return parts.map((part, index) => {
    if (part.type === 'math') {
      try {
        return <InlineMath key={index} math={part.content} />;
      } catch (e) {
        console.error('KaTeX render error:', e, part.content);
        return <span key={index}>${part.content}$</span>;
      }
    }
    return <span key={index}>{part.content}</span>;
  });
};

export const TopicSelectionView = ({ user, setView, startPracticeSession, topics, setLoading }) => {
  const [selected, setSelected] = useState([]);
  const availableTopics = topics.filter(t => t.grade === user.level);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 font-sans">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-slate-800"><Sparkles className="text-indigo-500"/> 選擇練習單元 ({user.level})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {availableTopics.length > 0 ? availableTopics.map(t => (
                <button key={t.id} onClick={() => toggle(t.id)} className={`p-4 rounded-xl border-2 text-left transition-all ${selected.includes(t.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-200'}`}>
                    <div className="font-bold text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{t.subTopics?.length || 0} 個子題</div>
                </button>
            )) : (
                <div className="col-span-2 text-center py-10 text-slate-400 bg-slate-50 rounded-xl">此年級暫無單元</div>
            )}
        </div>
        <div className="flex gap-4">
            <button onClick={() => setView('dashboard')} className="flex-1 py-3 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50">返回首頁</button>
            <button 
              onClick={async () => {
                if (selected.length === 0) return;
                // 先設置 loading 狀態並切換到 practice view，顯示「題目生成中」畫面
                if (setLoading) setLoading(true);
                setView('practice');
                // 然後開始生成題目
                await startPracticeSession(selected);
              }} 
              disabled={selected.length === 0} 
              className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              開始練習 ({selected.length})
            </button>
        </div>
    </div>
  );
};

export const MistakesView = ({ setView, mistakes, retryQuestion }) => (
    <div className="bg-white rounded-xl shadow p-6 max-w-3xl mx-auto animate-in fade-in font-sans">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800"><BookOpen className="text-red-500"/> 錯題本</h2>
            <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-slate-800">返回</button>
        </div>
        {mistakes.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 rounded-xl"><CheckCircle className="mx-auto text-green-400 mb-3" size={48}/><p className="text-slate-500 font-bold">太棒了！目前沒有錯題。</p></div>
        ) : (
            <div className="space-y-4">
                {mistakes.map((m, idx) => (
                    <div key={idx} className="p-4 border border-red-100 bg-red-50/50 rounded-xl">
                        <div className="flex justify-between items-start mb-2"><span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">{m.category || '數學'}</span><button onClick={() => retryQuestion(m)} className="text-indigo-600 text-sm font-bold hover:underline flex items-center gap-1"><RefreshCw size={14}/> 舉一反三練習</button></div>
                        <p className="font-bold text-slate-800 mb-2"><span>{renderMathText(m.question)}</span></p>
                        <p className="text-sm text-slate-500">你的答案: <span className="text-red-500 font-mono decoration-slice line-through"><span>{renderMathText(String(m.userWrongAnswer || ''))}</span></span> / 正解: <span className="text-green-600 font-mono font-bold"><span>{renderMathText(String(m.answer || ''))}</span></span></p>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ParentView 已移至獨立文件 app/components/ParentView.tsx

export const SummaryView = ({ sessionStats, restartSelection, setView }) => {
    const score = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;
    return (
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center animate-in zoom-in-95 font-sans">
            <div className="mb-6 relative inline-block"><Award size={80} className={score >= 80 ? "text-yellow-400" : "text-indigo-400"} />{score >= 100 && <Sparkles className="absolute -top-2 -right-2 text-yellow-500 animate-pulse" size={30} />}</div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">{score >= 80 ? "太強了！" : "練習完成！"}</h2>
            <p className="text-slate-500 mb-6">本次得分: <span className="text-2xl font-bold text-indigo-600">{score}</span> / 100</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-3 rounded-lg"><div className="text-2xl font-bold text-slate-700">{sessionStats.total}</div><div className="text-xs text-slate-400">總題數</div></div>
                <div className="bg-slate-50 p-3 rounded-lg"><div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div><div className="text-xs text-slate-400">答對</div></div>
            </div>
            <div className="flex flex-col gap-3">
                <button onClick={restartSelection} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg transition">再練一次</button>
                <button onClick={() => setView('dashboard')} className="w-full bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition">回首頁</button>
            </div>
        </div>
    );
};

export const ProfileView = ({ setView, user, handleLogout }) => (
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in-95 font-sans">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-slate-800">個人檔案</h3><button onClick={setView} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
        <div className="flex flex-col items-center mb-6">
            <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-indigo-100 mb-3" alt="avatar" />
            <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
            <p className="text-slate-500">{user.school || '學校未設定'} • {user.level}</p>
        </div>
        <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 flex items-center justify-center gap-2"><LogOut size={18}/> 登出帳號</button>
    </div>
);