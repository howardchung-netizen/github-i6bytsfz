import { NextResponse } from 'next/server';
import { CURRENT_MODEL_NAME } from '../../lib/constants';

/**
 * 測試 Google API 連線的端點
 * 用於確認部署環境（如 Vercel）是否可以正常訪問 Google Gemini API
 */
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        success: false,
        error: 'API Key not configured',
        message: '請在環境變數中設置 GOOGLE_GEMINI_API_KEY'
      }, { status: 500 });
    }

    // 測試連線到 Google Gemini API（使用統一的模型配置）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const testMessage = "請回覆：測試成功";
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: testMessage }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(10000) // 10 秒超時
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Unknown error';
      const isQuotaExceeded = response.status === 429 || 
                              errorMessage.toLowerCase().includes('quota') ||
                              errorMessage.toLowerCase().includes('exceeded');
      
      // 如果是配額超限，這實際上證明連線是成功的！
      if (isQuotaExceeded) {
        return NextResponse.json({
          success: true, // 連線成功，只是配額用完了
          connectionStatus: '✅ 連線成功',
          quotaStatus: '❌ 配額已達上限',
          error: errorMessage,
          status: response.status,
          details: data,
          message: '✅ 好消息：Vercel/部署平台可以正常訪問 Google API！\n❌ 但 API Key 配額已達上限（免費層每日 250 個請求）。\n💡 建議：明天再試，或升級到付費方案。',
          note: '即使配額超限，這也證明了部署環境可以正常連線到 Google API，無需 VPN。'
        }, { status: 200 }); // 返回 200 因為連線測試成功
      }
      
      // 其他錯誤
      return NextResponse.json({
        success: false,
        error: errorMessage,
        status: response.status,
        details: data,
        message: 'Google API 連線失敗。請檢查 API Key 或網路連線。'
      }, { status: response.status });
    }

    // 成功！
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return NextResponse.json({
      success: true,
      message: 'Google API 連線成功！',
      response: text,
      timestamp: new Date().toISOString(),
      serverLocation: 'Vercel/部署平台',
      note: '如果看到此訊息，表示部署環境可以正常訪問 Google API，無需 VPN。'
    });

  } catch (error: any) {
    console.error("Test API Error:", error);
    
    let errorMessage = 'Unknown error';
    let isNetworkError = false;
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorMessage = 'Request Timeout';
      isNetworkError = true;
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Network Connection Error';
      isNetworkError = true;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      isNetworkError,
      message: isNetworkError 
        ? '無法連線到 Google API 伺服器。這可能是網路問題或地區限制。'
        : '測試失敗，請檢查錯誤訊息。',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
