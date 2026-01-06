"use client";
import React, { useRef, useEffect } from 'react';
import { Loader2, CloudLightning, BrainCircuit, Accessibility, Volume2, Home, CheckCircle, XCircle, RefreshCw, HelpCircle, ArrowRight, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { AI_SERVICE } from '../lib/ai-service';

export default function PracticeView({ 
  user, currentQuestion, userAnswer, setUserAnswer, checkAnswer, feedback, setFeedback, 
  handleNext, setView, showExplanation, setShowExplanation, sessionProgress, loading, 
  adhdMode 
}) {
  
  const handleSpeak = () => { 
      if(currentQuestion) AI_SERVICE.speakQuestion(currentQuestion.question, currentQuestion.lang);
  };

  const handleOptionClick = (opt) => {
      if (feedback) return;
      setUserAnswer(opt);
  };

  // 幾何圖形繪製元件 (內部元件)
  const GeometryCanvas = ({ shape, params }) => { 
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0,0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const scale = 20; 
        ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 3; ctx.font = '16px sans-serif'; ctx.fillStyle = '#1e3a8a'; 
        ctx.beginPath();
        if (shape === 'rectangle') {
          const w = params.w * scale; const h = params.h * scale;
          ctx.rect(centerX - w/2, centerY - h/2, w, h);
          ctx.fillText(`${params.w}cm`, centerX - 10, centerY - h/2 - 10); 
          ctx.fillText(`${params.h}cm`, centerX + w/2 + 5, centerY + 5); 
          ctx.stroke();
        } 
        if (shape === 'square') {
            const s = params.s === '?' ? 8 : params.s; 
            const label = params.s === '?' ? '?' : `${params.s}cm`;
            const drawS = s * scale;
            ctx.rect(centerX - drawS/2, centerY - drawS/2, drawS, drawS);
            ctx.fillText(label, centerX - 10, centerY - drawS/2 - 10);
            ctx.stroke();
        }
      }, [shape, params]);
      return <canvas ref={canvasRef} width={300} height={220} className="border border-slate-200 rounded-lg bg-slate-50 mx-auto" />;
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 border-t-8 border-indigo-500 relative">
      {/* 全屏 Loading Overlay - 鎖定畫面 */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-12 shadow-2xl max-w-md mx-4 text-center">
            {/* 漏斗動畫 */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="text-indigo-600 animate-spin" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">題目生成中</h3>
            <p className="text-slate-600 text-sm">AI 老師正在為您準備題目，請稍候...</p>
            <div className="mt-6 flex justify-center gap-1">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`bg-slate-50 p-4 border-b flex justify-between items-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
        <button 
          onClick={() => !loading && setView('dashboard')} 
          disabled={loading}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Home size={16} /> 退出練習
        </button>
        
        {loading ? (
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> AI Generating...
            </span>
        ) : (
           <div className="flex items-center gap-2">
             <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 border ${
                 currentQuestion?.source === 'ai_next_api' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'
             }`}>
                {currentQuestion?.source === 'ai_next_api' ? <CloudLightning size={12} className="text-green-600"/> : <BrainCircuit size={12} className="text-indigo-500"/>}
                {currentQuestion?.source === 'ai_next_api' ? 'Next.js API' : 'Seed/Local'}
             </span>
             <span className="text-slate-400 text-xs font-bold">({sessionProgress.current}/{sessionProgress.total})</span>
             {adhdMode && <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Accessibility size={12} /> 專注模式</span>}
           </div>
        )}
      </div>

      <div className={`p-8 ${loading ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-3 rounded-full mb-8 overflow-hidden">
            <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${(sessionProgress.current / sessionProgress.total) * 100}%` }}></div>
        </div>

        {!currentQuestion && !loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3">
              <Loader2 size={48} className="animate-spin text-indigo-500" />
              <p className="font-bold">準備中...</p>
          </div>
        ) : currentQuestion ? (
          <>
            <div className="mb-8 relative">
              {adhdMode && (
                <div className="flex justify-end mb-4">
                   <button onClick={() => !loading && handleSpeak()} disabled={loading} className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition shadow-sm font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                       <Volume2 size={18} /> 讀題
                   </button>
                </div>
              )}
              
              <div className="text-center">
                <h3 className={`text-xl font-bold text-slate-800 mb-6 leading-relaxed whitespace-pre-wrap ${adhdMode ? 'text-2xl leading-loose' : ''}`}>
                  {currentQuestion.question}
                </h3>

                {(currentQuestion.type === 'geometry' || currentQuestion.shape) && (
                    <div className="mb-6"><GeometryCanvas shape={currentQuestion.shape} params={currentQuestion.params} /></div>
                )}

                {currentQuestion.type === 'bar_chart' && currentQuestion.chartData && (
                    <div className="mb-6 h-64 w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentQuestion.chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis allowDecimals={false} />
                                <Bar dataKey="value" fill="#6366f1" barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
              </div>
            </div>
          
            {/* Answer Section */}
            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
              {!feedback ? (
                <>
                  {currentQuestion.options ? (
                      <div className={`grid gap-3 w-full ${currentQuestion.options.length === 8 ? 'grid-cols-4' : 'grid-cols-2'}`}>
                          {currentQuestion.options.map((opt, i) => (
                             <button 
                                key={i}
                                onClick={() => !loading && handleOptionClick(opt)}
                                disabled={loading}
                                className={`py-4 px-2 rounded-xl font-bold border-2 transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed ${userAnswer === opt ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50'}`}
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
                  ) : (
                     <div className="relative w-full">
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            value={userAnswer} 
                            onChange={(e) => !loading && setUserAnswer(e.target.value)} 
                            placeholder="在此輸入答案..." 
                            autoFocus 
                            disabled={loading}
                            className={`w-full text-center text-2xl p-4 border-2 rounded-xl outline-none transition shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${adhdMode ? 'border-indigo-300 focus:border-indigo-600' : 'border-slate-200 focus:border-indigo-500'}`} 
                            onKeyDown={(e) => !loading && e.key === 'Enter' && userAnswer && checkAnswer()} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currentQuestion.unit}</span>
                     </div>
                  )}
                  
                  <button onClick={() => !loading && checkAnswer()} disabled={!userAnswer || loading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition transform active:scale-95 mt-2 disabled:cursor-not-allowed">
                      提交答案 (Submit)
                  </button>
                </>
              ) : (
                <div className={`w-full p-6 rounded-xl text-center animate-in zoom-in-95 ${feedback === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {feedback === 'correct' ? (
                    <div className="space-y-4">
                      <div className="flex justify-center text-green-500 mb-2"><CheckCircle size={56} /></div>
                      <h4 className="text-2xl font-black text-green-700">答對了！🎉</h4>
                      <button onClick={() => !loading && handleNext()} disabled={loading} className="mt-4 bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                          {sessionProgress.current === sessionProgress.total ? '查看成績單' : '下一題'} <ArrowRight size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!showExplanation ? (
                        <>
                          <div className="flex justify-center text-red-500 mb-2"><XCircle size={56} /></div>
                          <h4 className="text-2xl font-black text-red-700">再試試看！💪</h4>
                          
                          <div className="bg-white p-4 rounded-xl border border-red-100 text-left mt-2 relative overflow-hidden shadow-sm">
                              <p className="text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><CloudLightning size={12}/> AI 提示 (Hint):</p>
                              <p className="text-slate-700 font-medium">{currentQuestion.hint}</p>
                          </div>
                          
                          <div className="flex gap-2 mt-4 flex-wrap">
                            <button onClick={() => !loading && (setFeedback(null), setUserAnswer(''))} disabled={loading} className="flex-1 min-w-[100px] bg-white border border-slate-300 text-slate-600 px-3 py-3 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                <RefreshCw size={16} className="inline mr-1" /> 重試
                            </button>
                            <button onClick={() => !loading && setShowExplanation(true)} disabled={loading} className="flex-1 min-w-[100px] bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-3 rounded-xl font-bold hover:bg-indigo-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                <HelpCircle size={16} className="inline mr-1" /> 看詳解
                            </button>
                            <button onClick={() => !loading && handleNext()} disabled={loading} className="flex-1 min-w-[80px] bg-red-100 border border-red-200 text-red-600 px-3 py-3 rounded-xl font-bold hover:bg-red-200 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                跳過 <ArrowRight size={16} className="inline ml-1" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                          <h4 className="text-lg font-bold text-indigo-800 mb-2 flex items-center justify-center gap-2">
                              <BookOpen size={20} /> AI 詳解 (Solution)
                          </h4>
                          <div className="bg-white p-5 rounded-xl border border-indigo-100 text-left text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                              {currentQuestion.explanation}
                          </div>
                          <div className="mt-4 pt-4 border-t border-red-100">
                            <p className="text-sm font-bold text-slate-500 mb-4 text-center">正確答案: <span className="text-green-600 text-lg">{currentQuestion.answer}{currentQuestion.unit}</span></p>
                            <button onClick={() => !loading && handleNext()} disabled={loading} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {sessionProgress.current === sessionProgress.total ? '查看成績單' : '下一題'} <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}