import { NextResponse } from 'next/server';
import { CURRENT_MODEL_NAME } from '../../lib/constants';

/**
 * API Key 診斷端點
 * 幫助診斷 API Key 相關問題
 */
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    const diagnosis = {
      timestamp: new Date().toISOString(),
      checks: [] as Array<{ name: string; status: 'pass' | 'fail' | 'warning'; message: string; details?: any }>,
      summary: '',
      recommendations: [] as string[]
    };

    // 檢查 1: API Key 是否存在
    if (!apiKey) {
      diagnosis.checks.push({
        name: 'API Key 存在性',
        status: 'fail',
        message: '❌ API Key 未設置',
        details: '環境變數 GOOGLE_GEMINI_API_KEY 不存在'
      });
      diagnosis.summary = 'API Key 未設置';
      diagnosis.recommendations.push('在 .env.local 文件中添加 GOOGLE_GEMINI_API_KEY=your_api_key');
      diagnosis.recommendations.push('確認文件在項目根目錄（與 package.json 同級）');
      diagnosis.recommendations.push('重啟開發服務器（npm run dev）');
      return NextResponse.json(diagnosis, { status: 200 });
    }

    diagnosis.checks.push({
      name: 'API Key 存在性',
      status: 'pass',
      message: '✅ API Key 已設置',
      details: `API Key 長度: ${apiKey.length} 字符`
    });

    // 檢查 2: API Key 格式
    const isValidFormat = apiKey.startsWith('AIza') && apiKey.length > 30;
    if (!isValidFormat) {
      diagnosis.checks.push({
        name: 'API Key 格式',
        status: 'warning',
        message: '⚠️ API Key 格式可能不正確',
        details: `預期格式: 以 "AIza" 開頭，長度 > 30 字符。當前: ${apiKey.substring(0, 10)}... (長度: ${apiKey.length})`
      });
    } else {
      diagnosis.checks.push({
        name: 'API Key 格式',
        status: 'pass',
        message: '✅ API Key 格式正確',
        details: `以 "AIza" 開頭，長度: ${apiKey.length} 字符`
      });
    }

    // 檢查 3: 測試 API Key 是否有效
    try {
      const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_MODEL_NAME}:generateContent?key=${apiKey}`;
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "回覆：OK" }]
          }]
        }),
        signal: AbortSignal.timeout(20000) // 增加到 20 秒
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || 'Unknown error';
        const statusCode = response.status;

        // 檢查配額錯誤
        if (statusCode === 429 || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exceeded')) {
          // 檢查是否為配額為 0
          const hasZeroQuota = errorMessage.includes('limit: 0');
          
          if (hasZeroQuota) {
            diagnosis.checks.push({
              name: 'API Key 有效性',
              status: 'fail',
              message: '❌ API Key 配額為 0',
              details: {
                error: errorMessage,
                statusCode,
                issue: '該 API Key 對當前模型的免費層配額為 0（limit: 0）',
                possibleCauses: [
                  '實驗版模型（如 gemini-2.0-flash-exp）可能沒有免費層配額',
                  'API Key 沒有啟用該模型的配額',
                  '需要升級到付費方案'
                ]
              }
            });
            diagnosis.summary = 'API Key 配額為 0，無法使用免費層';
            diagnosis.recommendations.push(`當前使用模型：${CURRENT_MODEL_NAME}`);
            diagnosis.recommendations.push('如果遇到配額問題，可以嘗試切換回 gemini-flash-latest（1.5 Flash）或確認已升級到付費方案');
            diagnosis.recommendations.push('或升級到 Google Cloud 付費方案');
            diagnosis.recommendations.push('檢查 Google AI Studio 確認 API Key 配額設置');
          } else {
            diagnosis.checks.push({
              name: 'API Key 有效性',
              status: 'warning',
              message: '⚠️ API Key 配額已用完',
              details: {
                error: errorMessage,
                statusCode,
                note: 'API Key 有效，但配額已用完'
              }
            });
            diagnosis.summary = 'API Key 有效，但配額已用完';
            diagnosis.recommendations.push('等待配額重置（每天香港時間下午 4:00）');
            diagnosis.recommendations.push('或升級到付費方案');
            diagnosis.recommendations.push('檢查配額使用情況: https://aistudio.google.com/app/apikey');
          }
        } 
        // 檢查認證錯誤
        else if (statusCode === 401 || statusCode === 403 || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('forbidden')) {
          diagnosis.checks.push({
            name: 'API Key 有效性',
            status: 'fail',
            message: '❌ API Key 無效或無權限',
            details: {
              error: errorMessage,
              statusCode,
              issue: 'API Key 可能無效、過期或沒有權限'
            }
          });
          diagnosis.summary = 'API Key 無效或無權限';
          diagnosis.recommendations.push('前往 Google AI Studio 重新生成 API Key: https://aistudio.google.com/app/apikey');
          diagnosis.recommendations.push('確認 API Key 沒有過期或被撤銷');
          diagnosis.recommendations.push('檢查 Google Cloud Console 確認 API 權限設置');
        }
        // 其他錯誤
        else {
          diagnosis.checks.push({
            name: 'API Key 有效性',
            status: 'warning',
            message: '⚠️ API 請求失敗',
            details: {
              error: errorMessage,
              statusCode
            }
          });
          diagnosis.summary = `API 請求失敗 (${statusCode})`;
          diagnosis.recommendations.push('檢查錯誤訊息詳情');
          diagnosis.recommendations.push('確認網路連線正常');
        }
      } else {
        // 成功！
        diagnosis.checks.push({
          name: 'API Key 有效性',
          status: 'pass',
          message: '✅ API Key 有效且可用',
          details: {
            response: data.candidates?.[0]?.content?.parts?.[0]?.text,
            statusCode: response.status
          }
        });
        diagnosis.summary = '✅ 所有檢查通過，API Key 正常';
      }
    } catch (testError: any) {
      diagnosis.checks.push({
        name: 'API Key 有效性',
        status: 'fail',
        message: '❌ 無法測試 API Key',
        details: {
          error: testError.message,
          issue: '可能是網路問題或 API 服務不可用'
        }
      });
      diagnosis.summary = '無法測試 API Key';
      diagnosis.recommendations.push('檢查網路連線');
      diagnosis.recommendations.push('確認可以訪問 Google API');
    }

    // 檢查 4: 環境變數來源
    const isVercel = !!process.env.VERCEL;
    const isLocal = !isVercel;
    
    diagnosis.checks.push({
      name: '運行環境',
      status: 'pass',
      message: isVercel ? '🌐 Vercel 生產環境' : '💻 本地開發環境',
      details: {
        environment: isVercel ? 'Vercel' : 'Local',
        note: isLocal 
          ? '確認 .env.local 文件存在且格式正確' 
          : '確認 Vercel 環境變數已設置'
      }
    });

    return NextResponse.json(diagnosis, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      error: '診斷過程中發生錯誤',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
