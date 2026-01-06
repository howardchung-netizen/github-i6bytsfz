import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageBase64, prompt } = await request.json();

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API Key not configured. Please set GOOGLE_GEMINI_API_KEY in .env.local file.' 
      }, { status: 500 });
    }

    // 使用 Gemini 1.5 Flash（支持 Vision，成本較低）
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // 移除 Base64 前綴（如果有的話）
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    // 檢測圖像格式
    const mimeType = imageBase64.match(/data:image\/(\w+);base64/)?.[1] || 'png';

    const defaultPrompt = `請分析這張數學題目的圖像，提取以下信息並以 JSON 格式返回：

1. 圖形類型（如果有的話）：rectangle, square, triangle, circle, trapezoid, parallelogram, irregular, composite, map_grid
2. 圖形參數（如果有的話）：如長度、寬度、半徑等，格式為對象
3. 題目文字內容：完整的題目描述
4. 答案：題目的正確答案
5. 解釋（可選）：簡短解釋

請嚴格按照以下 JSON 格式返回：
{
  "shape": "圖形類型或null",
  "params": {參數對象或null},
  "question": "題目文字",
  "answer": "答案",
  "explanation": "解釋（可選）",
  "type": "geometry或word_problem"
}

注意：
- 如果題目沒有圖形，shape 和 params 設為 null
- 如果題目有圖形，必須準確提取圖形類型和參數
- 題目文字必須完整，包括所有數字和單位
- 使用 LaTeX 格式表示分數：$\\frac{3}{8}$`;

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
        ]
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
