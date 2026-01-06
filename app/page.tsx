"use client";

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import { Loader2, Calculator } from 'lucide-react';

// Logic Services
import { auth } from './lib/firebase';
import { DB_SERVICE } from './lib/db-service';
import { AI_SERVICE } from './lib/ai-service';
import { INITIAL_TOPICS, ADMIN_USER } from './lib/constants';

// UI Components
import DashboardView from './components/DashboardView';
import DeveloperView from './components/DeveloperView';
import PracticeView from './components/PracticeView';
import RegisterView from './components/RegisterView';
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
  const [dailyQuestionCount, setDailyQuestionCount] = useState(0); // 今日已生成題數

  // --- Handlers ---
  const goToSelection = () => setView('selection');
  const goToDeveloper = () => setView('developer');
  const goToMistakes = () => setView('mistakes');
  const goToParent = () => setView('parent');
  const toggleAdhdMode = () => setAdhdMode(!adhdMode);

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

              // 載入今日已生成題數
              const todayCount = await DB_SERVICE.getDailyQuestionCount(user.id);
              setDailyQuestionCount(todayCount);
          } catch(e) { 
              console.error("Load User Data Error:", e); 
          }
      };
      loadUserData();
  }, [isLoggedIn, user.id]);


  // --- 檢查每日題數限制 ---
  const checkDailyLimit = () => {
      // 免費用戶每日限制 20 題，訂閱用戶無限制
      const FREE_USER_DAILY_LIMIT = 20;
      if (!user.isPremium && dailyQuestionCount >= FREE_USER_DAILY_LIMIT) {
          return false;
      }
      return true;
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
  const startPracticeSession = async (selectedTopicIds, count = 10) => { 
      // 檢查每日題數限制
      if (!checkDailyLimit()) {
          alert(`⚠️ 免費用戶每日限制 ${20} 題，您今日已達上限。請升級至訂閱版以獲得無限題目！`);
          return;
      }

      setSessionStats({ total: count, current: 1, correct: 0 }); 
      setSessionMistakes([]); 
      setSessionTopics(selectedTopicIds);
      setLoading(true); 
      
      // 記錄開始練習
      await logLearningActivity('start_practice', { topicIds: selectedTopicIds, questionCount: count });
      
      let q = null; 
      try { 
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', selectedTopicIds, topics);
          setDailyQuestionCount(prev => prev + 1);
          // 記錄生成題目
          await logLearningActivity('generate_question', { topicIds: selectedTopicIds });
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
      if (!checkDailyLimit()) return; // 如果已達限制，不預加載
      
      try {
          const q = await AI_SERVICE.generateQuestion(user.level, 'normal', selectedTopicIds || sessionTopics, topics);
          if (q) {
              setPreloadedQuestion(q);
              setDailyQuestionCount(prev => prev + 1);
              // 記錄預加載題目
              await logLearningActivity('generate_question', { 
                  topicIds: selectedTopicIds || sessionTopics,
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

      // 檢查每日題數限制
      if (!checkDailyLimit()) {
          alert(`⚠️ 免費用戶每日限制 ${20} 題，您今日已達上限。請升級至訂閱版以獲得無限題目！`);
          setView('summary');
          return;
      }

      setLoading(true); 
      let q = null;
      try { 
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', sessionTopics, topics);
          setDailyQuestionCount(prev => prev + 1);
          // 記錄生成題目
          await logLearningActivity('generate_question', { topicIds: sessionTopics });
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
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 p-4 md:p-8">
      <ErrorBoundary>
        {view === 'register' && <RegisterView setView={setView} setUser={(u) => { setUser(u); setIsLoggedIn(true); }} />}
        
        {user.isEditingProfile && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <ProfileView setView={() => setUser(u => ({...u, isEditingProfile: false}))} user={user} handleLogout={handleLogout} />
            </div>
        )}

        {isLoggedIn && view !== 'register' && (
          <div className="max-w-4xl mx-auto">
             {/* App Header */}
             <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-2">
                     <div className="bg-indigo-600 p-2 rounded-lg text-white"><Calculator size={24} /></div>
                     <h1 className="text-2xl font-black tracking-tight text-slate-800">
                         AI Math Tutor <span className="text-indigo-600 text-sm font-normal bg-indigo-100 px-2 py-1 rounded-full">Pro</span>
                     </h1>
                 </div>
                 {view !== 'dashboard' && view !== 'developer' && (
                     <button onClick={() => setView('dashboard')} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm">回首頁</button>
                 )}
             </div>

             {/* Main Views */}
             {view === 'dashboard' && <DashboardView user={user} setUser={setUser} stats={stats} mistakes={mistakes} goToSelection={goToSelection} adhdMode={adhdMode} toggleAdhdMode={toggleAdhdMode} goToDeveloper={goToDeveloper} goToMistakes={goToMistakes} goToParent={goToParent} handleLogout={handleLogout} dailyQuestionCount={dailyQuestionCount} />}
             {view === 'developer' && <DeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'selection' && <TopicSelectionView user={user} setView={setView} startPracticeSession={startPracticeSession} topics={topics} />}
             {view === 'mistakes' && <MistakesView setView={setView} mistakes={mistakes} retryQuestion={retryQuestion} />}
             {view === 'parent' && <ParentView setView={setView} user={user} />}
             {view === 'practice' && <PracticeView user={user} currentQuestion={currentQuestion} userAnswer={userAnswer} setUserAnswer={setUserAnswer} checkAnswer={checkAnswer} feedback={feedback} setFeedback={setFeedback} handleNext={handleNext} setView={setView} showExplanation={showExplanation} setShowExplanation={setShowExplanation} sessionProgress={sessionStats} loading={loading} adhdMode={adhdMode} />}
             {view === 'summary' && <SummaryView sessionStats={sessionStats} restartSelection={goToSelection} setView={setView} />}
             
             <div className="mt-8 text-center text-slate-400 text-xs">Powered by Google Gemini 2.0 Flash & Next.js</div>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}