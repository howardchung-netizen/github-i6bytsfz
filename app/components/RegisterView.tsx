"use client";
import React, { useState, useMemo } from 'react';
import { UserCircle, LogIn, Mail, Lock, FileText, User, RefreshCw, Loader2, Save, KeyRound } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';

export default function RegisterView({ setView, setUser }) {
    const [mode, setMode] = useState('login'); // login or register
    const [formData, setFormData] = useState({ name: '', gender: 'boy', school: '', age: '', grade: 'P4', email: '', password: '', dob: '', role: 'student', institutionName: '' });
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [avatarVersion, setAvatarVersion] = useState(0); 
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleDobChange = (e) => { 
        const dob = e.target.value; 
        const today = new Date(); 
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear(); 
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } 
        setFormData({ ...formData, dob: dob, age: (age >= 0 ? age : 0).toString() }); 
    };

    const { boySeeds, girlSeeds } = useMemo(() => { 
        return { 
            boySeeds: Array.from({length: 5}, (_, i) => `boy_${i}_${avatarVersion}`), 
            girlSeeds: Array.from({length: 5}, (_, i) => `girl_${i}_${avatarVersion}`) 
        }; 
    }, [avatarVersion]);

    const refreshAvatars = () => { setAvatarVersion(v => v + 1); setSelectedAvatar(null); };

    const getPlatformFromUserAgent = () => {
        if (typeof navigator === 'undefined') return 'web';
        const ua = navigator.userAgent || '';
        const isTablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua);
        return isTablet ? 'tablet' : 'web';
    };

    const handleRegister = async () => { 
        setErrorMessage(""); 
        if (!formData.name || !formData.email || !formData.password || !selectedAvatar) { 
            setErrorMessage("⚠️ 請填寫所有欄位並選擇頭像"); return; 
        } 
        setIsProcessing(true); 
        const emailExists = await DB_SERVICE.checkEmailExists(formData.email); 
        if (emailExists) { setErrorMessage("❌ 此電郵已被註冊！"); setIsProcessing(false); return; } 
        
        // 如果是教學者，必須填寫教育機構名稱
        if (formData.role === 'teacher' && !formData.institutionName.trim()) {
            setErrorMessage("⚠️ 教學者帳號必須填寫教育機構名稱"); 
            setIsProcessing(false); 
            return;
        }

        const { password, ...profileData } = { 
            ...formData, 
            avatar: selectedAvatar, 
            xp: 0, 
            level: formData.grade,
            role: formData.role || 'student',
            institutionName: formData.role === 'teacher' ? formData.institutionName.trim() : '', // 只有教學者需要
            isPremium: false, // 預設為免費用戶
            platform: getPlatformFromUserAgent()
        }; 
        const userId = await DB_SERVICE.registerUser(profileData, formData.password); 
        
        if (userId) { setUser({ ...profileData, id: userId }); setView('dashboard'); } 
        else { setErrorMessage("❌ 註冊失敗，請稍後再試"); } 
        setIsProcessing(false); 
    };

    const handleLogin = async () => { 
        setErrorMessage(""); 
        if (!formData.email || !formData.password) { setErrorMessage("⚠️ 請輸入電郵與密碼"); return; } 
        setIsProcessing(true); 
        try { 
            const userData = await DB_SERVICE.loginUser(formData.email, formData.password); 
            if (userData) { setUser(userData); setView('dashboard'); } 
            else { setErrorMessage("❌ 登入失敗：找不到用戶或密碼錯誤"); } 
        } catch (error) { setErrorMessage("❌ 系統錯誤：" + error.message); } 
        setIsProcessing(false); 
    };

    return (
        <div className="max-w-4xl mx-auto min-h-screen bg-indigo-50 p-6 flex items-center justify-center font-sans">
            <div className="bg-white rounded-3xl shadow-xl p-8 w-full transition-all duration-500">
                <div className="text-center mb-8">
                    <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        {mode === 'register' ? <UserCircle size={40} /> : <LogIn size={40} />}
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">{mode === 'register' ? "建立帳戶" : "歡迎回來"}</h2>
                </div>

                {mode === 'login' && (
                    <div className="max-w-md mx-auto space-y-6">
                        <div><label className="block text-sm font-bold text-slate-600 mb-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3.5 text-slate-400" size={18}/><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 pl-10" /></div></div>
                        <div><label className="block text-sm font-bold text-slate-600 mb-1">Password</label><div className="relative"><Lock className="absolute left-3 top-3.5 text-slate-400" size={18}/><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 pl-10" /></div></div>
                        {errorMessage && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold text-center animate-pulse">{errorMessage}</div>}
                        <button onClick={handleLogin} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2">{isProcessing ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}{isProcessing ? "登入中..." : "立即登入"}</button>
                        <div className="text-center mt-4"><button onClick={() => {setMode('register'); setErrorMessage('');}} className="text-slate-500 hover:text-indigo-600 text-sm font-bold underline">還沒有帳戶？按此註冊</button></div>
                    </div>
                )}

                {mode === 'register' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in">
                        <div className="space-y-4">
                            <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2"><FileText size={20}/> 基本資料</h3>
                            
                            {/* 角色選擇 */}
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">帳號類型 *</label>
                                <select 
                                    value={formData.role} 
                                    onChange={e => setFormData({...formData, role: e.target.value, institutionName: e.target.value === 'teacher' ? formData.institutionName : ''})} 
                                    className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white"
                                >
                                    <option value="student">學生</option>
                                    <option value="teacher">教學者</option>
                                </select>
                            </div>

                            {/* 教育機構名稱（僅教學者顯示） */}
                            {formData.role === 'teacher' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-1">
                                        教育機構名稱 * <span className="text-red-500 text-xs">（相同機構的教學者可共用種子題目庫）</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.institutionName} 
                                        onChange={e => setFormData({...formData, institutionName: e.target.value})} 
                                        placeholder="例如：香港小學、ABC補習社"
                                        className="w-full border-2 border-slate-200 rounded-xl p-3" 
                                    />
                                    <p className="text-xs text-slate-500 mt-1">💡 相同機構名稱的教學者將共用種子題目庫</p>
                                </div>
                            )}

                            <div><label className="block text-sm font-bold text-slate-600 mb-1">姓名</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-slate-600 mb-1">性別</label><select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white"><option value="boy">男生</option><option value="girl">女生</option></select></div>
                                <div><label className="block text-sm font-bold text-slate-600 mb-1">年齡</label><input type="number" value={formData.age} readOnly className="w-full border-2 border-slate-100 bg-slate-50 rounded-xl p-3 text-slate-500" placeholder="-" /></div>
                            </div>
                            <div><label className="block text-sm font-bold text-slate-600 mb-1">出生日期</label><input type="date" value={formData.dob} onChange={handleDobChange} className="w-full border-2 border-slate-200 rounded-xl p-3" /></div>
                            <div><label className="block text-sm font-bold text-slate-600 mb-1">現在班級</label><select value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white"><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option><option value="P5">P5</option><option value="P6">P6</option></select></div>
                            <div><label className="block text-sm font-bold text-slate-600 mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3" /></div>
                            <div><label className="block text-sm font-bold text-slate-600 mb-1">設定密碼</label><div className="relative"><KeyRound className="absolute left-3 top-3.5 text-slate-400" size={18}/><input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border-2 border-slate-200 rounded-xl p-3 pl-10" /></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-slate-700 flex items-center gap-2"><User size={20}/> 選擇頭像</h3><button onClick={refreshAvatars} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-indigo-100"><RefreshCw size={14}/> 換一批</button></div>
                            <div className="mb-4"><span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">男生區 👦</span><div className="grid grid-cols-5 gap-2 mt-2">{boySeeds.map((seed) => { const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`; return (<button key={seed} onClick={() => setSelectedAvatar(url)} className={`rounded-full overflow-hidden border-4 transition-all hover:scale-110 aspect-square ${selectedAvatar === url ? 'border-indigo-500 ring-2 ring-indigo-200 scale-110' : 'border-transparent'}`}><img src={url} alt="avatar" className="w-full h-full" /></button>); })}</div></div>
                            <div><span className="text-xs font-bold text-pink-500 bg-pink-50 px-2 py-1 rounded-full">女生區 👧</span><div className="grid grid-cols-5 gap-2 mt-2">{girlSeeds.map((seed) => { const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=ffdfbf`; return (<button key={seed} onClick={() => setSelectedAvatar(url)} className={`rounded-full overflow-hidden border-4 transition-all hover:scale-110 aspect-square ${selectedAvatar === url ? 'border-pink-500 ring-2 ring-pink-200 scale-110' : 'border-transparent'}`}><img src={url} alt="avatar" className="w-full h-full" /></button>); })}</div></div>
                            {errorMessage && <div className="mt-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold text-center animate-pulse">{errorMessage}</div>}
                            <div className="mt-8 flex gap-3">
                                <button onClick={() => setView('dashboard')} className="flex-1 bg-white border-2 border-slate-200 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50">返回</button>
                                <button onClick={handleRegister} disabled={isProcessing} className={`flex-[2] text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 ${isProcessing ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}{isProcessing ? "建立中..." : "完成註冊"}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}