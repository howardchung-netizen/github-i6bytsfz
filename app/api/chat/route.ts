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
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error:", data);
      return NextResponse.json({ 
        error: `Google API Error: ${data.error?.message || 'Unknown error'}`,
        details: data 
      }, { status: response.status });
    }

    // 成功！回傳題目
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}