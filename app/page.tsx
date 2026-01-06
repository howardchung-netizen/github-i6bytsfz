"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import { Loader2, Sparkles, MoreVertical } from 'lucide-react';

// Logic Services
import { auth } from './lib/firebase';
import { DB_SERVICE } from './lib/db-service';
import { AI_SERVICE } from './lib/ai-service';
import { INITIAL_TOPICS, ADMIN_USER } from './lib/constants';

// UI Components
import DashboardView from './components/DashboardView';
import DeveloperView from './components/DeveloperView';
import ChineseDeveloperView from './components/ChineseDeveloperView';
import EnglishDeveloperView from './components/EnglishDeveloperView';
import PracticeView from './components/PracticeView';
import RegisterView from './components/RegisterView';
import SubscriptionView from './components/SubscriptionView';
import DailyTaskView from './components/DailyTaskView';
import { TopicSelectionView, MistakesView, ParentView, SummaryView, ProfileView } from './components/CommonViews';

// Error Boundary for Runtime Safety
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("Uncaught Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl m-4 border border-red-200">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p className="text-sm font-mono bg-white p-2 rounded border border-red-100">{this.state.error ? this.state.error.toString() : "Unknown Error"}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700">Refresh App</button>
        </div>
      );
    }
    return this.props.children; 
  }
}

