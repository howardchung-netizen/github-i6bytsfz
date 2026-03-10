import { NextResponse } from 'next/server';
import { CURRENT_VISION_MODEL_NAME } from '../../lib/constants';

export async function POST(request: Request) {
  try {
    const { imageBase64, prompt } = await request.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured. Please set GOOGLE_GEMINI_API_KEY in .env.local file.' 
      }, { status: 500 });
    }

    // 使用統一的 Vision 模型配置（從 constants.js 導入）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CURRENT_VISION_MODEL_NAME}:generateContent?key=${apiKey}`;

    // 移除 Base64 前綴（如果有的話）
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 檢測圖像格式
    const mimeType = imageBase64.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const defaultPrompt = `你是一位專業的題目數位化助手。
請閱讀這張題目圖片，僅萃取文字與邏輯，回傳純 JSON（不得包含 markdown）。

任務：
1) 提取題幹 question（若涉及圖形，題幹可補「如附圖所示」）。
2) 提取 options（若非選擇題可為空陣列）。
3) 提取 answer。
4) explanation 為可選；若圖中沒有解析可省略。

嚴格禁令：
- 不要描述圖形外觀比例。
- 不要生成 SVG/Canvas/座標代碼。
- 不要輸出 shape/params/mapData 等幾何欄位。

輸出 JSON schema：
{
  "question": "string",
  "options": ["string"],
  "answer": "string",
  "explanation": "string (optional)"
}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt || defaultPrompt
              },
              {
                inlineData: {
                  mimeType: `image/${mimeType}`,
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Vision API Error:", data);
      return NextResponse.json({ 
        error: `Google Vision API Error: ${data.error?.message || 'Unknown error'}`,
        details: data 
      }, { status: response.status });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return NextResponse.json({ 
        error: 'No response from Vision API',
        details: data 
      }, { status: 500 });
    }

    // 嘗試解析 JSON
    try {
      // 移除可能的 markdown 代碼塊標記
      const cleanJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanJson);
      return NextResponse.json({ 
        success: true,
        result: parsed,
        raw: text 
      });
    } catch (e) {
      // 如果解析失敗，返回原始文本
      console.warn("JSON Parse failed, returning raw text:", e);
      return NextResponse.json({ 
        success: false,
        result: null,
        raw: text,
        error: 'Failed to parse JSON from Vision API response'
      });
    }

  } catch (error) {
    console.error("Vision API Server Error:", error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
