"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, BarChart3, FileText, Send, Settings, Home, BookOpen, Award, TrendingUp, Upload, Save, RefreshCw } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';
import { createMockClassWithStudents } from '../lib/mock-data-generator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TeacherView({ setView, user, topics }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStats, setClassStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes', 'assignments', 'analytics', 'seeds'
  
  // 班級管理狀態
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('P4');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentEmail, setStudentEmail] = useState('');
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  
  // 派卷狀態
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    topicIds: [],
    questionCount: 10,
    dueDate: '',
    seedQuestionIds: [] // 新增：選擇的種子題目 ID
  });
  
  // 種子題目上傳狀態
  const [showSeedUpload, setShowSeedUpload] = useState(false);
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({ year: '2024', grade: 'P4', term: '上學期', topicId: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [imageProcessingProgress, setImageProcessingProgress] = useState({ current: 0, total: 0 });
  const [seedQuestions, setSeedQuestions] = useState([]); // 種子題目列表
  const [paperCount, setPaperCount] = useState(0);
  
  // 教學者回饋相關狀態
  const [showFeedbackInput, setShowFeedbackInput] = useState(null); // 當前顯示回饋輸入的題目 ID
  const [teacherFeedbackText, setTeacherFeedbackText] = useState('');
  const [teacherSelectedTypes, setTeacherSelectedTypes] = useState([]);
  const [teacherCategory, setTeacherCategory] = useState('');
  const [isSavingTeacherFeedback, setIsSavingTeacherFeedback] = useState(false);
  
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
    if (selectedClass) {
      loadClassStats(selectedClass.id);
      loadAssignments(selectedClass.id);
    }
  }, [selectedClass]);

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
      const classesList = await DB_SERVICE.getTeacherClasses(teacherUid);
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

  const loadClassStats = async (classId) => {
    setLoading(true);
    try {
      const stats = await DB_SERVICE.getClassStats(classId);
      setClassStats(stats);
    } catch (e) {
      console.error("Load class stats error:", e);
    } finally {
      setLoading(false);
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

  // 載入種子題目
  const loadSeedQuestions = async () => {
    try {
      const { db } = await import('../lib/firebase');
      const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
      const { APP_ID } = await import('../lib/constants');
      
      const q = query(
        collection(db, "artifacts", APP_ID, "public", "data", "past_papers"),
        where("grade", "==", selectedClass?.grade || paperMeta.grade || 'P4'),
        limit(100)
      );
      const snap = await getDocs(q);
      const questions = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.source === 'seed_init' || data.source === 'vision_api' || data.source === 'manual_json') {
          questions.push({ id: d.id, ...data });
        }
      });
      setSeedQuestions(questions);
    } catch (e) {
      console.error("Load seed questions error:", e);
    }
  };

  // 載入試卷數量
  const loadPaperCount = async () => {
    try {
      const count = await DB_SERVICE.countPastPapers();
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
      // 步驟 1：處理上傳的圖像文件
      if (imageFiles.length > 0) {
        setImageProcessingProgress({ current: 0, total: imageFiles.length });
        
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          setImageProcessingProgress({ current: i + 1, total: imageFiles.length });
          
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
              setImageProcessingProgress(prev => ({ 
                current: prev.current + 1, 
                total: prev.total + 1 
              }));
              
              try {
                const result = await processSingleImage(q.image, q.imageFileName || 'json_image');
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
      if (allQuestions.length === 0 && imageFiles.length === 0 && !paperJson.trim()) {
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
          grade: paperMeta.grade || selectedClass?.grade || 'P4',
          term: paperMeta.term,
          topic: selectedTopicName || q.topic,
          source: q.source || 'seed_init',
          subject: 'math',
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.uid || user.id // 記錄上傳者
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
        
        // 清空表單並重新載入
        setPaperJson('');
        setImageFiles([]);
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
          seedQuestionIds: []
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
      console.log('開始創建模擬班級...', { teacherUid, user });
      let progressMessage = '';
      const result = await createMockClassWithStudents(
        teacherUid, 
        '測試班級', 
        'P4', 
        20,
        (msg) => {
          progressMessage = msg;
          console.log('進度:', msg);
        }
      );
      
      console.log('模擬班級創建完成:', result);
      
      alert(`✅ 模擬班級創建成功！\n\n班級名稱：${result.className}\n學生人數：${result.students.length}人\n年級：P4\n\n已為每個學生生成5-14天的學習數據`);
      
      // 重新載入班級列表
      await loadClasses();
      
      // 等待一下讓數據同步
      setTimeout(async () => {
        await loadClasses();
        // 選擇新創建的班級
        const updatedClasses = await DB_SERVICE.getTeacherClasses(teacherUid);
        const newClass = updatedClasses.find(c => c.id === result.classId);
        if (newClass) {
          setSelectedClass(newClass);
          console.log('已選擇班級:', newClass);
        } else {
          console.warn('找不到新創建的班級，classId:', result.classId, '所有班級:', updatedClasses);
          // 如果還是找不到，選擇第一個班級
          if (updatedClasses.length > 0) {
            setSelectedClass(updatedClasses[0]);
          }
        }
      }, 2000);
    } catch (e) {
      console.error("Generate mock class error:", e);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-500 font-sans">
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
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'classes'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={18} className="inline mr-2" /> 班級管理
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'assignments'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={18} className="inline mr-2" /> 派卷功能
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'analytics'
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
          className={`px-6 py-3 font-bold transition ${
            activeTab === 'seeds'
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
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-lg font-bold transition ${
                  selectedClass?.id === cls.id
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
                          console.log('開始為班級生成模擬學生...', { classId: selectedClass.id, teacherUid });
                          // 為現有班級添加模擬學生
                          const result = await createMockClassWithStudents(
                            teacherUid,
                            selectedClass.className,
                            selectedClass.grade || 'P4',
                            20,
                            (msg) => console.log('進度:', msg)
                          );
                          // 將新學生添加到現有班級
                          const updatedStudents = [...(selectedClass.students || []), ...result.students.map(s => ({
                            email: s.email,
                            uid: s.uid,
                            name: s.name,
                            level: s.level,
                            addedAt: new Date().toISOString()
                          }))];
                          // 更新班級
                          const { db } = await import('../lib/firebase');
                          const { doc, setDoc } = await import('firebase/firestore');
                          const { APP_ID } = await import('../lib/constants');
                          await setDoc(
                            doc(db, "artifacts", APP_ID, "public", "data", "classes", selectedClass.id),
                            { ...selectedClass, students: updatedStudents }
                          );
                          alert(`✅ 已為「${selectedClass.className}」生成20個模擬學生！\n\n已為每個學生生成5-14天的學習數據`);
                          await loadClasses();
                          // 重新選擇班級以刷新數據
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
                <button
                  onClick={() => setShowCreateAssignment(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-2"
                >
                  <Send size={18} /> 創建作業
                </button>
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
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        選擇種子題目（可選，留空則使用 AI 自動生成）
                      </label>
                      <div className="max-h-40 overflow-y-auto border-2 border-slate-200 rounded-lg p-2 bg-white">
                        {seedQuestions.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">暫無種子題目，請先上傳</p>
                        ) : (
                          seedQuestions.slice(0, 20).map((q, idx) => (
                            <label key={q.id || idx} className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={assignmentData.seedQuestionIds?.includes(q.id) || false}
                                onChange={(e) => {
                                  const currentIds = assignmentData.seedQuestionIds || [];
                                  if (e.target.checked) {
                                    setAssignmentData({
                                      ...assignmentData,
                                      seedQuestionIds: [...currentIds, q.id]
                                    });
                                  } else {
                                    setAssignmentData({
                                      ...assignmentData,
                                      seedQuestionIds: currentIds.filter(id => id !== q.id)
                                    });
                                  }
                                }}
                                className="mt-1"
                              />
                              <span className="text-xs text-slate-700 flex-1">
                                {q.question?.substring(0, 60) || '無題目文字'}...
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      {assignmentData.seedQuestionIds?.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ 已選擇 {assignmentData.seedQuestionIds.length} 道種子題目
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateAssignment}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50"
                      >
                        發送作業
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
                            seedQuestionIds: []
                          });
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center py-12 bg-slate-50 rounded-lg">
                <FileText size={48} className="mx-auto mb-3 text-slate-400" />
                <p className="text-slate-600 font-bold">作業列表功能開發中</p>
              </div>
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
      ) : activeTab === 'seeds' ? (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Upload size={20} className="text-green-600"/> 種子題目庫管理
              </h3>
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">總數: {paperCount}</span>
            </div>
            
            <div className="flex gap-4 mb-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">年級</label>
                <select 
                  value={paperMeta.grade} 
                  onChange={e => setPaperMeta({...paperMeta, grade: e.target.value})} 
                  className="border p-2 rounded text-sm bg-white"
                >
                  {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">指定單元 (選填)</label>
                <select 
                  value={paperMeta.topicId} 
                  onChange={e => setPaperMeta({...paperMeta, topicId: e.target.value})} 
                  className="border border-indigo-200 bg-indigo-50 text-indigo-900 p-2 rounded text-sm w-full font-bold"
                >
                  <option value="">🤖 自動偵測 / 不指定</option>
                  {topics.filter(t => t.grade === paperMeta.grade && t.subject === 'math').map(t => (
                    <option key={t.id} value={t.id}>📍 {t.name}</option>
                  ))}
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
                  📷 方式 1：上傳圖像文件（支持多選，自動識別圖形）
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs border border-slate-300 rounded p-2 bg-white"
                  disabled={isUploading || isProcessingImages}
                />
                {imageFiles.length > 0 && (
                  <div className="text-xs text-green-700 mt-1 font-bold">
                    ✓ 已選擇 {imageFiles.length} 張圖像
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
                disabled={isUploading || isProcessingImages || (imageFiles.length === 0 && !paperJson.trim())} 
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isUploading || isProcessingImages ? (
                  <>
                    <RefreshCw size={18} className="animate-spin"/>
                    {isProcessingImages 
                      ? `處理中 ${imageProcessingProgress.current}/${imageProcessingProgress.total || imageFiles.length}...` 
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

            {/* 種子題目列表 */}
            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-800 mb-3">已上傳的種子題目</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {seedQuestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50"/>
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
                                    className={`px-2 py-1 rounded text-xs transition ${
                                      teacherSelectedTypes.includes(type)
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
      ) : null}
    </div>
  );
}
