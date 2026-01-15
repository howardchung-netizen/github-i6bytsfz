/**
 * 驗證腳本：測試 Google Gemini Thinking 模型
 * 
 * 用途：
 * 1. 列出所有可用的模型
 * 2. 測試 gemini-2.0-flash-thinking-exp 模型是否可用
 * 3. 驗證 API Key 權限
 * 
 * 使用方法：
 * node scripts/verify-thinking-model.js
 * 
 * 注意：需要設置環境變數 GOOGLE_GEMINI_API_KEY
 * 方法 1：在 .env.local 文件中設置（推薦）
 * 方法 2：在 PowerShell 中設置：$env:GOOGLE_GEMINI_API_KEY="your_key"
 */

// 嘗試讀取 .env.local 文件（如果存在）
try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^GOOGLE_GEMINI_API_KEY=(.+)$/);
            if (match) {
                process.env.GOOGLE_GEMINI_API_KEY = match[1].trim();
            }
        });
    }
} catch (e) {
    // 如果讀取失敗，繼續使用環境變數
}

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error('❌ 錯誤：未設置 GOOGLE_GEMINI_API_KEY 環境變數');
    console.log('\n請在 .env.local 文件中設置：');
    console.log('GOOGLE_GEMINI_API_KEY=your_api_key_here');
    process.exit(1);
}

// 可能的審計員模型名稱（按推理能力優先）
// 注意：Thinking 模型可能不存在，使用 Pro 模型作為替代（更好的推理能力）
const AUDITOR_MODELS = [
    'gemini-2.5-pro',                      // 最新 Pro 模型（推薦，更好的推理能力）
    'gemini-2.5-flash',                    // 最新 Flash 模型（快速但推理能力較弱）
    'gemini-exp-1206',                     // 實驗版（Gemini 2.5 Pro 實驗版）
    'gemini-2.0-flash-thinking-exp-1219', // Thinking 模型（如果存在）
    'gemini-2.0-flash-thinking-exp',      // Thinking 模型（如果存在）
    'gemini-2.0-flash-thinking',          // Thinking 模型（如果存在）
];

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * 列出所有可用的模型
 */
