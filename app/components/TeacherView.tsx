"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, BarChart3, FileText, Send, Settings, Home, BookOpen, Award, TrendingUp, Upload, Save, RefreshCw, Sparkles } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
// mock-data-generator is now handled server-side via /api/mock-class
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TeacherView({ setView, user, topics }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'assignments', 'analytics', 'seeds', 'paper-creation', 'paper-preview', 'assignment-seed-selection'
  const [institutionStats, setInstitutionStats] = useState(null);
  const [isLoadingInstitutionStats, setIsLoadingInstitutionStats] = useState(false);
  const [assignmentCompletionStats, setAssignmentCompletionStats] = useState([]);
  const [isLoadingAssignmentStats, setIsLoadingAssignmentStats] = useState(false);
  const [rankingSubject, setRankingSubject] = useState('all');
  const [rankingDays, setRankingDays] = useState(14);
  const [rankingSort, setRankingSort] = useState('accuracy_desc');

  // 班級管理狀態
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('P4');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [classSort, setClassSort] = useState('students_desc');
  const [classQuickSelect, setClassQuickSelect] = useState('all');
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);

  // 派卷狀態
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    topicIds: [],
    questionCount: 10,
    dueDate: '',
    seedQuestionIds: [], // 新增：選擇的種子題目 ID
    grade: 'P4' // 新增：年級，默認值為 P4
  });

  // 作業種子題目選擇頁面狀態
  const [assignmentSeedQuestions, setAssignmentSeedQuestions] = useState([]); // 用於選擇的種子題目列表
  const [selectedAssignmentSeeds, setSelectedAssignmentSeeds] = useState([]); // 已選擇的種子題目
  const [showTopicSelector, setShowTopicSelector] = useState(null); // 當前顯示單元選擇器的題目索引
  const [selectedTopicForQuestion, setSelectedTopicForQuestion] = useState(null); // 為某題選擇的單元

  // 種子題目上傳狀態
  const [showSeedUpload, setShowSeedUpload] = useState(false);
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({ year: '2024', grade: 'P4', term: '上學期', topicId: '', subTopic: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pdfPages, setPdfPages] = useState<{ name: string; dataUrl: string }[]>([]);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState({ current: 0, total: 0 });
  const [seedQuestions, setSeedQuestions] = useState([]); // 種子題目列表
  const [paperCount, setPaperCount] = useState(0);

  // 試卷制訂相關狀態
  const [paperCreation, setPaperCreation] = useState({
    questionCount: 10,
    selectedTopicIds: [],
    selectedSubTopics: [],
    grade: 'P4'
  });
  const [generatedPaper, setGeneratedPaper] = useState([]); // 生成的試卷題目
  const [isGeneratingPaper, setIsGeneratingPaper] = useState(false);
  const [paperGenerationProgress, setPaperGenerationProgress] = useState({ current: 0, total: 0 });
  const [showPaperPreview, setShowPaperPreview] = useState(false); // 顯示試卷預覽頁面
  const [selectedPaperForReuse, setSelectedPaperForReuse] = useState(null); // 選擇要重用的試卷

  // 已發送試卷列表
  const [sentPapers, setSentPapers] = useState([]);
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentSort, setAssignmentSort] = useState('sent_desc');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState('all');
  const [isLoadingSentPapers, setIsLoadingSentPapers] = useState(false);
  const [selectedSentPaper, setSelectedSentPaper] = useState(null); // 選中的試卷詳情

  // 教學者回饋相關狀態
  const [showFeedbackInput, setShowFeedbackInput] = useState(null); // 當前顯示回饋輸入的題目 ID
  const [teacherFeedbackText, setTeacherFeedbackText] = useState('');
  const [teacherSelectedTypes, setTeacherSelectedTypes] = useState([]);
  const [teacherCategory, setTeacherCategory] = useState('');
  const [isSavingTeacherFeedback, setIsSavingTeacherFeedback] = useState(false);
  const isTeacherPending = user?.role === 'teacher' && user?.institutionRole === 'member' && user?.institutionStatus !== 'active';

  // 題型選項（與開發者相同）
  const questionTypeOptions = [
    '應用題', '計算題', '幾何題', '選擇題', '文字題',
    '圖形題', '邏輯題', '數據題', '混合題'
  ];

  // 分類選項
  const categoryOptions = [
    '加法', '減法', '乘法', '除法', '分數', '小數',
    '百分數', '周界', '面積', '體積', '時間', '金錢', '其他'
  ];

  useEffect(() => {
    if (user.role === 'teacher' || user.role === 'admin') {
      loadClasses();
    }
  }, [user]);

  useEffect(() => {
    const loadInstitutionStats = async () => {
      if (activeTab !== 'analytics' || classes.length === 0) return;
      setIsLoadingInstitutionStats(true);
      try {
        const statsList = await Promise.all(
          classes.map(async (cls) => {
            const stats = await DB_SERVICE.getClassStats(cls.id);
            return stats ? { className: cls.name || cls.className || cls.id, stats } : null;
          })
        );
        const validStats = statsList.filter(Boolean);
        const totalStudents = validStats.reduce((sum, item) => sum + (item.stats.totalStudents || 0), 0);
        const totalQuestions = validStats.reduce((sum, item) => {
          return sum + item.stats.students.reduce((s, st) => s + (st.stats?.totalQuestions || 0), 0);
        }, 0);
        const totalCorrect = validStats.reduce((sum, item) => {
          return sum + item.stats.students.reduce((s, st) => s + (st.stats?.correctAnswers || 0), 0);
        }, 0);
        const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const classChart = validStats.map((item) => ({
          name: item.className,
          students: item.stats.totalStudents || 0
        }));
        setInstitutionStats({
          classCount: validStats.length,
          totalStudents,
          totalQuestions,
          avgAccuracy,
          classChart
        });
      } catch (e) {
        console.error("Load Institution Stats Error:", e);
        setInstitutionStats(null);
      } finally {
        setIsLoadingInstitutionStats(false);
      }
    };
    loadInstitutionStats();
  }, [activeTab, classes]);

  useEffect(() => {
    if (activeTab === 'analytics' && selectedClass) {
      loadAssignmentStats(selectedClass.id);
    }
  }, [activeTab, selectedClass]);

  // 載入已發送試卷列表
  useEffect(() => {
    const loadSentPapers = async () => {
      if ((activeTab === 'paper-creation' || activeTab === 'assignments') && (user.role === 'teacher' || user.role === 'admin')) {
        setIsLoadingSentPapers(true);
        try {
          const papers = await DB_SERVICE.getSentPapers(
            user.uid || user.id,
            user.institutionName || null
          );
          setSentPapers(papers);
        } catch (e) {
          console.error("Load Sent Papers Error:", e);
        } finally {
          setIsLoadingSentPapers(false);
        }
      }
    };
    loadSentPapers();
  }, [activeTab, user]);

  // 當進入 assignments tab 時，自動顯示創建作業表單
  useEffect(() => {
    if (activeTab === 'assignments' && selectedClass && !showCreateAssignment) {
      setShowCreateAssignment(true);
    }
  }, [activeTab, selectedClass]);

  useEffect(() => {
    if (selectedClass) {
      loadClassStats(selectedClass.id);
      loadAssignments(selectedClass.id);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass?.id) {
      setClassQuickSelect(selectedClass.id);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (activeTab === 'analytics' && selectedClass) {
      loadClassStats(selectedClass.id);
    }
  }, [rankingDays, activeTab, selectedClass]);

  useEffect(() => {
    if (user.role === 'teacher' || user.role === 'admin') {
      loadSeedQuestions();
      loadPaperCount();
    }
  }, [user]);

  const loadClasses = async () => {
    setLoading(true);
    try {
      // 使用 user.uid 或 user.id（優先使用 uid，因為這是 Firebase Auth 的 UID）
      const teacherUid = user.uid || user.id;
      if (!teacherUid) {
        console.warn('No teacher UID found:', user);
        return;
      }
      console.log('Loading classes for teacher:', teacherUid, user);

      let classesList;
      const isAdmin = user.role === 'admin' || user.email === 'admin@test.com';

      if (isAdmin) {
        // Admin用戶透過後端API讀取（繞過Firestore安全規則）
        const res = await fetch(`/api/mock-class?teacherUid=${encodeURIComponent(teacherUid)}`);
        const data = await res.json();
        if (res.ok && data.success) {
          classesList = data.classes || [];
        } else {
          console.error('API load classes error:', data.error);
          classesList = [];
        }
      } else {
        classesList = user.institutionName
          ? await DB_SERVICE.getInstitutionClasses(user.institutionName)
          : await DB_SERVICE.getTeacherClasses(teacherUid);
      }

      console.log('Loaded classes:', classesList);
      setClasses(classesList);
      if (classesList.length > 0 && !selectedClass) {
        setSelectedClass(classesList[0]);
      }
    } catch (e) {
      console.error("Load classes error:", e);
    } finally {
      setLoading(false);
    }
  };


  const loadClassStats = async (classId, days = rankingDays) => {
    setLoading(true);
    try {
      const stats = await DB_SERVICE.getClassStats(classId, days);
      setClassStats(stats);
    } catch (e) {
      console.error("Load class stats error:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentStats = async (classId) => {
    setIsLoadingAssignmentStats(true);
    try {
      const stats = await DB_SERVICE.getAssignmentCompletionStats(classId);
      setAssignmentCompletionStats(stats);
    } catch (e) {
      console.error("Load assignment stats error:", e);
      setAssignmentCompletionStats([]);
    } finally {
      setIsLoadingAssignmentStats(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      alert('請輸入班級名稱');
      return;
    }
    setLoading(true);
    try {
      const teacherUid = user.uid || user.id;
      if (!teacherUid) {
        alert('無法獲取教師 ID');
        return;
      }
      const classId = await DB_SERVICE.createClass(teacherUid, newClassName.trim(), newClassGrade);
      if (classId) {
        alert('班級創建成功！');
        setShowCreateClass(false);
        setNewClassName('');
        await loadClasses();
      } else {
        alert('班級創建失敗');
      }
    } catch (e) {
      console.error("Create class error:", e);
      alert('班級創建失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentEmail.trim() || !selectedClass) {
      alert('請輸入學生電郵');
      return;
    }
    setLoading(true);
    try {
      const success = await DB_SERVICE.addStudentToClass(selectedClass.id, studentEmail.trim());
      if (success) {
        alert('學生添加成功！');
        setShowAddStudent(false);
        setStudentEmail('');
        await loadClassStats(selectedClass.id);
        await loadClasses();
      } else {
        alert('添加失敗：找不到該學生帳號');
      }
    } catch (e) {
      console.error("Add student error:", e);
      alert('添加失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 載入種子題目（支持混合查詢：主庫 + 機構庫）
  const loadSeedQuestions = async () => {
    try {
      const { db } = await import('../lib/firebase');
      const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
      const { APP_ID } = await import('../lib/constants');

      const questions = [];
      const grade = selectedClass?.grade || paperMeta.grade || 'P4';

      // 1. 查詢主資料庫（開發者上傳的）
      const mainQuery = query(
        collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
        where("grade", "==", grade),
        limit(100)
      );
      const mainSnap = await getDocs(mainQuery);
      mainSnap.forEach(d => {
        const data = d.data();
        if (data.source === 'seed_init' || data.source === 'vision_api' || data.source === 'manual_json') {
          questions.push({ id: d.id, source: 'main_db', ...data });
        }
      });

      // 2. 如果是教學者，同時查詢機構專用庫
      if (user.role === 'teacher' && user.institutionName) {
        try {
          const teacherQuery = query(
            collection(db, "artifacts", APP_ID, "public", "data", "teacher_seed_questions", user.institutionName, "questions"),
            where("grade", "==", grade),
            limit(100)
          );
          const teacherSnap = await getDocs(teacherQuery);
          teacherSnap.forEach(d => {
            const data = d.data();
            questions.push({ id: d.id, source: 'teacher_db', institutionName: user.institutionName, ...data });
          });
        } catch (e) {
          console.error("Load teacher seed questions error:", e);
          // 如果機構庫不存在，繼續使用主庫
        }
      }

      setSeedQuestions(questions);
    } catch (e) {
      console.error("Load seed questions error:", e);
    }
  };

  // 載入試卷數量（根據用戶角色計算）
  const loadPaperCount = async () => {
    try {
      const count = await DB_SERVICE.countPastPapers(user);
      setPaperCount(count);
    } catch (e) {
      console.error("Load paper count error:", e);
    }
  };

  // 載入作業列表
  const loadAssignments = async (classId: string) => {
    try {
      const assignments = await DB_SERVICE.getAssignments(classId);
      // 可以設置到狀態中顯示
    } catch (e) {
      console.error("Load assignments error:", e);
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
      const pdfjsModule = await import('pdfjs-dist/legacy/build/pdf');
      const pdfjs = (pdfjsModule && pdfjsModule.default) || pdfjsModule;
      if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.530/pdf.worker.min.js';
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
          fileName: fileName,
          grade: paperMeta.grade || selectedClass?.grade || 'P4',
          topicId: paperMeta.topicId || ''
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        ...data,
        imageFileName: fileName,
        processedAt: new Date().toISOString(),
        source: 'vision_api'
      };
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : '處理失敗');
    }
  };

  // 統一上傳處理（自動分類）
  const handleUnifiedUpload = async () => {
    const allQuestions = [];
    const errors = [];

    setIsUploading(true);
    setIsProcessingImages(true);
    setImageProcessingProgress({ current: 0, total: 0 });

    try {
      const totalImages = imageFiles.length + pdfPages.length;
      // 步驟 1：處理上傳的圖像/PDF頁面
      if (totalImages > 0) {
        setImageProcessingProgress({ current: 0, total: totalImages });
        let currentIndex = 0;

        for (const page of pdfPages) {
          currentIndex += 1;
          setImageProcessingProgress({ current: currentIndex, total: totalImages });
          try {
            const result = await processSingleImage(page.dataUrl, page.name);
            allQuestions.push({
              ...result,
              originalImage: page.dataUrl
            });
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
            allQuestions.push({
              ...result,
              originalImage: base64
            });
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
              setImageProcessingProgress(prev => ({
                current: prev.current + 1,
                total: prev.total + 1
              }));

              try {
                const result = await processSingleImage(q.image, q.imageFileName || 'json_image');
                allQuestions.push({
                  ...q,
                  ...result,
                  source: 'vision_api',
                  originalImage: q.image
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
        let selectedSubTopic = null;
        if (paperMeta.topicId) {
          const found = topics.find(t => t.id === paperMeta.topicId);
          if (found) {
            selectedTopicName = found.name;
            if (paperMeta.subTopic && (found.subTopics || []).includes(paperMeta.subTopic)) {
              selectedSubTopic = paperMeta.subTopic;
            }
          }
        }

        const enrichedPapers = allQuestions.map(q => ({
          ...q,
          year: paperMeta.year,
          grade: paperMeta.grade || selectedClass?.grade || 'P4',
          term: paperMeta.term,
          topic: selectedTopicName || q.topic,
          subTopic: selectedSubTopic || q.subTopic,
          source: q.source || 'seed_init',
          subject: 'math',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid || user.id // 記錄上傳者
        }));

        // 傳入 user 參數，系統會根據角色自動選擇存儲位置
        await DB_SERVICE.uploadPastPaperBatch(enrichedPapers, user);

        // 統計信息
        const textCount = enrichedPapers.filter(q => q.source === 'manual_json').length;
        const imageCount = enrichedPapers.filter(q => q.source === 'vision_api').length;

        const storageLocation = user.role === 'teacher' && user.institutionName
          ? `機構庫（${user.institutionName}）`
          : '主資料庫';

        let message = `✅ 成功上傳 ${enrichedPapers.length} 道種子題目！\n\n`;
        message += `📝 文字題目：${textCount} 道（免費）\n`;
        message += `📷 圖像題目：${imageCount} 道（已自動識別）\n`;
        message += `💾 存儲位置：${storageLocation}`;

        if (errors.length > 0) {
          message += `\n\n⚠️ ${errors.length} 項處理失敗`;
        }

        alert(message);

        // 清空表單並重新載入
        setPaperJson('');
        setImageFiles([]);
        setPdfPages([]);
        await loadSeedQuestions();
        await loadPaperCount();
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

  const handleCreateAssignment = async () => {
    if (!selectedClass || !assignmentData.title.trim()) {
      alert('請填寫所有必填欄位');
      return;
    }
    setLoading(true);
    try {
      const assignmentId = await DB_SERVICE.createAssignment(selectedClass.id, {
        ...assignmentData,
        dueDate: assignmentData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        seedQuestionIds: assignmentData.seedQuestionIds || []
      });

      if (assignmentId) {
        // 為班級中的每個學生創建通知
        if (selectedClass.students && selectedClass.students.length > 0) {
          await DB_SERVICE.createAssignmentNotifications(selectedClass.id, assignmentId, assignmentData.title);
        }

        alert(`作業創建成功！已發送通知給 ${selectedClass.students?.length || 0} 名學生`);
        setShowCreateAssignment(false);
        setAssignmentData({
          title: '',
          description: '',
          topicIds: [],
          questionCount: 10,
          dueDate: '',
          seedQuestionIds: [],
          grade: selectedClass?.grade || assignmentData.grade || 'P4'
        });
        await loadAssignments(selectedClass.id);
      } else {
        alert('作業創建失敗');
      }
    } catch (e) {
      console.error("Create assignment error:", e);
      alert('作業創建失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMockClass = async () => {
    // 使用 user.uid 或 user.id（優先使用 uid）
    const teacherUid = user.uid || user.id;

    if (!teacherUid) {
      alert('請先登入');
      return;
    }

    // 檢查是否為 admin 帳號
    const isAdmin = user.role === 'admin' || user.email === 'admin@test.com';
    if (!isAdmin) {
      alert('此功能僅供 admin 帳號測試使用');
      return;
    }

    if (!confirm('確定要創建模擬班級嗎？\n這將創建20個學生並生成學習數據，可能需要1-2分鐘。')) {
      return;
    }

    setIsGeneratingMock(true);
    setLoading(true);

    try {
      console.log('開始創建模擬班級（透過 API）...', { teacherUid });
      const res = await fetch('/api/mock-class', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherUid, className: '測試班級', grade: 'P4', studentCount: 20 }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || '伺服器錯誤');
      }

      console.log('模擬班級創建完成:', result);

      alert(`✅ 模擬班級創建成功！\n\n班級名稱：${result.className}\n學生人數：${result.students.length}人\n年級：P4\n\n已為每個學生生成5-14天的學習數據`);

      // 重新載入班級列表
      await loadClasses();

      // 等待一下讓數據同步
      setTimeout(async () => {
        await loadClasses();
        const updatedClasses = await DB_SERVICE.getTeacherClasses(teacherUid);
        const newClass = updatedClasses.find(c => c.id === result.classId);
        if (newClass) {
          setSelectedClass(newClass);
        } else if (updatedClasses.length > 0) {
          setSelectedClass(updatedClasses[0]);
        }
      }, 2000);
    } catch (e) {
      console.error("Generate mock class error:", e);
      alert('創建模擬班級失敗：' + (e.message || '未知錯誤') + '\n\n請查看控制台了解詳細錯誤信息');
    } finally {
      setIsGeneratingMock(false);
      setLoading(false);
    }
  };

  // 準備圖表數據
  const gradeDistribution = useMemo(() => {
    if (!classStats?.students) return [];
    return classStats.students.map(student => {
      const accuracy = student.stats && student.stats.totalQuestions > 0
        ? Math.round((student.stats.correctAnswers / student.stats.totalQuestions) * 100)
        : 0;
      return {
        name: student.name,
        accuracy: accuracy,
        questions: student.stats?.totalQuestions || 0
      };
    });
  }, [classStats]);

  const studentRanking = useMemo(() => {
    if (!classStats?.students) return [];
    return classStats.students
      .map((student) => {
        const totalQuestions = student.stats?.totalQuestions || 0;
        const correctAnswers = student.stats?.correctAnswers || 0;
        const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
        const avgTimeMs = totalQuestions > 0 ? Math.round((student.stats?.totalTimeSpent || 0) / totalQuestions) : 0;
        return {
          name: student.name,
          level: student.level,
          totalQuestions,
          accuracy,
          avgTimeMs,
          subjects: student.stats?.subjects || {}
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [classStats]);

  const classDailyTimeData = useMemo(() => {
    if (!classStats?.students) return [];
    const dailyMap: Record<string, { date: string; timeSpent: number }> = {};
    classStats.students.forEach((student) => {
      const daily = (student.stats?.dailyActivity || {}) as Record<string, { timeSpent?: number }>;
      Object.entries(daily).forEach(([date, payload]) => {
        if (!dailyMap[date]) {
          dailyMap[date] = { date, timeSpent: 0 };
        }
        dailyMap[date].timeSpent += payload?.timeSpent || 0;
      });
    });
    return Object.values(dailyMap)
      .map((entry) => ({
        ...entry,
        timeMinutes: Math.round((entry.timeSpent || 0) / 60000)
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [classStats]);

  const mistakeDistribution = useMemo(() => {
    if (!classStats?.students) return [];
    const map = {};
    classStats.students.forEach((student) => {
      const mistakes = student.stats?.mistakes || [];
      mistakes.forEach((m) => {
        const key = m.category || m.topic || '未分類';
        map[key] = (map[key] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [classStats]);

  const filteredStudentRanking = useMemo(() => {
    if (rankingSubject === 'all') return studentRanking;
    return studentRanking.filter((student) => {
      const subjects = student.subjects || {};
      return subjects[rankingSubject] > 0;
    });
  }, [studentRanking, rankingSubject]);

  const sortedStudentRanking = useMemo(() => {
    return [...filteredStudentRanking].sort((a, b) => {
      if (rankingSort === 'accuracy_desc') return b.accuracy - a.accuracy;
      if (rankingSort === 'accuracy_asc') return a.accuracy - b.accuracy;
      if (rankingSort === 'time_desc') return b.avgTimeMs - a.avgTimeMs;
      if (rankingSort === 'time_asc') return a.avgTimeMs - b.avgTimeMs;
      if (rankingSort === 'questions_desc') return b.totalQuestions - a.totalQuestions;
      if (rankingSort === 'questions_asc') return a.totalQuestions - b.totalQuestions;
      return 0;
    });
  }, [filteredStudentRanking, rankingSort]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 font-sans">
      {isTeacherPending && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-amber-800 font-bold">⏳ 子帳號等待主號確認中</p>
          <p className="text-sm text-amber-700 mt-1">完成確認後才能完整使用機構功能。</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black flex items-center gap-2 text-slate-800">
          <Users className="text-indigo-600" size={32} /> 教學者控制台
        </h2>
        <button
          onClick={() => setView('dashboard')}
          className="text-slate-500 hover:text-slate-800 font-bold transition flex items-center gap-2"
        >
          <Home size={18} /> 返回
        </button>
      </div>

      {/* 標籤頁 */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-6 py-3 font-bold transition ${activeTab === 'classes'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Users size={18} className="inline mr-2" /> 班級管理
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-6 py-3 font-bold transition ${activeTab === 'assignments'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <FileText size={18} className="inline mr-2" /> 派卷功能
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-bold transition ${activeTab === 'analytics'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <BarChart3 size={18} className="inline mr-2" /> 數據中控台
        </button>
        <button
          onClick={() => {
            setActiveTab('seeds');
            loadSeedQuestions();
            loadPaperCount();
          }}
          className={`px-6 py-3 font-bold transition ${activeTab === 'seeds'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          <Upload size={18} className="inline mr-2" /> 種子題目庫
        </button>
      </div>

      {/* 班級選擇 */}
      {classes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-700">選擇班級：</span>
            <input
              type="text"
              value={classSearch}
              onChange={(e) => setClassSearch(e.target.value)}
              placeholder="搜尋班級名稱"
              className="border rounded-lg px-3 py-1.5 text-sm"
            />
            <select
              value={classSort}
              onChange={(e) => setClassSort(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="students_desc">人數多 → 少</option>
              <option value="students_asc">人數少 → 多</option>
              <option value="grade_desc">年級高 → 低</option>
              <option value="grade_asc">年級低 → 高</option>
            </select>
            <select
              value={classQuickSelect}
              onChange={(e) => {
                const nextId = e.target.value;
                setClassQuickSelect(nextId);
                const match = classes.find((cls) => cls.id === nextId);
                if (match) setSelectedClass(match);
              }}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="all">快速切換班級</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.className || cls.name || cls.id}
                </option>
              ))}
            </select>
            {classes
              .filter((cls) => (cls.className || cls.name || '').toLowerCase().includes(classSearch.toLowerCase()))
              .sort((a, b) => {
                if (classSort === 'students_desc') return (b.students?.length || 0) - (a.students?.length || 0);
                if (classSort === 'students_asc') return (a.students?.length || 0) - (b.students?.length || 0);
                if (classSort === 'grade_desc') return (b.grade || '').localeCompare(a.grade || '');
                if (classSort === 'grade_asc') return (a.grade || '').localeCompare(b.grade || '');
                return 0;
              })
              .map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-lg font-bold transition ${selectedClass?.id === cls.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {cls.className} ({cls.grade}) - {cls.students?.length || 0} 人
                </button>
              ))}
            <div className="ml-auto flex gap-2">
              {(user.role === 'admin' || user.email === 'admin@test.com') && (
                <button
                  onClick={handleGenerateMockClass}
                  disabled={isGeneratingMock}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMock ? '生成中...' : '🎲 創建模擬班級（20人）'}
                </button>
              )}
              <button
                onClick={() => setShowCreateClass(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <Plus size={18} /> 創建新班級
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && !classes.length ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600 font-bold">載入中...</p>
        </div>
      ) : activeTab === 'classes' ? (
        <>
          {/* 創建班級表單 */}
          {showCreateClass && (
            <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">創建新班級</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">班級名稱</label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="例如：4A班"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">年級</label>
                  <select
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                  >
                    {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateClass}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
                  >
                    創建
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateClass(false);
                      setNewClassName('');
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 班級列表 */}
          {classes.length === 0 && !showCreateClass ? (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-12 text-center">
              <Users size={64} className="mx-auto mb-4 text-yellow-600" />
              <h3 className="text-xl font-bold text-yellow-800 mb-2">尚未創建班級</h3>
              <p className="text-yellow-700 mb-4">點擊「創建新班級」來開始管理您的學生，或創建模擬班級進行測試</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCreateClass(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold transition"
                >
                  <Plus size={18} className="inline mr-2" /> 創建新班級
                </button>
                <button
                  onClick={handleGenerateMockClass}
                  disabled={isGeneratingMock}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingMock ? '生成中...' : '🎲 創建模擬班級（20人+數據）'}
                </button>
              </div>
            </div>
          ) : selectedClass ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  {selectedClass.className} - {selectedClass.students?.length || 0} 名學生
                </h3>
                <div className="flex gap-2">
                  {(user.role === 'admin' || user.email === 'admin@test.com') && (
                    <button
                      onClick={async () => {
                        const teacherUid = user.uid || user.id;
                        if (!teacherUid) {
                          alert('無法獲取教師 ID');
                          return;
                        }
                        if (!confirm(`確定要為「${selectedClass.className}」生成20個模擬學生嗎？\n這將創建20個學生並生成學習數據，可能需要1-2分鐘。`)) {
                          return;
                        }
                        setIsGeneratingMock(true);
                        setLoading(true);
                        try {
                          console.log('開始為班級生成模擬學生（透過 API）...', { classId: selectedClass.id, teacherUid });
                          const res = await fetch('/api/mock-class', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              teacherUid,
                              className: selectedClass.className,
                              grade: selectedClass.grade || 'P4',
                              studentCount: 20,
                            }),
                          });
                          const result = await res.json();
                          if (!res.ok || !result.success) {
                            throw new Error(result.error || '伺服器錯誤');
                          }
                          alert(`✅ 已為「${selectedClass.className}」生成20個模擬學生！\n\n已為每個學生生成5-14天的學習數據`);
                          await loadClasses();
                          setTimeout(async () => {
                            await loadClasses();
                            const updatedClass = classes.find(c => c.id === selectedClass.id);
                            if (updatedClass) setSelectedClass(updatedClass);
                          }, 1000);
                        } catch (e) {
                          console.error("Generate mock students error:", e);
                          alert('生成模擬學生失敗：' + (e.message || '未知錯誤'));
                        } finally {
                          setIsGeneratingMock(false);
                          setLoading(false);
                        }
                      }}
                      disabled={isGeneratingMock || loading}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingMock ? '生成中...' : '🎲 生成20個模擬學生'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddStudent(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
                  >
                    <Plus size={18} /> 添加學生
                  </button>
                </div>
              </div>

              {showAddStudent && (
                <div className="bg-slate-50 border-2 border-indigo-200 rounded-lg p-4 mb-4">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="輸入學生電郵地址"
                      className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                    />
                    <button
                      onClick={handleAddStudent}
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
                    >
                      添加
                    </button>
                    <button
                      onClick={() => {
                        setShowAddStudent(false);
                        setStudentEmail('');
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedClass.students?.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">{student.name}</span>
                      <span className="text-sm text-slate-500 ml-2">({student.email})</span>
                    </div>
                    <span className="text-sm text-slate-600">{student.level || 'P4'}</span>
                  </div>
                ))}
                {(!selectedClass.students || selectedClass.students.length === 0) && (
                  <div className="text-center py-8 text-slate-500">
                    尚未添加學生
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : activeTab === 'assignments' ? (
        <>
          {selectedClass ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">派卷功能</h3>
              </div>

              {showCreateAssignment && (
                <div className="bg-slate-50 border-2 border-indigo-200 rounded-lg p-6 mb-4">
                  <h4 className="text-lg font-bold text-slate-800 mb-4">創建新作業</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">作業標題</label>
                      <input
                        type="text"
                        value={assignmentData.title}
                        onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
                        placeholder="例如：數學練習（第3單元）"
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">作業描述</label>
                      <textarea
                        value={assignmentData.description}
                        onChange={(e) => setAssignmentData({ ...assignmentData, description: e.target.value })}
                        placeholder="作業說明..."
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">題目數量</label>
                        <input
                          type="number"
                          value={assignmentData.questionCount}
                          onChange={(e) => setAssignmentData({ ...assignmentData, questionCount: parseInt(e.target.value) || 10 })}
                          min="1"
                          max="50"
                          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">截止日期</label>
                        <input
                          type="date"
                          value={assignmentData.dueDate}
                          onChange={(e) => setAssignmentData({ ...assignmentData, dueDate: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    {/* 選擇單元（可多項選擇） */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">選擇單元（可多選）</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                        {topics.filter(t => t.grade === selectedClass?.grade && t.subject === 'math').map(topic => (
                          <label key={topic.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={assignmentData.topicIds.includes(topic.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setAssignmentData({
                                    ...assignmentData,
                                    topicIds: [...assignmentData.topicIds, topic.id]
                                  });
                                } else {
                                  setAssignmentData({
                                    ...assignmentData,
                                    topicIds: assignmentData.topicIds.filter(id => id !== topic.id)
                                  });
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{topic.name}</span>
                          </label>
                        ))}
                      </div>
                      {assignmentData.topicIds.length === 0 && (
                        <p className="text-xs text-slate-500 mt-1">💡 不選擇單元將從所有單元中生成</p>
                      )}
                    </div>

                    {/* 檢閱曾經儲存的試卷（Email風格） */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        檢閱曾經儲存的試卷
                      </label>
                      <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-64 overflow-y-auto bg-white">
                        {sentPapers.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            <FileText size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-xs">暫無已儲存的試卷</p>
                          </div>
                        ) : (
                          sentPapers.map((paper) => (
                            <div
                              key={paper.id}
                              onClick={() => {
                                // 重用試卷
                                setAssignmentData({
                                  ...assignmentData,
                                  seedQuestionIds: paper.questions?.map(q => q.id).filter(Boolean) || []
                                });
                                alert(`已選擇試卷「${paper.title}」的 ${paper.questions?.length || 0} 道題目`);
                              }}
                              className="p-3 hover:bg-slate-50 cursor-pointer transition"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-slate-800">{paper.title || '未命名試卷'}</span>
                                    <span className="text-xs text-slate-500">
                                      {paper.questionCount || 0} 題
                                    </span>
                                    {paper.grade && (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        {paper.grade}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>{new Date(paper.sentAt || paper.createdAt).toLocaleString('zh-HK')}</span>
                                  </div>
                                </div>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // 載入試卷題目到 B 頁
                                    setAssignmentSeedQuestions(paper.questions || []);
                                    setSelectedAssignmentSeeds(paper.questions?.map(q => q.id).filter(Boolean) || []);
                                    setAssignmentData({
                                      ...assignmentData,
                                      seedQuestionIds: paper.questions?.map(q => q.id).filter(Boolean) || []
                                    });
                                    setActiveTab('assignment-seed-selection');
                                    alert(`已載入試卷「${paper.title}」的 ${paper.questions?.length || 0} 道題目到選擇頁面`);
                                  }}
                                  className="ml-4 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                                >
                                  使用
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* 發送作業按鈕（當有選擇種子題目時顯示） */}
                    {assignmentData.seedQuestionIds && assignmentData.seedQuestionIds.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 mb-3 font-bold">
                          ✓ 已選擇 {assignmentData.seedQuestionIds.length} 道種子題目，可直接發送作業
                        </p>
                        <button
                          onClick={async () => {
                            if (!selectedClass || !assignmentData.title.trim()) {
                              alert('請填寫所有必填欄位');
                              return;
                            }

                            setLoading(true);
                            try {
                              const assignmentId = await DB_SERVICE.createAssignment(
                                selectedClass.id,
                                {
                                  ...assignmentData,
                                  dueDate: assignmentData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                                  seedQuestionIds: assignmentData.seedQuestionIds || []
                                }
                              );

                              if (assignmentId) {
                                // 為班級中的每個學生創建通知
                                if (selectedClass.students && selectedClass.students.length > 0) {
                                  await DB_SERVICE.createAssignmentNotifications(selectedClass.id, assignmentId, assignmentData.title);
                                }

                                alert(`作業創建成功！已發送通知給 ${selectedClass.students?.length || 0} 名學生`);

                                // 重置
                                setAssignmentData({
                                  title: '',
                                  description: '',
                                  topicIds: [],
                                  questionCount: 10,
                                  dueDate: '',
                                  seedQuestionIds: [],
                                  grade: selectedClass?.grade || assignmentData.grade || 'P4'
                                });
                                setShowCreateAssignment(false);
                              } else {
                                alert('創建作業失敗，請檢查連線');
                              }
                            } catch (e) {
                              console.error("Create Assignment Error:", e);
                              alert('創建作業失敗：' + (e.message || '未知錯誤'));
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Send size={18} />
                          發送作業
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={async () => {
                          // 載入種子題目並進入選擇頁面
                          await loadSeedQuestions();
                          setAssignmentSeedQuestions(seedQuestions);
                          setSelectedAssignmentSeeds(assignmentData.seedQuestionIds || []);
                          setActiveTab('assignment-seed-selection');
                        }}
                        disabled={loading || !assignmentData.title.trim()}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Send size={18} /> 下一步：選擇種子題目
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateAssignment(false);
                          setAssignmentData({
                            title: '',
                            description: '',
                            topicIds: [],
                            questionCount: 10,
                            dueDate: '',
                            seedQuestionIds: [],
                            grade: selectedClass?.grade || assignmentData.grade || 'P4'
                          });
                        }}
                        className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-lg transition"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-12 text-center">
              <FileText size={64} className="mx-auto mb-4 text-yellow-600" />
              <h3 className="text-xl font-bold text-yellow-800 mb-2">請先選擇班級</h3>
            </div>
          )}
        </>
      ) : activeTab === 'analytics' ? (
        <>
          {isLoadingInstitutionStats && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 text-slate-500">
              載入機構總覽中...
            </div>
          )}
          {!isLoadingInstitutionStats && institutionStats && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800">機構總覽（同機構班級）</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs text-slate-500">班級數</div>
                  <div className="text-2xl font-bold">{institutionStats.classCount}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs text-slate-500">總學生數</div>
                  <div className="text-2xl font-bold">{institutionStats.totalStudents}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs text-slate-500">總題數</div>
                  <div className="text-2xl font-bold">{institutionStats.totalQuestions}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-xs text-slate-500">平均正確率</div>
                  <div className="text-2xl font-bold">{institutionStats.avgAccuracy}%</div>
                </div>
              </div>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={institutionStats.classChart || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {selectedClass && classStats ? (
            <div className="space-y-6">
              {/* 總覽統計 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users size={24} />
                    <span className="text-3xl font-black">{classStats.totalStudents}</span>
                  </div>
                  <p className="text-sm text-indigo-100">總學生數</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <BookOpen size={24} />
                    <span className="text-3xl font-black">
                      {classStats.students.reduce((sum, s) => sum + (s.stats?.totalQuestions || 0), 0)}
                    </span>
                  </div>
                  <p className="text-sm text-green-100">總題數</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Award size={24} />
                    <span className="text-3xl font-black">
                      {classStats.students.length > 0
                        ? Math.round(
                          classStats.students.reduce((sum, s) => {
                            const accuracy = s.stats && s.stats.totalQuestions > 0
                              ? (s.stats.correctAnswers / s.stats.totalQuestions) * 100
                              : 0;
                            return sum + accuracy;
                          }, 0) / classStats.students.length
                        )
                        : 0}%
                    </span>
                  </div>
                  <p className="text-sm text-blue-100">平均正確率</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp size={24} />
                    <span className="text-3xl font-black">
                      {classStats.students.reduce((sum, s) => sum + (s.stats?.mistakes?.length || 0), 0)}
                    </span>
                  </div>
                  <p className="text-sm text-purple-100">總錯題數</p>
                </div>
              </div>

              {/* 成績分佈圖 */}
              {gradeDistribution.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">學生成績分佈</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="accuracy" fill="#6366f1" name="正確率 (%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">作業完成率</h3>
                  {isLoadingAssignmentStats ? (
                    <p className="text-slate-500">載入中...</p>
                  ) : assignmentCompletionStats.length === 0 ? (
                    <p className="text-slate-500">暫無作業資料</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={assignmentCompletionStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="title" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completionRate" fill="#10b981" name="完成率 (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">每日總學習時長（分鐘）</h3>
                  {classDailyTimeData.length === 0 ? (
                    <p className="text-slate-500">暫無學習時長資料</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={classDailyTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="timeMinutes" stroke="#6366f1" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">錯題分類分佈</h3>
                {mistakeDistribution.length === 0 ? (
                  <p className="text-slate-500">暫無錯題資料</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={mistakeDistribution}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {mistakeDistribution.map((_, index) => (
                          <Cell key={`mistake-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">作業完成率明細</h3>
                {isLoadingAssignmentStats ? (
                  <p className="text-slate-500">載入中...</p>
                ) : assignmentCompletionStats.length === 0 ? (
                  <p className="text-slate-500">暫無作業資料</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-2 pr-4">作業</th>
                          <th className="py-2 pr-4">完成率</th>
                          <th className="py-2 pr-4">狀態</th>
                          <th className="py-2 pr-4">已完成</th>
                          <th className="py-2">總人數</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignmentCompletionStats.map((item) => (
                          <tr key={item.assignmentId} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 font-semibold text-slate-700">{item.title}</td>
                            <td className="py-2 pr-4 text-emerald-600 font-bold">{item.completionRate}%</td>
                            <td className="py-2 pr-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.completionRate >= 80
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.completionRate >= 50
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-red-100 text-red-600'
                                  }`}
                              >
                                {item.completionRate >= 80 ? '高' : item.completionRate >= 50 ? '中' : '低'}
                              </span>
                            </td>
                            <td className="py-2 pr-4">{item.completed}</td>
                            <td className="py-2">{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-800">學生排行（正確率）</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={rankingSubject}
                      onChange={(e) => setRankingSubject(e.target.value)}
                      className="border rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="all">所有科目</option>
                      <option value="math">數學</option>
                      <option value="chi">中文</option>
                      <option value="eng">英文</option>
                    </select>
                    <select
                      value={rankingDays}
                      onChange={(e) => setRankingDays(Number(e.target.value))}
                      className="border rounded-lg px-2 py-1 text-sm"
                    >
                      <option value={7}>近 7 天</option>
                      <option value={14}>近 14 天</option>
                      <option value={30}>近 30 天</option>
                    </select>
                    <select
                      value={rankingSort}
                      onChange={(e) => setRankingSort(e.target.value)}
                      className="border rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="accuracy_desc">正確率高 → 低</option>
                      <option value="accuracy_asc">正確率低 → 高</option>
                      <option value="time_desc">用時長 → 短</option>
                      <option value="time_asc">用時短 → 長</option>
                      <option value="questions_desc">題數多 → 少</option>
                      <option value="questions_asc">題數少 → 多</option>
                    </select>
                  </div>
                </div>
                {sortedStudentRanking.length === 0 ? (
                  <p className="text-slate-500">暫無學生資料</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b">
                          <th className="py-2 pr-4">學生</th>
                          <th className="py-2 pr-4">年級</th>
                          <th className="py-2 pr-4">正確率</th>
                          <th className="py-2 pr-4">總題數</th>
                          <th className="py-2">平均用時</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudentRanking.map((student, index) => (
                          <tr key={`${student.name}-${index}`} className="border-b last:border-b-0">
                            <td className="py-2 pr-4 font-semibold text-slate-700">{student.name}</td>
                            <td className="py-2 pr-4">{student.level || '-'}</td>
                            <td className="py-2 pr-4 text-indigo-600 font-bold">{student.accuracy}%</td>
                            <td className="py-2 pr-4">{student.totalQuestions}</td>
                            <td className="py-2">{Math.round(student.avgTimeMs / 1000)} 秒</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 個別學生進度 */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">個別學生進度</h3>
                <div className="space-y-4">
                  {classStats.students.map((student, index) => {
                    const accuracy = student.stats && student.stats.totalQuestions > 0
                      ? Math.round((student.stats.correctAnswers / student.stats.totalQuestions) * 100)
                      : 0;
                    return (
                      <div key={index} className="border-2 border-slate-200 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-slate-800">{student.name}</span>
                          <span className="text-sm text-slate-600">{student.level}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-3">
                          <div>
                            <div className="text-2xl font-black text-indigo-600">{student.stats?.totalQuestions || 0}</div>
                            <div className="text-xs text-slate-500">總題數</div>
                          </div>
                          <div>
                            <div className="text-2xl font-black text-green-600">{accuracy}%</div>
                            <div className="text-xs text-slate-500">正確率</div>
                          </div>
                          <div>
                            <div className="text-2xl font-black text-red-600">{student.stats?.mistakes?.length || 0}</div>
                            <div className="text-xs text-slate-500">錯題數</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-12 text-center">
              <BarChart3 size={64} className="mx-auto mb-4 text-yellow-600" />
              <h3 className="text-xl font-bold text-yellow-800 mb-2">請先選擇班級</h3>
            </div>
          )}
        </>
      ) : activeTab === 'paper-creation' ? (
        <>
          {/* 載入已發送試卷列表 */}
          {useEffect(() => {
            const loadSentPapers = async () => {
              setIsLoadingSentPapers(true);
              try {
                const papers = await DB_SERVICE.getSentPapers(
                  user.uid || user.id,
                  user.institutionName || null
                );
                setSentPapers(papers);
              } catch (e) {
                console.error("Load Sent Papers Error:", e);
              } finally {
                setIsLoadingSentPapers(false);
              }
            };
            if (activeTab === 'paper-creation') {
              loadSentPapers();
            }
          }, [activeTab, user])}

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-purple-600" /> 試卷制訂
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              根據設定的參數生成試卷，生成後可測試、編輯每道題目，滿意後再派發給學生。
            </p>

            {/* 試卷設定 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">題目數量 *</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={paperCreation.questionCount}
                  onChange={e => setPaperCreation({ ...paperCreation, questionCount: parseInt(e.target.value) || 10 })}
                  className="w-full border-2 border-slate-200 rounded-lg p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">年級</label>
                <select
                  value={paperCreation.grade}
                  onChange={e => setPaperCreation({ ...paperCreation, grade: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-lg p-3"
                >
                  {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 單元選擇 */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">選擇單元（可多選）</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {topics.filter(t => t.grade === paperCreation.grade && t.subject === 'math').map(topic => (
                  <label key={topic.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={paperCreation.selectedTopicIds.includes(topic.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setPaperCreation({
                            ...paperCreation,
                            selectedTopicIds: [...paperCreation.selectedTopicIds, topic.id]
                          });
                        } else {
                          setPaperCreation({
                            ...paperCreation,
                            selectedTopicIds: paperCreation.selectedTopicIds.filter(id => id !== topic.id)
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{topic.name}</span>
                  </label>
                ))}
              </div>
              {paperCreation.selectedTopicIds.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">💡 不選擇單元將從所有單元中隨機生成</p>
              )}
            </div>

            {/* 生成按鈕 */}
            <button
              onClick={async () => {
                if (paperCreation.questionCount < 1 || paperCreation.questionCount > 50) {
                  alert('題目數量必須在 1-50 之間');
                  return;
                }

                setIsGeneratingPaper(true);
                setPaperGenerationProgress({ current: 0, total: paperCreation.questionCount });
                setGeneratedPaper([]);

                try {
                  const questions = [];
                  const { AI_SERVICE } = await import('../lib/ai-service');

                  for (let i = 0; i < paperCreation.questionCount; i++) {
                    setPaperGenerationProgress({ current: i + 1, total: paperCreation.questionCount });

                    const question = await AI_SERVICE.generateQuestion(
                      paperCreation.grade,
                      'normal',
                      paperCreation.selectedTopicIds.length > 0 ? paperCreation.selectedTopicIds : [],
                      topics,
                      'math',
                      user,
                      null, // Language preference
                      {}, // Subtopics
                      false // adhdMode
                    );

                    if (question) {
                      questions.push({
                        ...question,
                        index: i + 1,
                        isSelected: true, // 預設保留
                        isRegenerating: false
                      });
                    }

                    // 避免 API 配額超限，每題間隔 3.5 秒
                    if (i < paperCreation.questionCount - 1) {
                      await new Promise(resolve => setTimeout(resolve, 3500));
                    }
                  }

                  setGeneratedPaper(questions);
                  setActiveTab('paper-preview'); // 切換到試卷預覽頁面
                  alert(`✅ 成功生成 ${questions.length} 道題目！`);
                } catch (e) {
                  console.error("Generate Paper Error:", e);
                  alert('生成試卷失敗：' + (e.message || '未知錯誤'));
                } finally {
                  setIsGeneratingPaper(false);
                  setPaperGenerationProgress({ current: 0, total: 0 });
                }
              }}
              disabled={isGeneratingPaper}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {isGeneratingPaper ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  生成中... ({paperGenerationProgress.current}/{paperGenerationProgress.total})
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  生成試卷
                </>
              )}
            </button>
          </div>

          {/* 已發送試卷列表（Email風格） */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" /> 已發送試卷
              </h4>
              <input
                type="text"
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                placeholder="搜尋試卷標題"
                className="border rounded-lg px-3 py-1.5 text-sm"
              />
              <select
                value={assignmentSort}
                onChange={(e) => setAssignmentSort(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="sent_desc">日期新 → 舊</option>
                <option value="sent_asc">日期舊 → 新</option>
                <option value="count_desc">題數多 → 少</option>
                <option value="count_asc">題數少 → 多</option>
              </select>
              <select
                value={assignmentStatusFilter}
                onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-sm"
              >
                <option value="all">全部狀態</option>
                <option value="overdue">逾期</option>
                <option value="dueSoon">即將到期</option>
                <option value="active">正常</option>
              </select>
              <button
                onClick={async () => {
                  setIsLoadingSentPapers(true);
                  try {
                    const papers = await DB_SERVICE.getSentPapers(
                      user.uid || user.id,
                      user.institutionName || null
                    );
                    setSentPapers(papers);
                  } catch (e) {
                    console.error("Load Sent Papers Error:", e);
                    alert('載入失敗：' + (e.message || '未知錯誤'));
                  } finally {
                    setIsLoadingSentPapers(false);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition flex items-center gap-1"
              >
                <RefreshCw size={14} className={isLoadingSentPapers ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>

            {isLoadingSentPapers ? (
              <div className="text-center py-8">
                <RefreshCw size={24} className="animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">載入中...</p>
              </div>
            ) : sentPapers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暫無已發送試卷</p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                {sentPapers
                  .filter((paper) => (paper.title || '').toLowerCase().includes(assignmentSearch.toLowerCase()))
                  .filter((paper) => {
                    if (assignmentStatusFilter === 'all') return true;
                    if (!paper.dueDate) return assignmentStatusFilter === 'active';
                    const now = Date.now();
                    const dueTime = new Date(paper.dueDate).getTime();
                    const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
                    if (assignmentStatusFilter === 'overdue') return diffDays < 0;
                    if (assignmentStatusFilter === 'dueSoon') return diffDays >= 0 && diffDays <= 3;
                    return diffDays > 3;
                  })
                  .sort((a, b) => {
                    const timeA = new Date(a.sentAt || a.createdAt || 0).getTime();
                    const timeB = new Date(b.sentAt || b.createdAt || 0).getTime();
                    const countA = a.questionCount || a.questions?.length || 0;
                    const countB = b.questionCount || b.questions?.length || 0;
                    if (assignmentSort === 'sent_desc') return timeB - timeA;
                    if (assignmentSort === 'sent_asc') return timeA - timeB;
                    if (assignmentSort === 'count_desc') return countB - countA;
                    if (assignmentSort === 'count_asc') return countA - countB;
                    return 0;
                  })
                  .map((paper) => (
                    <div
                      key={paper.id}
                      onClick={() => setSelectedSentPaper(paper)}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition ${selectedSentPaper?.id === paper.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{paper.title || '未命名試卷'}</span>
                            <span className="text-xs text-slate-500">
                              {paper.questionCount || 0} 題
                            </span>
                            {paper.grade && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {paper.grade}
                              </span>
                            )}
                            {paper.dueDate ? (
                              (() => {
                                const diffDays = Math.ceil((new Date(paper.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                if (diffDays < 0) {
                                  return (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">逾期</span>
                                  );
                                }
                                if (diffDays <= 3) {
                                  return (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">即將到期</span>
                                  );
                                }
                                return (
                                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">正常</span>
                                );
                              })()
                            ) : (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">已發送</span>
                            )}
                          </div>
                          {paper.description && (
                            <p className="text-sm text-slate-600 mb-1 line-clamp-1">
                              {paper.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{new Date(paper.sentAt || paper.createdAt).toLocaleString('zh-HK')}</span>
                            {paper.institutionName && (
                              <span>• {paper.institutionName}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // 重用試卷（不能修改）
                            setSelectedPaperForReuse(paper);
                            setActiveTab('paper-preview');
                          }}
                          className="ml-4 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                        >
                          重用
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'seeds' ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Upload size={20} className="text-green-600" /> 種子題目庫管理
              </h3>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">總數: {paperCount}</span>
            </div>

            <div className="flex gap-4 mb-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">年級</label>
                <select
                  value={paperMeta.grade}
                  onChange={e => setPaperMeta({ ...paperMeta, grade: e.target.value })}
                  className="border p-2 rounded text-sm bg-white"
                >
                  {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">指定單元 (選填)</label>
                <select
                  value={paperMeta.topicId}
                  onChange={e => setPaperMeta({ ...paperMeta, topicId: e.target.value, subTopic: '' })}
                  className="border border-indigo-200 bg-indigo-50 text-indigo-900 p-2 rounded text-sm w-full font-bold"
                >
                  <option value="">🤖 自動偵測 / 不指定</option>
                  {topics.filter(t => t.grade === paperMeta.grade && t.subject === 'math').map(t => (
                    <option key={t.id} value={t.id}>📍 {t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">指定子單元 (選填)</label>
                <select
                  value={paperMeta.subTopic}
                  onChange={e => setPaperMeta({ ...paperMeta, subTopic: e.target.value })}
                  disabled={!paperMeta.topicId}
                  className="border border-slate-300 bg-white p-2 rounded text-sm w-full font-bold disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">🤖 交給 AI 分類</option>
                  {topics
                    .filter(t => t.id === paperMeta.topicId)
                    .flatMap(t => t.subTopics || [])
                    .map(st => (
                      <option key={st} value={st}>📌 {st}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* 統一上傳介面 */}
            <div className="mb-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg">
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Upload size={18} className="text-green-600" />
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
                  className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
                  disabled={isUploading || isProcessingImages || isPreparingPdf}
                />
                {(imageFiles.length > 0 || pdfPages.length > 0) && (
                  <div className="text-xs text-green-700 mt-1 font-bold">
                    ✓ 已選擇 {imageFiles.length + pdfPages.length} 張圖像
                  </div>
                )}
                {isPreparingPdf && (
                  <div className="text-xs text-amber-600 mt-1 font-bold">
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
                  className="w-full h-32 border border-slate-300 rounded-lg p-3 font-mono text-xs bg-white focus:ring-2 focus:ring-green-200 outline-none"
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

            {/* 種子題目列表 */}
            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-3">已上傳的種子題目</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {seedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暫無種子題目</p>
                  </div>
                ) : (
                  seedQuestions.map((q, idx) => {
                    const questionId = q.id || `temp_${idx}`;
                    const isShowingFeedback = showFeedbackInput === questionId;

                    return (
                      <div key={questionId} className="p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800 mb-1">
                              {q.question?.substring(0, 80) || '無題目文字'}...
                            </p>
                            <div className="flex gap-2 text-xs text-slate-500">
                              <span>答案: {q.answer}</span>
                              {q.topic && <span>• {q.topic}</span>}
                              {q.shape && <span>• 圖形: {q.shape}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (isShowingFeedback) {
                                setShowFeedbackInput(null);
                                setTeacherFeedbackText('');
                                setTeacherSelectedTypes([]);
                                setTeacherCategory('');
                              } else {
                                setShowFeedbackInput(questionId);
                              }
                            }}
                            className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                          >
                            {isShowingFeedback ? '取消' : '💬 回饋'}
                          </button>
                        </div>

                        {/* 回饋輸入區域 */}
                        {isShowingFeedback && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-700 mb-2 font-semibold">
                              💡 您的回饋將提交給開發者審核，審核通過後才會應用於 AI 生成
                            </p>

                            {/* 題型選擇 */}
                            <div className="mb-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                題型分類（可多選）*：
                              </label>
                              <div className="flex flex-wrap gap-1">
                                {questionTypeOptions.map(type => (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => {
                                      if (teacherSelectedTypes.includes(type)) {
                                        setTeacherSelectedTypes(teacherSelectedTypes.filter(t => t !== type));
                                      } else {
                                        setTeacherSelectedTypes([...teacherSelectedTypes, type]);
                                      }
                                    }}
                                    className={`px-2 py-1 rounded text-xs transition ${teacherSelectedTypes.includes(type)
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-100'
                                      }`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 分類選擇 */}
                            <div className="mb-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                主分類 *：
                              </label>
                              <select
                                value={teacherCategory}
                                onChange={(e) => setTeacherCategory(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              >
                                <option value="">請選擇分類</option>
                                {categoryOptions.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            {/* 回饋輸入 */}
                            <div className="mb-2">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                回饋內容 *：
                              </label>
                              <textarea
                                value={teacherFeedbackText}
                                onChange={(e) => setTeacherFeedbackText(e.target.value)}
                                placeholder="例如：這類題目應該注意單位換算..."
                                className="w-full h-20 bg-white border border-slate-300 rounded px-2 py-1 text-xs resize-none"
                              />
                            </div>

                            {/* 提交按鈕 */}
                            <button
                              onClick={async () => {
                                if (!teacherFeedbackText.trim()) {
                                  alert('請輸入回饋內容');
                                  return;
                                }
                                if (teacherSelectedTypes.length === 0) {
                                  alert('請至少選擇一個題型');
                                  return;
                                }
                                if (!teacherCategory) {
                                  alert('請選擇分類');
                                  return;
                                }

                                setIsSavingTeacherFeedback(true);
                                try {
                                  const feedbackData = {
                                    questionId: questionId,
                                    questionType: teacherSelectedTypes,
                                    category: teacherCategory,
                                    subject: 'math',
                                    feedback: teacherFeedbackText.trim(),
                                    createdBy: user.email
                                  };

                                  const feedbackId = await DB_SERVICE.saveTeacherFeedback(feedbackData);

                                  if (feedbackId) {
                                    alert('✅ 回饋已提交！開發者審核通過後，AI 將參考此回饋生成題目。');
                                    setShowFeedbackInput(null);
                                    setTeacherFeedbackText('');
                                    setTeacherSelectedTypes([]);
                                    setTeacherCategory('');
                                  } else {
                                    alert('❌ 提交失敗，請檢查連線');
                                  }
                                } catch (e) {
                                  console.error("Save Teacher Feedback Error:", e);
                                  alert('提交失敗：' + (e.message || '未知錯誤'));
                                } finally {
                                  setIsSavingTeacherFeedback(false);
                                }
                              }}
                              disabled={isSavingTeacherFeedback || !teacherFeedbackText.trim() || teacherSelectedTypes.length === 0 || !teacherCategory}
                              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold py-1.5 rounded text-xs transition flex items-center justify-center gap-1"
                            >
                              {isSavingTeacherFeedback ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" />
                                  提交中...
                                </>
                              ) : (
                                <>
                                  <Send size={12} />
                                  提交回饋給開發者
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'paper-preview' ? (
        <>
          {/* 試卷預覽獨立頁面 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* 標題欄 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('paper-creation');
                    setSelectedPaperForReuse(null);
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition flex items-center gap-1"
                >
                  <Home size={16} />
                  返回
                </button>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-purple-600" />
                  {selectedPaperForReuse ? '試卷預覽（只讀）' : '試卷預覽'}
                  <span className="text-sm font-normal text-slate-500">
                    ({selectedPaperForReuse ? selectedPaperForReuse.questions?.length || 0 : generatedPaper.filter(q => q.isSelected).length}/{selectedPaperForReuse ? selectedPaperForReuse.questions?.length || 0 : generatedPaper.length} 題)
                  </span>
                </h3>
              </div>
            </div>

            {/* 試卷內容 */}
            <div className="space-y-4">
              {(selectedPaperForReuse?.questions || generatedPaper).map((q, idx) => {
                const question = selectedPaperForReuse ? q : generatedPaper[idx];
                if (!question) return null;

                return (
                  <div
                    key={idx}
                    className={`p-4 border-2 rounded-lg ${selectedPaperForReuse
                        ? 'border-slate-200 bg-slate-50'
                        : question.isSelected
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-bold text-slate-700">第 {question.index || idx + 1} 題</span>
                        {question.isRegenerating && (
                          <RefreshCw size={14} className="animate-spin text-blue-600" />
                        )}
                      </div>
                      {!selectedPaperForReuse && (
                        <div className="flex gap-2">
                          {/* 選擇單元按鈕 */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                // 使用狀態控制下拉菜單顯示
                                const currentSelector = showTopicSelector;
                                setShowTopicSelector(currentSelector === `preview_${idx}` ? null : `preview_${idx}`);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition flex items-center gap-1"
                            >
                              📚 選擇單元
                            </button>

                            {/* 單元選擇下拉菜單 */}
                            {showTopicSelector === `preview_${idx}` && (
                              <div className="absolute right-0 top-full mt-1 bg-white border-2 border-indigo-200 rounded-lg shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                                <div className="p-2">
                                  <div className="text-xs font-bold text-slate-700 mb-2">選擇單元：</div>
                                  {topics && topics.length > 0 ? (
                                    topics
                                      .filter(t => t.grade === paperCreation.grade && t.subject === 'math')
                                      .map((topic) => (
                                        <button
                                          key={topic.id}
                                          onClick={() => {
                                            const updatedPaper = [...generatedPaper];
                                            updatedPaper[idx].selectedTopic = topic.name;
                                            setGeneratedPaper(updatedPaper);
                                            setShowTopicSelector(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 rounded transition"
                                        >
                                          {topic.name}
                                        </button>
                                      ))
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-slate-400">暫無單元</div>
                                  )}
                                  <button
                                    onClick={() => {
                                      setShowTopicSelector(null);
                                    }}
                                    className="w-full mt-2 px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* 重新生成按鈕 */}
                          <button
                            onClick={async () => {
                              const updatedPaper = [...generatedPaper];
                              updatedPaper[idx].isRegenerating = true;
                              setGeneratedPaper(updatedPaper);

                              try {
                                const { AI_SERVICE } = await import('../lib/ai-service');
                                const newQuestion = await AI_SERVICE.generateQuestion(
                                  paperCreation.grade,
                                  'normal',
                                  paperCreation.selectedTopicIds.length > 0 ? paperCreation.selectedTopicIds : [],
                                  topics,
                                  'math',
                                  user
                                );

                                if (newQuestion) {
                                  updatedPaper[idx] = {
                                    ...newQuestion,
                                    index: question.index || idx + 1,
                                    isSelected: true,
                                    isRegenerating: false,
                                    selectedTopic: question.selectedTopic || null
                                  };
                                  setGeneratedPaper(updatedPaper);
                                }
                              } catch (e) {
                                console.error("Regenerate Question Error:", e);
                                alert('重新生成失敗：' + (e.message || '未知錯誤'));
                                updatedPaper[idx].isRegenerating = false;
                                setGeneratedPaper(updatedPaper);
                              }
                            }}
                            disabled={question.isRegenerating}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-xs rounded transition flex items-center gap-1"
                          >
                            {question.isRegenerating ? (
                              <>
                                <RefreshCw size={12} className="animate-spin" />
                                生成中...
                              </>
                            ) : (
                              <>
                                🔄 重新生成
                              </>
                            )}
                          </button>
                          {/* 保留/移除按鈕 */}
                          <button
                            onClick={() => {
                              const updatedPaper = [...generatedPaper];
                              updatedPaper[idx].isSelected = !updatedPaper[idx].isSelected;
                              setGeneratedPaper(updatedPaper);
                            }}
                            className={`px-3 py-1.5 text-xs rounded transition ${question.isSelected
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                          >
                            {question.isSelected ? '❌ 移除' : '✅ 保留'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded p-3 mb-2">
                      {question.selectedTopic && (
                        <div className="mb-2">
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                            單元：{question.selectedTopic}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-slate-700 mb-2">{question.question}</p>
                      {question.options && Array.isArray(question.options) && (
                        <div className="space-y-1">
                          {question.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`text-xs p-2 rounded ${opt === question.answer ? 'bg-green-100 text-green-800 font-bold' : 'bg-slate-50'
                                }`}
                            >
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-slate-600">
                        <strong>答案：</strong>{question.answer}
                        {question.explanation && (
                          <>
                            <br />
                            <strong>解釋：</strong>{question.explanation}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部操作按鈕 */}
            {!selectedPaperForReuse && (
              <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
                <button
                  onClick={() => {
                    if (!confirm('確定要清空當前試卷嗎？')) return;
                    setGeneratedPaper([]);
                    setActiveTab('paper-creation');
                  }}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-lg transition"
                >
                  清空試卷
                </button>
                <button
                  onClick={async () => {
                    const selectedQuestions = generatedPaper.filter(q => q.isSelected);
                    if (selectedQuestions.length === 0) {
                      alert('請至少保留一道題目');
                      return;
                    }

                    // 保存試卷
                    try {
                      const paperId = await DB_SERVICE.saveSentPaper(
                        {
                          title: `試卷 ${new Date().toLocaleDateString('zh-HK')}`,
                          description: '',
                          questions: selectedQuestions,
                          grade: paperCreation.grade,
                          topicIds: paperCreation.selectedTopicIds,
                          createdBy: user.email
                        },
                        user.uid || user.id,
                        user.institutionName || ''
                      );

                      if (paperId) {
                        alert(`✅ 試卷已保存並派發！共 ${selectedQuestions.length} 道題目。`);
                        setActiveTab('paper-creation');
                        setGeneratedPaper([]);
                        // 重新載入已發送試卷列表
                        const papers = await DB_SERVICE.getSentPapers(
                          user.uid || user.id,
                          user.institutionName || null
                        );
                        setSentPapers(papers);
                      } else {
                        alert('❌ 保存失敗，請檢查連線');
                      }
                    } catch (e) {
                      console.error("Save Paper Error:", e);
                      alert('保存失敗：' + (e.message || '未知錯誤'));
                    }
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition"
                >
                  保存並派發
                </button>
              </div>
            )}
          </div>
        </>
      ) : activeTab === 'assignment-seed-selection' ? (
        <>
          {/* 作業種子題目選擇頁面（B頁） */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {/* 標題欄 */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveTab('assignments');
                    setShowCreateAssignment(true);
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition flex items-center gap-1"
                >
                  <Home size={16} />
                  返回
                </button>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={20} className="text-indigo-600" />
                  選擇種子題目（可選，留空則使用 AI 自動生成）
                </h3>
              </div>
            </div>

            {/* 作業信息顯示 */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-bold text-slate-700">作業標題：</span>
                  <span className="text-slate-600 ml-2">{assignmentData.title}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700">題目數量：</span>
                  <span className="text-slate-600 ml-2">{assignmentData.questionCount}</span>
                </div>
                {assignmentData.topicIds.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-bold text-slate-700">選擇單元：</span>
                    <span className="text-slate-600 ml-2">
                      {topics.filter(t => assignmentData.topicIds.includes(t.id)).map(t => t.name).join('、')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 種子題目列表 */}
            <div className="space-y-3">
              {assignmentSeedQuestions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暫無種子題目，將使用 AI 自動生成</p>
                </div>
              ) : (
                assignmentSeedQuestions.map((q, idx) => {
                  const isSelected = selectedAssignmentSeeds.includes(q.id);

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 border-2 rounded-lg ${isSelected ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                        }`}
                      onClick={() => {
                        // 點擊題目區域切換選擇狀態
                        if (isSelected) {
                          setSelectedAssignmentSeeds(selectedAssignmentSeeds.filter(id => id !== q.id));
                        } else {
                          setSelectedAssignmentSeeds([...selectedAssignmentSeeds, q.id]);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-bold text-slate-700">題目 {idx + 1}</span>
                        </div>
                        <div className="flex gap-2">
                          {/* 選擇單元按鈕 */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowTopicSelector(showTopicSelector === idx ? null : idx);
                                setSelectedTopicForQuestion(null);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition flex items-center gap-1"
                            >
                              📚 選擇單元
                            </button>

                            {/* 單元選擇下拉菜單 */}
                            {showTopicSelector === idx && (
                              <div className="absolute right-0 top-full mt-1 bg-white border-2 border-indigo-200 rounded-lg shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                                <div className="p-2">
                                  <div className="text-xs font-bold text-slate-700 mb-2">選擇單元：</div>
                                  {topics && topics.length > 0 ? (
                                    topics
                                      .filter(t => {
                                        const grade = selectedClass?.grade || assignmentData.grade || 'P4';
                                        return t.grade === grade && t.subject === 'math';
                                      })
                                      .map((topic) => (
                                        <button
                                          key={topic.id}
                                          onClick={() => {
                                            const updatedQuestions = [...assignmentSeedQuestions];
                                            updatedQuestions[idx].selectedTopic = topic.name;
                                            setAssignmentSeedQuestions(updatedQuestions);
                                            setShowTopicSelector(null);
                                            setSelectedTopicForQuestion(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 rounded transition"
                                        >
                                          {topic.name}
                                        </button>
                                      ))
                                  ) : (
                                    <div className="px-3 py-2 text-xs text-slate-400">暫無單元</div>
                                  )}
                                  <button
                                    onClick={() => {
                                      setShowTopicSelector(null);
                                      setSelectedTopicForQuestion(null);
                                    }}
                                    className="w-full mt-2 px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded transition"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {/* 重新生成按鈕 */}
                          <button
                            onClick={async () => {
                              try {
                                const { AI_SERVICE } = await import('../lib/ai-service');
                                const newQuestion = await AI_SERVICE.generateQuestion(
                                  selectedClass?.grade || 'P4',
                                  'normal',
                                  assignmentData.topicIds.length > 0 ? assignmentData.topicIds : [],
                                  topics,
                                  'math',
                                  user
                                );

                                if (newQuestion) {
                                  const updatedQuestions = [...assignmentSeedQuestions];
                                  updatedQuestions[idx] = {
                                    ...newQuestion,
                                    id: q.id || `temp_${idx}`,
                                    selectedTopic: q.selectedTopic || null
                                  };
                                  setAssignmentSeedQuestions(updatedQuestions);
                                  alert('題目已重新生成！');
                                }
                              } catch (e) {
                                console.error("Regenerate Question Error:", e);
                                alert('重新生成失敗：' + (e.message || '未知錯誤'));
                              }
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition flex items-center gap-1"
                          >
                            🔄 重新生成
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded p-3 mt-2">
                        {q.selectedTopic && (
                          <div className="mb-2">
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              單元：{q.selectedTopic}
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-slate-700 mb-2">{q.question?.substring(0, 150) || '無題目文字'}...</p>
                        <div className="text-xs text-slate-500">
                          <span>答案: {q.answer}</span>
                          {q.topic && <span className="ml-2">• {q.topic}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部操作按鈕 */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => {
                  setActiveTab('assignments');
                  setShowCreateAssignment(true);
                }}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-lg transition"
              >
                返回
              </button>
              <button
                onClick={async () => {
                  // 儲存試卷（不發送作業）
                  try {
                    const selectedQuestions = assignmentSeedQuestions.filter(q => selectedAssignmentSeeds.includes(q.id));

                    const paperId = await DB_SERVICE.saveSentPaper(
                      {
                        title: assignmentData.title || '未命名試卷',
                        description: assignmentData.description || '',
                        questions: selectedQuestions,
                        questionCount: selectedQuestions.length,
                        grade: selectedClass?.grade || assignmentData.grade || 'P4',
                        topicIds: assignmentData.topicIds,
                        createdBy: user.email
                      },
                      user.uid || user.id,
                      user.institutionName || ''
                    );

                    if (paperId) {
                      alert(`✅ 試卷已儲存！共 ${selectedQuestions.length} 道題目。`);

                      // 更新 assignmentData 的 seedQuestionIds，以便在首頁顯示
                      setAssignmentData({
                        ...assignmentData,
                        seedQuestionIds: selectedAssignmentSeeds
                      });

                      // 返回首頁
                      setActiveTab('assignments');
                      setShowCreateAssignment(true);

                      // 重新載入已儲存試卷列表
                      try {
                        const papers = await DB_SERVICE.getSentPapers(
                          user.uid || user.id,
                          user.institutionName || null
                        );
                        setSentPapers(papers);
                      } catch (e) {
                        console.error("Reload Sent Papers Error:", e);
                      }
                    } else {
                      alert('❌ 儲存失敗，請檢查連線');
                    }
                  } catch (e) {
                    console.error("Save Paper Error:", e);
                    alert('儲存失敗：' + (e.message || '未知錯誤'));
                  }
                }}
                disabled={selectedAssignmentSeeds.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Save size={18} />
                儲存試卷 {selectedAssignmentSeeds.length > 0 && `(${selectedAssignmentSeeds.length} 道題目)`}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
