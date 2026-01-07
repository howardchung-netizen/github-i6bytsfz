"use client";
import React, { useState } from 'react';
import { Check, Sparkles, Infinity, Brain, BarChart3, Download, Volume2, Accessibility, ArrowLeft, CreditCard, Crown } from 'lucide-react';
import { DB_SERVICE } from '../lib/db-service';

export default function SubscriptionView({ user, setUser, setView }) {
  const [selectedPlan, setSelectedPlan] = useState('monthly'); // 'monthly' or 'yearly'
  const [isProcessing, setIsProcessing] = useState(false);

  const plans = {
    free: {
      name: '免費版',
      price: 0,
      period: '',
      features: [
        '基本練習功能',
        '每科每日 20 題任務限制',
        '錯題本功能',
        '基本能力雷達圖'
      ],
      limitations: [
        '無 AI 老師跟進',
        '無詳細進度報告'
      ]
    },
    monthly: {
      name: '訂閱版（月付）',
      price: 99,
      period: '/月',
      originalPrice: null,
      features: [
        '每科每日 20 題任務（鼓勵均衡學習）',
        'ADHD 輔助模式',
        'AI 老師跟進（每 2 週報告）',
        '詳細進度報告',
        '語音讀題功能',
        '關鍵字高亮顯示',
        '可匯出專注力報告',
        '優先客服支援'
      ]
    },
    yearly: {
      name: '訂閱版（年付）',
      price: 899,
      period: '/年',
      originalPrice: 1188, // 99 * 12
      features: [
        '每科每日 20 題任務（鼓勵均衡學習）',
        'ADHD 輔助模式',
        'AI 老師跟進（每 2 週報告）',
        '詳細進度報告',
        '語音讀題功能',
        '關鍵字高亮顯示',
        '可匯出專注力報告',
        '優先客服支援',
        '節省 24% 費用'
      ]
    }
  };

  const handleSubscribe = async () => {
    if (!user.id) {
      alert('請先登入');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 調用後端 API 創建 Stripe Checkout Session
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 如果 Stripe 未配置，顯示友好提示
        if (response.status === 503 && data.message) {
          throw new Error(data.message);
        }
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // 重定向到 Stripe Checkout 頁面
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment Error:', error);
      alert(`支付失敗：${error.message || '請稍後再試'}`);
      setIsProcessing(false);
    }
  };

  const simulatePayment = async (plan) => {
    // 模擬支付延遲
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log(`模擬支付成功: ${plan} - ${plans[plan].price} HKD`);
        resolve();
      }, 1500);
    });
  };

  const updateUserSubscription = async (isPremium) => {
    try {
      // 更新本地狀態
      setUser(prev => ({ ...prev, isPremium }));
      
      // 這裡應該更新資料庫中的用戶訂閱狀態
      // await DB_SERVICE.updateUserSubscription(user.id, isPremium);
    } catch (error) {
      console.error('Update Subscription Error:', error);
    }
  };

  const currentPlan = user.isPremium ? plans.monthly : plans.free;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      {/* 返回按鈕 */}
      <button 
        onClick={() => setView('dashboard')} 
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 font-bold transition"
      >
        <ArrowLeft size={18} /> 返回首頁
      </button>

      {/* 標題區域 */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
          <Crown size={32} className="text-white" />
        </div>
        <h1 className="text-4xl font-black text-slate-800 mb-2">升級至訂閱版</h1>
        <p className="text-slate-600 text-lg">解鎖所有功能，享受完整的 AI 學習體驗</p>
      </div>

      {/* 當前狀態 */}
      {user.isPremium ? (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Check className="text-green-600" size={24} />
            <span className="text-green-800 font-bold text-lg">您已經是訂閱用戶</span>
          </div>
          <p className="text-green-700 text-sm">感謝您的支持！您已可享受所有訂閱功能。</p>
        </div>
      ) : (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8 text-center">
          <p className="text-yellow-800 font-bold">您目前使用免費版</p>
          <p className="text-yellow-700 text-sm mt-1">升級後可享受無限題目與更多功能</p>
        </div>
      )}

      {/* 訂閱計劃選擇 */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={`px-6 py-2 rounded-md font-bold transition ${
              selectedPlan === 'monthly'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            月付
          </button>
          <button
            onClick={() => setSelectedPlan('yearly')}
            className={`px-6 py-2 rounded-md font-bold transition ${
              selectedPlan === 'yearly'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            年付 <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-1">省 24%</span>
          </button>
        </div>
      </div>

      {/* 計劃對比卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* 免費版 */}
        <div className={`bg-white rounded-2xl p-8 border-2 ${user.isPremium ? 'border-slate-200' : 'border-indigo-300 shadow-lg'}`}>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-slate-800 mb-2">{plans.free.name}</h3>
            <div className="text-4xl font-black text-slate-600 mb-1">
              <span className="text-2xl">HKD</span> {plans.free.price}
            </div>
            <p className="text-slate-500 text-sm">{plans.free.period}</p>
          </div>
          
          <ul className="space-y-3 mb-6">
            {plans.free.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700 text-sm">{feature}</span>
              </li>
            ))}
            {plans.free.limitations.map((limitation, index) => (
              <li key={`lim-${index}`} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span className="text-slate-400 text-sm line-through">{limitation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 訂閱版 */}
        <div className={`bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-8 border-2 ${user.isPremium ? 'border-green-400' : 'border-indigo-500'} shadow-xl relative overflow-hidden`}>
          {!user.isPremium && (
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 text-xs font-black px-3 py-1 rounded-full">
              推薦
            </div>
          )}
          
          <div className="text-center mb-6 text-white">
            <h3 className="text-2xl font-black mb-2">{plans[selectedPlan].name}</h3>
            <div className="flex items-baseline justify-center gap-2 mb-1">
              {plans[selectedPlan].originalPrice && (
                <span className="text-xl line-through text-indigo-300">
                  HKD {plans[selectedPlan].originalPrice}
                </span>
              )}
              <span className="text-4xl font-black">
                <span className="text-2xl">HKD</span> {plans[selectedPlan].price}
              </span>
            </div>
            <p className="text-indigo-100 text-sm">{plans[selectedPlan].period}</p>
            {selectedPlan === 'yearly' && (
              <p className="text-yellow-300 text-xs mt-1 font-bold">
                平均每月只需 HKD {Math.round(plans[selectedPlan].price / 12)}
              </p>
            )}
          </div>
          
          <ul className="space-y-3 mb-6 text-white">
            {plans[selectedPlan].features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check size={18} className="text-yellow-300 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          {!user.isPremium && (
            <button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-white text-indigo-600 font-black py-4 px-6 rounded-xl shadow-lg hover:bg-indigo-50 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  處理中...
                </>
              ) : (
                <>
                  <CreditCard size={20} />
                  立即訂閱
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 功能詳細說明 */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200">
        <h3 className="text-2xl font-black text-slate-800 mb-6 text-center">訂閱版功能詳情</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
            <div className="bg-indigo-100 p-3 rounded-lg flex-shrink-0">
              <Infinity size={24} className="text-indigo-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">每日任務系統</h4>
              <p className="text-slate-600 text-sm">每科每日 20 題任務，鼓勵均衡學習各科目</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-purple-100 p-3 rounded-lg flex-shrink-0">
              <Accessibility size={24} className="text-purple-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">ADHD 輔助模式</h4>
              <p className="text-slate-600 text-sm">優化介面、語音讀題、關鍵字高亮</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
              <Brain size={24} className="text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">AI 老師跟進</h4>
              <p className="text-slate-600 text-sm">每 2 週自動生成進度報告與客製化課程</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-yellow-100 p-3 rounded-lg flex-shrink-0">
              <BarChart3 size={24} className="text-yellow-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-1">詳細進度報告</h4>
              <p className="text-slate-600 text-sm">可匯出供醫生/學校參考的專注力報告</p>
            </div>
          </div>
        </div>
      </div>

      {/* 常見問題 */}
      <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 mt-8">
        <h3 className="text-xl font-black text-slate-800 mb-6 text-center">常見問題</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-slate-800 mb-1">Q: 訂閱後可以隨時取消嗎？</h4>
            <p className="text-slate-600 text-sm">A: 是的，您可以隨時在設定中取消訂閱。取消後將在當前計費週期結束時停止自動續費。</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-1">Q: 支付方式有哪些？</h4>
            <p className="text-slate-600 text-sm">A: 我們支援信用卡（Visa、Mastercard、American Express）、轉數快、PayPal 等多種支付方式。</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-1">Q: 訂閱後多久生效？</h4>
            <p className="text-slate-600 text-sm">A: 支付成功後立即生效，您可以馬上使用所有訂閱功能。</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-800 mb-1">Q: 年付計劃可以退款嗎？</h4>
            <p className="text-slate-600 text-sm">A: 年付計劃在購買後 7 天內可申請全額退款，超過 7 天將按比例退款。</p>
          </div>
        </div>
      </div>

      {/* 支付安全說明 */}
      <div className="mt-8 text-center text-slate-500 text-xs">
        <p>🔒 支付安全：我們使用業界標準的加密技術保護您的支付信息</p>
        <p className="mt-1">💳 支援多種支付方式：信用卡、轉數快、PayPal</p>
        <p className="mt-1">📞 如有疑問，請聯繫客服：support@aitutor.com</p>
      </div>

      {/* 條款與政策 */}
      <div className="mt-6 text-center text-slate-400 text-xs">
        <p>點擊「立即訂閱」即表示您同意我們的 <a href="#" className="text-indigo-600 hover:underline">服務條款</a> 和 <a href="#" className="text-indigo-600 hover:underline">隱私政策</a></p>
      </div>
    </div>
  );
}
