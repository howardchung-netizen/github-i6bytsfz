"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Settings, Home, Upload, Save, FileJson, RefreshCw, Sparkles, Database, Trash2, Plus, BookType } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';

export default function EnglishDeveloperView({ topics, setTopics, setView, isFirebaseReady }) {
  const [activeTab, setActiveTab] = useState('syllabus');
  const [paperJson, setPaperJson] = useState('');
  const [paperMeta, setPaperMeta] = useState({ year: '2024', grade: 'P4', term: '上學期', topicId: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [paperCount, setPaperCount] = useState(0);
  
  // 新增單元相關狀態（英文科）
  const [newTopic, setNewTopic] = useState({ name: '', grade: 'P4', term: '上學期', subject: 'eng' });
  const [subTopics, setSubTopics] = useState([]);
  const [subTopicInput, setSubTopicInput] = useState('');

  // 測試生成相關狀態
  const [testSeed, setTestSeed] = useState(null);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 取得目前條件下的可用單元 (用於下拉選單)
  const availableTopics = useMemo(() => {
    return topics.filter(t => t.grade === paperMeta.grade && t.subject === 'eng');
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
         name: newTopic.name, grade: newTopic.grade, term: newTopic.term, subject: 'eng', 
         type: 'text', lang: 'en', 
         subTopics: subTopics, createdAt: new Date().toISOString() 
     };
     
     const docId = await DB_SERVICE.addTopic(topicToAdd);
     
     if (docId) {
         const newTopicWithId = { id: docId, ...topicToAdd };
         setTopics(prevTopics => [...prevTopics, newTopicWithId]);
         alert("English unit added successfully!");
         setNewTopic({...newTopic, name: ''});
         setSubTopics([]);
     } else {
         alert("Failed to add, please check connection.");
     }
  };

  const handleUploadPastPaper = async () => {
      if (!paperJson) { alert("Please paste JSON content"); return; }
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
              subject: 'eng',
              uploadedAt: new Date().toISOString()
          }));

          await DB_SERVICE.uploadPastPaperBatch(enrichedPapers);
          alert(`Successfully uploaded ${enrichedPapers.length} English seed questions!`); 
          setPaperJson(''); 
          const c = await DB_SERVICE.countPastPapers(); 
          setPaperCount(c);
      } catch (e) { 
          alert("Upload failed: " + e.message); 
      }
      setIsUploading(false);
  };

  const handleTestGenerate = async () => {
      if (!testSeed) { alert("Please paste a JSON seed question first"); return; }
      setIsGenerating(true);
      setGeneratedResult(null);
      try {
          const prompt = `
            Role: English Language Teacher.
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
      <div className="bg-amber-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
            <BookType size={20} className="text-amber-300" />
            <h1 className="font-bold text-lg">English Subject Management</h1>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setView('developer')} className="text-white/80 hover:text-white text-xs bg-indigo-600 px-3 py-1.5 rounded-lg transition">
                數學科
            </button>
            <button onClick={() => setView('chinese-developer')} className="text-white/80 hover:text-white text-xs bg-rose-600 px-3 py-1.5 rounded-lg transition">
                中文科
            </button>
            <button onClick={() => setView('dashboard')} className="text-amber-200 hover:text-white text-sm flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg transition">
                <Home size={14} /> Back to Dashboard
            </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button onClick={() => setActiveTab('syllabus')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'syllabus' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>
                1. Unit Management
            </button>
            <button onClick={() => setActiveTab('past_papers')} className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'past_papers' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700'}`}>
                2. Seed Question Bank
            </button>
        </div>

        {activeTab === 'syllabus' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Plus size={18}/> Add New Unit</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Grade</label>
                                <select value={newTopic.grade} onChange={e => setNewTopic({...newTopic, grade: e.target.value})} className="w-full border p-2 rounded text-sm">
                                    {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Term</label>
                                <select value={newTopic.term} onChange={e => setNewTopic({...newTopic, term: e.target.value})} className="w-full border p-2 rounded text-sm">
                                    <option>上學期</option><option>下學期</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Unit Name</label>
                            <input type="text" value={newTopic.name} onChange={e => setNewTopic({...newTopic, name: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g., Grammar, Reading Comprehension" />
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Sub-topics</label>
                            <div className="flex gap-2 mb-2">
                                <input type="text" value={subTopicInput} onChange={e => setSubTopicInput(e.target.value)} className="flex-1 border p-2 rounded text-sm" placeholder="Enter and click Add" />
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
                        <button onClick={handleAddTopic} className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold shadow hover:bg-amber-700 transition">Save to Database</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Database size={18}/> Existing Units</h3>
                    <div className="h-64 overflow-y-auto space-y-2">
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'eng').map(t => (
                            <div key={t.id} className="p-3 border rounded-lg hover:bg-slate-50 text-sm">
                                <div className="font-bold text-amber-700">{t.name}</div>
                                <div className="text-xs text-slate-400 mt-1">{t.grade} • {t.term} • {t.subTopics?.length || 0} sub-topics</div>
                            </div>
                        ))}
                        {topics.filter(t => t.grade === newTopic.grade && t.subject === 'eng').length === 0 && <div className="text-center text-slate-400 py-10">No English units for this grade</div>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'past_papers' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={20} className="text-green-600"/> Upload English Seed Questions</h3>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">DB Total: {paperCount}</span>
                    </div>
                    
                    <div className="flex gap-4 mb-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Grade</label>
                            <select value={paperMeta.grade} onChange={e => setPaperMeta({...paperMeta, grade: e.target.value})} className="border p-2 rounded text-sm bg-white">
                                {['P1','P2','P3','P4','P5','P6'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Unit (Optional)</label>
                            <select value={paperMeta.topicId} onChange={e => setPaperMeta({...paperMeta, topicId: e.target.value})} className="border border-amber-200 bg-amber-50 text-amber-900 p-2 rounded text-sm w-full font-bold">
                                <option value="">🤖 Auto-detect / None</option>
                                {availableTopics.map(t => (<option key={t.id} value={t.id}>📍 Force: {t.name}</option>))}
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
                        {isUploading ? 'Uploading...' : 'Batch Upload Seeds'} <Save size={18}/>
                    </button>
                 </div>

                 <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg">
                     <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400" size={20}/> AI Generation Test</h3>
                     <p className="text-xs text-slate-400 mb-4">Paste a JSON seed to test if the system can generate variations correctly.</p>
                     
                     <textarea 
                        onChange={e => {
                            try { setTestSeed(JSON.parse(e.target.value)); } catch(err) { setTestSeed(null); }
                        }}
                        className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-xs text-green-400 mb-4 focus:outline-none"
                        placeholder='{"question": "Reading comprehension...", "topic": "Reading"}'
                     ></textarea>

                     <button 
                        onClick={handleTestGenerate} 
                        disabled={isGenerating || !testSeed}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-2 rounded-lg mb-4 transition flex items-center justify-center gap-2"
                     >
                        {isGenerating ? 'AI Thinking...' : 'Generate New Question'} <RefreshCw size={16}/>
                     </button>

                     <div className="bg-black/50 p-4 rounded-lg min-h-[100px] text-xs font-mono text-slate-300 whitespace-pre-wrap border border-slate-700">
                         {generatedResult ? generatedResult : "// AI generation result will appear here..."}
                     </div>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
}
