"use client";
import React, { useState, useEffect } from 'react';
import { Settings, Home, RefreshCw, Database, MessageSquare, Bell } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
import SystemLogs from './admin/SystemLogs';
import AnalyticsView from './admin/AnalyticsView';
import FactoryDashboard from './admin/FactoryDashboard';
import QuestionManager from './admin/QuestionManager';
import SyllabusView from './admin/SyllabusView';

// 👇 注意這裡 props 接收了 setTopics
export default function DeveloperView({ topics, setTopics, setView, isFirebaseReady, user }) {
  const [activeTab, setActiveTab] = useState('syllabus');
  
  // 教學者試題管理狀態
  const [teacherQuestions, setTeacherQuestions] = useState([]);
  const [isLoadingTeacherQuestions, setIsLoadingTeacherQuestions] = useState(false);
  
  // 教學者回饋通知欄
  const [pendingTeacherFeedbackCount, setPendingTeacherFeedbackCount] = useState(0);
  const [isLoadingTeacherFeedbackCount, setIsLoadingTeacherFeedbackCount] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  
  

  


  const isAdminReviewer = user && user.email === 'admin@test.com';

  const loadPendingTeacherFeedbackCount = async () => {
      if (!isFirebaseReady || !isAdminReviewer) return;
      setIsLoadingTeacherFeedbackCount(true);
      try {
          const feedbacks = await DB_SERVICE.getPendingTeacherFeedback();
          setPendingTeacherFeedbackCount(feedbacks.length || 0);
      } catch (e) {
          console.error("Load Pending Teacher Feedback Count Error:", e);
      } finally {
          setIsLoadingTeacherFeedbackCount(false);
      }
  };

  useEffect(() => {
      loadPendingTeacherFeedbackCount();
  }, [isFirebaseReady, isAdminReviewer]);

  const loadAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
          const res = await fetch('/api/metrics');
          const data = await res.json();
          if (data?.success) {
              setAnalyticsData(data.data);
          } else {
              setAnalyticsData(null);
          }
      } catch (e) {
          console.error("Load Analytics Error:", e);
          setAnalyticsData(null);
      } finally {
          setIsLoadingAnalytics(false);
      }
  };

  useEffect(() => {
      if (activeTab === 'analytics' && isAdminReviewer) {
          loadAnalytics();
      }
  }, [activeTab, isAdminReviewer]);

  return (
    <div className="max-w-6xl mx-auto bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
            <Settings size={20} className="text-indigo-300" />
            <h1 className="font-bold text-lg">數學科管理 (Math Subject)</h1>
        </div>
        <div className="flex items-center gap-2">
            {isAdminReviewer && (
                <button 
                    onClick={() => setView('feedback-review')} 
                    className="text-white/80 hover:text-white text-xs bg-purple-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    title="審核教學者回饋"
                >
                    <MessageSquare size={14} />
                    回饋審核
                    {pendingTeacherFeedbackCount > 0 && (
                        <span className="ml-1 text-[10px] bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded-full font-bold">
                            {pendingTeacherFeedbackCount}
                        </span>
                    )}
                </button>
            )}
            <button onClick={() => setView('chinese-developer')} className="text-white/80 hover:text-white text-xs bg-rose-600 px-3 py-1.5 rounded-lg transition">
                中文科
            </button>
            <button onClick={() => setView('english-developer')} className="text-white/80 hover:text-white text-xs bg-amber-600 px-3 py-1.5 rounded-lg transition">
                英文科
            </button>
            <button onClick={() => setView('dashboard')} className="text-slate-300 hover:text-white text-sm flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg transition">
                <Home size={14} /> 返回首頁
            </button>
        </div>
      </div>

      <div className="p-6">
        {isAdminReviewer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-semibold">
                    <Bell size={16} />
                    教學者回饋通知欄：{isLoadingTeacherFeedbackCount ? '載入中...' : `待審核 ${pendingTeacherFeedbackCount} 筆`}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadPendingTeacherFeedbackCount}
                        className="text-xs bg-white border border-amber-200 text-amber-800 px-2 py-1 rounded hover:bg-amber-100 transition"
                    >
                        重新整理
                    </button>
                    <button
                        onClick={() => setView('feedback-review')}
                        className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition"
                    >
                        前往審核
                    </button>
                </div>
            </div>
        )}
        <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button onClick={() => setActiveTab('syllabus')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'syllabus' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                1. 課程單元管理
            </button>
            <button onClick={() => setActiveTab('past_papers')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'past_papers' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'}`}>
                2. 試卷庫 & 種子管理
            </button>
            {isAdminReviewer && (
                <button onClick={() => setActiveTab('question_manager')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'question_manager' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    2.5 題庫清理
                </button>
            )}
            {user && user.email === 'admin@test.com' && (
                <button 
                    onClick={async () => {
                        setActiveTab('teacher_questions');
                        setIsLoadingTeacherQuestions(true);
                        try {
                            const questions = await DB_SERVICE.getAllTeacherSeedQuestions();
                            setTeacherQuestions(questions);
                        } catch (e) {
                            console.error("Load Teacher Questions Error:", e);
                            alert('載入失敗：' + (e.message || '未知錯誤'));
                        } finally {
                            setIsLoadingTeacherQuestions(false);
                        }
                    }} 
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'teacher_questions' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    3. 教學者試題管理
                </button>
            )}
            {isAdminReviewer && (
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'analytics' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    4. 後台總覽
                </button>
            )}
            {isAdminReviewer && (
                <button
                    onClick={() => setActiveTab('factory')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'factory' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    🏭 工廠模式
                </button>
            )}
            {isAdminReviewer && (
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'logs' ? 'text-slate-700 border-b-2 border-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    📋 系統日誌
                </button>
            )}
        </div>

        {activeTab === 'syllabus' && (
            <SyllabusView
                topics={topics}
                setTopics={setTopics}
                isFirebaseReady={isFirebaseReady}
            />
        )}

        {activeTab === 'analytics' && isAdminReviewer && (
            <AnalyticsView
                analyticsData={analyticsData}
                isLoadingAnalytics={isLoadingAnalytics}
                onRefresh={loadAnalytics}
            />
        )}

        {activeTab === 'past_papers' && (
            <FactoryDashboard
                topics={topics}
                isFirebaseReady={isFirebaseReady}
                user={user}
                mode="past_papers"
            />
        )}

        {activeTab === 'question_manager' && isAdminReviewer && (
            <QuestionManager isFirebaseReady={isFirebaseReady} />
        )}

        {/* 教學者試題管理標籤頁 */}
        {activeTab === 'teacher_questions' && user && user.email === 'admin@test.com' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                        <Database size={18}/> 教學者上傳的試題管理
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        查看所有教學者上傳的試題，可以將優質試題加入主資料庫供所有用戶使用。
                    </p>

                    {isLoadingTeacherQuestions ? (
                        <div className="text-center py-8">
                            <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
                            <p className="text-slate-600">載入中...</p>
                        </div>
                    ) : teacherQuestions.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Database size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-sm">暫無教學者上傳的試題</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-blue-700">
                                    📋 共有 <strong>{teacherQuestions.length}</strong> 道教學者試題
                                </p>
                            </div>

                            <div className="space-y-4 max-h-96 overflow-y-auto">
                                {teacherQuestions.map((q, idx) => (
                                    <div
                                        key={q.id || idx}
                                        className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                                                        {q.institutionName || '未知機構'}
                                                    </span>
                                                    {q.uploadedBy && (
                                                        <span className="text-xs text-slate-500">
                                                            上傳者：{q.uploadedBy}
                                                        </span>
                                                    )}
                                                    {q.uploadedAt && (
                                                        <span className="text-xs text-slate-500">
                                                            {new Date(q.uploadedAt).toLocaleDateString('zh-HK')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-bold text-slate-800 mb-1">
                                                    {q.question?.substring(0, 100) || '無題目文字'}...
                                                </p>
                                                <div className="flex gap-2 text-xs text-slate-500">
                                                    <span>答案: {q.answer}</span>
                                                    {q.topic && <span>• {q.topic}</span>}
                                                    {q.grade && <span>• {q.grade}</span>}
                                                    {q.shape && <span>• 圖形: {q.shape}</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('確定要將此試題加入主資料庫嗎？')) return;
                                                    
                                                    try {
                                                        const success = await DB_SERVICE.addTeacherQuestionToMainDB(q);
                                                        if (success) {
                                                            alert('✅ 試題已成功加入主資料庫！');
                                                            // 從列表中移除（可選）
                                                            setTeacherQuestions(teacherQuestions.filter(item => item.id !== q.id));
                                                        } else {
                                                            alert('❌ 加入失敗，請檢查連線');
                                                        }
                                                    } catch (e) {
                                                        console.error("Add to Main DB Error:", e);
                                                        alert('加入失敗：' + (e.message || '未知錯誤'));
                                                    }
                                                }}
                                                className="ml-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                                            >
                                                ➕ 加入主庫
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'factory' && isAdminReviewer && (
            <FactoryDashboard
                topics={topics}
                isFirebaseReady={isFirebaseReady}
                user={user}
                mode="factory"
            />
        )}
        {activeTab === 'logs' && isAdminReviewer && (
            <SystemLogs logs={[]} />
        )}
      </div>
    </div>
  );
}