// Main App Export
export default function App() {
  const [view, setView] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(ADMIN_USER);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  
  const [adhdMode, setAdhdMode] = useState(false);
  const [topics, setTopics] = useState(INITIAL_TOPICS);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stats (Mock data for now, ideally fetch from DB)
  const [stats, setStats] = useState({
    math: [{ subject: '運算', A: 80, fullMark: 100 }, { subject: '幾何', A: 65, fullMark: 100 }, { subject: '邏輯', A: 90, fullMark: 100 }, { subject: '應用題', A: 50, fullMark: 100 }, { subject: '數據', A: 70, fullMark: 100 }],
    chi: [{ subject: '閱讀', A: 75, fullMark: 100 }, { subject: '寫作', A: 60, fullMark: 100 }, { subject: '成語', A: 85, fullMark: 100 }, { subject: '文法', A: 70, fullMark: 100 }, { subject: '修辭', A: 65, fullMark: 100 }],
    eng: [{ subject: 'Grammar', A: 70, fullMark: 100 }, { subject: 'Vocab', A: 80, fullMark: 100 }, { subject: 'Reading', A: 65, fullMark: 100 }, { subject: 'Listening', A: 85, fullMark: 100 }, { subject: 'Speaking', A: 60, fullMark: 100 }]
  });
  
  const [sessionStats, setSessionStats] = useState({ total: 20, current: 0, correct: 0 });
  const [sessionMistakes, setSessionMistakes] = useState([]);
  const [sessionTopics, setSessionTopics] = useState([]);
  const [preloadedQuestion, setPreloadedQuestion] = useState(null); // 預加載的下一題
  const [dailyTasks, setDailyTasks] = useState({
    math: { used: 0, limit: 20 },
    chi: { used: 0, limit: 20 },
    eng: { used: 0, limit: 20 }
  }); // 每日任務：每科20題

  // --- Handlers ---
  const goToSelection = () => setView('selection');
  const goToDeveloper = () => setView('developer');
  const goToMistakes = () => setView('mistakes');
  const goToParent = () => setView('parent');
  const goToSubscription = () => setView('subscription');
  const goToDailyTask = (subject) => setView(`daily-task-${subject}`);
  const toggleAdhdMode = () => setAdhdMode(!adhdMode);

  // 處理支付（可整合實際支付服務如 Stripe）
  const handlePayment = async (plan, amount) => {
    // TODO: 整合實際支付服務
    // 例如：Stripe, PayPal, 或其他支付網關
    console.log(`處理支付: ${plan} - HKD ${amount}`);
    
    // 模擬支付流程
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, transactionId: `txn_${Date.now()}` });
      }, 1500);
    });
  };

  const handleLogout = () => { 
      signOut(auth).then(() => {
          setIsLoggedIn(false); 
          setUser({ name: '', level: '', xp: 0, avatar: null }); 
          setView('register'); 
      });
  };

  // --- Auto-Login & Init Logic ---
  useEffect(() => {
    // 1. 初始化 Firebase Auth
    const initAuth = async () => {
        if (!auth.currentUser) {
            try {
                console.log("🔒 Authenticating...");
                // 在開發環境下，如果沒有登入，自動使用匿名登入以確保 DB 權限
                await signInAnonymously(auth);
            } catch (e) { console.error("Auth Init Failed:", e); }
        }
    };
    initAuth();

    // 2. 監聽登入狀態
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsFirebaseReady(!!currentUser);
      if (currentUser) {
        setLoading(true);
        // 嘗試從 DB 抓取用戶資料
        const profile = await DB_SERVICE.getUserProfile(currentUser.email);
        if (profile) {
            setUser({ ...profile, id: currentUser.uid });
            setIsLoggedIn(true);
            setView('dashboard');
        } else {
             // 如果是 Admin 測試帳號，保持登入
             if (user.email === 'admin@test.com') {
                 setUser(prev => ({ ...prev, id: currentUser.uid }));
                 setIsLoggedIn(true);
             } else {
                 // 否則視為未註冊，保持在 RegisterView 但不強迫登出
                 setView('register');
             }
        }
        setLoading(false);
      } else {
        setLoading(false); 
        setView('register');
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. 載入單元與種子資料
  useEffect(() => { 
      const loadData = async () => { 
          if (!isFirebaseReady) return;
          
          // 載入單元
          try {
              const remoteTopics = await DB_SERVICE.fetchTopics(); 
              if(remoteTopics.length > 0) setTopics([...INITIAL_TOPICS, ...remoteTopics]); 
          } catch(e) { console.error("Fetch Topic Error:", e); }

          // 自動填充種子資料 (如果 DB 是空的)
          await DB_SERVICE.seedInitialData();
      }; 
      loadData(); 
  }, [isFirebaseReady]);

  // 4. 載入錯題本數據和今日題數
  useEffect(() => {
      const loadUserData = async () => {
          if (!isLoggedIn || !user.id) return;
          try {
              // 載入錯題本
              const mistakesData = await DB_SERVICE.fetchMistakes(user.id);
              // 轉換格式以符合組件需求
              const formattedMistakes = mistakesData.map(m => ({
                  id: m.questionId || m.id,
                  question: m.question,
                  answer: m.answer,
                  userWrongAnswer: m.userWrongAnswer,
                  hint: m.hint,
                  explanation: m.explanation,
                  category: m.category,
                  createdAt: m.createdAt
              }));
              setMistakes(formattedMistakes);

              // 載入每日任務（每科使用量）
              const tasks = await DB_SERVICE.getDailyTasks(user.id);
              setDailyTasks(tasks);
          } catch(e) { 
              console.error("Load User Data Error:", e); 
          }
      };
      loadUserData();
  }, [isLoggedIn, user.id]);


  // --- 檢查每日任務限制（按科目） ---
  const checkDailyTaskLimit = (subject = 'math') => {
      // 所有用戶（包括訂閱用戶）都有每日任務限制：每科20題
      const task = dailyTasks[subject] || dailyTasks.math;
      if (task.used >= task.limit) {
          return false;
      }
      return true;
  };

  // --- 獲取科目（從 topicIds 判斷，如果為空則需要從當前 view 判斷） ---
  const getSubjectFromTopics = (topicIds, fallbackSubject = 'math') => {
      if (!topicIds || topicIds.length === 0) {
          // 如果 topicIds 為空，嘗試從當前 view 判斷科目
          if (view === 'daily-task-math' || view === 'practice' && sessionTopics.length === 0 && fallbackSubject === 'math') return 'math';
          if (view === 'daily-task-chi' || view === 'practice' && sessionTopics.length === 0 && fallbackSubject === 'chi') return 'chi';
          if (view === 'daily-task-eng' || view === 'practice' && sessionTopics.length === 0 && fallbackSubject === 'eng') return 'eng';
          return fallbackSubject || 'math';
      }
      const topic = topics.find(t => topicIds.includes(t.id));
      if (!topic) return fallbackSubject || 'math';
      return topic.subject || fallbackSubject || 'math';
  };

  // --- 記錄學習歷程 ---
  const logLearningActivity = async (action, data = {}) => {
      if (!user.id || !isFirebaseReady) return;
      try {
          await DB_SERVICE.saveLearningLog(user.id, {
              action,
              timestamp: new Date().toISOString(),
              ...data
          });
      } catch(e) { 
          console.error("Save Learning Log Error:", e); 
      }
  };

  // --- Game Loop Logic ---
  const startPracticeSession = async (selectedTopicIds = [], count = 10, subjectHint = null) => { 
      // 檢查每日任務限制（按科目）
      // 如果 selectedTopicIds 為空，使用 subjectHint；否則從 topics 判斷
      const subject = selectedTopicIds.length > 0 
          ? getSubjectFromTopics(selectedTopicIds) 
          : (subjectHint || 'math');
      
      if (!checkDailyTaskLimit(subject)) {
          const subjectName = { math: '數學', chi: '中文', eng: '英文' }[subject] || '該科目';
          alert(`⚠️ ${subjectName}每日任務已達上限（20題），請選擇其他科目或明天再試！`);
          setLoading(false); // 如果達到限制，確保 loading 狀態被重置
          return;
      }

      setSessionStats({ total: count, current: 1, correct: 0 }); 
      setSessionMistakes([]); 
      setSessionTopics(selectedTopicIds);
      // 注意：loading 狀態應該在調用此函數之前就已經設置為 true（在 DailyTaskView 或 TopicSelectionView 中）
      // 這裡確保 loading 狀態是 true
      setLoading(true); 
      
      // 記錄開始練習
      await logLearningActivity('start_practice', { topicIds: selectedTopicIds, questionCount: count, subject, autoDetect: selectedTopicIds.length === 0 });
      
      let q = null; 
      try { 
          // 如果 selectedTopicIds 為空，傳入 subject 讓 AI 自動偵測該科目的題目
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', selectedTopicIds, topics, subject);
          // 更新對應科目的任務計數
          setDailyTasks(prev => ({
              ...prev,
              [subject]: { ...prev[subject], used: prev[subject].used + 1 }
          }));
          // 記錄生成題目
          await logLearningActivity('generate_question', { topicIds: selectedTopicIds, subject, autoDetect: selectedTopicIds.length === 0 });
      } catch (e) { console.error("Start session error:", e); } 
      
      if (!q) { 
          q = { id: Date.now(), question: '系統暫時無法產生題目，請檢查網絡連線或單元設定。', type: 'text', answer: 0, unit: '', lang: 'zh-HK', source: 'local' };
      } 
      
      setLoading(false); 
      setCurrentQuestion(q); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer(''); 
      setView('practice'); 

      // 預加載下一題
      if (count > 1) {
          preloadNextQuestion(selectedTopicIds);
      }
  };

  // --- 預加載下一題 ---
  const preloadNextQuestion = async (selectedTopicIds) => {
      const topicIds = selectedTopicIds || sessionTopics;
      const subject = getSubjectFromTopics(topicIds);
      if (!checkDailyTaskLimit(subject)) return; // 如果已達限制，不預加載
      
      try {
          const q = await AI_SERVICE.generateQuestion(user.level, 'normal', topicIds, topics);
          if (q) {
              setPreloadedQuestion(q);
              // 更新對應科目的任務計數
              setDailyTasks(prev => ({
                  ...prev,
                  [subject]: { ...prev[subject], used: prev[subject].used + 1 }
              }));
              // 記錄預加載題目
              await logLearningActivity('generate_question', { 
                  topicIds: topicIds,
                  subject,
                  isPreload: true 
              });
          }
      } catch(e) { 
          console.error("Preload question error:", e); 
      }
  };

  const generateNewQuestion = async () => { 
      // 如果有預加載的題目，直接使用
      if (preloadedQuestion) {
          setCurrentQuestion(preloadedQuestion);
          setPreloadedQuestion(null);
          setFeedback(null); 
          setShowExplanation(false); 
          setUserAnswer('');
          return;
      }

      // 檢查每日任務限制（按科目）
      const subject = getSubjectFromTopics(sessionTopics);
      if (!checkDailyTaskLimit(subject)) {
          const subjectName = { math: '數學', chi: '中文', eng: '英文' }[subject] || '該科目';
          alert(`⚠️ ${subjectName}每日任務已達上限（20題），請選擇其他科目或明天再試！`);
          setView('summary');
          return;
      }

      setLoading(true); 
      let q = null;
      try { 
          // 傳入 subject 參數以支持自動偵測
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', sessionTopics, topics, subject);
          // 更新對應科目的任務計數
          setDailyTasks(prev => ({
              ...prev,
              [subject]: { ...prev[subject], used: prev[subject].used + 1 }
          }));
          // 記錄生成題目
          await logLearningActivity('generate_question', { topicIds: sessionTopics, subject });
      } catch(e) { console.error("New question error:", e); } 
      
      if (!q) { 
          q = { id: Date.now(), question: '題目生成失敗，請跳過或重試。', type: 'text', answer: 0, unit: '', lang: 'zh-HK', source: 'local' };
      } 
      
      setLoading(false); 
      setCurrentQuestion(q); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer(''); 

      // 如果還有下一題，預加載
      if (sessionStats.current < sessionStats.total) {
          preloadNextQuestion();
      }
  };

  const checkAnswer = (answerToCheck) => { 
      const finalAnswer = answerToCheck || userAnswer; 
      const startTime = Date.now();
      
      // 簡單的答案檢查邏輯
      const isCorrect = (typeof currentQuestion.answer === 'number') ?
          Math.abs(parseFloat(finalAnswer) - currentQuestion.answer) < 0.1 : 
          finalAnswer.toString().trim() === currentQuestion.answer.toString().trim(); 
      
      if (isCorrect) { 
          setFeedback('correct'); 
          setUser(u => ({...u, xp: (u.xp || 0) + 100}));
          setSessionStats(s => ({...s, correct: s.correct + 1})); 
          
          // 記錄答對
          logLearningActivity('answer_correct', {
              questionId: currentQuestion.id,
              topic: currentQuestion.topic || sessionTopics[0],
              timeSpent: Date.now() - startTime
          });
      } else { 
          setFeedback('wrong'); 
          const qData = { ...currentQuestion }; 
          DB_SERVICE.saveMistake(user.id, qData, finalAnswer);
          if (!mistakes.find(m => m.id === currentQuestion.id)) setMistakes([...mistakes, currentQuestion]); 
          setSessionMistakes([...sessionMistakes, currentQuestion]); 
          
          // 記錄答錯
          logLearningActivity('answer_wrong', {
              questionId: currentQuestion.id,
              topic: currentQuestion.topic || sessionTopics[0],
              userAnswer: finalAnswer,
              correctAnswer: currentQuestion.answer,
              timeSpent: Date.now() - startTime
          });
      } 
  };

  const handleNext = () => { 
      if (sessionStats.current < sessionStats.total) { 
          setSessionStats(s => ({...s, current: s.current + 1})); 
          generateNewQuestion();
      } else { 
          // 記錄完成練習
          logLearningActivity('complete_practice', {
              totalQuestions: sessionStats.total,
              correctAnswers: sessionStats.correct,
              mistakes: sessionMistakes.length
          });
          setView('summary'); 
      } 
  };

  const retryQuestion = (mistakeData) => { 
      const q = { ...mistakeData, id: Date.now() }; 
      setCurrentQuestion(q);
      setSessionStats({ total: 1, current: 1, correct: 0 }); 
      setSessionMistakes([]); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer(''); 
      setView('practice'); 
  };

  // --- Render ---
  if (loading && !isLoggedIn && view !== 'register') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-indigo-50">
            <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-indigo-600" />
                <p className="text-slate-500 font-bold">正在連接 AI 數學教室...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <ErrorBoundary>
        {view === 'register' && <RegisterView setView={setView} setUser={(u) => { setUser(u); setIsLoggedIn(true); }} />}
        
        {user.isEditingProfile && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <ProfileView setView={() => setUser(u => ({...u, isEditingProfile: false}))} user={user} handleLogout={handleLogout} />
            </div>
        )}

        {isLoggedIn && view !== 'register' && (
          <div className="max-w-6xl mx-auto p-4 md:p-6">
             {/* Main Views */}
             {view === 'dashboard' && <DashboardView user={user} setUser={setUser} stats={stats} mistakes={mistakes} goToSelection={goToSelection} adhdMode={adhdMode} toggleAdhdMode={toggleAdhdMode} goToDeveloper={goToDeveloper} goToMistakes={goToMistakes} goToParent={goToParent} goToSubscription={goToSubscription} goToDailyTask={goToDailyTask} handleLogout={handleLogout} dailyTasks={dailyTasks} />}
             {view === 'developer' && <DeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'chinese-developer' && <ChineseDeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'english-developer' && <EnglishDeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'subscription' && <SubscriptionView user={user} setUser={setUser} setView={setView} />}
             {view === 'daily-task-math' && <DailyTaskView subject="math" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'daily-task-chi' && <DailyTaskView subject="chi" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'daily-task-eng' && <DailyTaskView subject="eng" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'selection' && <TopicSelectionView user={user} setView={setView} startPracticeSession={startPracticeSession} topics={topics} setLoading={setLoading} />}
             {view === 'mistakes' && <MistakesView setView={setView} mistakes={mistakes} retryQuestion={retryQuestion} />}
             {view === 'parent' && <ParentView setView={setView} user={user} />}
             {view === 'practice' && <PracticeView user={user} currentQuestion={currentQuestion} userAnswer={userAnswer} setUserAnswer={setUserAnswer} checkAnswer={checkAnswer} feedback={feedback} setFeedback={setFeedback} handleNext={handleNext} setView={setView} showExplanation={showExplanation} setShowExplanation={setShowExplanation} sessionProgress={sessionStats} loading={loading} adhdMode={adhdMode} />}
             {view === 'summary' && <SummaryView sessionStats={sessionStats} restartSelection={goToSelection} setView={setView} />}
             
             {/* Floating Action Button */}
             {view === 'dashboard' && (
                 <div className="fixed bottom-6 right-6">
                     <button className="bg-slate-800 hover:bg-slate-900 text-white p-3 rounded-lg shadow-lg transition flex items-center gap-2">
                         <Sparkles size={18} />
                         <MoreVertical size={16} className="opacity-70" />
                     </button>
                 </div>
             )}
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}