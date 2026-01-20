"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Home, Upload, Save, FileJson, RefreshCw, Sparkles, Database, Trash2, Plus, MessageSquare, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DB_SERVICE } from '../lib/db-service';

// 👇 注意這裡 props 接收了 setTopics
export default function DeveloperView({ topics, setTopics, setView, isFirebaseReady, user }) {
  const [activeTab, setActiveTab] = useState('syllabus');
  
  // 教學者試題管理狀態
  const [teacherQuestions, setTeacherQuestions] = useState([]);
  const [isLoadingTeacherQuestions, setIsLoadingTeacherQuestions] = useState(false);
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({ year: '2024', grade: 'P4', term: '上學期', topicId: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  
  // 新增單元相關狀態（數學科）
  const [newTopic, setNewTopic] = useState({ name: '', grade: 'P4', term: '上學期', subject: 'math' });
  const [subTopics, setSubTopics] = useState([]);
  const [subTopicInput, setSubTopicInput] = useState('');
  const [topicEdits, setTopicEdits] = useState({});

  // 測試生成相關狀態
  const [testSeed, setTestSeed] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // 開發者回饋相關狀態
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>([]);
  const [questionCategory, setQuestionCategory] = useState('');
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  // 教學者回饋通知欄
  const [pendingTeacherFeedbackCount, setPendingTeacherFeedbackCount] = useState(0);
  const [isLoadingTeacherFeedbackCount, setIsLoadingTeacherFeedbackCount] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isNormalizingSyllabus, setIsNormalizingSyllabus] = useState(false);
  
  
  // 圖像上傳相關狀態
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pdfPages, setPdfPages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState({ current: 0, total: 0 });

  // 工廠模式（Factory）
  const [factoryPoolType, setFactoryPoolType] = useState('TEXT');
  const [factorySelections, setFactorySelections] = useState<Record<string, {
    selected?: boolean;
    qty?: number;
    grade?: string;
    subject?: string;
    topicId?: string;
    subTopic?: string;
  }>>({});
  const [factorySeedImages, setFactorySeedImages] = useState<File[]>([]);
  const [factoryQueue, setFactoryQueue] = useState([]);
  const [factoryStats, setFactoryStats] = useState({ draftCount: 0, publishedCount: 0 });
  const [factoryStockMap, setFactoryStockMap] = useState({});
  const [isFactoryGenerating, setIsFactoryGenerating] = useState(false);
  const [isFactoryLoadingQueue, setIsFactoryLoadingQueue] = useState(false);
  const [isFactoryAuditingAll, setIsFactoryAuditingAll] = useState(false);
  const [factoryAuditLoading, setFactoryAuditLoading] = useState({});
  const [factoryPublishLoading, setFactoryPublishLoading] = useState({});
  const [factoryDiscardLoading, setFactoryDiscardLoading] = useState({});

  // 取得目前條件下的可用單元 (用於下拉選單，只顯示數學科)
  const availableTopics = useMemo(() => {
    return topics.filter(t => t.grade === paperMeta.grade && t.subject === 'math');
  }, [topics, paperMeta.grade]);

  useEffect(() => {
    const fetchCount = async () => { 
        if(!isFirebaseReady) return; 
        const c = await DB_SERVICE.countPastPapers(); 
        setPaperCount(c); 
    };
    if(activeTab === 'past_papers') fetchCount();
  }, [activeTab, isFirebaseReady]);

  const factoryTopicTree = useMemo(() => {
    return topics.reduce((groups, t) => {
      const gradeKey = t.grade || 'P4';
      const subjectKey = t.subject || 'math';
      if (!groups[gradeKey]) groups[gradeKey] = {};
      if (!groups[gradeKey][subjectKey]) groups[gradeKey][subjectKey] = [];
      groups[gradeKey][subjectKey].push(t);
      return groups;
    }, {});
  }, [topics]);

  const unauditedQueue = useMemo(
    () => factoryQueue.filter(q => q.status === 'DRAFT' && !q.auditMeta),
    [factoryQueue]
  );

  const auditedQueue = useMemo(
    () => factoryQueue.filter(q => q.status === 'DRAFT' && q.auditMeta),
    [factoryQueue]
  );

  const unauditedSummary = useMemo<{ label: string; count: number }[]>(() => {
    const map: Record<string, number> = {};
    unauditedQueue.forEach(item => {
      const label = `${item.grade || 'P4'} ${item.subject || ''} - ${item.topic || item.topic_id || '未分類'}`;
      map[label] = (map[label] || 0) + 1;
    });
    const entries = Object.entries(map) as Array<[string, number]>;
    return entries.map(([label, count]) => ({ label, count }));
  }, [unauditedQueue]);

  useEffect(() => {
    if (activeTab !== 'factory') return;
    loadFactoryQueue();
    loadFactoryStock();
  }, [activeTab, isFirebaseReady]);

  // --- Handlers ---
  const handleAddSubTopic = () => { 
      if (!subTopicInput.trim()) return; 
      setSubTopics([...subTopics, subTopicInput.trim()]); 
      setSubTopicInput(''); 
  };

  const loadFactoryQueue = async () => {
    if (!isFirebaseReady) return;
    setIsFactoryLoadingQueue(true);
    try {
      const [queue, stats] = await Promise.all([
        DB_SERVICE.fetchFactoryQueue(['DRAFT', 'AUDITED', 'REJECTED']),
        DB_SERVICE.getFactoryStats()
      ]);
      setFactoryQueue(queue);
      setFactoryStats({
        draftCount: stats.draftCount || 0,
        publishedCount: stats.publishedCount || 0
      });
    } catch (e) {
      console.error("Load Factory Queue Error:", e);
    } finally {
      setIsFactoryLoadingQueue(false);
    }
  };

  const loadFactoryStock = async () => {
    if (!isFirebaseReady) return;
    try {
      const combos = topics.reduce((acc, t) => {
        const key = `${t.grade}__${t.subject}`;
        if (!acc[key]) acc[key] = { grade: t.grade, subject: t.subject };
        return acc;
      }, {});
      const entries = Object.values(combos);
      const results = await Promise.all(entries.map(item => DB_SERVICE.getPublishedQuestionCounts(item)));
      const merged = {};
      results.forEach((map) => {
        Object.entries(map || {}).forEach(([topicKey, val]) => {
          if (!merged[topicKey]) {
            merged[topicKey] = { total: 0, subTopics: {} };
          }
          merged[topicKey].total += val.total || 0;
          if (val.subTopics) {
            Object.entries(val.subTopics).forEach(([st, count]) => {
              merged[topicKey].subTopics[st] = (merged[topicKey].subTopics[st] || 0) + count;
            });
          }
        });
      });
      setFactoryStockMap(merged);
    } catch (e) {
      console.error("Load Factory Stock Error:", e);
    }
  };

  const parseAuditReport = (raw) => {
    if (!raw) return null;
    try {
      if (typeof raw === 'string') return JSON.parse(raw);
      return raw;
    } catch {
      return null;
    }
  };

  const handleFactoryGenerate = async () => {
    if (isFactoryGenerating) return;
    const selectedItems = Object.values(factorySelections).filter(item => item?.selected);
    if (selectedItems.length === 0) {
      alert("請至少勾選一個單元或子單元");
      return;
    }
    let seedImageBase64 = null;
    if (factorySeedImages.length > 0) {
      try {
        seedImageBase64 = await convertImageToBase64(factorySeedImages[0]);
      } catch (e) {
        alert("圖像轉換失敗，請重試");
        return;
      }
    }
    setIsFactoryGenerating(true);
    try {
      for (const item of selectedItems) {
        const qty = Math.max(1, Number(item.qty || 1));
        const payload: any = {
          poolType: factoryPoolType,
          type: factoryPoolType,
          count: qty,
          topic: item.topicId,
          grade: item.grade,
          subject: item.subject,
          subTopic: item.subTopic || null
        };
        if (seedImageBase64) {
          payload.seedImage = seedImageBase64;
        }
        const response = await fetch('/api/factory/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Factory generate failed');
        }
      }
      alert("✅ 批量生產完成");
      setFactorySeedImages([]);
      setFactorySelections({});
      await loadFactoryQueue();
      await loadFactoryStock();
    } catch (e) {
      console.error("Factory Generate Error:", e);
      alert(`生產失敗：${e.message || '未知錯誤'}`);
    } finally {
      setIsFactoryGenerating(false);
    }
  };

  const handleFactoryAudit = async (questionIds = []) => {
    if (!questionIds.length) return;
    if (questionIds.length > 1) {
      setIsFactoryAuditingAll(true);
    }
    const loadingState = {};
    questionIds.forEach(id => { loadingState[id] = true; });
    setFactoryAuditLoading(prev => ({ ...prev, ...loadingState }));
    try {
      const response = await fetch('/api/factory/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Factory audit failed');
      }
      await loadFactoryQueue();
    } catch (e) {
      console.error("Factory Audit Error:", e);
      alert(`審核失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryAuditLoading(prev => {
        const next = { ...prev };
        questionIds.forEach(id => { delete next[id]; });
        return next;
      });
      setIsFactoryAuditingAll(false);
    }
  };

  const handleFactoryPublish = async (questionId) => {
    if (!questionId) return;
    setFactoryPublishLoading(prev => ({ ...prev, [questionId]: true }));
    try {
      const response = await fetch('/api/factory/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [questionId] })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Publish failed');
      }
      await loadFactoryQueue();
      await loadFactoryStock();
    } catch (e) {
      console.error("Factory Publish Error:", e);
      alert(`發布失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryPublishLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleFactoryDiscard = async (questionId) => {
    if (!questionId) return;
    if (!confirm('確定要丟棄此題目嗎？')) return;
    setFactoryDiscardLoading(prev => ({ ...prev, [questionId]: true }));
    try {
      const ok = await DB_SERVICE.deleteQuestionFromPool(questionId);
      if (!ok) throw new Error('Delete failed');
      await loadFactoryQueue();
    } catch (e) {
      console.error("Factory Discard Error:", e);
      alert(`丟棄失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryDiscardLoading(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const handleAddTopic = async () => {
     const topicToAdd = { 
         name: newTopic.name, grade: newTopic.grade, term: newTopic.term, subject: newTopic.subject, 
         type: 'text', lang: newTopic.subject === 'math' ? 'zh-HK' : 'en', 
         subTopics: subTopics, createdAt: new Date().toISOString() 
     };
     
     // 1. 寫入資料庫
     const docId = await DB_SERVICE.addTopic(topicToAdd);
     
     if (docId) {
         // 2. 關鍵修正：立即更新前端狀態 (State)，不用等重新整理
         const newTopicWithId = { id: docId, ...topicToAdd };
         setTopics(prevTopics => [...prevTopics, newTopicWithId]);
         
         alert("單元已成功新增！");
         // 清空輸入
         setNewTopic({...newTopic, name: ''});
         setSubTopics([]);
     } else {
         alert("新增失敗，請檢查連線。");
     }
  };

  const updateTopicInState = (id, patch) => {
    setTopics(prevTopics => prevTopics.map(t => (t.id === id ? { ...t, ...patch } : t)));
  };

  const handleRenameTopic = async (topic) => {
    const nextName = String(topicEdits?.[topic.id]?.name ?? topic.name).trim();
    if (!nextName) {
      alert("請輸入單元名稱");
      return;
    }
    if (nextName === topic.name) {
      alert("名稱沒有變更");
      return;
    }
    const ok = await DB_SERVICE.updateTopic(topic.id, { name: nextName });
    if (ok) {
      updateTopicInState(topic.id, { name: nextName });
      alert("單元名稱已更新");
    } else {
      alert("更新失敗，請檢查連線。");
    }
  };

  const handleDeleteTopic = async (topic) => {
    const confirmed = window.confirm(`確定要刪除「${topic.name}」嗎？此操作無法復原。`);
    if (!confirmed) return;
    const ok = await DB_SERVICE.deleteTopic(topic.id);
    if (ok) {
      setTopics(prevTopics => prevTopics.filter(t => t.id !== topic.id));
      setTopicEdits(prev => {
        const next = { ...prev };
        delete next[topic.id];
        return next;
      });
      alert("已刪除單元");
    } else {
      alert("刪除失敗，請檢查連線。");
    }
  };

  const handleAddSubTopicFor = async (topic) => {
    const input = String(topicEdits?.[topic.id]?.subTopicInput ?? '').trim();
    if (!input) return;
    const nextSubTopics = [...(topic.subTopics || []), input];
    const ok = await DB_SERVICE.updateTopic(topic.id, { subTopics: nextSubTopics });
    if (ok) {
      updateTopicInState(topic.id, { subTopics: nextSubTopics });
      setTopicEdits(prev => ({
        ...prev,
        [topic.id]: { ...prev?.[topic.id], subTopicInput: '' }
      }));
    } else {
      alert("新增子單元失敗，請檢查連線。");
    }
  };

  const handleRemoveSubTopicFor = async (topic, index) => {
    const nextSubTopics = (topic.subTopics || []).filter((_, i) => i !== index);
    const ok = await DB_SERVICE.updateTopic(topic.id, { subTopics: nextSubTopics });
    if (ok) {
      updateTopicInState(topic.id, { subTopics: nextSubTopics });
    } else {
      alert("移除子單元失敗，請檢查連線。");
    }
  };

  const handleRenameSubTopicFor = async (topic, index) => {
    const nextName = String(topicEdits?.[topic.id]?.subTopicEdits?.[index] ?? topic.subTopics?.[index] ?? '').trim();
    if (!nextName) {
      alert("請輸入子單元名稱");
      return;
    }
    if (nextName === topic.subTopics?.[index]) {
      alert("子單元名稱沒有變更");
      return;
    }
    const nextSubTopics = [...(topic.subTopics || [])];
    nextSubTopics[index] = nextName;
    const ok = await DB_SERVICE.updateTopic(topic.id, { subTopics: nextSubTopics });
    if (ok) {
      updateTopicInState(topic.id, { subTopics: nextSubTopics });
    } else {
      alert("更新子單元失敗，請檢查連線。");
    }
  };

  const handleNormalizeSyllabus = async () => {
    if (!isFirebaseReady) {
      alert("Firebase 尚未就緒，請稍後再試。");
      return;
    }
    setIsNormalizingSyllabus(true);
    const result = await DB_SERVICE.normalizeSyllabusDocs();
    setIsNormalizingSyllabus(false);
    if (result?.error) {
      alert("格式修正失敗，請檢查連線。");
      return;
    }
    alert(`格式修正完成：更新 ${result.updated} 筆，略過 ${result.skipped} 筆`);
    const remoteTopics = await DB_SERVICE.fetchTopics();
    if (remoteTopics.length > 0) {
      setTopics([...remoteTopics]);
    }
  };

  // 圖像轉 Base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertPdfToImages = async (file: File) => {
    try {
      setIsPreparingPdf(true);
      // @ts-ignore - pdfjs-dist 缺少型別宣告
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js';
      }
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const pages: { name: string; dataUrl: string }[] = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/png');
        pages.push({ name: `${file.name}-page-${pageNum}.png`, dataUrl });
      }
      return pages;
    } catch (e) {
      console.error("PDF Convert Error:", e);
      return [];
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleSeedFileChange = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    const imageList = list.filter(f => f.type.startsWith('image/'));
    const pdfList = list.filter(f => f.type === 'application/pdf');
    if (imageList.length > 0) {
      setImageFiles(imageList);
    }
    if (pdfList.length > 0) {
      const pages = [];
      for (const pdfFile of pdfList) {
        const pdfPages = await convertPdfToImages(pdfFile);
        pages.push(...pdfPages);
      }
      setPdfPages(pages);
    }
  };

  // 檢查是否為圖像 Base64
  const isImageBase64 = (str: string): boolean => {
    return typeof str === 'string' && (
      str.startsWith('data:image/') || 
      /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 100
    );
  };

  // 處理單個圖像（Vision API）
  const processSingleImage = async (imageBase64: string, fileName?: string): Promise<any> => {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: imageBase64,
          prompt: "請分析這張數學題目的圖像，提取圖形類型和參數，返回 JSON 格式"
        })
      });

      const data = await response.json();
      
      if (data.success && data.result) {
        return {
          ...data.result,
          imageFileName: fileName,
          processedAt: new Date().toISOString(),
          source: 'vision_api'
        };
      } else {
        throw new Error(data.error || '識別失敗');
      }
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : '處理失敗');
    }
  };

  // 統一上傳處理（自動分類）
  const handleUnifiedUpload = async () => {
    const allQuestions = [];
    const errors = [];
    let hasImages = false;

    setIsUploading(true);
    setIsProcessingImages(true);
    setImageProcessingProgress({ current: 0, total: 0 });

    try {
      const totalImages = imageFiles.length + pdfPages.length;
      // 步驟 1：處理上傳的圖像/PDF頁面
      if (totalImages > 0) {
        hasImages = true;
        setImageProcessingProgress({ current: 0, total: totalImages });
        let currentIndex = 0;

        for (const page of pdfPages) {
          currentIndex += 1;
          setImageProcessingProgress({ current: currentIndex, total: totalImages });
          try {
            const result = await processSingleImage(page.dataUrl, page.name);
            allQuestions.push(result);
          } catch (e) {
            errors.push({
              source: 'pdf_page',
              name: page.name,
              error: e instanceof Error ? e.message : '處理失敗'
            });
          }
        }

        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          currentIndex += 1;
          setImageProcessingProgress({ current: currentIndex, total: totalImages });
          
          try {
            const base64 = await convertImageToBase64(file);
            const result = await processSingleImage(base64, file.name);
            allQuestions.push(result);
          } catch (e) {
            errors.push({ 
              source: 'image_file', 
              name: file.name, 
              error: e instanceof Error ? e.message : '處理失敗' 
            });
          }
        }
      }

      // 步驟 2：處理 JSON 輸入
      if (paperJson.trim()) {
        try {
          const rawData = JSON.parse(paperJson);
          const jsonQuestions = Array.isArray(rawData) ? rawData : [rawData];
          
          for (const q of jsonQuestions) {
            // 檢查是否包含圖像
            if (q.image && isImageBase64(q.image)) {
              // 包含圖像，需要調用 Vision API
              hasImages = true;
              setImageProcessingProgress(prev => ({ 
                current: prev.current + 1, 
                total: prev.total + 1 
              }));
              
              try {
                const result = await processSingleImage(q.image, q.imageFileName || 'json_image');
                // 合併原有數據和識別結果
                allQuestions.push({
                  ...q,
                  ...result,
                  source: 'vision_api'
                });
              } catch (e) {
                errors.push({ 
                  source: 'json_image', 
                  name: q.question || '未知題目', 
                  error: e instanceof Error ? e.message : '處理失敗' 
                });
              }
            } else {
              // 純文字題目，直接使用（不調用 Vision API）
              allQuestions.push({
                ...q,
                source: 'manual_json'
              });
            }
          }
        } catch (e) {
          errors.push({ 
            source: 'json_parse', 
            name: 'JSON 解析', 
            error: e instanceof Error ? e.message : 'JSON 格式錯誤' 
          });
        }
      }

      // 步驟 3：如果沒有任何內容，提示用戶
      if (allQuestions.length === 0 && imageFiles.length === 0 && pdfPages.length === 0 && !paperJson.trim()) {
        alert("請至少上傳圖像或輸入 JSON 內容");
        setIsUploading(false);
        setIsProcessingImages(false);
        return;
      }

      // 步驟 4：保存到數據庫
      if (allQuestions.length > 0) {
        let selectedTopicName = null;
        if (paperMeta.topicId) {
          const found = topics.find(t => t.id === paperMeta.topicId);
          if (found) selectedTopicName = found.name;
        }

        const enrichedPapers = allQuestions.map(q => ({
          ...q,
          year: paperMeta.year,
          grade: paperMeta.grade,
          term: paperMeta.term,
          topic: selectedTopicName || q.topic,
          source: q.source || 'seed_init',
          subject: 'math',
          uploadedAt: new Date().toISOString()
        }));

        await DB_SERVICE.uploadPastPaperBatch(enrichedPapers);
        
        // 統計信息
        const textCount = enrichedPapers.filter(q => q.source === 'manual_json').length;
        const imageCount = enrichedPapers.filter(q => q.source === 'vision_api').length;
        
        let message = `✅ 成功上傳 ${enrichedPapers.length} 道種子題目！\n\n`;
        message += `📝 文字題目：${textCount} 道（免費）\n`;
        message += `📷 圖像題目：${imageCount} 道（已自動識別）`;
        
        if (errors.length > 0) {
          message += `\n\n⚠️ ${errors.length} 項處理失敗`;
        }
        
        alert(message);
        
        // 清空表單
        setPaperJson('');
        setImageFiles([]);
        setPdfPages([]);
        const c = await DB_SERVICE.countPastPapers();
        setPaperCount(c);
      } else {
        alert(`所有內容處理失敗。${errors.map(e => `\n${e.name}: ${e.error}`).join('')}`);
      }

    } catch (e) {
      alert("上傳失敗：" + (e instanceof Error ? e.message : '未知錯誤'));
    } finally {
      setIsUploading(false);
      setIsProcessingImages(false);
      setImageProcessingProgress({ current: 0, total: 0 });
    }
  };


  const handleTestGenerate = async () => {
      if (!testSeed) { alert("請先從下方貼上一道題目的 JSON 來當作測試種子"); return; }
      setIsGenerating(true);
      setGeneratedResult(null);
      try {
          const mockTopicList = [{id: 'test', name: testSeed.topic || '一般數學'}];
          const prompt = `
            Role: Math Teacher.
            Task: Create a NEW variation of this seed: "${testSeed.question}".
            Topic: ${testSeed.topic}. Level: ${paperMeta.grade}.
            Output strict JSON: { "question": "...", "answer": "...", "explanation": "..." }
          `;
          
          const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: prompt }),
          });
          const data = await response.json();
          setGeneratedResult(data.response); 
      } catch (e) {
          setGeneratedResult("Error: " + e.message);
      }
      setIsGenerating(false);
  };

  // 保存開發者回饋
  const handleSaveFeedback = async () => {
      // 權限檢查：只有 admin@test.com 可以保存
      if (!user || user.email !== 'admin@test.com') {
          alert('❌ 只有開發者帳號（admin@test.com）可以保存回饋');
          return;
      }

      if (!feedbackText.trim()) {
          alert('請輸入回饋內容');
          return;
      }

      if (selectedQuestionTypes.length === 0) {
          alert('請至少選擇一個題型');
          return;
      }

      if (!questionCategory) {
          alert('請選擇分類');
          return;
      }

      setIsSavingFeedback(true);
      try {
          const feedbackData = {
              questionId: testSeed?.id || null,
              questionType: selectedQuestionTypes,
              category: questionCategory,
              subject: 'math', // 數學科
              feedback: feedbackText.trim(),
              createdBy: user.email
          };

          const feedbackId = await DB_SERVICE.saveDeveloperFeedback(feedbackData);
          
          if (feedbackId) {
              alert('✅ 回饋已保存！AI 將在生成類似題目時參考此回饋。');
              // 清空輸入
              setFeedbackText('');
              setSelectedQuestionTypes([]);
              setQuestionCategory('');
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

  // 切換題型選擇（多選）
  const toggleQuestionType = (type) => {
      if (selectedQuestionTypes.includes(type)) {
          setSelectedQuestionTypes(selectedQuestionTypes.filter(t => t !== type));
      } else {
          setSelectedQuestionTypes([...selectedQuestionTypes, type]);
      }
  };

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
        </div>

        {activeTab === 'syllabus' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Plus size={18}/> 新增數學單元</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">年級</label>
                                <select value={newTopic.grade} onChange={e => setNewTopic({...newTopic, grade: e.target.value})} className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                                    {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">學期</label>
                                <select value={newTopic.term} onChange={e => setNewTopic({...newTopic, term: e.target.value})} className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                                    <option>上學期</option><option>下學期</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">單元名稱</label>
                            <input type="text" value={newTopic.name} onChange={e => setNewTopic({...newTopic, name: e.target.value})} className="w-full border p-2 rounded text-sm bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" placeholder="例如：分數的加減" />
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">子單元 (Sub-topics)</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={subTopicInput} onChange={e => setSubTopicInput(e.target.value)} className="flex-1 border p-2 rounded text-sm bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" placeholder="輸入後按新增" />
                                <button onClick={handleAddSubTopic} className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-bold hover:bg-slate-300">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {subTopics.map((st, i) => (
                                    <span key={i} className="text-xs bg-white border px-2 py-1 rounded flex items-center gap-1">
                                        {st} <button onClick={() => setSubTopics(subTopics.filter((_, idx) => idx !== i))}><Trash2 size={10} className="text-red-400"/></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleAddTopic} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition">儲存單元至資料庫</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-slate-700"><Database size={18}/> 現有單元列表</h3>
                        <button
                            onClick={handleNormalizeSyllabus}
                            disabled={isNormalizingSyllabus}
                            className="text-xs bg-slate-800 text-white px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-60"
                        >
                            {isNormalizingSyllabus ? '修正中...' : '修正格式'}
                        </button>
                    </div>
                    <div className="h-64 overflow-y-auto space-y-3">
                        {/* 👇 修正：這裡會根據更新後的 topics 渲染，新增的會馬上跑出來（只顯示數學科） */}
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'math').map(t => {
                            const edit = topicEdits?.[t.id] || {};
                            return (
                                <details key={t.id} className="border rounded-lg bg-white text-sm">
                                    <summary className="list-none cursor-pointer p-3 hover:bg-slate-50 rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-indigo-700">{t.name}</div>
                                            <div className="text-xs text-slate-400">{t.grade} • {t.term} • {t.subTopics?.length || 0} 子題</div>
                                        </div>
                                        <span className="text-xs text-slate-400">展開</span>
                                    </summary>
                                    <div className="p-3 pt-0 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={edit.name ?? t.name}
                                                onChange={e => setTopicEdits(prev => ({ ...prev, [t.id]: { ...prev?.[t.id], name: e.target.value } }))}
                                                className="flex-1 border p-2 rounded text-xs bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                                                placeholder="輸入新名稱"
                                            />
                                            <button onClick={() => handleRenameTopic(t)} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold hover:bg-slate-300">改名</button>
                                            <button onClick={() => handleDeleteTopic(t)} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-100">刪除</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={edit.subTopicInput ?? ''}
                                                onChange={e => setTopicEdits(prev => ({ ...prev, [t.id]: { ...prev?.[t.id], subTopicInput: e.target.value } }))}
                                                className="flex-1 border p-2 rounded text-xs bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                                                placeholder="新增子單元"
                                            />
                                            <button onClick={() => handleAddSubTopicFor(t)} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold hover:bg-slate-300">新增</button>
                                        </div>
                                        <div className="space-y-2">
                                            {(t.subTopics || []).map((st, idx) => (
                                                <div key={`${t.id}-${idx}`} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        value={edit.subTopicEdits?.[idx] ?? st}
                                                        onChange={e => setTopicEdits(prev => ({
                                                            ...prev,
                                                            [t.id]: {
                                                                ...prev?.[t.id],
                                                                subTopicEdits: {
                                                                    ...(prev?.[t.id]?.subTopicEdits || {}),
                                                                    [idx]: e.target.value
                                                                }
                                                            }
                                                        }))}
                                                        className="flex-1 border p-2 rounded text-xs bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                                                    />
                                                    <button onClick={() => handleRenameSubTopicFor(t, idx)} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold hover:bg-slate-300">改名</button>
                                                    <button onClick={() => handleRemoveSubTopicFor(t, idx)} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-100">刪除</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </details>
                            );
                        })}
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'math').length === 0 && <div className="text-center text-slate-400 py-10">此年級尚無數學單元</div>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'analytics' && isAdminReviewer && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">開發者後台總覽</h3>
                    <button
                        onClick={loadAnalytics}
                        disabled={isLoadingAnalytics}
                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition"
                    >
                        重新整理
                    </button>
                </div>

                {isLoadingAnalytics && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
                        載入中...
                    </div>
                )}

                {!isLoadingAnalytics && !analyticsData && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
                        暫無數據，請稍後再試。
                    </div>
                )}

                {!isLoadingAnalytics && analyticsData && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="text-xs text-slate-500">造訪數</div>
                                <div className="text-2xl font-bold">{analyticsData.visits?.total || 0}</div>
                                <div className="text-xs text-slate-500">Web {analyticsData.visits?.web || 0} / 平板 {analyticsData.visits?.tablet || 0}</div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="text-xs text-slate-500">下載率（暫以註冊代替）</div>
                                <div className="text-2xl font-bold">
                                    {((analyticsData.signups?.download_rate || 0) * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-slate-500">
                                    近 30 日註冊 {analyticsData.signups?.total || 0}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="text-xs text-slate-500">新帳號申請（近 30 日）</div>
                                <div className="text-2xl font-bold">
                                    {analyticsData.users?.new_30d || 0}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Web {analyticsData.signups?.web || 0} / 平板 {analyticsData.signups?.app || 0}
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <div className="text-xs text-slate-500">每月訂閱人數（目前）</div>
                                <div className="text-2xl font-bold">
                                    {analyticsData.users?.premium_total || 0}
                                </div>
                                <div className="text-xs text-slate-500">近 30 日新增 {analyticsData.users?.premium_new_30d || 0}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                                帳號總數：{analyticsData.users?.total || 0}
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                                生成量：{analyticsData.generation?.gen_count || 0}（失敗 {analyticsData.generation?.gen_fail_count || 0}）
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                                平台比例：Web {analyticsData.visits?.web || 0} / 平板 {analyticsData.visits?.tablet || 0}
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                                註冊率（Web / 平板）：{((analyticsData.signups?.web_rate || 0) * 100).toFixed(1)}% / {((analyticsData.signups?.app_rate || 0) * 100).toFixed(1)}%
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                                DAU / WAU / MAU：{analyticsData.active_users?.dau || 0} / {analyticsData.active_users?.wau || 0} / {analyticsData.active_users?.mau || 0}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">近 30 日造訪趨勢</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsData.daily || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">近 30 日註冊趨勢</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analyticsData.daily || []}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="web_signups" stroke="#10b981" strokeWidth={2} name="Web 註冊" />
                                            <Line type="monotone" dataKey="app_signups" stroke="#f59e0b" strokeWidth={2} name="平板註冊" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">平台分佈</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Web', value: analyticsData.visits?.web || 0 },
                                                    { name: '平板', value: analyticsData.visits?.tablet || 0 }
                                                ]}
                                                dataKey="value"
                                                nameKey="name"
                                                outerRadius={90}
                                                label
                                            >
                                                <Cell fill="#6366f1" />
                                                <Cell fill="#f59e0b" />
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">角色分佈</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(analyticsData.users?.roles_total || analyticsData.roles || {}).map(([name, value]) => ({ name, value }))}
                                                dataKey="value"
                                                nameKey="name"
                                                outerRadius={90}
                                                label
                                            >
                                                {Object.keys(analyticsData.users?.roles_total || analyticsData.roles || {}).map((_, index) => (
                                                    <Cell key={`role-${index}`} fill={['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}

        {activeTab === 'past_papers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-green-600"/> 上傳種子試題 (Seed Upload)</h3>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">DB Total: {paperCount}</span>
                    </div>
                    
                    <div className="flex gap-4 mb-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">年級</label>
                            <select value={paperMeta.grade} onChange={e => setPaperMeta({...paperMeta, grade: e.target.value})} className="border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                                {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-700 mb-1">指定單元 (選填)</label>
                            <select value={paperMeta.topicId} onChange={e => setPaperMeta({...paperMeta, topicId: e.target.value})} className="border border-slate-600 bg-slate-800 text-white p-2 rounded text-sm w-full font-bold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                                <option value="">🤖 自動偵測 / 不指定</option>
                                {/* 👇 修正：下拉選單也會同步更新（只顯示數學科） */}
                                {availableTopics.map(t => (<option key={t.id} value={t.id}>📍 強制歸類: {t.name}</option>))}
                            </select>
                        </div>
                    </div>
                    
                    {/* 統一上傳介面 */}
                    <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
                        <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Upload size={18} className="text-green-600"/> 
                            統一上傳介面（系統自動分類，節省成本）
                        </h4>
                        
                        {/* 方式 1：上傳圖像 */}
                        <div className="mb-3">
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                            📷 方式 1：上傳圖像或 PDF（支持多選，自動識別圖形）
                        </label>
                            <input
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={(e) => handleSeedFileChange(e.target.files)}
                                className="w-full text-xs border border-slate-600 rounded p-2 bg-slate-800 text-white"
                            disabled={isUploading || isProcessingImages || isPreparingPdf}
                        />
                        {(imageFiles.length > 0 || pdfPages.length > 0) && (
                            <div className="text-xs text-green-700 mt-1 font-bold">
                                ✓ 已選擇 {imageFiles.length + pdfPages.length} 張圖像
                            </div>
                        )}
                        {isPreparingPdf && (
                            <div className="text-xs text-amber-500 mt-1 font-bold">
                                PDF 轉圖中，請稍候...
                            </div>
                        )}
                        </div>

                        {/* 方式 2：輸入 JSON */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-slate-700 mb-2">
                                📝 方式 2：貼上 JSON（文字題目或包含圖像的 JSON）
                            </label>
                            <textarea 
                                value={paperJson} 
                                onChange={e => setPaperJson(e.target.value)} 
                                className="w-full h-32 border border-slate-600 rounded-lg p-3 font-mono text-xs bg-slate-800 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-green-200 outline-none" 
                                placeholder='[ { "question": "...", "answer": "...", "topic": "..." } ]&#10;或包含 "image": "data:image/..." 的 JSON'
                                disabled={isUploading || isProcessingImages}
                            ></textarea>
                        </div>

                        {/* 說明 */}
                        <div className="bg-white/60 rounded p-2 mb-3">
                            <div className="text-xs text-slate-600 space-y-1">
                                <div className="flex items-start gap-2">
                                    <span className="text-green-600 font-bold">💡</span>
                                    <span><strong>自動分類：</strong>系統會自動識別文字題目和圖像題目</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-blue-600 font-bold">💰</span>
                                    <span><strong>成本優化：</strong>只有圖像題目會調用 Vision API，文字題目免費</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-purple-600 font-bold">⚡</span>
                                    <span><strong>混合上傳：</strong>可同時上傳圖像和 JSON，系統會統一處理</span>
                                </div>
                            </div>
                        </div>

                        {/* 統一上傳按鈕 */}
                        <button 
                            onClick={handleUnifiedUpload} 
                            disabled={isUploading || isProcessingImages || (imageFiles.length === 0 && pdfPages.length === 0 && !paperJson.trim())} 
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isUploading || isProcessingImages ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin"/>
                                    {isProcessingImages 
                                        ? `處理中 ${imageProcessingProgress.current}/${imageProcessingProgress.total || (imageFiles.length + pdfPages.length)}...` 
                                        : '上傳中...'}
                                </>
                            ) : (
                                <>
                                    <Save size={18}/>
                                    一鍵上傳（自動分類處理）
                                </>
                            )}
                        </button>
                    </div>
                 </div>

                 <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400" size={20}/> AI 生成測試 (Seed Test)</h3>
                     <p className="text-xs text-slate-400 mb-4">貼上一段 JSON 種子，測試系統是否能正確生成變體。</p>
                     
                     <textarea 
                        onChange={e => {
                            try { setTestSeed(JSON.parse(e.target.value)); } catch(err) { setTestSeed(null); }
                        }}
                        className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-green-400 mb-4 focus:outline-none"
                        placeholder='{"question": "小明有5個蘋果...", "topic": "加法"}'
                     ></textarea>

                     <button 
                        onClick={handleTestGenerate} 
                        disabled={isGenerating || !testSeed}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-2 rounded-lg mb-4 transition flex items-center justify-center gap-2"
                     >
                        {isGenerating ? 'AI 思考中...' : '生成新題目'} <RefreshCw size={16}/>
                     </button>

                     <div className="bg-black/50 p-4 rounded-lg min-h-[100px] text-xs font-mono text-slate-300 whitespace-pre-wrap border border-slate-700 mb-4">
                         {generatedResult ? generatedResult : "// AI 生成結果將顯示於此..."}
                     </div>

                 </div>
            </div>
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
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 font-semibold">待審核庫存</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{factoryStats.draftCount}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200">
                        <div className="text-xs text-slate-500 font-semibold">已入庫總數</div>
                        <div className="text-2xl font-bold text-slate-800 mt-1">{factoryStats.publishedCount}</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Upload size={18} className="text-amber-600" /> 生產下單與庫存監控
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Pool 類型</label>
                            <select
                                value={factoryPoolType}
                                onChange={e => setFactoryPoolType(e.target.value)}
                                className="w-full border p-2 rounded text-sm bg-white"
                            >
                                <option value="TEXT">TEXT（文字題）</option>
                                <option value="IMAGE_STATIC">IMAGE_STATIC（圖片題）</option>
                                <option value="IMAGE_CANVAS">IMAGE_CANVAS（幾何題）</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500">種子圖片（選填，圖片題用）</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setFactorySeedImages(Array.from(e.target.files || []))}
                                className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
                            />
                            {factorySeedImages.length > 0 && (
                                <div className="text-xs text-emerald-600 mt-1 font-semibold">
                                    ✓ 已選擇 {factorySeedImages.length} 張圖像
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg">
                        {Object.entries(factoryTopicTree).map(([grade, subjectMap]) => (
                            <details key={grade} className="border-b border-slate-200">
                                <summary className="cursor-pointer px-4 py-2 font-semibold text-slate-700 bg-slate-50">{grade}</summary>
                                <div className="px-4 py-2 space-y-2">
                                    {Object.entries(subjectMap).map(([subject, subjectTopics]) => (
                                        <details key={`${grade}-${subject}`} className="border border-slate-200 rounded-lg">
                                            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-600 bg-white">{subject}</summary>
                                            <div className="px-3 py-2 space-y-2">
                                                {subjectTopics.map((topic) => {
                                                    const stock = factoryStockMap[topic.id]?.total ?? factoryStockMap[topic.name]?.total ?? 0;
                                                    const stockColor = stock < 10 ? 'text-red-600' : stock > 50 ? 'text-emerald-600' : 'text-slate-600';
                                                    const topicKey = `topic-${topic.id}`;
                                                    const topicSelected = factorySelections[topicKey]?.selected;
                                                    return (
                                                        <div key={topic.id} className="border border-slate-200 rounded-lg p-2 bg-slate-50">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!topicSelected}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setFactorySelections(prev => ({
                                                                                ...prev,
                                                                                [topicKey]: {
                                                                                    ...(prev[topicKey] || {}),
                                                                                    selected: checked,
                                                                                    qty: prev[topicKey]?.qty || 3,
                                                                                    grade: topic.grade,
                                                                                    subject: topic.subject,
                                                                                    topicId: topic.id,
                                                                                    subTopic: null
                                                                                }
                                                                            }));
                                                                        }}
                                                                    />
                                                                    <div className="text-sm font-semibold text-slate-700">{topic.name}</div>
                                                                    <div className={`text-xs font-semibold ${stockColor}`}>庫存 {stock}</div>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    disabled={!topicSelected}
                                                                    value={factorySelections[topicKey]?.qty || 3}
                                                                    onChange={(e) => {
                                                                        const qty = Number(e.target.value || 1);
                                                                        setFactorySelections(prev => ({
                                                                            ...prev,
                                                                            [topicKey]: { ...(prev[topicKey] || {}), qty }
                                                                        }));
                                                                    }}
                                                                    className="w-20 border p-1 rounded text-xs bg-white"
                                                                />
                                                            </div>
                                                            {Array.isArray(topic.subTopics) && topic.subTopics.length > 0 && (
                                                                <div className="mt-2 space-y-1">
                                                                    {topic.subTopics.map((st) => {
                                                                        const subKey = `sub-${topic.id}-${st}`;
                                                                        const subCount = factoryStockMap[topic.id]?.subTopics?.[st]
                                                                            ?? factoryStockMap[topic.name]?.subTopics?.[st]
                                                                            ?? 0;
                                                                        const subColor = subCount < 10 ? 'text-red-600' : subCount > 50 ? 'text-emerald-600' : 'text-slate-500';
                                                                        const subSelected = factorySelections[subKey]?.selected;
                                                                        return (
                                                                            <div key={subKey} className="flex items-center justify-between gap-2 pl-6">
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={!!subSelected}
                                                                                        onChange={(e) => {
                                                                                            const checked = e.target.checked;
                                                                                            setFactorySelections(prev => ({
                                                                                                ...prev,
                                                                                                [subKey]: {
                                                                                                    ...(prev[subKey] || {}),
                                                                                                    selected: checked,
                                                                                                    qty: prev[subKey]?.qty || 3,
                                                                                                    grade: topic.grade,
                                                                                                    subject: topic.subject,
                                                                                                    topicId: topic.id,
                                                                                                    subTopic: st
                                                                                                }
                                                                                            }));
                                                                                        }}
                                                                                    />
                                                                                    <div className="text-xs text-slate-600">{st}</div>
                                                                                    <div className={`text-[11px] font-semibold ${subColor}`}>庫存 {subCount}</div>
                                                                                </div>
                                                                                <input
                                                                                    type="number"
                                                                                    min={1}
                                                                                    disabled={!subSelected}
                                                                                    value={factorySelections[subKey]?.qty || 3}
                                                                                    onChange={(e) => {
                                                                                        const qty = Number(e.target.value || 1);
                                                                                        setFactorySelections(prev => ({
                                                                                            ...prev,
                                                                                            [subKey]: { ...(prev[subKey] || {}), qty }
                                                                                        }));
                                                                                    }}
                                                                                    className="w-20 border p-1 rounded text-[11px] bg-white"
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleFactoryGenerate}
                            disabled={isFactoryGenerating}
                            className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-400 text-white font-bold py-2 px-4 rounded-lg transition flex items-center gap-2"
                        >
                            {isFactoryGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isFactoryGenerating ? '生產中...' : '🚀 批量生產'}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileJson size={18} className="text-indigo-600" /> 審核隊列
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={loadFactoryQueue}
                                className="text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition"
                            >
                                重新整理
                            </button>
                            <button
                                onClick={() => handleFactoryAudit(unauditedQueue.map(q => q.id))}
                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition"
                            >
                                ⚡ 一鍵審核
                            </button>
                        </div>
                    </div>

                    {isFactoryLoadingQueue ? (
                        <div className="text-center py-8">
                            <RefreshCw size={32} className="animate-spin text-indigo-600 mx-auto mb-4" />
                            <p className="text-slate-600">載入中...</p>
                        </div>
                    ) : factoryQueue.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">暫無待審核題目</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {isFactoryAuditingAll && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-700 flex items-center gap-2">
                                    <RefreshCw size={16} className="animate-spin" />
                                    AI 正在審核中，請勿關閉...
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="font-semibold text-slate-700 mb-2">⬅️ 待審核區</div>
                                    {unauditedQueue.length === 0 ? (
                                        <div className="text-xs text-slate-400">沒有待審核題目</div>
                                    ) : (
                                        <ul className="text-xs text-slate-600 space-y-1">
                                            {unauditedSummary.map(({ label, count }) => (
                                                <li key={label}>{label}（{count}題）</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                    <div className="font-semibold text-slate-700 mb-2">➡️ 已審核驗收區</div>
                                    <div className="text-xs text-slate-500">
                                        {auditedQueue.length} 題待確認
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                            {auditedQueue.map((q) => {
                                const auditReport = parseAuditReport(q.audit_report);
                                const auditStatus = q.auditMeta?.status
                                    || (auditReport?.status === 'verified' ? 'PASS' : auditReport?.status === 'flagged' ? 'FAIL' : null);
                                const reportText = auditReport?.report || auditReport?.error_report || '（無審核報告）';
                                const suggestedFix = auditReport?.suggested_fix || null;
                                const isAudited = Boolean(auditStatus);

                                const statusBadge = auditStatus === 'PASS'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : auditStatus === 'FAIL'
                                        ? 'bg-red-100 text-red-700'
                                        : auditStatus === 'FIXED'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-600';

                                return (
                                    <div key={q.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${statusBadge}`}>
                                                        {auditStatus === 'PASS' ? '🟢 PASS' : auditStatus === 'FAIL' ? '🔴 REJECT' : auditStatus === 'FIXED' ? '🟡 FIXED' : '⚪ 未審核'}
                                                    </span>
                                                    <span className="text-xs text-slate-500">狀態：{q.status || 'DRAFT'}</span>
                                                    <span className="text-xs text-slate-500">Pool：{q.poolType || 'TEXT'}</span>
                                                </div>
                                                {q.image && (
                                                    <img src={q.image} alt="seed" className="w-full max-w-md rounded border border-slate-200 mb-3" />
                                                )}
                                                <div className="text-sm font-semibold text-slate-800 mb-1">{q.question || '（無題目文字）'}</div>
                                                {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                                    <div className="text-xs text-slate-600 mb-2">
                                                        選項：{q.options.filter(Boolean).slice(0, 8).join(' / ')}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-500">答案：{q.answer}</div>
                                            </div>
                                            <div className="flex flex-col gap-2 min-w-[140px]">
                                                {!isAudited && (
                                                    <button
                                                        onClick={() => handleFactoryAudit([q.id])}
                                                        disabled={factoryAuditLoading[q.id]}
                                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-bold py-2 rounded"
                                                    >
                                                        {factoryAuditLoading[q.id] ? '審核中...' : '✨ 執行 AI 審核'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleFactoryPublish(q.id)}
                                                    disabled={factoryPublishLoading[q.id] || (isAudited && auditStatus === 'FAIL')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold py-2 rounded"
                                                >
                                                    {factoryPublishLoading[q.id] ? '發布中...' : '批准發布'}
                                                </button>
                                                <button
                                                    onClick={() => handleFactoryDiscard(q.id)}
                                                    disabled={factoryDiscardLoading[q.id]}
                                                    className="bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold py-2 rounded disabled:opacity-60"
                                                >
                                                    {factoryDiscardLoading[q.id] ? '處理中...' : '丟棄'}
                                                </button>
                                            </div>
                                        </div>

                                        {isAudited && (
                                            <div className="mt-4 space-y-3">
                                                <div className="bg-white border border-slate-200 rounded p-3 text-xs text-slate-700">
                                                    <div className="font-semibold text-slate-600 mb-1">審核報告</div>
                                                    <div className="whitespace-pre-wrap">{reportText}</div>
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    信心分數：{typeof q.auditMeta?.confidence === 'number' ? q.auditMeta.confidence.toFixed(2) : '—'}
                                                </div>
                                                {auditStatus === 'FIXED' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="bg-white border border-amber-200 rounded p-3 text-xs text-slate-700">
                                                            <div className="font-semibold text-amber-700 mb-1">修改前</div>
                                                            <pre className="whitespace-pre-wrap">{JSON.stringify(suggestedFix?.before || q, null, 2)}</pre>
                                                        </div>
                                                        <div className="bg-white border border-emerald-200 rounded p-3 text-xs text-slate-700">
                                                            <div className="font-semibold text-emerald-700 mb-1">修改後</div>
                                                            <pre className="whitespace-pre-wrap">{JSON.stringify(suggestedFix?.after || q, null, 2)}</pre>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}