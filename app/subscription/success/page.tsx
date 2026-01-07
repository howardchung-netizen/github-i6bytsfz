"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2 } from 'lucide-react';

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setStatus('error');
        return;
      }

      try {
        // 這裡可以調用 API 驗證支付狀態
        // 或者依賴 webhook 已經更新了用戶狀態
        // 目前先假設支付成功
        setStatus('success');
        
        // 3 秒後自動跳轉到首頁
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={64} className="animate-spin text-indigo-600 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-slate-800 mb-2">處理中...</h1>
            <p className="text-slate-600">正在確認您的支付</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">訂閱成功！🎉</h1>
            <p className="text-slate-600 mb-6">
              感謝您的訂閱！您現在可以享受所有訂閱功能。
            </p>
            <p className="text-sm text-slate-500">
              正在跳轉到首頁...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-red-600">✗</span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">支付驗證失敗</h1>
            <p className="text-slate-600 mb-6">
              無法確認您的支付狀態，請聯繫客服或稍後再試。
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              返回首頁
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Loader2 size={64} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">載入中...</h1>
          <p className="text-slate-600">正在載入頁面</p>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
