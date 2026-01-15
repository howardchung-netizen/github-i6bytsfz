"use client";
import React, { useRef, useEffect, useState } from 'react';
import { Loader2, CloudLightning, BrainCircuit, Accessibility, Volume2, Home, CheckCircle, XCircle, RefreshCw, HelpCircle, ArrowRight, BookOpen, Save, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { AI_SERVICE } from '../lib/ai-service';
import { highlightKeywords, speakTextForADHD, isSpeechSynthesisSupported } from '../lib/adhd-utils';
import { DB_SERVICE } from '../lib/db-service';
import { RAG_SERVICE } from '../lib/rag-service';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export default function PracticeView({ 
  user, currentQuestion, userAnswer, setUserAnswer, checkAnswer, feedback, setFeedback, 
  handleNext, setView, showExplanation, setShowExplanation, sessionProgress, loading, 
  adhdMode, topics
}) {
  
  // 邏輯補充相關狀態（僅開發者可見）
  const isDeveloper = user && user.email === 'admin@test.com';
  const [feedbackText, setFeedbackText] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  
  // ADHD 模式：自動播放語音
  useEffect(() => {
    if (adhdMode && currentQuestion && !loading && !feedback) {
      // 延遲一點播放，讓用戶先看到題目
      const timer = setTimeout(() => {
        speakTextForADHD(
          currentQuestion.question, 
          currentQuestion.lang || 'zh-HK',
          { rate: 0.75, pitch: 1.0, volume: 1.0 }
        );
      }, 500);
      
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [adhdMode, currentQuestion?.id, loading, feedback]);
  
  // 當題目變化時，清空回饋輸入
  useEffect(() => {
    if (currentQuestion) {
      setFeedbackText('');
    }
  }, [currentQuestion?.id]);

  const handleSpeak = () => { 
      if(currentQuestion) {
        speakTextForADHD(
          currentQuestion.question, 
          currentQuestion.lang || 'zh-HK',
          { rate: 0.75, pitch: 1.0, volume: 1.0 }
        );
      }
  };

  const handleOptionClick = (opt) => {
      if (feedback) return;
      setUserAnswer(opt);
  };
  
  // 保存邏輯補充回饋（僅開發者）
  const handleSaveFeedback = async () => {
      if (!isDeveloper) {
          alert('❌ 只有開發者帳號可以使用此功能');
          return;
      }
      
      if (!feedbackText.trim()) {
          alert('請輸入回饋內容');
          return;
      }
      
      if (!currentQuestion) {
          alert('沒有當前題目');
          return;
      }
      
      setIsSavingFeedback(true);
      try {
          // 推斷科目
          const questionId = typeof currentQuestion.id === 'number' 
              ? currentQuestion.id.toString() 
              : currentQuestion.id;
          const topicId = currentQuestion.topic_id || null;
          const category = currentQuestion.category || currentQuestion.topic || '其他';
          const subject = currentQuestion.subject || 'math';
          
          // 推斷題型
          const questionType = [];
          if (currentQuestion.type === 'mcq' || currentQuestion.options) {
              questionType.push('選擇題');
          } else {
              questionType.push('文字題');
          }
          if (currentQuestion.type === 'geometry' || currentQuestion.shape) {
              questionType.push('幾何題');
          }
          
          // 保存回饋
          const feedbackData = {
              questionId: questionId,
              questionType: questionType.length > 0 ? questionType : ['其他'],
              category: category,
              subject: subject,
              feedback: feedbackText.trim(),
              createdBy: user.email
          };
          
          const feedbackId = await DB_SERVICE.saveDeveloperFeedback(feedbackData);
          
          if (feedbackId) {
              // 根據回饋生成改進題目
              try {
                  const improvedQuestion = await AI_SERVICE.generateVariationFromMistake(
                      {
                          question: currentQuestion.question,
                          answer: currentQuestion.answer,
                          category: category,
                          topic: currentQuestion.topic || category,
                          options: currentQuestion.options
                      },
                      user?.level || 'P4',
                      topics || [],
                      feedbackText.trim() // 傳遞回饋文本
                  );
                  
                  if (improvedQuestion) {
                      // 儲存改進題目到資料庫
                      const topicIdForSave = topicId || (topics && topics.length > 0 ? topics[0].id : null);
                      await RAG_SERVICE.saveGeneratedQuestion(
                          improvedQuestion,
                          topicIdForSave,
                          user?.level || 'P4',
                          subject,
                          topics || []
                      );
                      alert('✅ 回饋已保存！改進題目已生成並儲存到資料庫。');
                  } else {
                      alert('✅ 回饋已保存！但改進題目生成失敗。');
                  }
              } catch (improveError) {
                  console.error('生成改進題目失敗:', improveError);
                  alert('✅ 回饋已保存！但改進題目生成失敗：' + (improveError.message || '未知錯誤'));
              }
              
              // 清空輸入
              setFeedbackText('');
          } else {
              alert('❌ 保存失敗，請檢查連線');
          }
      } catch (e) {
          console.error("Save Feedback Error:", e);
          alert('保存失敗：' + (e.message || '未知錯誤'));
      } finally {
          setIsSavingFeedback(false);
      }
  };

  // 渲染包含 LaTeX 的文本
  const renderMathText = (text) => {
    if (!text) return '';
    
    // 清理可能的錯誤格式：將單個反斜杠後跟數字的情況轉換為普通文本
    // 例如：\350 -> 350, \38 -> 38（這些不是 LaTeX，而是錯誤的轉義）
    let cleanedText = text;
    
    // 匹配 $...$ 格式的 LaTeX（不匹配 $$...$$）
    const mathRegex = /\$([^$]+)\$/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = mathRegex.exec(cleanedText)) !== null) {
      // 添加 LaTeX 前的文本
      if (match.index > lastIndex) {
        const textBefore = cleanedText.substring(lastIndex, match.index);
        // 清理錯誤的反斜杠轉義（單個反斜杠後跟數字，但不是有效的 LaTeX）
        const cleanedBefore = textBefore.replace(/\\([0-9]+)/g, '$1');
        if (cleanedBefore) {
          parts.push({ type: 'text', content: cleanedBefore });
        }
      }
      // 添加 LaTeX 數學公式
      parts.push({ type: 'math', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩餘文本
    if (lastIndex < cleanedText.length) {
      const remainingText = cleanedText.substring(lastIndex);
      // 清理錯誤的反斜杠轉義
      const cleanedRemaining = remainingText.replace(/\\([0-9]+)/g, '$1');
      if (cleanedRemaining) {
        parts.push({ type: 'text', content: cleanedRemaining });
      }
    }
    
    // 如果沒有匹配到 LaTeX，清理並返回原文本
    if (parts.length === 0) {
      const cleaned = cleanedText.replace(/\\([0-9]+)/g, '$1');
      return cleaned;
    }
    
    return parts.map((part, index) => {
      if (part.type === 'math') {
        try {
          return <InlineMath key={index} math={part.content} style={{ fontFamily: 'KaTeX_Main, "Times New Roman", serif' }} />;
        } catch (e) {
          console.error('KaTeX render error:', e, part.content);
          return <span key={index} className="font-mono">${part.content}$</span>;
        }
      }
      return <span key={index} style={{ fontFamily: 'inherit' }}>{part.content}</span>;
    });
  };

  // 幾何圖形繪製元件 (內部元件) - 擴展版
  const GeometryCanvas = ({ shape, params, mapData }) => { 
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const scale = 20; 
        ctx.strokeStyle = '#2563EB'; 
        ctx.lineWidth = 3; 
        ctx.font = '16px sans-serif'; 
        ctx.fillStyle = '#1e3a8a';
        
        // === 基本幾何圖形 ===
        if (shape === 'rectangle') {
          const w = params.w * scale; 
          const h = params.h * scale;
          ctx.beginPath();
          ctx.rect(centerX - w/2, centerY - h/2, w, h);
          ctx.stroke();
          ctx.fillText(`${params.w}cm`, centerX - 10, centerY - h/2 - 10); 
          ctx.fillText(`${params.h}cm`, centerX + w/2 + 5, centerY + 5); 
        } 
        else if (shape === 'square') {
          const s = params.s === '?' ? 8 : params.s; 
          const label = params.s === '?' ? '?' : `${params.s}cm`;
          const drawS = s * scale;
          ctx.beginPath();
          ctx.rect(centerX - drawS/2, centerY - drawS/2, drawS, drawS);
          ctx.stroke();
          ctx.fillText(label, centerX - 10, centerY - drawS/2 - 10);
        }
        // === 三角形 ===
        else if (shape === 'triangle') {
          const base = (params.base || params.b || 6) * scale;
          const height = (params.height || params.h || 4) * scale;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - height/2); // 頂點
          ctx.lineTo(centerX - base/2, centerY + height/2); // 左下
          ctx.lineTo(centerX + base/2, centerY + height/2); // 右下
          ctx.closePath();
          ctx.stroke();
          ctx.fillText(`${params.base || params.b || 6}cm`, centerX - base/2, centerY + height/2 + 20);
          ctx.fillText(`${params.height || params.h || 4}cm`, centerX + base/2 + 10, centerY);
        }
        // === 圓形 ===
        else if (shape === 'circle') {
          const radius = (params.radius || params.r || 4) * scale;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
          // 繪製半徑線
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(centerX + radius, centerY);
          ctx.stroke();
          ctx.fillText(`r=${params.radius || params.r || 4}cm`, centerX + radius/2, centerY - 10);
        }
        // === 梯形 ===
        else if (shape === 'trapezoid') {
          const top = (params.top || 4) * scale;
          const bottom = (params.bottom || params.base || 8) * scale;
          const height = (params.height || params.h || 5) * scale;
          ctx.beginPath();
          ctx.moveTo(centerX - top/2, centerY - height/2);
          ctx.lineTo(centerX + top/2, centerY - height/2);
          ctx.lineTo(centerX + bottom/2, centerY + height/2);
          ctx.lineTo(centerX - bottom/2, centerY + height/2);
          ctx.closePath();
          ctx.stroke();
          ctx.fillText(`${params.top || 4}cm`, centerX - 5, centerY - height/2 - 10);
          ctx.fillText(`${params.bottom || params.base || 8}cm`, centerX - 10, centerY + height/2 + 20);
        }
        // === 平行四邊形 ===
        else if (shape === 'parallelogram') {
          const base = (params.base || params.b || 8) * scale;
          const height = (params.height || params.h || 4) * scale;
          const offset = scale; // 傾斜偏移
          ctx.beginPath();
          ctx.moveTo(centerX - base/2 + offset, centerY - height/2);
          ctx.lineTo(centerX + base/2 + offset, centerY - height/2);
          ctx.lineTo(centerX + base/2, centerY + height/2);
          ctx.lineTo(centerX - base/2, centerY + height/2);
          ctx.closePath();
          ctx.stroke();
          ctx.fillText(`${params.base || params.b || 8}cm`, centerX, centerY - height/2 - 10);
        }
        // === 不規則圖形（多邊形）===
        else if (shape === 'irregular' && params.points) {
          ctx.beginPath();
          params.points.forEach((point, i) => {
            const x = centerX + (point.x * scale);
            const y = centerY + (point.y * scale);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.stroke();
          // 標記點
          params.points.forEach((point, i) => {
            const x = centerX + (point.x * scale);
            const y = centerY + (point.y * scale);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1e3a8a';
          });
        }
        // === 複合圖形 ===
        else if (shape === 'composite' && params.shapes) {
          params.shapes.forEach((subShape) => {
            const offsetX = (subShape.offset?.x || 0) * scale;
            const offsetY = (subShape.offset?.y || 0) * scale;
            const subCenterX = centerX + offsetX;
            const subCenterY = centerY + offsetY;
            
            if (subShape.type === 'rectangle') {
              const w = subShape.params.w * scale;
              const h = subShape.params.h * scale;
              ctx.beginPath();
              ctx.rect(subCenterX - w/2, subCenterY - h/2, w, h);
              ctx.stroke();
            } else if (subShape.type === 'square') {
              const s = subShape.params.s * scale;
              ctx.beginPath();
              ctx.rect(subCenterX - s/2, subCenterY - s/2, s, s);
              ctx.stroke();
            }
            // 可以繼續添加其他子圖形類型
          });
        }
        // === 8 位方向地圖 ===
        else if (shape === 'map_grid' && mapData) {
          const gridSize = mapData.gridSize || { rows: 5, cols: 5 };
          const cellWidth = canvas.width / (gridSize.cols + 2);
          const cellHeight = canvas.height / (gridSize.rows + 2);
          const startX = cellWidth;
          const startY = cellHeight;
          
          // 繪製網格
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          for (let i = 0; i <= gridSize.rows; i++) {
            ctx.beginPath();
            ctx.moveTo(startX, startY + i * cellHeight);
            ctx.lineTo(startX + gridSize.cols * cellWidth, startY + i * cellHeight);
            ctx.stroke();
          }
          for (let j = 0; j <= gridSize.cols; j++) {
            ctx.beginPath();
            ctx.moveTo(startX + j * cellWidth, startY);
            ctx.lineTo(startX + j * cellWidth, startY + gridSize.rows * cellHeight);
            ctx.stroke();
          }
          
          // 繪製起點
          if (mapData.startPos) {
            const startRow = mapData.startPos.row || 0;
            const startCol = mapData.startPos.col || 0;
            const cellX = startX + startCol * cellWidth + cellWidth / 2;
            const cellY = startY + startRow * cellHeight + cellHeight / 2;
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(cellX, cellY, cellWidth / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('起', cellX - 6, cellY + 4);
          }
          
          // 繪製路徑
          if (mapData.path && mapData.path.length > 0) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.fillStyle = '#3b82f6';
            
            let currentRow = mapData.startPos?.row || 0;
            let currentCol = mapData.startPos?.col || 0;
            let currentX = startX + currentCol * cellWidth + cellWidth / 2;
            let currentY = startY + currentRow * cellHeight + cellHeight / 2;
            
            mapData.path.forEach((step) => {
              const direction = step.direction?.toLowerCase() || 'north';
              const steps = step.steps || 1;
              
              for (let s = 0; s < steps; s++) {
                let nextRow = currentRow;
                let nextCol = currentCol;
                
                // 計算下一步位置
                if (direction.includes('north')) nextRow--;
                if (direction.includes('south')) nextRow++;
                if (direction.includes('west')) nextCol--;
                if (direction.includes('east')) nextCol++;
                
                const nextX = startX + nextCol * cellWidth + cellWidth / 2;
                const nextY = startY + nextRow * cellHeight + cellHeight / 2;
                
                // 繪製線段
                ctx.beginPath();
                ctx.moveTo(currentX, currentY);
                ctx.lineTo(nextX, nextY);
                ctx.stroke();
                
                // 繪製箭頭
                const angle = Math.atan2(nextY - currentY, nextX - currentX);
                const arrowLength = cellWidth / 3;
                ctx.beginPath();
                ctx.moveTo(nextX, nextY);
                ctx.lineTo(
                  nextX - arrowLength * Math.cos(angle - Math.PI / 6),
                  nextY - arrowLength * Math.sin(angle - Math.PI / 6)
                );
                ctx.moveTo(nextX, nextY);
                ctx.lineTo(
                  nextX - arrowLength * Math.cos(angle + Math.PI / 6),
                  nextY - arrowLength * Math.sin(angle + Math.PI / 6)
                );
                ctx.stroke();
                
                currentRow = nextRow;
                currentCol = nextCol;
                currentX = nextX;
                currentY = nextY;
              }
            });
          }
          
          // 繪製地標
          if (mapData.landmarks) {
            mapData.landmarks.forEach((landmark) => {
              const cellX = startX + landmark.col * cellWidth + cellWidth / 2;
              const cellY = startY + landmark.row * cellHeight + cellHeight / 2;
              ctx.fillStyle = '#f59e0b';
              ctx.beginPath();
              ctx.arc(cellX, cellY, cellWidth / 5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#1e3a8a';
              ctx.font = '10px sans-serif';
              ctx.fillText(landmark.label || '', cellX - 10, cellY - cellHeight / 2);
            });
          }
          
          // 繪製方向標記（N, S, E, W）
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText('N', startX - cellWidth / 2, startY - 5);
          ctx.fillText('S', startX - cellWidth / 2, startY + gridSize.rows * cellHeight + 15);
          ctx.fillText('W', startX - 15, startY + gridSize.rows * cellHeight / 2);
          ctx.fillText('E', startX + gridSize.cols * cellWidth + 5, startY + gridSize.rows * cellHeight / 2);
        }
        
        ctx.fillStyle = '#1e3a8a'; // 重置顏色
      }, [shape, params, mapData]);
      
      return <canvas ref={canvasRef} width={400} height={300} className="border border-slate-200 rounded-lg bg-slate-50 mx-auto" />;
  };

  return (
    <div className={`max-w-3xl mx-auto rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 relative ${
      adhdMode 
        ? 'bg-white border-t-8 border-yellow-400' 
        : 'bg-white border-t-8 border-indigo-500'
    }`} style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' }}>
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
      <div className={`p-4 border-b flex justify-between items-center ${loading ? 'pointer-events-none opacity-50' : ''} ${
        adhdMode ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'
      }`}>
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

      <div className={`p-8 ${loading ? 'pointer-events-none opacity-50' : ''} ${adhdMode ? 'bg-white' : ''}`}>
        {/* Progress Bar */}
        <div className={`w-full h-3 rounded-full mb-8 overflow-hidden ${adhdMode ? 'bg-yellow-100' : 'bg-slate-100'}`}>
            <div className={`h-3 rounded-full transition-all duration-500 ease-out ${adhdMode ? 'bg-yellow-500' : 'bg-indigo-600'}`} style={{ width: `${(sessionProgress.current / sessionProgress.total) * 100}%` }}></div>
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
                   <button 
                     onClick={() => !loading && handleSpeak()} 
                     disabled={loading || !isSpeechSynthesisSupported()} 
                     className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg transition shadow-md font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-600"
                   >
                       <Volume2 size={18} /> 重新讀題
                   </button>
                </div>
              )}
              
              <div className="text-center">
                <h3 className={`text-xl font-bold text-slate-800 mb-6 leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere ${adhdMode ? 'text-2xl leading-loose' : ''}`} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {adhdMode ? (
                    <span className="inline-block max-w-full">
                      {renderMathText(currentQuestion.question)}
                    </span>
                  ) : (
                    <span className="inline-block max-w-full">{renderMathText(currentQuestion.question)}</span>
                  )}
                </h3>

                {(currentQuestion.type === 'geometry' || currentQuestion.shape) && (
                    <div className="mb-6">
                      <GeometryCanvas 
                        shape={currentQuestion.shape} 
                        params={currentQuestion.params} 
                        mapData={currentQuestion.mapData}
                      />
                    </div>
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
            
            {/* 邏輯補充（僅開發者可見） */}
            {isDeveloper && (
                <div className="mb-4 max-w-xl mx-auto">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                                <Sparkles size={12} className="text-indigo-600" />
                                邏輯補充
                            </h4>
                        </div>
                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="例如：注意單位換算，答案格式應為小數..."
                            className="w-full h-16 bg-white border border-indigo-300 rounded-md p-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
                        />
                        <button
                            onClick={handleSaveFeedback}
                            disabled={isSavingFeedback || !feedbackText.trim()}
                            className="mt-1.5 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-1.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 text-xs"
                        >
                            {isSavingFeedback ? (
                                <>
                                    <RefreshCw size={12} className="animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <Save size={12} />
                                    保存回饋
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
          
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
                                className={`py-4 px-2 rounded-xl font-bold border-2 transition-all shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed break-words overflow-wrap-anywhere ${
                                  adhdMode 
                                    ? (userAnswer === opt 
                                        ? 'border-yellow-600 bg-yellow-100 text-yellow-900 shadow-md' 
                                        : 'border-yellow-300 hover:border-yellow-500 text-slate-700 hover:bg-yellow-50')
                                    : (userAnswer === opt 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-200 hover:border-indigo-300 text-slate-600 hover:bg-slate-50')
                                }`}
                              >
                                  <span>{renderMathText(opt)}</span>
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
                            className={`w-full text-center text-2xl p-4 border-2 rounded-xl outline-none transition shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${
                              adhdMode 
                                ? 'border-yellow-400 focus:border-yellow-600 bg-yellow-50 focus:bg-yellow-100' 
                                : 'border-slate-200 focus:border-indigo-500'
                            }`} 
                            onKeyDown={(e) => !loading && e.key === 'Enter' && userAnswer && checkAnswer()} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currentQuestion.unit}</span>
                     </div>
                  )}
                  
                  <button 
                    onClick={() => !loading && checkAnswer()} 
                    disabled={!userAnswer || loading} 
                    className={`w-full text-white font-bold py-4 px-6 rounded-xl shadow-lg transition transform active:scale-95 mt-2 disabled:cursor-not-allowed ${
                      adhdMode 
                        ? 'bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 border-2 border-yellow-700' 
                        : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300'
                    }`}
                  >
                      提交答案 (Submit)
                  </button>
                </>
              ) : (
                <div className={`w-full p-6 rounded-xl text-center animate-in zoom-in-95 ${
                  feedback === 'correct' 
                    ? (adhdMode ? 'bg-green-100 border-2 border-green-400' : 'bg-green-50 border border-green-200')
                    : (adhdMode ? 'bg-red-100 border-2 border-red-400' : 'bg-red-50 border border-red-200')
                }`}>
                  {feedback === 'correct' ? (
                    <div className="space-y-4">
                      <div className="flex justify-center text-green-500 mb-2"><CheckCircle size={56} /></div>
                      <h4 className="text-2xl font-black text-green-700">答對了！🎉</h4>
                      <button 
                        onClick={() => !loading && handleNext()} 
                        disabled={loading} 
                        className={`mt-4 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          adhdMode 
                            ? 'bg-green-600 hover:bg-green-700 border-2 border-green-800' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                          {sessionProgress.current === sessionProgress.total ? '查看成績單' : '下一題'} <ArrowRight size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!showExplanation ? (
                        <>
                          <div className="flex justify-center text-red-500 mb-2"><XCircle size={56} /></div>
                          <h4 className="text-2xl font-black text-red-700">再試試看！💪</h4>
                          
                          <div className={`p-4 rounded-xl border text-left mt-2 relative overflow-hidden shadow-sm ${
                            adhdMode 
                              ? 'bg-yellow-50 border-2 border-yellow-300' 
                              : 'bg-white border border-red-100'
                          }`}>
                              <p className={`text-xs font-bold uppercase mb-1 flex items-center gap-1 ${
                                adhdMode ? 'text-yellow-900' : 'text-slate-500'
                              }`}>
                                <CloudLightning size={12}/> AI 提示 (Hint):
                              </p>
                              <p className={`font-medium ${adhdMode ? 'text-yellow-900 text-lg' : 'text-slate-700'}`}>
                                {adhdMode ? (
                                  <span className="inline-block">
                                    {highlightKeywords(currentQuestion.hint || '', currentQuestion.lang || 'zh-HK')}
                                  </span>
                                ) : (
                                  currentQuestion.hint
                                )}
                              </p>
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
                          <div className={`p-5 rounded-xl border text-left whitespace-pre-wrap leading-relaxed shadow-sm ${
                            adhdMode 
                              ? 'bg-yellow-50 border-2 border-yellow-300 text-yellow-900 text-base' 
                              : 'bg-white border border-indigo-100 text-sm text-slate-700'
                          }`}>
                              {adhdMode ? (
                                <span className="inline-block">
                                  {renderMathText(currentQuestion.explanation || '')}
                                </span>
                              ) : (
                                <span>{renderMathText(currentQuestion.explanation || '')}</span>
                              )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-red-100">
                            <p className="text-sm font-bold text-slate-500 mb-4 text-center">正確答案: <span className="text-green-600 text-lg">{renderMathText(String(currentQuestion.answer || ''))}{currentQuestion.unit}</span></p>
                            <button 
                              onClick={() => !loading && handleNext()} 
                              disabled={loading} 
                              className={`w-full text-white px-6 py-3 rounded-xl font-bold shadow transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                adhdMode 
                                  ? 'bg-yellow-500 hover:bg-yellow-600 border-2 border-yellow-700' 
                                  : 'bg-indigo-600 hover:bg-indigo-700'
                              }`}
                            >
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