async function listAvailableModels() {
    console.log('\n📋 正在列出所有可用模型...\n');
    
    try {
        const url = `${BASE_URL}/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            console.error('❌ 獲取模型列表失敗：', data.error?.message || 'Unknown error');
            return null;
        }
        
        if (data.models && Array.isArray(data.models)) {
            console.log(`✅ 找到 ${data.models.length} 個模型\n`);
            
            // 過濾出適合審計的模型（Pro 模型或 Thinking 模型）
            const auditorModels = data.models.filter(m => 
                m.name && (
                    m.name.includes('pro') || 
                    m.name.includes('thinking') ||
                    (m.name.includes('exp') && m.name.includes('gemini'))
                )
            );
            
            if (auditorModels.length > 0) {
                console.log('🧠 適合審計的模型（Pro/Thinking）：');
                auditorModels.forEach(m => {
                    console.log(`   - ${m.name}`);
                    if (m.displayName) console.log(`     顯示名稱: ${m.displayName}`);
                    if (m.description) console.log(`     描述: ${m.description}`);
                });
                console.log('');
            }
            
            // 顯示所有模型（前20個）
            console.log('📦 所有模型（前20個）：');
            data.models.slice(0, 20).forEach(m => {
                console.log(`   - ${m.name}`);
            });
            
            if (data.models.length > 20) {
                console.log(`   ... 還有 ${data.models.length - 20} 個模型`);
            }
            
            return data.models;
        } else {
            console.error('❌ 響應格式不正確');
            return null;
        }
    } catch (error) {
        console.error('❌ 獲取模型列表時發生錯誤：', error.message);
        return null;
    }
}

/**
 * 測試特定模型
 */
async function testModel(modelName) {
    console.log(`\n🧪 測試模型：${modelName}\n`);
    
    try {
        const url = `${BASE_URL}/models/${modelName}:generateContent?key=${API_KEY}`;
        
        const testPrompt = `請用一句話回答：1 + 1 等於多少？`;
        
        console.log(`📤 發送測試請求...`);
        console.log(`   提示詞: "${testPrompt}"`);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: testPrompt
                    }]
                }]
            }),
            signal: AbortSignal.timeout(30000) // 30秒超時
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error(`❌ 模型測試失敗：`);
            console.error(`   狀態碼: ${response.status}`);
            console.error(`   錯誤訊息: ${data.error?.message || 'Unknown error'}`);
            
            // 詳細錯誤信息
            if (data.error?.details) {
                console.error(`   詳細信息:`, JSON.stringify(data.error.details, null, 2));
            }
            
            // 檢查是否為模型不存在
            if (response.status === 404 || data.error?.message?.includes('not found')) {
                console.log(`\n💡 提示：模型 "${modelName}" 不存在或不可用`);
                console.log(`   請檢查模型名稱是否正確，或嘗試其他版本`);
            }
            
            // 檢查是否為權限問題
            if (response.status === 403 || data.error?.message?.includes('permission')) {
                console.log(`\n💡 提示：API Key 可能沒有訪問此模型的權限`);
                console.log(`   請檢查 Google Cloud Console 中的 API 權限設置`);
            }
            
            return false;
        }
        
        // 成功！
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`\n✅ 模型測試成功！`);
        console.log(`   響應: "${text}"`);
        console.log(`   模型名稱: ${modelName}`);
        console.log(`   可用於審計系統 ✅\n`);
        
        return true;
        
    } catch (error) {
        console.error(`❌ 測試時發生錯誤：`, error.message);
        
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            console.error(`   請求超時（30秒）`);
            console.log(`\n💡 提示：Thinking 模型可能需要更長的響應時間`);
            console.log(`   建議增加超時時間或檢查網路連線`);
        }
        
        return false;
    }
}

/**
 * 主函數
 */
async function main() {
    console.log('='.repeat(60));
    console.log('🔍 Google Gemini Thinking 模型驗證腳本');
    console.log('='.repeat(60));
    console.log(`\nAPI Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);
    
    // 步驟 1: 列出所有可用模型
    const models = await listAvailableModels();
    
    // 步驟 2: 測試審計員模型
    console.log('\n' + '='.repeat(60));
    console.log('🧠 測試審計員模型（Pro/Thinking）');
    console.log('='.repeat(60));
    
    let successModel = null;
    
    for (const modelName of AUDITOR_MODELS) {
        const success = await testModel(modelName);
        if (success) {
            successModel = modelName;
            break; // 找到可用的模型，停止測試
        }
        
        // 等待一下再測試下一個模型（避免速率限制）
        if (modelName !== AUDITOR_MODELS[AUDITOR_MODELS.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('📊 驗證結果總結');
    console.log('='.repeat(60));
    
    if (successModel) {
        console.log(`\n✅ 成功！找到可用的審計員模型：`);
        console.log(`   ${successModel}`);
        console.log(`\n💡 建議在 constants.js 中更新：`);
        console.log(`   export const AUDITOR_MODEL_NAME = "${successModel}";`);
        console.log(`\n📝 注意：`);
        if (successModel.includes('pro')) {
            console.log(`   - 使用 Pro 模型作為審計員（推理能力更強）`);
            console.log(`   - Pro 模型可能比 Flash 模型更慢但更準確`);
        } else if (successModel.includes('thinking')) {
            console.log(`   - 使用 Thinking 模型作為審計員（專門用於推理）`);
        }
    } else {
        console.log(`\n❌ 未找到可用的審計員模型`);
        console.log(`\n💡 可能的原因：`);
        console.log(`   1. API Key 沒有訪問 Pro/Thinking 模型的權限`);
        console.log(`   2. 模型名稱不正確（請檢查 Google AI Studio 獲取最新名稱）`);
        console.log(`   3. 需要升級到付費方案才能使用 Pro 模型`);
        console.log(`\n💡 建議：`);
        console.log(`   1. 檢查 Google Cloud Console 中的 API 權限`);
        console.log(`   2. 訪問 https://aistudio.google.com/ 查看可用模型`);
        console.log(`   3. 確認 API Key 是否已啟用 Gemini API`);
        console.log(`   4. 如果沒有 Pro 模型，可以使用 gemini-2.5-flash 作為備選`);
    }
    
    console.log('\n');
}

// 執行主函數
main().catch(error => {
    console.error('\n❌ 腳本執行失敗：', error);
    process.exit(1);
});
