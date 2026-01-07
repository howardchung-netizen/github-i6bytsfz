import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    vercelEnv: process.env.VERCEL_ENV || 'not-set', // Vercel 專用環境變數
    vercelUrl: process.env.VERCEL_URL || 'not-set', // Vercel 部署 URL
    hasApiKey: !!process.env.GOOGLE_GEMINI_API_KEY, // 檢查 API Key 是否存在（不顯示值）
    timestamp: new Date().toISOString(),
    message: process.env.NODE_ENV === 'production' 
      ? '✅ 當前運行在生產環境（Production）' 
      : '⚠️ 當前運行在開發環境（Development）'
  });
}
