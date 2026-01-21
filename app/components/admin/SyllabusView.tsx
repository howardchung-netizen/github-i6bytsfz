"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Database } from 'lucide-react';
import { DB_SERVICE } from '../../lib/db-service';

interface SyllabusViewProps {
  topics: any[];
  setTopics: (topics: any[] | ((prevTopics: any[]) => any[])) => void;
  isFirebaseReady: boolean;
}

export default function SyllabusView({ topics, setTopics, isFirebaseReady }: SyllabusViewProps) {
  const [newTopic, setNewTopic] = useState({ name: '', grade: 'P4', term: '上學期', subject: 'math' });
  const [subTopics, setSubTopics] = useState([]);
  const [subTopicInput, setSubTopicInput] = useState('');
  const [topicEdits, setTopicEdits] = useState({});
  const [isNormalizingSyllabus, setIsNormalizingSyllabus] = useState(false);

  const handleAddSubTopic = () => {
    if (!subTopicInput.trim()) return;
    setSubTopics([...subTopics, subTopicInput.trim()]);
    setSubTopicInput('');
  };

  const handleAddTopic = async () => {
    if (!isFirebaseReady) {
      alert("Firebase 尚未就緒，請稍後再試。");
      return;
    }
    const topicToAdd = {
      name: newTopic.name,
      grade: newTopic.grade,
      term: newTopic.term,
      subject: newTopic.subject,
      type: 'text',
      lang: newTopic.subject === 'math' ? 'zh-HK' : 'en',
      subTopics: subTopics,
      createdAt: new Date().toISOString()
    };

    const docId = await DB_SERVICE.addTopic(topicToAdd);

    if (docId) {
      const newTopicWithId = { id: docId, ...topicToAdd };
      setTopics(prevTopics => [...prevTopics, newTopicWithId]);

      alert("單元已成功新增！");
      setNewTopic({ ...newTopic, name: '' });
      setSubTopics([]);
    } else {
      const error = DB_SERVICE.getLastError?.();
      const message = error?.message || error?.code || "未知錯誤";
      alert(`新增失敗，請檢查連線。\n${message}`);
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700"><Plus size={18} /> 新增數學單元</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500">年級</label>
              <select value={newTopic.grade} onChange={e => setNewTopic({ ...newTopic, grade: e.target.value })} className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                {['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">學期</label>
              <select value={newTopic.term} onChange={e => setNewTopic({ ...newTopic, term: e.target.value })} className="w-full border p-2 rounded text-sm bg-slate-800 text-white border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                <option>上學期</option><option>下學期</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500">單元名稱</label>
            <input type="text" value={newTopic.name} onChange={e => setNewTopic({ ...newTopic, name: e.target.value })} className="w-full border p-2 rounded text-sm bg-slate-800 text-white placeholder:text-slate-300 border-slate-600 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" placeholder="例如：分數的加減" />
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
                  {st} <button onClick={() => setSubTopics(subTopics.filter((_, idx) => idx !== i))}><Trash2 size={10} className="text-red-400" /></button>
                </span>
              ))}
            </div>
          </div>
          <button onClick={handleAddTopic} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold shadow hover:bg-blue-700 transition">儲存單元至資料庫</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2 text-slate-700"><Database size={18} /> 現有單元列表</h3>
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
  );
}
