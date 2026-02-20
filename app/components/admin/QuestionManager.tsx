 "use client";
 import React, { useMemo, useState } from 'react';
 import { RefreshCw, Trash2, Search } from 'lucide-react';
 import { DB_SERVICE } from '../../lib/db-service';
 
 interface QuestionManagerProps {
   isFirebaseReady: boolean;
 }
 
 const STATUS_OPTIONS = ['ALL', 'DRAFT', 'AUDITED', 'REJECTED', 'PUBLISHED'];
 const ORIGIN_OPTIONS = ['ALL', 'SEED', 'AI_GEN'];
 const COLLECTION_OPTIONS = [
   { value: 'past_papers', label: '正式題庫 (past_papers)' },
   { value: 'seed_questions', label: '種子題庫 (seed_questions)' }
 ];
 
 export default function QuestionManager({ isFirebaseReady }: QuestionManagerProps) {
   const [collectionName, setCollectionName] = useState('past_papers');
   const [status, setStatus] = useState('ALL');
   const [origin, setOrigin] = useState('ALL');
   const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
   const [topic, setTopic] = useState('');
   const [subTopic, setSubTopic] = useState('');
   const [max, setMax] = useState(200);
   const [items, setItems] = useState<any[]>([]);
   const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
   const [isLoading, setIsLoading] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
 
   const stats = useMemo(() => {
     const counters = {
       total: items.length,
       published: 0,
       draft: 0,
       audited: 0,
       rejected: 0
     };
     items.forEach(item => {
       const st = item.status || 'PUBLISHED';
       if (st === 'DRAFT') counters.draft += 1;
       else if (st === 'AUDITED') counters.audited += 1;
       else if (st === 'REJECTED') counters.rejected += 1;
       else counters.published += 1;
     });
     return counters;
   }, [items]);
 
   const usefulCount = stats.published;
   const uselessCount = stats.rejected;

  const isIncompleteRecord = (item: any) => {
    const missingStatus = !item?.status;
    const missingQuestion = !String(item?.question || '').trim();
    const missingAnswer = !String(item?.answer || '').trim();
    const missingTopic = !String(item?.topic || '').trim();
    const missingGrade = !String(item?.grade || '').trim();
    const missingSubject = !String(item?.subject || '').trim();
    return missingStatus || missingQuestion || missingAnswer || missingTopic || missingGrade || missingSubject;
  };

  const filteredItems = useMemo(() => {
    if (!onlyIncomplete) return items;
    return items.filter(isIncompleteRecord);
  }, [items, onlyIncomplete]);
 
   const loadItems = async () => {
     if (!isFirebaseReady) return;
     setIsLoading(true);
     setSelectedIds({});
     try {
       const list = await DB_SERVICE.fetchQuestionManagerItems({
         collectionName,
         status,
         origin,
         grade,
         subject,
         topic,
         subTopic,
         max
       });
       setItems(list || []);
     } catch (e) {
       console.error("Question Manager Load Error:", e);
       alert("載入失敗，請稍後再試。");
     } finally {
       setIsLoading(false);
     }
   };
 
   const toggleSelectAll = (checked: boolean) => {
     if (!checked) {
       setSelectedIds({});
       return;
     }
     const next: Record<string, boolean> = {};
    filteredItems.forEach(item => {
       if (item?.id) next[item.id] = true;
     });
     setSelectedIds(next);
   };
 
   const selectedList = useMemo(() => Object.keys(selectedIds).filter((id) => selectedIds[id]), [selectedIds]);
  const incompleteIds = useMemo(() => filteredItems.filter(isIncompleteRecord).map((item) => item.id), [filteredItems]);

  const selectIncomplete = () => {
    const next: Record<string, boolean> = {};
    incompleteIds.forEach((id) => {
      if (id) next[id] = true;
    });
    setSelectedIds(next);
  };
 
   const handleDeleteSelected = async () => {
     if (selectedList.length === 0) {
       alert("請先勾選要刪除的題目");
       return;
     }
     const confirmed = window.confirm(`確定要刪除 ${selectedList.length} 題嗎？此操作無法復原。`);
     if (!confirmed) return;
     setIsDeleting(true);
     try {
       const result = await DB_SERVICE.batchDeleteQuestions(selectedList, collectionName);
       if (result?.error) throw new Error(result.error);
       alert(`已刪除 ${result.deleted || selectedList.length} 題`);
       await loadItems();
     } catch (e) {
       alert(`刪除失敗：${e instanceof Error ? e.message : '未知錯誤'}`);
     } finally {
       setIsDeleting(false);
     }
   };
 
   return (
     <div className="space-y-6">
       <div className="bg-white p-4 rounded-xl border border-slate-200">
         <div className="flex flex-wrap items-end gap-3">
           <div>
             <label className="text-xs font-bold text-slate-500">題庫來源</label>
             <select
               value={collectionName}
               onChange={(e) => setCollectionName(e.target.value)}
               className="w-full border p-2 rounded text-sm bg-white"
             >
               {COLLECTION_OPTIONS.map(opt => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
             </select>
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500">狀態</label>
             <select value={status} onChange={(e) => setStatus(e.target.value)} className="border p-2 rounded text-sm bg-white">
               {STATUS_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
             </select>
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500">來源</label>
             <select value={origin} onChange={(e) => setOrigin(e.target.value)} className="border p-2 rounded text-sm bg-white">
               {ORIGIN_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
             </select>
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500">年級</label>
             <input value={grade} onChange={(e) => setGrade(e.target.value)} className="border p-2 rounded text-sm bg-white w-20" placeholder="P4" />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500">科目</label>
             <input value={subject} onChange={(e) => setSubject(e.target.value)} className="border p-2 rounded text-sm bg-white w-24" placeholder="math" />
           </div>
           <div className="flex-1 min-w-[160px]">
             <label className="text-xs font-bold text-slate-500">單元</label>
             <input value={topic} onChange={(e) => setTopic(e.target.value)} className="border p-2 rounded text-sm bg-white w-full" placeholder="乘法" />
           </div>
           <div className="flex-1 min-w-[160px]">
             <label className="text-xs font-bold text-slate-500">子單元</label>
             <input value={subTopic} onChange={(e) => setSubTopic(e.target.value)} className="border p-2 rounded text-sm bg-white w-full" placeholder="乘法應用題" />
           </div>
           <div>
             <label className="text-xs font-bold text-slate-500">上限</label>
             <input type="number" min={20} max={1000} value={max} onChange={(e) => setMax(Number(e.target.value || 200))} className="border p-2 rounded text-sm bg-white w-24" />
           </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 ml-2">
            <input
              type="checkbox"
              checked={onlyIncomplete}
              onChange={(e) => setOnlyIncomplete(e.target.checked)}
            />
            只顯示格式不全（缺欄位/缺 status）
          </label>
           <button
             onClick={loadItems}
             disabled={isLoading}
             className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2 disabled:bg-slate-400"
           >
             {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
             載入
           </button>
         </div>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-xl border border-slate-200">
           <div className="text-xs text-slate-500 font-semibold">總數</div>
           <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200">
           <div className="text-xs text-slate-500 font-semibold">有用 (PUBLISHED)</div>
           <div className="text-2xl font-bold text-emerald-600 mt-1">{usefulCount}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200">
           <div className="text-xs text-slate-500 font-semibold">待處理 (DRAFT/AUDITED)</div>
           <div className="text-2xl font-bold text-amber-600 mt-1">{stats.draft + stats.audited}</div>
         </div>
         <div className="bg-white p-4 rounded-xl border border-slate-200">
           <div className="text-xs text-slate-500 font-semibold">無用 (REJECTED)</div>
           <div className="text-2xl font-bold text-red-600 mt-1">{uselessCount}</div>
         </div>
       </div>
 
       <div className="bg-white p-4 rounded-xl border border-slate-200">
         <div className="flex items-center justify-between mb-3">
           <div className="text-sm font-semibold text-slate-700">題目清單</div>
          <div className="text-xs text-slate-500">
            提示：PUBLISHED 也包含舊資料（status 為空）
          </div>
           <button
             onClick={handleDeleteSelected}
             disabled={isDeleting || selectedList.length === 0}
             className="bg-red-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2 disabled:bg-slate-400"
           >
             {isDeleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
             刪除勾選 ({selectedList.length})
           </button>
         </div>
        {filteredItems.length === 0 ? (
           <div className="text-sm text-slate-400">尚未載入或沒有資料</div>
         ) : (
           <div className="space-y-2">
             <div className="flex items-center gap-2 text-xs text-slate-500">
               <input
                 type="checkbox"
                checked={selectedList.length > 0 && selectedList.length === filteredItems.length}
                 onChange={(e) => toggleSelectAll(e.target.checked)}
               />
               全選 / 取消
              {onlyIncomplete && (
                <button
                  type="button"
                  onClick={selectIncomplete}
                  className="ml-2 text-xs text-amber-700 hover:text-amber-900"
                >
                  一鍵選取不完整 ({incompleteIds.length})
                </button>
              )}
             </div>
             <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
              {filteredItems.map(item => (
                 <label key={item.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                   <input
                     type="checkbox"
                     checked={!!selectedIds[item.id]}
                     onChange={(e) => setSelectedIds(prev => ({ ...prev, [item.id]: e.target.checked }))}
                   />
                   <div className="flex-1">
                     <div className="text-sm font-semibold text-slate-800">{item.question || '（無題目文字）'}</div>
                     <div className="text-xs text-slate-500 mt-1">
                       狀態：{item.status || 'PUBLISHED'} | 來源：{item.origin || 'AI_GEN'} | 分類：{item.topic || '未分類'}{item.subTopic ? ` / ${item.subTopic}` : ''}
                     </div>
                     <div className="text-[11px] text-slate-400 mt-1">
                       ID: {item.id} | {item.createdAt || item.uploadedAt || '—'}
                     </div>
                    {isIncompleteRecord(item) && (
                      <div className="text-[11px] text-red-600 mt-1">
                        ⚠️ 格式不全
                      </div>
                    )}
                   </div>
                 </label>
               ))}
             </div>
           </div>
         )}
       </div>
     </div>
   );
 }
