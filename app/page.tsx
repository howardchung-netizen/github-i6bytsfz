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
import TeacherView from './components/TeacherView';
import { TopicSelectionView, MistakesView, SummaryView, ProfileView } from './components/CommonViews';
import ParentView from './components/ParentView';
import FeedbackReviewView from './components/FeedbackReviewView';

// Error Boundary for Runtime Safety
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) { console.error("Uncaught Error:", error, errorInfo); }
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
  const [quotaExceeded, setQuotaExceeded] = useState(false); // 配額超限標記
  const [quotaRetryAfter, setQuotaRetryAfter] = useState(null); // 配額重試時間（秒）
  const [lastRequestTime, setLastRequestTime] = useState(0); // 上次請求時間（用於速率限制）
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
  const goToTeacher = () => setView('teacher');
  const goToSubscription = () => setView('subscription');
  const goToDailyTask = (subject) => setView(`daily-task-${subject}`);
  const toggleAdhdMode = () => setAdhdMode(!adhdMode);

  // 處理支付（可整合實際支付服務如 Stripe）
  const handlePayment = async (plan, amount) => {
    // TODO: 整合實際支付服務
    // 例如：Stripe, PayPal, 或其他支付網關
    console.log(`處理支付: ${plan} - HKD ${amount}`);
    
    // 模擬支付流程
    return new Promise<{ success: boolean; transactionId: string }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true, transactionId: `txn_${Date.now()}` });
      }, 1500);
    });
  };

  const handleLogout = () => { 
      signOut(auth).then(() => {
          setIsLoggedIn(false); 
          setUser({ 
            id: '', 
            name: '', 
            email: '', 
            level: '', 
            xp: 0, 
            avatar: '', 
            role: '', 
            school: '', 
            gender: '', 
            age: 0, 
            isPremium: false 
          }); 
          setView('register'); 
      });
  };

  const handleDeleteAccount = async (user) => {
      try {
          const success = await DB_SERVICE.deleteUserAccount(user);
          if (success) {
              // 登出用戶
              await signOut(auth);
              setIsLoggedIn(false);
              setUser({ 
                id: '', 
                name: '', 
                email: '', 
                level: '', 
                xp: 0, 
                avatar: '', 
                role: '', 
                school: '', 
                gender: '', 
                age: 0, 
                isPremium: false 
              });
              setView('register');
          }
          return success;
      } catch (error) {
          console.error("Delete account error:", error);
          return false;
      }
  };

  // --- 配額超限自動恢復 ---
  useEffect(() => {
      if (quotaExceeded && quotaRetryAfter) {
          console.log(`⏰ 配額超限，將在 ${quotaRetryAfter} 秒後自動恢復`);
          const timer = setTimeout(() => {
              setQuotaExceeded(false);
              setQuotaRetryAfter(null);
              console.log("✅ 配額限制已恢復，可以繼續生成題目");
          }, quotaRetryAfter * 1000);
          
          return () => clearTimeout(timer);
      }
  }, [quotaExceeded, quotaRetryAfter]);

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
        const profile: any = await DB_SERVICE.getUserProfile(currentUser.email);
        if (profile) {
            setUser({ 
              id: currentUser.uid,
              name: profile.name || '',
              email: profile.email || currentUser.email || '',
              level: profile.level || '',
              xp: profile.xp || 0,
              avatar: profile.avatar || '',
              role: profile.role || '',
              school: profile.school || '',
              gender: profile.gender || '',
              age: profile.age || 0,
              isPremium: profile.isPremium || false
            });
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
          // 速率限制：確保至少間隔 3 秒（如果之前有請求）
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;
          const minInterval = 3000; // 3 秒間隔
          
          if (lastRequestTime > 0 && timeSinceLastRequest < minInterval) {
              const waitTime = minInterval - timeSinceLastRequest;
              console.log(`⏳ 速率限制：等待 ${waitTime}ms 後再生成第一題`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          setLastRequestTime(Date.now());
          // 如果 selectedTopicIds 為空，傳入 subject 讓 AI 自動偵測該科目的題目
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', selectedTopicIds, topics, subject, user);
          
          // 檢查是否為錯誤回退（配額超限）
          if (q && q.source === 'error_fallback' && q.question.includes('配額')) {
              setQuotaExceeded(true);
              // 從錯誤訊息中提取重試時間
              const retryMatch = q.question.match(/等待約 (\d+) 秒/);
              if (retryMatch) {
                  setQuotaRetryAfter(parseInt(retryMatch[1]));
              }
          } else if (q && q.source !== 'error_fallback') {
              // 成功生成題目，重置配額超限標記
              setQuotaExceeded(false);
              setQuotaRetryAfter(null);
              // 更新對應科目的任務計數
              setDailyTasks(prev => ({
                  ...prev,
                  [subject]: { ...prev[subject], used: prev[subject].used + 1 }
              }));
              // 記錄生成題目
              await logLearningActivity('generate_question', { topicIds: selectedTopicIds, subject, autoDetect: selectedTopicIds.length === 0 });
          }
      } catch (e) { 
          console.error("Start session error:", e);
          // 檢查是否為配額超限錯誤
          if (e.message && (e.message.includes('quota') || e.message.includes('配額'))) {
              setQuotaExceeded(true);
          }
      } 
      
      if (!q) { 
          q = { id: Date.now(), question: '系統暫時無法產生題目，請檢查網絡連線或單元設定。', type: 'text', answer: 0, unit: '', lang: 'zh-HK', source: 'local' };
      } 
      
      setLoading(false); 
      setCurrentQuestion(q); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer(''); 
      setView('practice'); 

      // 暫時禁用預加載功能，避免快速消耗免費層配額
      // 預加載會在用戶點擊「下一題」時才觸發
      // if (count > 1 && !quotaExceeded) {
      //     setTimeout(() => {
      //         preloadNextQuestion(selectedTopicIds);
      //     }, 4000);
      // }
  };

  // --- 預加載下一題 ---
  const preloadNextQuestion = async (selectedTopicIds) => {
      // 如果配額超限，不進行預加載
      if (quotaExceeded) {
          console.log("⏸️ 配額超限，跳過預加載");
          return;
      }
      
      const topicIds = selectedTopicIds || sessionTopics;
      const subject = getSubjectFromTopics(topicIds);
      if (!checkDailyTaskLimit(subject)) return; // 如果已達限制，不預加載
      
      // 速率限制：確保至少間隔 3.5 秒（免費層每分鐘 20 個請求，保守起見使用 3.5 秒）
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      const minInterval = 3500; // 3.5 秒間隔（更保守）
      
      if (lastRequestTime > 0 && timeSinceLastRequest < minInterval) {
          const waitTime = minInterval - timeSinceLastRequest;
          console.log(`⏳ 速率限制：等待 ${Math.ceil(waitTime/1000)} 秒後再預加載`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      try {
          // 在發送請求前更新時間戳
          setLastRequestTime(Date.now());
          const q = await AI_SERVICE.generateQuestion(user.level, 'normal', topicIds, topics, null, user);
          if (q) {
              // 檢查是否為錯誤回退（配額超限）
              if (q.source === 'error_fallback' && q.question.includes('配額')) {
                  setQuotaExceeded(true);
                  // 從錯誤訊息中提取重試時間
                  const retryMatch = q.question.match(/等待約 (\d+) 秒/);
                  if (retryMatch) {
                      setQuotaRetryAfter(parseInt(retryMatch[1]));
                  }
                  console.log("⚠️ 預加載時檢測到配額超限");
                  return;
              }
              
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
          // 檢查是否為配額超限錯誤
          if (e.message && (e.message.includes('quota') || e.message.includes('配額'))) {
              setQuotaExceeded(true);
          }
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
          // 速率限制：確保至少間隔 3.5 秒（免費層每分鐘 20 個請求，保守起見使用 3.5 秒）
          const now = Date.now();
          const timeSinceLastRequest = now - lastRequestTime;
          const minInterval = 3500; // 3.5 秒間隔（更保守）
          
          if (lastRequestTime > 0 && timeSinceLastRequest < minInterval) {
              const waitTime = minInterval - timeSinceLastRequest;
              console.log(`⏳ 速率限制：等待 ${Math.ceil(waitTime/1000)} 秒`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          // 在發送請求前更新時間戳
          setLastRequestTime(Date.now());
          // 傳入 subject 參數以支持自動偵測
          q = await AI_SERVICE.generateQuestion(user.level, 'normal', sessionTopics, topics, subject, user);
          
          // 檢查是否為錯誤回退（配額超限）
          if (q && q.source === 'error_fallback' && q.question.includes('配額')) {
              setQuotaExceeded(true);
              // 從錯誤訊息中提取重試時間
              const retryMatch = q.question.match(/等待約 (\d+) 秒/);
              if (retryMatch) {
                  setQuotaRetryAfter(parseInt(retryMatch[1]));
              }
          } else if (q && q.source !== 'error_fallback') {
              // 成功生成題目，重置配額超限標記
              setQuotaExceeded(false);
              setQuotaRetryAfter(null);
              // 更新對應科目的任務計數
              setDailyTasks(prev => ({
                  ...prev,
                  [subject]: { ...prev[subject], used: prev[subject].used + 1 }
              }));
              // 記錄生成題目
              await logLearningActivity('generate_question', { topicIds: sessionTopics, subject });
          }
      } catch(e) { 
          console.error("New question error:", e);
          // 檢查是否為配額超限錯誤
          if (e.message && (e.message.includes('quota') || e.message.includes('配額'))) {
              setQuotaExceeded(true);
          }
      } 
      
      if (!q) { 
          q = { id: Date.now(), question: '題目生成失敗，請跳過或重試。', type: 'text', answer: 0, unit: '', lang: 'zh-HK', source: 'local' };
      } 
      
      setLoading(false); 
      setCurrentQuestion(q); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer(''); 

      // 暫時禁用預加載功能，避免快速消耗免費層配額
      // 用戶點擊「下一題」時才會生成新題目
      // if (sessionStats.current < sessionStats.total && !quotaExceeded) {
      //     setTimeout(() => {
      //         preloadNextQuestion();
      //     }, 4000);
      // }
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

  const retryQuestion = async (mistakeData) => { 
      // 設置 loading 狀態並切換到 practice view
      setLoading(true);
      setView('practice');
      
      // 重置狀態
      setSessionStats({ total: 1, current: 1, correct: 0 }); 
      setSessionMistakes([]); 
      setFeedback(null); 
      setShowExplanation(false); 
      setUserAnswer('');
      
      try {
          // 調用 AI 生成「舉一反三」的新題目
          const newQuestion = await AI_SERVICE.generateVariationFromMistake(mistakeData, user.level, topics);
          
          if (newQuestion) {
              setCurrentQuestion(newQuestion);
              // 記錄生成舉一反三題目
              await logLearningActivity('generate_variation_from_mistake', {
                  originalMistakeId: mistakeData.id || mistakeData.questionId,
                  newQuestionId: newQuestion.id,
                  category: mistakeData.category
              });
          } else {
              // 如果生成失敗，使用原題目
              const q = { ...mistakeData, id: Date.now() }; 
              setCurrentQuestion(q);
          }
      } catch (error) {
          console.error("Error generating variation:", error);
          // 錯誤時使用原題目
          const q = { ...mistakeData, id: Date.now() }; 
          setCurrentQuestion(q);
      } finally {
          setLoading(false);
      }
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
                <ProfileView setView={() => setUser(u => ({...u, isEditingProfile: false}))} user={user} handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} />
            </div>
        )}

        {isLoggedIn && view !== 'register' && (
          <div className="max-w-6xl mx-auto p-4 md:p-6">
             {/* Main Views */}
             {view === 'dashboard' && <DashboardView user={user} setUser={setUser} stats={stats} mistakes={mistakes} goToSelection={goToSelection} adhdMode={adhdMode} toggleAdhdMode={toggleAdhdMode} goToDeveloper={goToDeveloper} goToMistakes={goToMistakes} goToParent={goToParent} goToTeacher={goToTeacher} goToSubscription={goToSubscription} goToDailyTask={goToDailyTask} handleLogout={handleLogout} dailyTasks={dailyTasks} />}
             {view === 'developer' && <DeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} user={user} />}
             {view === 'feedback-review' && <FeedbackReviewView setView={setView} user={user} isFirebaseReady={isFirebaseReady} />}
             {view === 'chinese-developer' && <ChineseDeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'english-developer' && <EnglishDeveloperView topics={topics} setTopics={setTopics} setView={setView} isFirebaseReady={isFirebaseReady} />}
             {view === 'subscription' && <SubscriptionView user={user} setUser={setUser} setView={setView} />}
             {view === 'daily-task-math' && <DailyTaskView subject="math" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'daily-task-chi' && <DailyTaskView subject="chi" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'daily-task-eng' && <DailyTaskView subject="eng" dailyTasks={dailyTasks} setView={setView} startPracticeSession={startPracticeSession} user={user} setLoading={setLoading} />}
             {view === 'selection' && <TopicSelectionView user={user} setView={setView} startPracticeSession={startPracticeSession} topics={topics} setLoading={setLoading} />}
             {view === 'mistakes' && <MistakesView setView={setView} mistakes={mistakes} retryQuestion={retryQuestion} />}
             {view === 'parent' && <ParentView setView={setView} user={user} />}
             {view === 'teacher' && <TeacherView setView={setView} user={user} topics={topics} />}
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