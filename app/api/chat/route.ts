import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // 👇 從環境變數讀取 API Key（安全性最佳實踐）
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured. Please set GOOGLE_GEMINI_API_KEY in .env.local file.' 
      }, { status: 500 });
    }

    // 👇 2. 終極修正：使用診斷列表裡確認存在的 "gemini-flash-latest"
    // 這對應到 1.5 Flash 穩定版，且通常是免費的
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: message }
            ]
          }
        ]
      }),
      // 設定超時時間（30秒）
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      
      // 特別處理配額超限錯誤（429 或 quota exceeded）
      const errorMessage = data.error?.message || 'Unknown error';
      const isQuotaExceeded = response.status === 429 || 
                              errorMessage.toLowerCase().includes('quota') ||
                              errorMessage.toLowerCase().includes('rate limit') ||
                              errorMessage.toLowerCase().includes('exceeded');
      
      // 提取重試時間（秒）
      let retryAfter = null;
      if (data.error?.details) {
        const retryInfo = data.error.details.find((d: any) => d.retryInfo);
        if (retryInfo?.retryInfo?.retryDelay) {
          retryAfter = Math.ceil(parseFloat(retryInfo.retryInfo.retryDelay.replace('s', '')));
        }
      }
      
      // 從錯誤訊息中提取重試時間（如果有的話）
      if (!retryAfter && errorMessage.includes('retry in')) {
        const match = errorMessage.match(/retry in ([\d.]+)s/i);
        if (match) {
          retryAfter = Math.ceil(parseFloat(match[1]));
        }
      }
      
      // 判斷是每分鐘限制還是每日限制
      // 如果重試時間很長（> 3600秒 = 1小時），可能是每日限制
      // 如果重試時間較短（< 60秒），可能是每分鐘限制
      const isDailyLimit = retryAfter && retryAfter > 3600;
      const isMinuteLimit = retryAfter && retryAfter < 60;
      
      let quotaTypeMessage = '';
      if (isDailyLimit) {
        quotaTypeMessage = '每日配額已達上限（免費層每日 250 個請求）。請明天再試，或考慮升級到付費方案。';
      } else if (isMinuteLimit) {
        quotaTypeMessage = `每分鐘配額已達上限（免費層每分鐘 20 個請求）。${retryAfter ? `請等待約 ${retryAfter} 秒後再試。` : '請稍後再試。'}`;
      } else {
        // 無法確定，提供兩種可能
        quotaTypeMessage = `API 配額已達上限。可能是每分鐘限制（20 個請求）或每日限制（250 個請求）。${retryAfter ? `請等待約 ${Math.ceil(retryAfter / 60)} 分鐘後再試。` : '請稍後再試，或檢查 Google Cloud Console 的使用情況。'}`;
      }
      
      return NextResponse.json({ 
        error: `Google API Error: ${errorMessage}`,
        details: data,
        isQuotaExceeded,
        retryAfter,
        isDailyLimit,
        isMinuteLimit,
        userMessage: isQuotaExceeded ? quotaTypeMessage : undefined
      }, { status: response.status });
    }

    // 成功！回傳題目
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ response: text });

  } catch (error: any) {
    console.error("Server Error:", error);
    
    // 處理網路連線錯誤
    let errorMessage = 'Internal Server Error';
    let userFriendlyMessage = '請檢查 API Key 或網路連線。';
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorMessage = 'Request Timeout';
      userFriendlyMessage = '連線超時。請檢查網路連線，或確認是否需要使用 VPN（某些地區可能需要 VPN 才能訪問 Google API）。';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Network Connection Error';
      userFriendlyMessage = '無法連線到 Google API 伺服器。如果您在香港或其他地區，可能需要使用 VPN 才能訪問。請確認 VPN 已開啟並連線到台灣或其他支援的地區。';
    } else if (error.message) {
      errorMessage = error.message;
      // 如果錯誤訊息包含網路相關關鍵字，提供 VPN 建議
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('connection')) {
        userFriendlyMessage = '網路連線問題。請確認 VPN 已開啟（建議使用台灣地區的 VPN）。';
      }
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      message: userFriendlyMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}