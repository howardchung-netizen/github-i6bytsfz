import { NextResponse } from 'next/server';
import { CURRENT_MODEL_NAME } from '../../lib/constants';

/**
 * 檢查 Google Gemini API 配額狀態
 * 返回配額是否可用，以及詳細的狀態信息
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

    // 發送一個簡單的測試請求（使用統一的模型配置）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "回覆：OK" }
            ]
          }
        ]
      }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Unknown error';
      const isQuotaExceeded = response.status === 429 || 
                              errorMessage.toLowerCase().includes('quota') ||
                              errorMessage.toLowerCase().includes('exceeded') ||
                              errorMessage.toLowerCase().includes('rate limit');
      
      if (isQuotaExceeded) {
        // 提取重試時間
        const retryInfo = data.error?.details?.[0]?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
          ? data.error.details[0]
          : null;
        const retryAfter = retryInfo?.retryDelay || null;
        
        return NextResponse.json({
          success: false,
          quotaAvailable: false,
          quotaExceeded: true,
          error: errorMessage,
          retryAfter: retryAfter,
          message: '❌ API 配額已達上限',
          suggestion: retryAfter 
            ? `請等待 ${retryAfter} 後再試`
            : '免費層每日配額為 1,500 個請求，請等待重置（香港時間下午 4:00）或升級到付費方案',
          timestamp: new Date().toISOString()
        }, { status: 200 });
      }
      
      return NextResponse.json({
        success: false,
        quotaAvailable: false,
        quotaExceeded: false,
        error: errorMessage,
        message: 'API 請求失敗（非配額問題）',
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    // 成功！配額可用
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    return NextResponse.json({
      success: true,
      quotaAvailable: true,
      quotaExceeded: false,
      message: '✅ API 配額可用，可以正常使用',
      response: text,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Check Quota Error:", error);
    
    return NextResponse.json({
      success: false,
      quotaAvailable: false,
      error: error.message || 'Unknown error',
      message: '檢查配額時發生錯誤',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
