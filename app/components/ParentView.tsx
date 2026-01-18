"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { UserCog, Clock, BookOpen, TrendingUp, Award, AlertCircle, Users, Plus, Search, BarChart3, Calendar, Sparkles, PieChart as PieIcon } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
import { createMockStudent } from '../lib/mock-data-generator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function ParentView({ setView, user }) {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childStats, setChildStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentEmail, setStudentEmail] = useState('');
  const [reports, setReports] = useState([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  const [trendRangeDays, setTrendRangeDays] = useState(14);
  const [childSearch, setChildSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportSort, setReportSort] = useState('date_desc');
  const [dailyStatsRange, setDailyStatsRange] = useState([]);
  const [childrenSummary, setChildrenSummary] = useState([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [rankingMetric, setRankingMetric] = useState('timeMinutes');

  useEffect(() => {
    loadChildren();
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      loadChildStats(selectedChild.uid, trendRangeDays);
      loadReports(selectedChild.uid);
    }
  }, [selectedChild, trendRangeDays]);

  useEffect(() => {
    let isMounted = true;
    const loadChildrenSummary = async () => {
      if (!children || children.length === 0) {
        setChildrenSummary([]);
        return;
      }
      setComparisonLoading(true);
      try {
        const summaries = await Promise.all(
          children.map(async (child) => {
            const uid = child.uid || child.id;
            if (!uid) {
              return {
                id: child.id,
                uid: child.uid,
                name: child.name || '未命名',
                level: child.level || '未設定',
                avatar: child.avatar,
                totalQuestions: 0,
                correctAnswers: 0,
                timeMinutes: 0,
                mistakesCount: 0,
                accuracyRate: 0
              };
            }
            const stats = await DB_SERVICE.getStudentLearningStats(uid, trendRangeDays);
            const totalQuestions = stats?.totalQuestions || 0;
            const correctAnswers = stats?.correctAnswers || 0;
            const timeMinutes = Math.round((stats?.totalTimeSpent || 0) / 60000);
            const mistakesCount = stats?.mistakes?.length || 0;
            const accuracyRate = totalQuestions > 0
              ? Math.round((correctAnswers / totalQuestions) * 100)
              : 0;
            return {
              id: child.id,
              uid: child.uid,
              name: child.name || '未命名',
              level: child.level || '未設定',
              avatar: child.avatar,
              totalQuestions,
              correctAnswers,
              timeMinutes,
              mistakesCount,
              accuracyRate
            };
          })
        );
        if (isMounted) {
          setChildrenSummary(summaries);
        }
      } catch (e) {
        console.error("Load children summary error:", e);
        if (isMounted) {
          setChildrenSummary([]);
        }
      } finally {
        if (isMounted) {
          setComparisonLoading(false);
        }
      }
    };
    loadChildrenSummary();
    return () => {
      isMounted = false;
    };
  }, [children, trendRangeDays]);

  const loadChildren = async () => {
    if (user.role === 'parent' && user.id) {
      try {
        const childrenList = await DB_SERVICE.getStudentChildren(user.id);
        setChildren(childrenList);
        if (childrenList.length > 0 && !selectedChild) {
          setSelectedChild(childrenList[0]);
        }
      } catch (e) {
        console.error("Load children error:", e);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const loadChildStats = async (studentUid, days = trendRangeDays) => {
    setLoading(true);
    try {
      const stats = await DB_SERVICE.getStudentLearningStats(studentUid, days);
      setChildStats(stats);
    } catch (e) {
      console.error("Load child stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async (studentUid) => {
    try {
      const reportsList = await DB_SERVICE.getStudentReports(studentUid);
      setReports(reportsList);
    } catch (e) {
      console.error("Load reports error:", e);
    }
  };

  const handleLinkStudent = async () => {
    if (!studentEmail.trim()) {
      alert('請輸入學生電郵');
      return;
    }
    setLoading(true);
    try {
      const success = await DB_SERVICE.linkParentToStudent(user.id, studentEmail.trim());
      if (success) {
        alert('成功連結學生帳號！');
        setShowLinkForm(false);
        setStudentEmail('');
        await loadChildren();
      } else {
        alert('連結失敗：找不到該學生帳號');
      }
    } catch (e) {
      console.error("Link student error:", e);
      alert('連結失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const report = await DB_SERVICE.generateProgressReport(selectedChild.uid, 14);
      if (report) {
        alert('報告生成成功！');
        await loadReports(selectedChild.uid);
      } else {
        alert('報告生成失敗');
      }
    } catch (e) {
      console.error("Generate report error:", e);
      alert('報告生成失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockStudent = async () => {
    if (!user.id) {
      alert('請先登入');
      return;
    }
    
    // 檢查是否為 admin 帳號
    const isAdmin = user.role === 'admin' || user.email === 'admin@test.com';
    if (!isAdmin) {
      alert('此功能僅供 admin 帳號測試使用');
      return;
    }
    
    setIsGeneratingMock(true);
    setLoading(true);
    
    try {
      let progressMessage = '';
      const mockStudent = await createMockStudent(user.id, Date.now(), (msg) => {
        progressMessage = msg;
        console.log(msg);
      });
      
      // 連結學生
      await DB_SERVICE.linkParentToStudent(user.id, mockStudent.email);
      
      alert(`✅ 模擬學生創建成功！\n\n姓名：${mockStudent.name}\n電郵：${mockStudent.email}\n年級：${mockStudent.level}\n\n已生成14天學習數據和10道錯題`);
      
      // 重新載入學生列表
      await loadChildren();
      if (mockStudent.id) {
        setSelectedChild(mockStudent);
      }
    } catch (e) {
      console.error("Generate mock student error:", e);
      alert('創建模擬學生失敗：' + (e.message || '未知錯誤'));
    } finally {
      setIsGeneratingMock(false);
      setLoading(false);
    }
  };

  const mistakeDistribution = useMemo(() => {
    if (!childStats?.mistakes) return [];
    const map = {};
    childStats.mistakes.forEach((m) => {
      const key = m.category || m.topic || '未分類';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [childStats]);

  // 準備圖表數據
  const chartData = dailyStatsRange.length > 0
    ? dailyStatsRange.map((item: any) => ({
        dateString: item.date,
        date: new Date(item.date).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' }),
        questions: item.totalQuestions || 0,
        correct: item.correctAnswers || 0,
        wrong: item.wrongAnswers || 0,
        timeMinutes: Math.round((item.timeSpentMs || 0) / 60000)
      }))
    : (childStats?.dailyActivity ? Object.entries(childStats.dailyActivity)
        .map(([date, data]: [string, any]) => ({
          dateString: date, // 保留原始日期字符串用於排序
          date: new Date(date).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' }),
          questions: data?.questions || 0,
          correct: data?.correct || 0,
          wrong: data?.wrong || 0,
          timeMinutes: Math.round((data?.timeSpent || 0) / 60000)
        }))
        .sort((a, b) => new Date(a.dateString).getTime() - new Date(b.dateString).getTime())
        .slice(-trendRangeDays) : []);

  const accuracyRate = childStats && childStats.totalQuestions > 0
    ? Math.round((childStats.correctAnswers / childStats.totalQuestions) * 100)
    : 0;

  const rankingConfig = {
    timeMinutes: { label: '學習時長（分鐘）', format: (c) => `${c.timeMinutes} 分鐘`, order: 'desc' },
    accuracyRate: { label: '正確率', format: (c) => `${c.accuracyRate}%`, order: 'desc' },
    totalQuestions: { label: '做題數', format: (c) => `${c.totalQuestions} 題`, order: 'desc' },
    mistakesCount: { label: '錯題數', format: (c) => `${c.mistakesCount} 題`, order: 'desc' }
  };

  const rankedChildren = useMemo(() => {
    const config = rankingConfig[rankingMetric] || rankingConfig.timeMinutes;
    const sorted = [...childrenSummary].sort((a, b) => {
      const valueA = Number(a[rankingMetric] || 0);
      const valueB = Number(b[rankingMetric] || 0);
      return config.order === 'asc' ? valueA - valueB : valueB - valueA;
    });
    return sorted;
  }, [childrenSummary, rankingMetric]);

  useEffect(() => {
    const loadDailyStats = async () => {
      if (!selectedChild?.uid) {
        setDailyStatsRange([]);
        return;
      }
      try {
        const stats = await DB_SERVICE.getUserDailyStatsRange(selectedChild.uid, trendRangeDays);
        setDailyStatsRange(stats || []);
      } catch (e) {
        console.error("Load daily stats error:", e);
        setDailyStatsRange([]);
      }
    };
    loadDailyStats();
  }, [selectedChild, trendRangeDays]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black flex items-center gap-2 text-slate-800">
          <UserCog className="text-indigo-600" size={32} /> 家長監控台
        </h2>
        <button 
          onClick={() => setView('dashboard')} 
          className="text-slate-500 hover:text-slate-800 font-bold transition"
        >
          返回
        </button>
      </div>

      {/* 連結學生帳號 */}
      {children.length === 0 && !showLinkForm && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6 text-center">
          <Users size={48} className="mx-auto mb-3 text-yellow-600" />
          <h3 className="text-xl font-bold text-yellow-800 mb-2">尚未連結學生帳號</h3>
          <p className="text-yellow-700 mb-4">請輸入學生的電郵地址來連結帳號，或創建模擬學生進行測試</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowLinkForm(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold transition"
            >
              <Plus size={18} className="inline mr-2" /> 連結學生帳號
            </button>
            <button
              onClick={handleGenerateMockStudent}
              disabled={isGeneratingMock}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingMock ? '生成中...' : '🎲 創建模擬學生（含30天數據）'}
            </button>
          </div>
        </div>
      )}

      {showLinkForm && (
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-slate-800 mb-4">連結學生帳號</h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="輸入學生電郵地址"
              className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
            />
            <button
              onClick={handleLinkStudent}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
            >
              連結
            </button>
            <button
              onClick={() => {
                setShowLinkForm(false);
                setStudentEmail('');
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 學生選擇 */}
      {children.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">選擇學生：</span>
              <input
                type="text"
                value={childSearch}
                onChange={(e) => setChildSearch(e.target.value)}
                placeholder="搜尋學生姓名"
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={() => setShowLinkForm(true)}
              className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold hover:bg-indigo-200 transition flex items-center gap-2"
            >
              <Plus size={18} /> 新增學生
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children
              .filter((child) => (child.name || '').toLowerCase().includes(childSearch.toLowerCase()))
              .map((child) => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${
                    selectedChild?.id === child.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  <img
                    src={child.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${child.name}`}
                    alt={child.name}
                    className="w-12 h-12 rounded-full border border-slate-200"
                  />
                  <div>
                    <div className="font-bold text-slate-800">{child.name}</div>
                    <div className="text-xs text-slate-500">年級：{child.level || '未設定'}</div>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      {children.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={20} /> 多子女比較 / 排行（最近 {trendRangeDays} 天）
            </h3>
            <select
              value={rankingMetric}
              onChange={(e) => setRankingMetric(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm"
            >
              <option value="timeMinutes">學習時長排行</option>
              <option value="accuracyRate">正確率排行</option>
              <option value="totalQuestions">做題數排行</option>
              <option value="mistakesCount">錯題數排行</option>
            </select>
          </div>

          {comparisonLoading ? (
            <p className="text-slate-500">載入比較資料中...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {childrenSummary.map((child) => (
                  <div key={child.id} className={`border rounded-xl p-4 ${
                    selectedChild?.id === child.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={child.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${child.name}`}
                        alt={child.name}
                        className="w-10 h-10 rounded-full border border-slate-200"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{child.name}</div>
                        <div className="text-xs text-slate-500">年級：{child.level || '未設定'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-slate-500">做題數</div>
                        <div className="font-bold text-slate-800">{child.totalQuestions}</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-slate-500">正確率</div>
                        <div className="font-bold text-slate-800">{child.accuracyRate}%</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-slate-500">學習時長</div>
                        <div className="font-bold text-slate-800">{child.timeMinutes} 分鐘</div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <div className="text-slate-500">錯題數</div>
                        <div className="font-bold text-slate-800">{child.mistakesCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h4 className="font-bold text-slate-700 mb-3">排行：{rankingConfig[rankingMetric]?.label || '學習時長'}</h4>
                <div className="space-y-2">
                  {rankedChildren.map((child, index) => (
                    <div key={`${child.id}-rank`} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <img
                          src={child.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${child.name}`}
                          alt={child.name}
                          className="w-8 h-8 rounded-full border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-800">{child.name}</div>
                          <div className="text-xs text-slate-500">年級：{child.level || '未設定'}</div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-700">
                        {rankingConfig[rankingMetric]?.format(child)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {loading && !childStats ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-bold">載入中...</p>
        </div>
      ) : selectedChild && childStats ? (
        <>
          {/* 統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <BookOpen size={24} />
                <span className="text-3xl font-black">{childStats.totalQuestions}</span>
              </div>
              <p className="text-sm text-indigo-100">總題數（30天）</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Award size={24} />
                <span className="text-3xl font-black">{accuracyRate}%</span>
              </div>
              <p className="text-sm text-green-100">正確率</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <Clock size={24} />
                <span className="text-3xl font-black">
                  {Math.round(childStats.totalTimeSpent / 1000 / 60)}
                </span>
              </div>
              <p className="text-sm text-blue-100">學習時間（分鐘）</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle size={24} />
                <span className="text-3xl font-black">{childStats.mistakes.length}</span>
              </div>
              <p className="text-sm text-purple-100">錯題數</p>
            </div>
          </div>

          {/* 科目分佈 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 size={20} /> 科目分佈
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-3xl font-black text-indigo-600 mb-1">{childStats.subjects.math}</div>
                <div className="text-sm font-bold text-indigo-700">數學</div>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-lg">
                <div className="text-3xl font-black text-rose-600 mb-1">{childStats.subjects.chi}</div>
                <div className="text-sm font-bold text-rose-700">中文</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg">
                <div className="text-3xl font-black text-amber-600 mb-1">{childStats.subjects.eng}</div>
                <div className="text-sm font-bold text-amber-700">英文</div>
              </div>
            </div>
          </div>

          {/* 學習趨勢圖 */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={20} /> 學習趨勢（最近 {trendRangeDays} 天）
                </h3>
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
              <ResponsiveContainer width="100%" height={300}>
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
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock size={20} /> 每日學習時長（分鐘）
            </h3>
            {chartData.length === 0 ? (
              <p className="text-slate-500">暫無學習資料</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PieIcon size={20} /> 錯題分類分佈
            </h3>
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

          {/* AI 報告 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4 gap-2">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Sparkles size={20} /> AI 學習報告
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  placeholder="搜尋報告內容"
                  className="border rounded-lg px-3 py-1.5 text-sm"
                />
                <select
                  value={reportSort}
                  onChange={(e) => setReportSort(e.target.value)}
                  className="border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="date_desc">日期新 → 舊</option>
                  <option value="date_asc">日期舊 → 新</option>
                  <option value="days_desc">天數多 → 少</option>
                  <option value="days_asc">天數少 → 多</option>
                </select>
              </div>
              <button
                onClick={generateReport}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                <Sparkles size={18} /> 生成新報告
              </button>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <Calendar size={48} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-bold">尚未生成報告</p>
                <p className="text-sm text-slate-500 mt-1">點擊「生成新報告」來獲取 AI 分析</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports
                  .filter((report) => {
                    const text = `${report.summary || ''} ${report.recommendations?.join(' ') || ''}`;
                    return text.toLowerCase().includes(reportSearch.toLowerCase());
                  })
                  .sort((a, b) => {
                    const timeA = new Date(a.generatedAt || 0).getTime();
                    const timeB = new Date(b.generatedAt || 0).getTime();
                    if (reportSort === 'date_desc') return timeB - timeA;
                    if (reportSort === 'date_asc') return timeA - timeB;
                    if (reportSort === 'days_desc') return (b.periodDays || 0) - (a.periodDays || 0);
                    if (reportSort === 'days_asc') return (a.periodDays || 0) - (b.periodDays || 0);
                    return 0;
                  })
                  .map((report) => (
                  <div key={report.id} className="border-2 border-indigo-100 bg-indigo-50 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-indigo-900 mb-1">
                          {report.periodDays} 天學習報告
                        </h4>
                        <p className="text-sm text-indigo-700">
                          {new Date(report.generatedAt).toLocaleDateString('zh-HK')}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-700 font-medium mb-3">{report.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-bold text-green-700 mb-2">強項：</h5>
                        <ul className="list-disc list-inside text-sm text-slate-700">
                          {report.strengths.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-bold text-red-700 mb-2">弱項：</h5>
                        <ul className="list-disc list-inside text-sm text-slate-700">
                          {report.weaknesses.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h5 className="font-bold text-indigo-700 mb-2">建議：</h5>
                      <ul className="list-disc list-inside text-sm text-slate-700">
                        {report.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-indigo-200">
                      <h5 className="font-bold text-indigo-900 mb-2">下一階段計劃：</h5>
                      <p className="text-sm text-slate-700">{report.nextPhasePlan}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl">
          <Users size={48} className="mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 font-bold">請先連結學生帳號</p>
        </div>
      )}
    </div>
  );
}
