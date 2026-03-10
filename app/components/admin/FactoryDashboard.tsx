"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Upload, Save, FileJson, RefreshCw, Sparkles, Database } from 'lucide-react';
import { DB_SERVICE } from '../../lib/db-service';

interface FactoryDashboardProps {
  topics: any[];
  isFirebaseReady: boolean;
  user: any;
  setTopics?: (topics: any[]) => void;
  mode?: 'factory' | 'past_papers';
}

export default function FactoryDashboard({
  topics,
  isFirebaseReady,
  user,
  mode = 'factory'
}: FactoryDashboardProps) {
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({
    year: '2024',
    grade: 'P4',
    term: '上學期',
    topicId: '',
    subTopic: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [paperCount, setPaperCount] = useState(0);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pdfPages, setPdfPages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState({ current: 0, total: 0 });
  const [pdfError, setPdfError] = useState('');

  const [testSeed, setTestSeed] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
  const [originFilter, setOriginFilter] = useState<'ALL' | 'SEED' | 'AI_GEN'>('ALL');
  const [factoryAuditLoading, setFactoryAuditLoading] = useState({});
  const [factoryPublishLoading, setFactoryPublishLoading] = useState({});
  const [factoryDiscardLoading, setFactoryDiscardLoading] = useState({});
  const [inspectionItem, setInspectionItem] = useState<any | null>(null);
  const [inspectionForm, setInspectionForm] = useState({
    question: '',
    answer: '',
    topic: '',
    grade: 'P4',
    subTopic: '',
    optionsText: ''
  });
  const [isInspectionSaving, setIsInspectionSaving] = useState(false);

  const isAdminReviewer = user && user.email === 'admin@test.com';
  const showUpload = mode === 'past_papers';
  const showFactory = mode === 'factory';

  const availableTopics = useMemo(() => {
    return topics.filter(t => t.grade === paperMeta.grade && t.subject === 'math');
  }, [topics, paperMeta.grade]);

  const availableSubTopics = useMemo(() => {
    if (!paperMeta.topicId) return [];
    const selected = topics.find(t => t.id === paperMeta.topicId);
    return selected?.subTopics || [];
  }, [topics, paperMeta.topicId]);

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
    () => factoryQueue.filter(q => (q.status || 'DRAFT') === 'DRAFT' && !q.auditMeta),
    [factoryQueue]
  );

  const auditedQueue = useMemo(
    () => factoryQueue.filter(q => (q.status || 'DRAFT') !== 'PUBLISHED' && q.auditMeta),
    [factoryQueue]
  );

  const filteredUnauditedQueue = useMemo(() => {
    if (originFilter === 'ALL') return unauditedQueue;
    return unauditedQueue.filter(q => (q.origin || 'AI_GEN') === originFilter);
  }, [originFilter, unauditedQueue]);

  const filteredAuditedQueue = useMemo(() => {
    if (originFilter === 'ALL') return auditedQueue;
    return auditedQueue.filter(q => (q.origin || 'AI_GEN') === originFilter);
  }, [originFilter, auditedQueue]);

  const unauditedSummary = useMemo<{ label: string; count: number }[]>(() => {
    const map: Record<string, number> = {};
    filteredUnauditedQueue.forEach(item => {
      const label = `${item.grade || 'P4'} ${item.subject || ''} - ${item.topic || item.topic_id || '未分類'}`;
      map[label] = (map[label] || 0) + 1;
    });
    const entries = Object.entries(map) as Array<[string, number]>;
    return entries.map(([label, count]) => ({ label, count }));
  }, [filteredUnauditedQueue]);

  const incomingSeedQueue = useMemo(
    () => filteredUnauditedQueue.filter(q => (q.origin || '') === 'SEED'),
    [filteredUnauditedQueue]
  );

  const aiSeedQueue = useMemo(
    () => filteredUnauditedQueue.filter(q => (q.origin || 'AI_GEN') !== 'SEED'),
    [filteredUnauditedQueue]
  );

  const seedQueueStats = useMemo(() => {
    const seedItems = factoryQueue.filter(q => (q.origin || 'AI_GEN') === 'SEED');
    const auditedCount = seedItems.filter(q => q.auditMeta).length;
    return {
      total: seedItems.length,
      audited: auditedCount
    };
  }, [factoryQueue]);

  const modalTopicOptions = useMemo(() => {
    const grade = inspectionForm.grade || inspectionItem?.grade || 'P4';
    const subject = inspectionItem?.subject || 'math';
    return topics.filter(t => t.grade === grade && t.subject === subject);
  }, [inspectionForm.grade, inspectionItem, topics]);

  const modalSubTopicOptions = useMemo(() => {
    if (!inspectionForm.topic) return [];
    const match = modalTopicOptions.find(t => t.name === inspectionForm.topic);
    return match?.subTopics || [];
  }, [inspectionForm.topic, modalTopicOptions]);

  useEffect(() => {
    if (!showUpload || !isFirebaseReady) return;
    const fetchCount = async () => {
      const c = await DB_SERVICE.countPastPapers();
      setPaperCount(c);
    };
    fetchCount();
  }, [showUpload, isFirebaseReady]);

  useEffect(() => {
    if (!showFactory || !isFirebaseReady || !isAdminReviewer) return;
    loadFactoryQueue();
    loadFactoryStock();
  }, [showFactory, isFirebaseReady, isAdminReviewer]);

  const loadFactoryQueue = async () => {
    if (!isFirebaseReady) return;
    setIsFactoryLoadingQueue(true);
    try {
      const [aiQueue, seedQueue, stats] = await Promise.all([
        DB_SERVICE.fetchFactoryQueue(['DRAFT', 'AUDITED', 'REJECTED']),
        DB_SERVICE.fetchSeedQueue(['DRAFT', 'AUDITED', 'REJECTED']),
        DB_SERVICE.getFactoryStats()
      ]);
      const normalizedSeed = (seedQueue || []).map(item => ({
        ...item,
        origin: item.origin || 'SEED',
        __collection: 'seed_questions'
      }));
      const normalizedAi = (aiQueue || []).map(item => ({
        ...item,
        __collection: 'past_papers'
      }));
      const mergedQueue = [...normalizedSeed, ...normalizedAi].sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime();
        const tb = new Date(b.createdAt || 0).getTime();
        return tb - ta;
      });
      const draftCount = mergedQueue.filter(q => (q.status || 'DRAFT') === 'DRAFT').length;
      setFactoryQueue(mergedQueue);
      setFactoryStats({
        draftCount,
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
            merged[topicKey] = { total: 0, seed: 0, ai: 0, subTopics: {} };
          }
          merged[topicKey].total += val.total || 0;
          merged[topicKey].seed += val.seed || 0;
          merged[topicKey].ai += val.ai || 0;
          if (val.subTopics) {
            Object.entries(val.subTopics).forEach(([st, subVal]) => {
              if (!merged[topicKey].subTopics[st]) {
                merged[topicKey].subTopics[st] = { total: 0, seed: 0, ai: 0 };
              }
              merged[topicKey].subTopics[st].total += subVal?.total || 0;
              merged[topicKey].subTopics[st].seed += subVal?.seed || 0;
              merged[topicKey].subTopics[st].ai += subVal?.ai || 0;
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

  const handleFactoryAudit = async (itemsOrIds = []) => {
    if (!itemsOrIds.length) return;
    const resolvedItems = itemsOrIds.map((entry) => {
      if (typeof entry === 'string') {
        return factoryQueue.find(q => q.id === entry) || { id: entry, __collection: 'past_papers' };
      }
      return entry;
    }).filter(Boolean);
    if (!resolvedItems.length) return;
    if (resolvedItems.length > 1) {
      setIsFactoryAuditingAll(true);
    }
    const loadingState = {};
    resolvedItems.forEach(item => { loadingState[item.id] = true; });
    setFactoryAuditLoading(prev => ({ ...prev, ...loadingState }));
    try {
      const groups = resolvedItems.reduce((acc, item) => {
        const key = item.__collection === 'seed_questions' ? 'seed_questions' : 'past_papers';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item.id);
        return acc;
      }, {});
      const results = await Promise.all(Object.entries(groups).map(async ([collection, ids]) => {
        const response = await fetch('/api/factory/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIds: ids, collection })
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Factory audit failed');
        }
        return data;
      }));
      if (!results.length) {
        throw new Error('Factory audit failed');
      }
      await loadFactoryQueue();
    } catch (e) {
      console.error("Factory Audit Error:", e);
      alert(`審核失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryAuditLoading(prev => {
        const next = { ...prev };
        resolvedItems.forEach(item => { delete next[item.id]; });
        return next;
      });
      setIsFactoryAuditingAll(false);
    }
  };

  const handleFactoryPublish = async (item) => {
    if (!item?.id) return;
    setFactoryPublishLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      if (item.__collection === 'seed_questions') {
        const response = await fetch('/api/factory/publish-seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seedId: item.id })
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Publish seed failed');
        }
      } else {
        const response = await fetch('/api/factory/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIds: [item.id] })
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Publish failed');
        }
      }
      setFactoryQueue(prev => {
        const next = prev.filter(q => q.id !== item.id);
        const nextDraftCount = next.filter(q => (q.status || 'DRAFT') === 'DRAFT').length;
        setFactoryStats(prevStats => ({
          ...prevStats,
          draftCount: nextDraftCount,
          publishedCount: (prevStats.publishedCount || 0) + 1
        }));
        return next;
      });
      await loadFactoryStock();
      await loadFactoryQueue();
    } catch (e) {
      console.error("Factory Publish Error:", e);
      alert(`發布失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryPublishLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleFactoryDiscard = async (item) => {
    if (!item?.id) return;
    if (!confirm('確定要丟棄此題目嗎？')) return;
    setFactoryDiscardLoading(prev => ({ ...prev, [item.id]: true }));
    try {
      const ok = item.__collection === 'seed_questions'
        ? await DB_SERVICE.deleteSeedQuestion(item.id)
        : await DB_SERVICE.deleteQuestionFromPool(item.id);
      if (!ok) throw new Error('Delete failed');
      await loadFactoryQueue();
    } catch (e) {
      console.error("Factory Discard Error:", e);
      alert(`丟棄失敗：${e.message || '未知錯誤'}`);
    } finally {
      setFactoryDiscardLoading(prev => ({ ...prev, [item.id]: false }));
    }
  };


  const openInspection = (item) => {
    if (!item) return;
    setInspectionItem(item);
    setInspectionForm({
      question: item.question || '',
      answer: item.answer || '',
      topic: item.topic || '',
      grade: item.grade || 'P4',
      subTopic: item.subTopic || '',
      optionsText: Array.isArray(item.options) ? item.options.join('\n') : ''
    });
  };

  const closeInspection = () => {
    setInspectionItem(null);
  };

  const saveInspection = async (publish = false) => {
    if (!inspectionItem?.id) return;
    setIsInspectionSaving(true);
    try {
      const isSeed = inspectionItem.__collection === 'seed_questions';
      const nowIso = new Date().toISOString();
      const options = inspectionForm.optionsText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      const updates: any = {
        question: inspectionForm.question,
        answer: inspectionForm.answer,
        topic: inspectionForm.topic,
        subTopic: inspectionForm.subTopic,
        grade: inspectionForm.grade,
        options
      };
      if (!publish && inspectionItem.auditMeta?.status === 'FAIL') {
        updates.auditMeta = {
          ...(inspectionItem.auditMeta || {}),
          status: 'FIXED',
          fixedAt: nowIso
        };
        updates.status = 'DRAFT';
      }
      if (publish) {
        updates.status = 'PUBLISHED';
      }
      if (publish) {
        if (isSeed) {
          const response = await fetch('/api/factory/publish-seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seedId: inspectionItem.id, updates })
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            throw new Error(data?.error || 'Publish failed');
          }
        } else {
          const updateResponse = await fetch('/api/factory/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionId: inspectionItem.id, updates, collection: 'past_papers' })
          });
          const updateData = await updateResponse.json();
          if (!updateResponse.ok || !updateData?.success) {
            throw new Error(updateData?.error || 'Save failed');
          }
          const publishResponse = await fetch('/api/factory/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questionIds: [inspectionItem.id] })
          });
          const publishData = await publishResponse.json();
          if (!publishResponse.ok || !publishData?.success) {
            throw new Error(publishData?.error || 'Publish failed');
          }
        }
      } else {
        const response = await fetch('/api/factory/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: inspectionItem.id,
            updates,
            collection: isSeed ? 'seed_questions' : 'past_papers'
          })
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Save failed');
        }
      }
      await loadFactoryQueue();
      if (publish) {
        setInspectionItem(null);
      } else {
        const latest = factoryQueue.find(q => q.id === inspectionItem.id);
        setInspectionItem(latest || inspectionItem);
      }
    } catch (e) {
      alert(`儲存失敗：${e instanceof Error ? e.message : '未知錯誤'}`);
    } finally {
      setIsInspectionSaving(false);
    }
  };

  const discardInspection = async () => {
    if (!inspectionItem?.id) return;
    await handleFactoryDiscard(inspectionItem);
    setInspectionItem(null);
  };

  const normalizeText = (value: any) => String(value ?? '').trim();
  const findSyllabusTopic = (grade: string, subject: string, topicName: string) => {
    if (!topicName) return null;
    return topics.find(t =>
      t.grade === grade
      && t.subject === subject
      && (t.name === topicName || t.topic === topicName)
    ) || null;
  };

  const validateSuggestedClassification = (item: any, suggestedTopic?: string, suggestedSubTopic?: string) => {
    const grade = normalizeText(item?.grade || inspectionForm.grade);
    const subject = normalizeText(item?.subject || inspectionForm.subject || 'math');
    const cleanedTopic = normalizeText(suggestedTopic);
    const cleanedSubTopic = normalizeText(suggestedSubTopic);

    let validTopic = cleanedTopic;
    if (cleanedTopic) {
      const topicMatch = findSyllabusTopic(grade, subject, cleanedTopic);
      if (!topicMatch) {
        return { topic: '', subTopic: '', error: `審核建議的單元不存在：${cleanedTopic}` };
      }
      validTopic = topicMatch.name || cleanedTopic;
    }

    const baseTopicName = validTopic || normalizeText(item?.topic || inspectionForm.topic);
    let validSubTopic = cleanedSubTopic;
    if (cleanedSubTopic) {
      const baseTopic = findSyllabusTopic(grade, subject, baseTopicName);
      if (!baseTopic || !Array.isArray(baseTopic.subTopics) || !baseTopic.subTopics.includes(cleanedSubTopic)) {
        return { topic: validTopic, subTopic: '', error: `審核建議的子單元不存在：${cleanedSubTopic}` };
      }
      validSubTopic = cleanedSubTopic;
    }

    return { topic: validTopic, subTopic: validSubTopic, error: '' };
  };

  const applySuggestedFix = (item, auditReport) => {
    const suggestedTopic = auditReport?.suggested_topic
      || auditReport?.suggestedTopic
      || auditReport?.suggested_fix?.topic
      || auditReport?.suggested_fix?.topic_name;
    const suggestedSubTopic = auditReport?.suggested_subTopic
      || auditReport?.suggested_subtopic
      || auditReport?.suggestedSubTopic
      || auditReport?.suggested_fix?.subTopic
      || auditReport?.suggested_fix?.sub_topic;
    const validated = validateSuggestedClassification(item, suggestedTopic, suggestedSubTopic);
    if (validated.error) {
      alert(validated.error);
      return;
    }
    openInspection(item);
    setInspectionForm(prev => ({
      ...prev,
      topic: validated.topic || prev.topic,
      subTopic: validated.subTopic || prev.subTopic
    }));
  };

  const applySuggestedFixAndSave = async (item, auditReport) => {
    if (!item?.id) return;
    const suggestedTopic = auditReport?.suggested_topic
      || auditReport?.suggestedTopic
      || auditReport?.suggested_fix?.topic
      || auditReport?.suggested_fix?.topic_name;
    const suggestedSubTopic = auditReport?.suggested_subTopic
      || auditReport?.suggested_subtopic
      || auditReport?.suggestedSubTopic
      || auditReport?.suggested_fix?.subTopic
      || auditReport?.suggested_fix?.sub_topic;
    if (!suggestedTopic && !suggestedSubTopic) {
      alert('審核報告沒有提供可套用的分類建議');
      return;
    }
    const validated = validateSuggestedClassification(item, suggestedTopic, suggestedSubTopic);
    if (validated.error) {
      alert(validated.error);
      return;
    }
    if (!validated.topic && !validated.subTopic) {
      alert('審核建議不在既有子單元範圍內');
      return;
    }
    const nowIso = new Date().toISOString();
    const updates: any = {
      topic: validated.topic || item.topic || '未分類',
      subTopic: validated.subTopic || item.subTopic || null,
      status: 'DRAFT',
      auditMeta: {
        ...(item.auditMeta || {}),
        status: 'FIXED',
        fixedAt: nowIso,
        suggestedApplied: true
      }
    };
    try {
      const isSeed = item.__collection === 'seed_questions';
      const ok = isSeed
        ? await DB_SERVICE.updateSeedQuestionStatus(item.id, updates)
        : await DB_SERVICE.updateQuestionFactoryStatus(item.id, updates);
      if (!ok) throw new Error('Auto fix failed');
      await loadFactoryQueue();
    } catch (e) {
      alert(`自動修正失敗：${e instanceof Error ? e.message : '未知錯誤'}`);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const loadPdfJs = async () => {
    const candidates = [
      'pdfjs-dist/build/pdf',
      'pdfjs-dist/legacy/build/pdf'
    ];
    for (const path of candidates) {
      try {
        // @ts-ignore - pdfjs-dist 缺少型別宣告
        const mod = await import(path);
        const pdfjs = (mod && (mod as any).default) || mod;
        if (pdfjs && typeof pdfjs.getDocument === 'function') {
          if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.530/pdf.worker.min.mjs';
          }
          return pdfjs;
        }
      } catch (e) {
        console.warn(`PDFJS load failed for ${path}`, e);
      }
    }
    return null;
  };

  const convertPdfToImages = async (file: File) => {
    try {
      setIsPreparingPdf(true);
      setPdfError('');
      const pdfjs = await loadPdfJs();
      if (!pdfjs) {
        throw new Error('PDF 解析器載入失敗');
      }
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      let pdf = await pdfjs.getDocument({ data, disableWorker: true }).promise;
      if (!pdf?.numPages || pdf.numPages < 1) {
        // fallback: try loading via object URL for certain PDFs
        const url = URL.createObjectURL(file);
        try {
          pdf = await pdfjs.getDocument({ url, disableWorker: true }).promise;
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (!pdf?.numPages || pdf.numPages < 1) {
        throw new Error('PDF 頁數為 0');
      }
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
      const isPassword = e && typeof e === 'object' && (e as any).name === 'PasswordException';
      if (isPassword) {
        setPdfError('PDF 有密碼保護，請先解除密碼再上傳。');
        return [];
      }
      const message = e instanceof Error ? e.message : 'PDF 轉圖失敗';
      if (message.includes('PDF 頁數為 0')) {
        setPdfError('PDF 解析結果為 0 頁，請嘗試「另存為 PDF」或改用圖片上傳。');
        return [];
      }
      setPdfError(`PDF 轉圖失敗：${message}`);
      return [];
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleSeedFileChange = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;
    setPdfError('');
    const imageList = list.filter(f => f.type.startsWith('image/'));
    const pdfList = list.filter(f =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
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
      if (pages.length === 0 && !pdfError) {
        setPdfError('PDF 解析結果為 0 頁，請確認檔案是否可讀。');
      }
    }
  };

  const isImageBase64 = (str: string): boolean => {
    return typeof str === 'string' && (
      str.startsWith('data:image/') ||
      /^[A-Za-z0-9+/=]+$/.test(str) && str.length > 100
    );
  };

  const processSingleImage = async (imageBase64: string, fileName?: string): Promise<any[]> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: imageBase64,
          prompt: `請分析這張數學試題的圖像，擷取所有題目並回傳 JSON 陣列。
每一題請包含：
- question: 題目文字
- answer: 答案
- type: arithmetic | word_problem | geometry | others
- shape: 圖形類型或 null
- params: 圖形參數或 null
只回傳 JSON 陣列，不要加上 markdown。`
        })
      });
      clearTimeout(timeout);
      const data = await response.json();

      if (data.success && data.result) {
        const list = Array.isArray(data.result) ? data.result : [data.result];
        return list.map((item) => ({
          ...item,
          image: imageBase64,
          imageFileName: fileName,
          processedAt: new Date().toISOString(),
          source: 'vision_api'
        }));
      } else {
        throw new Error(data.error || '識別失敗');
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new Error('Vision 解析逾時，請稍後重試或改用較小圖片');
      }
      throw new Error(e instanceof Error ? e.message : '處理失敗');
    }
  };

  const handleUnifiedUpload = async () => {
    const allQuestions = [];
    const errors = [];
    let hasImages = false;

    setIsUploading(true);
    setIsProcessingImages(true);
    setImageProcessingProgress({ current: 0, total: 0 });

    try {
      const totalImages = imageFiles.length + pdfPages.length;
      if (totalImages > 0) {
        hasImages = true;
        setImageProcessingProgress({ current: 0, total: totalImages });
        let currentIndex = 0;

        for (const page of pdfPages) {
          currentIndex += 1;
          setImageProcessingProgress({ current: currentIndex, total: totalImages });
          try {
            const result = await processSingleImage(page.dataUrl, page.name);
            allQuestions.push(...result);
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
            allQuestions.push(...result);
          } catch (e) {
            errors.push({
              source: 'image_file',
              name: file.name,
              error: e instanceof Error ? e.message : '處理失敗'
            });
          }
        }
      }

      if (paperJson.trim()) {
        try {
          const rawData = JSON.parse(paperJson);
          const jsonQuestions = Array.isArray(rawData) ? rawData : [rawData];

          for (const q of jsonQuestions) {
            if (q.image && isImageBase64(q.image)) {
              hasImages = true;
              setImageProcessingProgress(prev => ({
                current: prev.current + 1,
                total: prev.total + 1
              }));

              try {
                const result = await processSingleImage(q.image, q.imageFileName || 'json_image');
                const first = result[0] || {};
                allQuestions.push({
                  ...q,
                  ...first,
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

      if (allQuestions.length === 0 && imageFiles.length === 0 && pdfPages.length === 0 && !paperJson.trim()) {
        alert("請至少上傳圖像或輸入 JSON 內容");
        setIsUploading(false);
        setIsProcessingImages(false);
        return;
      }

      if (allQuestions.length > 0) {
        let selectedTopicName = null;
        if (paperMeta.topicId) {
          const found = topics.find(t => t.id === paperMeta.topicId);
          if (found) selectedTopicName = found.name;
        }
        const selectedSubTopic = paperMeta.subTopic || null;

        const enrichedPapers = allQuestions.map(q => ({
          ...q,
          year: paperMeta.year,
          grade: paperMeta.grade,
          term: paperMeta.term,
          topic: selectedTopicName ?? q.topic ?? '未分類',
          subTopic: selectedSubTopic ?? q.subTopic ?? null,
          status: 'DRAFT',
          origin: 'SEED',
          poolType: 'TEXT',
          source: q.imageFileName || 'manual_upload',
          auditMeta: null,
          subject: 'math',
          uploadedAt: new Date().toISOString()
        }));

        const uploadOk = await DB_SERVICE.uploadPastPaperBatch(enrichedPapers, user);
        if (!uploadOk) {
          const lastError = DB_SERVICE.getLastError ? DB_SERVICE.getLastError() : null;
          const errorMessage = lastError instanceof Error
            ? lastError.message
            : (lastError ? String(lastError) : '未知錯誤');
          throw new Error(`Firestore 寫入失敗：${errorMessage}`);
        }

        const textCount = enrichedPapers.filter(q => q.source === 'manual_json').length;
        const imageCount = enrichedPapers.filter(q => q.source === 'vision_api').length;

        let message = `✅ 成功上傳 ${enrichedPapers.length} 道種子題目！\n\n`;
        message += `📝 JSON 文字題：${textCount} 道（免費）\n`;
        message += `📷 圖像識別題：${imageCount} 道（由圖片解析）`;

        if (errors.length > 0) {
          message += `\n\n⚠️ ${errors.length} 項處理失敗`;
        }

        alert(message);

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

  return (
    <div className="space-y-6">
      {showUpload && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-green-600" /> 上傳種子試題 (Seed Upload)</h3>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">DB Total: {paperCount}</span>
            </div>

            <div className="flex gap-4 mb-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">年級</label>
                <select value={paperMeta.grade} onChange={e => setPaperMeta({ ...paperMeta, grade: e.target.value })} className="border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                  {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">指定單元 (選填)</label>
                <select
                  value={paperMeta.topicId}
                  onChange={e => setPaperMeta({ ...paperMeta, topicId: e.target.value, subTopic: '' })}
                  className="border border-slate-600 bg-slate-800 text-white p-2 rounded text-sm w-full font-bold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="">🤖 自動偵測 / 不指定</option>
                  {availableTopics.map(t => (<option key={t.id} value={t.id}>📍 強制歸類: {t.name}</option>))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">指定子單元 (選填)</label>
                <select
                  value={paperMeta.subTopic}
                  onChange={e => setPaperMeta({ ...paperMeta, subTopic: e.target.value })}
                  disabled={!paperMeta.topicId || availableSubTopics.length === 0}
                  className="border border-slate-600 bg-slate-800 text-white p-2 rounded text-sm w-full font-bold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 disabled:opacity-60"
                >
                  <option value="">不指定</option>
                  {availableSubTopics.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Upload size={18} className="text-green-600" />
                統一上傳介面（系統自動分類，節省成本）
              </h4>

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
                {pdfError && (
                  <div className="text-xs text-red-500 mt-1 font-bold">
                    {pdfError}
                  </div>
                )}
              </div>

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

              <button
                onClick={handleUnifiedUpload}
                disabled={isUploading || isProcessingImages || (imageFiles.length === 0 && pdfPages.length === 0 && !paperJson.trim())}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUploading || isProcessingImages ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    {isProcessingImages
                      ? `處理中 ${imageProcessingProgress.current}/${imageProcessingProgress.total || (imageFiles.length + pdfPages.length)}...`
                      : '上傳中...'}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    一鍵上傳（自動分類處理）
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400" size={20} /> AI 生成測試 (Seed Test)</h3>
            <p className="text-xs text-slate-400 mb-4">貼上一段 JSON 種子，測試系統是否能正確生成變體。</p>

            <textarea
              onChange={e => {
                try { setTestSeed(JSON.parse(e.target.value)); } catch { setTestSeed(null); }
              }}
              className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-green-400 mb-4 focus:outline-none"
              placeholder='{"question": "小明有5個蘋果...", "topic": "加法"}'
            ></textarea>

            <button
              onClick={handleTestGenerate}
              disabled={isGenerating || !testSeed}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-2 rounded-lg mb-4 transition flex items-center justify-center gap-2"
            >
              {isGenerating ? 'AI 思考中...' : '生成新題目'} <RefreshCw size={16} />
            </button>

            <div className="bg-black/50 p-4 rounded-lg min-h-[100px] text-xs font-mono text-slate-300 whitespace-pre-wrap border border-slate-700 mb-4">
              {generatedResult ? generatedResult : "// AI 生成結果將顯示於此..."}
            </div>
          </div>
        </div>
      )}

      {showFactory && isAdminReviewer && (
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
                            const stockEntry = factoryStockMap[topic.id] || factoryStockMap[topic.name] || { total: 0, seed: 0, ai: 0, subTopics: {} };
                            const stock = stockEntry.total || 0;
                            const aiStock = stockEntry.ai || 0;
                            const stockColor = aiStock < 10 ? 'text-red-600' : aiStock > 50 ? 'text-emerald-600' : 'text-slate-600';
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
                                    <div className={`text-xs font-semibold ${stockColor}`}>
                                      庫存 {stock}（種子 {stockEntry.seed || 0} / AI {stockEntry.ai || 0}）
                                    </div>
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
                                      const subEntry = factoryStockMap[topic.id]?.subTopics?.[st]
                                        ?? factoryStockMap[topic.name]?.subTopics?.[st]
                                        ?? { total: 0, seed: 0, ai: 0 };
                                      const subCount = subEntry.total || 0;
                                      const subAiCount = subEntry.ai || 0;
                                      const subColor = subAiCount < 10 ? 'text-red-600' : subAiCount > 50 ? 'text-emerald-600' : 'text-slate-500';
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
                                            <div className={`text-[11px] font-semibold ${subColor}`}>
                                              庫存 {subCount}（種子 {subEntry.seed || 0} / AI {subEntry.ai || 0}）
                                            </div>
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
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value as 'ALL' | 'SEED' | 'AI_GEN')}
                  className="text-xs border border-slate-200 text-slate-700 px-2 py-1 rounded bg-white"
                >
                  <option value="ALL">全部來源</option>
                  <option value="SEED">🌱 種子</option>
                  <option value="AI_GEN">🤖 AI 生成</option>
                </select>
                <button
                  onClick={loadFactoryQueue}
                  className="text-xs bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition"
                >
                  重新整理
                </button>
                <button
                  onClick={() => handleFactoryAudit(filteredUnauditedQueue)}
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
                    <div className="font-semibold text-slate-700 mb-2">
                      ⬅️ 待審核區
                      {(originFilter === 'ALL' || originFilter === 'SEED') && seedQueueStats.total > 0 && (
                        <span className="ml-2 text-xs text-slate-500">
                          （已審核 {seedQueueStats.audited}/{seedQueueStats.total}）
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 font-semibold">
                        📥 人工上傳：{incomingSeedQueue.length}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-2 py-0.5 font-semibold">
                        🤖 AI 生成：{aiSeedQueue.length}
                      </span>
                    </div>
                    {filteredUnauditedQueue.length === 0 ? (
                      <div className="text-xs text-slate-400">沒有待審核題目</div>
                    ) : (
                      <>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {unauditedSummary.map(({ label, count }) => (
                            <li key={label}>{label}（{count}題）</li>
                          ))}
                        </ul>
                        <div className="mt-3 space-y-1">
                          {filteredUnauditedQueue.slice(0, 8).map((item) => (
                            <button
                              key={item.id}
                              onClick={() => openInspection(item)}
                              className="w-full text-left text-xs text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 hover:bg-slate-100"
                            >
                              {item.question || item.topic || '未命名題目'}
                            </button>
                          ))}
                          {filteredUnauditedQueue.length > 8 && (
                            <div className="text-[11px] text-slate-400">尚有 {filteredUnauditedQueue.length - 8} 題...</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="font-semibold text-slate-700 mb-2">➡️ 已審核驗收區</div>
                    <div className="text-xs text-slate-500">
                      {filteredAuditedQueue.length} 題待確認
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredAuditedQueue.map((q) => {
                    const auditReport = parseAuditReport(q.audit_report);
                    const auditStatus = q.auditMeta?.status
                      || (auditReport?.status === 'verified' ? 'PASS' : auditReport?.status === 'flagged' ? 'FAIL' : null);
                    const reportText = auditReport?.report || auditReport?.error_report || '（無審核報告）';
                    const suggestedFix = auditReport?.suggested_fix || null;
                    const suggestedTopic = auditReport?.suggested_topic
                      || auditReport?.suggestedTopic
                      || auditReport?.suggested_fix?.topic;
                    const suggestedSubTopic = auditReport?.suggested_subTopic
                      || auditReport?.suggested_subtopic
                      || auditReport?.suggestedSubTopic
                      || auditReport?.suggested_fix?.subTopic
                      || auditReport?.suggested_fix?.sub_topic;
                    const isAudited = Boolean(auditStatus);
                    const reportTextNormalized = String(reportText || '');
                    const isMismatchFlag = Boolean(
                      auditStatus === 'FAIL'
                      || /mismatch|不匹配/i.test(reportTextNormalized)
                    );

                    const statusBadge = auditStatus === 'PASS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : auditStatus === 'FAIL'
                        ? 'bg-red-100 text-red-700'
                        : auditStatus === 'FIXED'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600';

                    return (
                      <div
                        key={q.id}
                        onClick={() => openInspection(q)}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold px-2 py-1 rounded ${statusBadge}`}>
                                {auditStatus === 'PASS' ? '🟢 PASS' : auditStatus === 'FAIL' ? '🔴 REJECT' : auditStatus === 'FIXED' ? '🟡 FIXED' : '⚪ 未審核'}
                              </span>
                              {isMismatchFlag && (
                                <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700">
                                  ⚠️ 答案存疑
                                </span>
                              )}
                              <span className={`text-xs font-bold px-2 py-1 rounded ${q.origin === 'SEED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                {q.origin === 'SEED' ? '🌱 種子' : '🤖 AI 生成'}
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
                            <div className="text-xs text-slate-500 mb-2">
                              分類：{q.topic || '未分類'}{q.subTopic ? ` / ${q.subTopic}` : ' / —'}
                            </div>
                            <div className="text-xs text-slate-500">答案：{q.answer}</div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            {!isAudited && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFactoryAudit([q]);
                                }}
                                disabled={factoryAuditLoading[q.id]}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-bold py-2 rounded"
                              >
                                {factoryAuditLoading[q.id] ? '審核中...' : '✨ 執行 AI 審核'}
                              </button>
                            )}
                            {isAudited && auditStatus !== 'PASS' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFactoryAudit([q]);
                                }}
                                disabled={factoryAuditLoading[q.id]}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-xs font-bold py-2 rounded"
                              >
                                {factoryAuditLoading[q.id] ? '審核中...' : '🔁 再審一次'}
                              </button>
                            )}
                            {isAudited && auditStatus !== 'PASS' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openInspection(q);
                                }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold py-2 rounded"
                              >
                                ✏️ 修正
                              </button>
                            )}
                            {isAudited && auditStatus !== 'PASS' && (suggestedTopic || suggestedSubTopic || suggestedFix) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applySuggestedFix(q, auditReport);
                                }}
                                className="bg-sky-100 hover:bg-sky-200 text-sky-700 text-xs font-bold py-2 rounded"
                              >
                                🪄 套用建議
                              </button>
                            )}
                            {isAudited && auditStatus !== 'PASS' && (suggestedTopic || suggestedSubTopic || suggestedFix) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  applySuggestedFixAndSave(q, auditReport);
                                }}
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold py-2 rounded"
                              >
                                🤖 自動修正
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFactoryPublish(q);
                              }}
                              disabled={factoryPublishLoading[q.id] || (isAudited && auditStatus === 'FAIL')}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white text-xs font-bold py-2 rounded"
                            >
                              {factoryPublishLoading[q.id] ? '發布中...' : '批准發布'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFactoryDiscard(q);
                              }}
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

      {showFactory && !isAdminReviewer && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
          只有管理員可以使用工廠模式。
        </div>
      )}

      {inspectionItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl shadow-xl overflow-visible">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="font-bold text-slate-800">種子檢驗工作台</div>
              <button onClick={closeInspection} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              <div className="lg:col-span-2 p-4 border-r bg-slate-50">
                <div className="text-xs text-slate-500 mb-2">原圖預覽</div>
                {inspectionItem.image ? (
                  <img src={inspectionItem.image} alt="seed" className="w-full h-full max-h-[70vh] object-contain rounded border border-slate-200 bg-white" />
                ) : (
                  <div className="text-xs text-slate-400">無圖片</div>
                )}
              </div>
              <div className="lg:col-span-3 p-6 max-h-[calc(90vh-72px)] overflow-y-auto">
                {inspectionItem.auditMeta?.answerCheck?.mismatch && (
                  <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-800 text-sm p-3">
                    ⚠️ 答案存疑：AI 算出 {inspectionItem.auditMeta?.answerCheck?.aiAnswer}，原紀錄 {inspectionItem.auditMeta?.answerCheck?.provided}
                  </div>
                )}
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500">Question</label>
                        <textarea
                          value={inspectionForm.question}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, question: e.target.value }))}
                          className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          rows={4}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">Answer</label>
                        <input
                          value={inspectionForm.answer}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, answer: e.target.value }))}
                          className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500">Grade</label>
                          <select
                            value={inspectionForm.grade}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, grade: e.target.value }))}
                            className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          >
                            {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500">Topic</label>
                          <select
                            value={inspectionForm.topic}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, topic: e.target.value, subTopic: '' }))}
                            className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          >
                            <option value="">未分類</option>
                            {modalTopicOptions.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">Sub-topic</label>
                        {modalSubTopicOptions.length > 0 ? (
                          <select
                            value={inspectionForm.subTopic}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, subTopic: e.target.value }))}
                            className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          >
                            <option value="">未分類</option>
                            {modalSubTopicOptions.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={inspectionForm.subTopic}
                            onChange={(e) => setInspectionForm(prev => ({ ...prev, subTopic: e.target.value }))}
                            className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                            placeholder="無子單元可選，可手動輸入"
                          />
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500">Options (每行一個)</label>
                        <textarea
                          value={inspectionForm.optionsText}
                          onChange={(e) => setInspectionForm(prev => ({ ...prev, optionsText: e.target.value }))}
                          className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          rows={4}
                        />
                      </div>
                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <button
                      onClick={() => saveInspection(false)}
                      disabled={isInspectionSaving}
                      className="px-4 py-2 rounded bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 disabled:opacity-60"
                    >
                      💾 暫存變更
                    </button>
                    <button
                      onClick={() => saveInspection(true)}
                      disabled={isInspectionSaving}
                      className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      🚀 批准入庫
                    </button>
                    <button
                      onClick={discardInspection}
                      disabled={isInspectionSaving}
                      className="px-4 py-2 rounded bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200 disabled:opacity-60"
                    >
                      🗑️ 丟棄
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
