import { NextResponse } from 'next/server';
import { CURRENT_MODEL_NAME } from '../../lib/constants';

export async function POST(request: Request) {
  try {
    const { message, model, generationConfig } = await request.json();

    // 👇 從環境變數讀取 API Key（安全性最佳實踐）
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured. Please set GOOGLE_GEMINI_API_KEY in .env.local file.' 
      }, { status: 500 });
    }

    // 👇 使用統一的模型配置（從 constants.js 導入）
    // 當前使用：gemini-2.0-flash（2.0 Flash 免費版）
    const resolvedModel = model || CURRENT_MODEL_NAME;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;

    // 🔄 指數退避重試機制
    const maxRetries = 3;
    const baseDelay = 1000; // 1 秒
    const backoffFactor = 2;
    let lastError: any = null;
    let lastResponse: Response | null = null;
    let lastData: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
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
            ],
            generationConfig: generationConfig || undefined
          }),
          // 設定超時時間（30秒）
          signal: AbortSignal.timeout(30000)
        });

        const data = await response.json();

        // 檢查是否需要重試（僅針對 429 或 503）
        if (!response.ok && (response.status === 429 || response.status === 503)) {
          lastError = null;
          lastResponse = response;
          lastData = data;

          // 如果還有重試機會
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(backoffFactor, attempt);
            console.warn(`⚠️ Hit ${response.status} (${response.status === 429 ? 'Too Many Requests' : 'Service Unavailable'}), retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
            
            // 等待退避時間
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // 重試
          } else {
            // 已達最大重試次數，跳出循環處理錯誤
            break;
          }
        }

        // 成功或非重試錯誤，直接處理
        lastResponse = response;
        lastData = data;
        break;

      } catch (error: any) {
        lastError = error;
        
        // 如果是超時或網路錯誤，且還有重試機會，可以考慮重試
        // 但這裡我們主要關注 429/503，所以只記錄錯誤
        if (attempt < maxRetries && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
          const delay = baseDelay * Math.pow(backoffFactor, attempt);
          console.warn(`⚠️ Network/Timeout error, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // 其他錯誤或已達最大重試次數，跳出循環
        break;
      }
    }

    // 使用最後一次嘗試的結果
    // 如果沒有 response，說明所有重試都失敗了（網路錯誤）
    if (!lastResponse && lastError) {
      throw lastError; // 讓 catch 塊處理
    }
    
    const response = lastResponse!;
    const data = lastData;

    // 處理錯誤（包括重試後仍失敗的情況）
    if (!response || !response.ok) {
      // 如果沒有 data（可能是網路錯誤），構造錯誤數據
      if (!data && lastError) {
        throw lastError; // 讓 catch 塊處理
      }
      
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
      
      // 檢查是否為配額為 0 的情況（模型沒有免費層配額）
      const quotaDetails = data.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure');
      const hasZeroQuota = quotaDetails?.violations?.some((v: any) => 
        errorMessage.includes(`limit: 0`) || 
        errorMessage.includes('free_tier') && errorMessage.includes('limit: 0')
      );
      
      let quotaTypeMessage = '';
      if (hasZeroQuota) {
        // 配額為 0，表示該模型沒有免費層配額
        quotaTypeMessage = `⚠️ 該模型沒有免費層配額（limit: 0）。\n\n當前使用模型：${CURRENT_MODEL_NAME}\n\n可能原因：\n1. API Key 沒有啟用該模型的配額\n2. 需要升級到付費方案\n\n解決方案：\n1. 檢查 Google AI Studio 確認模型配額設置\n2. 確認已升級到付費方案\n3. 如果問題持續，可以嘗試切換回 gemini-flash-latest（1.5 Flash）`;
      } else if (isDailyLimit) {
        quotaTypeMessage = '每日配額已達上限（免費層每日 1,500 個請求）。請明天再試，或考慮升級到付費方案。';
      } else if (isMinuteLimit) {
        quotaTypeMessage = `每分鐘配額已達上限（免費層每分鐘 15 個請求）。${retryAfter ? `請等待約 ${retryAfter} 秒後再試。` : '請稍後再試。'}`;
      } else {
        // 無法確定，提供兩種可能
        quotaTypeMessage = `API 配額已達上限。可能是每分鐘限制（15 個請求）或每日限制（1,500 個請求）。${retryAfter ? `請等待約 ${Math.ceil(retryAfter / 60)} 分鐘後再試。` : '請稍後再試，或檢查 Google Cloud Console 的使用情況。'}`;
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