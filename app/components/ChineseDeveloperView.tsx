"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Home, Upload, Save, FileJson, RefreshCw, Sparkles, Database, Trash2, Plus, Languages } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';

export default function ChineseDeveloperView({ topics, setTopics, setView, isFirebaseReady }) {
  const [activeTab, setActiveTab] = useState('syllabus');
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({ year: '2024', grade: 'P4', term: '上學期', topicId: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  
  // 新增單元相關狀態（中文科）
  const [newTopic, setNewTopic] = useState({ name: '', grade: 'P4', term: '上學期', subject: 'chi' });
  const [subTopics, setSubTopics] = useState([]);
  const [subTopicInput, setSubTopicInput] = useState('');
  const [topicEdits, setTopicEdits] = useState({});

  // 測試生成相關狀態
  const [testSeed, setTestSeed] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 取得目前條件下的可用單元 (用於下拉選單)
  const availableTopics = useMemo(() => {
    return topics.filter(t => t.grade === paperMeta.grade && t.subject === 'chi');
  }, [topics, paperMeta.grade]);

  useEffect(() => {
    const fetchCount = async () => { 
        if(!isFirebaseReady) return; 
        const c = await DB_SERVICE.countPastPapers(); 
        setPaperCount(c); 
    };
    if(activeTab === 'past_papers') fetchCount();
  }, [activeTab, isFirebaseReady]);

  // --- Handlers ---
  const handleAddSubTopic = () => { 
      if (!subTopicInput.trim()) return; 
      setSubTopics([...subTopics, subTopicInput.trim()]); 
      setSubTopicInput(''); 
  };

  const handleAddTopic = async () => {
     const topicToAdd = { 
         name: newTopic.name, grade: newTopic.grade, term: newTopic.term, subject: 'chi', 
         type: 'text', lang: 'zh-HK', 
         subTopics: subTopics, createdAt: new Date().toISOString() 
     };
     
     const docId = await DB_SERVICE.addTopic(topicToAdd);
     
     if (docId) {
         const newTopicWithId = { id: docId, ...topicToAdd };
         setTopics(prevTopics => [...prevTopics, newTopicWithId]);
         alert("中文單元已成功新增！");
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

  const handleUploadPastPaper = async () => {
      if (!paperJson) { alert("請貼上 JSON 內容"); return; }
      setIsUploading(true);
      try {
          const rawData = JSON.parse(paperJson);
          const questions = Array.isArray(rawData) ? rawData : [rawData];
          
          let selectedTopicName = null;
          if (paperMeta.topicId) {
             const found = topics.find(t => t.id === paperMeta.topicId);
             if(found) selectedTopicName = found.name;
          }

          const enrichedPapers = questions.map(q => ({
              ...q, 
              year: paperMeta.year, grade: paperMeta.grade, term: paperMeta.term,
              topic: selectedTopicName || q.topic, 
              source: 'seed_init', 
              subject: 'chi',
              uploadedAt: new Date().toISOString()
          }));

          await DB_SERVICE.uploadPastPaperBatch(enrichedPapers);
          alert(`成功上傳 ${enrichedPapers.length} 道中文種子題目！`); 
          setPaperJson(''); 
          const c = await DB_SERVICE.countPastPapers(); 
          setPaperCount(c);
      } catch (e) { 
          alert("上傳失敗: " + e.message); 
      }
      setIsUploading(false);
  };

  const handleTestGenerate = async () => {
      if (!testSeed) { alert("請先從下方貼上一道題目的 JSON 來當作測試種子"); return; }
      setIsGenerating(true);
      setGeneratedResult(null);
      try {
          const prompt = `
            Role: Chinese Language Teacher.
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
    <div className="max-w-6xl mx-auto bg-slate-50 min-h-screen font-sans text-slate-800">
      <div className="bg-rose-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
            <Languages size={20} className="text-rose-300" />
            <h1 className="font-bold text-lg">中文科管理 (Chinese Subject)</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setView('developer')} className="text-white/80 hover:text-white text-xs bg-indigo-600 px-3 py-1.5 rounded-lg transition">
                數學科
            </button>
            <button onClick={() => setView('english-developer')} className="text-white/80 hover:text-white text-xs bg-amber-600 px-3 py-1.5 rounded-lg transition">
                英文科
            </button>
            <button onClick={() => setView('dashboard')} className="text-rose-200 hover:text-white text-sm flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg transition">
                <Home size={14} /> 返回首頁
            </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button onClick={() => setActiveTab('syllabus')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'syllabus' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                1. 課程單元管理
            </button>
            <button onClick={() => setActiveTab('past_papers')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'past_papers' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'}`}>
                2. 試卷庫 & 種子管理
            </button>
        </div>

        {activeTab === 'syllabus' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Plus size={18}/> 新增中文單元</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">年級</label>
                                <select value={newTopic.grade} onChange={e => setNewTopic({...newTopic, grade: e.target.value})} className="w-full border p-2 rounded text-sm">
                                    {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">學期</label>
                                <select value={newTopic.term} onChange={e => setNewTopic({...newTopic, term: e.target.value})} className="w-full border p-2 rounded text-sm">
                                    <option>上學期</option><option>下學期</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">單元名稱</label>
                            <input type="text" value={newTopic.name} onChange={e => setNewTopic({...newTopic, name: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="例如：閱讀理解、成語運用" />
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">子單元 (Sub-topics)</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={subTopicInput} onChange={e => setSubTopicInput(e.target.value)} className="flex-1 border p-2 rounded text-sm" placeholder="輸入後按新增" />
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
                        <button onClick={handleAddTopic} className="w-full bg-rose-600 text-white py-2 rounded-lg font-bold shadow hover:bg-rose-700 transition">儲存單元至資料庫</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Database size={18}/> 現有中文單元列表</h3>
                    <div className="h-64 overflow-y-auto space-y-3">
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'chi').map(t => {
                            const edit = topicEdits?.[t.id] || {};
                            return (
                                <details key={t.id} className="border rounded-lg bg-white text-sm">
                                    <summary className="list-none cursor-pointer p-3 hover:bg-slate-50 rounded-lg flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-rose-700">{t.name}</div>
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
                                                className="flex-1 border p-2 rounded text-xs"
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
                                                className="flex-1 border p-2 rounded text-xs"
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
                                                        className="flex-1 border p-2 rounded text-xs"
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
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'chi').length === 0 && <div className="text-center text-slate-400 py-10">此年級尚無中文單元</div>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'past_papers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-green-600"/> 上傳中文種子試題</h3>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">DB Total: {paperCount}</span>
                    </div>
                    
                    <div className="flex gap-4 mb-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">年級</label>
                            <select value={paperMeta.grade} onChange={e => setPaperMeta({...paperMeta, grade: e.target.value})} className="border p-2 rounded text-sm bg-white">
                                {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-700 mb-1">指定單元 (選填)</label>
                            <select value={paperMeta.topicId} onChange={e => setPaperMeta({...paperMeta, topicId: e.target.value})} className="border border-rose-200 bg-rose-50 text-rose-900 p-2 rounded text-sm w-full font-bold">
                                <option value="">🤖 自動偵測 / 不指定</option>
                                {availableTopics.map(t => (<option key={t.id} value={t.id}>📍 強制歸類: {t.name}</option>))}
                            </select>
                        </div>
                    </div>
                    
                    <textarea 
                        value={paperJson} 
                        onChange={e => setPaperJson(e.target.value)} 
                        className="w-full h-48 border border-slate-300 rounded-lg p-3 font-mono text-xs bg-slate-50 focus:ring-2 focus:ring-green-200 outline-none mb-4" 
                        placeholder='[ { "question": "...", "answer": "...", "topic": "..." } ]'
                    ></textarea>
                    
                    <button onClick={handleUploadPastPaper} disabled={isUploading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2">
                        {isUploading ? 'Uploading...' : '批量上傳種子'} <Save size={18}/>
                    </button>
                 </div>

                 <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400" size={20}/> AI 生成測試 (Seed Test)</h3>
                     <p className="text-xs text-slate-400 mb-4">貼上一段 JSON 種子，測試系統是否能正確生成變體。</p>
                     
                     <textarea 
                        onChange={e => {
                            try { setTestSeed(JSON.parse(e.target.value)); } catch(err) { setTestSeed(null); }
                        }}
                        className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-green-400 mb-4 focus:outline-none"
                        placeholder='{"question": "閱讀理解題目...", "topic": "閱讀理解"}'
                     ></textarea>

                     <button 
                        onClick={handleTestGenerate} 
                        disabled={isGenerating || !testSeed}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-2 rounded-lg mb-4 transition flex items-center justify-center gap-2"
                     >
                        {isGenerating ? 'AI 思考中...' : '生成新題目'} <RefreshCw size={16}/>
                     </button>

                     <div className="bg-black/50 p-4 rounded-lg min-h-[100px] text-xs font-mono text-slate-300 whitespace-pre-wrap border border-slate-700">
                         {generatedResult ? generatedResult : "// AI 生成結果將顯示於此..."}
                     </div>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
}
