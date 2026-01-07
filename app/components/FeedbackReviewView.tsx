"use client";
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft, MessageSquare } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';

export default function FeedbackReviewView({ setView, user, isFirebaseReady }) {
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 載入待審核回饋
  const loadPendingFeedback = async () => {
    if (!isFirebaseReady) return;
    setLoading(true);
    try {
      const feedbacks = await DB_SERVICE.getPendingTeacherFeedback();
      setPendingFeedback(feedbacks);
    } catch (e) {
      console.error("Load Pending Feedback Error:", e);
      alert('載入回饋失敗：' + (e.message || '未知錯誤'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingFeedback();
  }, [isFirebaseReady]);

  // 批准回饋
  const handleApprove = async (feedbackId) => {
    if (!user || user.email !== 'admin@test.com') {
      alert('❌ 只有開發者帳號（admin@test.com）可以審核回饋');
      return;
    }

    if (!confirm('確定要批准此回饋嗎？批准後，AI 將在生成類似題目時參考此回饋。')) {
      return;
    }

    setIsProcessing(true);
    try {
      const success = await DB_SERVICE.approveTeacherFeedback(feedbackId, user.email);
      if (success) {
        alert('✅ 回饋已批准！');
        await loadPendingFeedback(); // 重新載入列表
        setSelectedFeedback(null);
      } else {
        alert('❌ 批准失敗，請檢查連線');
      }
    } catch (e) {
      console.error("Approve Feedback Error:", e);
      alert('批准失敗：' + (e.message || '未知錯誤'));
    } finally {
      setIsProcessing(false);
    }
  };

  // 拒絕回饋
  const handleReject = async (feedbackId) => {
    if (!user || user.email !== 'admin@test.com') {
      alert('❌ 只有開發者帳號（admin@test.com）可以審核回饋');
      return;
    }

    if (!confirm('確定要拒絕此回饋嗎？')) {
      return;
    }

    setIsProcessing(true);
    try {
      const success = await DB_SERVICE.rejectTeacherFeedback(feedbackId, user.email);
      if (success) {
        alert('回饋已拒絕');
        await loadPendingFeedback(); // 重新載入列表
        setSelectedFeedback(null);
      } else {
        alert('❌ 拒絕失敗，請檢查連線');
      }
    } catch (e) {
      console.error("Reject Feedback Error:", e);
      alert('拒絕失敗：' + (e.message || '未知錯誤'));
    } finally {
      setIsProcessing(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '未知時間';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('zh-HK', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-slate-50 min-h-screen font-sans text-slate-800 p-4 md:p-6">
      {/* 標題欄 */}
      <div className="bg-indigo-900 text-white p-4 rounded-lg shadow-md mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('developer')}
            className="p-2 hover:bg-indigo-800 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <MessageSquare size={24} className="text-indigo-300" />
          <h1 className="font-bold text-xl">教學者回饋審核</h1>
        </div>
        <button
          onClick={loadPendingFeedback}
          disabled={loading}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          刷新
        </button>
      </div>

      {/* 權限檢查 */}
      {user && user.email !== 'admin@test.com' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 font-bold">
            ❌ 只有開發者帳號（admin@test.com）可以訪問此頁面
          </p>
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">載入中...</p>
        </div>
      )}

      {/* 回饋列表 */}
      {!loading && user && user.email === 'admin@test.com' && (
        <>
          {pendingFeedback.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <MessageSquare size={48} className="text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-700 mb-2">暫無待審核回饋</h2>
              <p className="text-slate-500">所有教學者回饋已處理完畢</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  📋 共有 <strong>{pendingFeedback.length}</strong> 條待審核回饋
                </p>
              </div>

              {pendingFeedback.map((fb) => (
                <div
                  key={fb.id}
                  className="bg-white rounded-lg shadow-md border-2 border-slate-200 hover:border-indigo-300 transition"
                >
                  <div className="p-4">
                    {/* 回饋標題欄 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">
                            待審核
                          </span>
                          <span className="text-xs text-slate-500">
                            提交時間：{formatDate(fb.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <span className="font-semibold">提交者：</span>
                          <span>{fb.createdBy || '未知'}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFeedback(selectedFeedback === fb.id ? null : fb.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1 text-sm"
                      >
                        <Eye size={16} />
                        {selectedFeedback === fb.id ? '收起' : '查看詳情'}
                      </button>
                    </div>

                    {/* 回饋摘要 */}
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-700">題型：</span>
                        {fb.questionType && Array.isArray(fb.questionType) && fb.questionType.length > 0 ? (
                          fb.questionType.map((type, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded"
                            >
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">未分類</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">分類：</span>
                        <span className="text-xs text-slate-600">{fb.category || '未分類'}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600">科目：{fb.subject || 'math'}</span>
                      </div>
                    </div>

                    {/* 回饋內容預覽 */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-slate-700 line-clamp-2">
                        {fb.feedback || '無回饋內容'}
                      </p>
                    </div>

                    {/* 展開詳情 */}
                    {selectedFeedback === fb.id && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="mb-3">
                          <h4 className="text-xs font-bold text-slate-700 mb-1">完整回饋內容：</h4>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                              {fb.feedback || '無回饋內容'}
                            </p>
                          </div>
                        </div>
                        {fb.questionId && (
                          <div className="mb-3">
                            <h4 className="text-xs font-bold text-slate-700 mb-1">關聯題目 ID：</h4>
                            <p className="text-xs text-slate-600 font-mono">{fb.questionId}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleApprove(fb.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        批准
                      </button>
                      <button
                        onClick={() => handleReject(fb.id)}
                        disabled={isProcessing}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        拒絕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
