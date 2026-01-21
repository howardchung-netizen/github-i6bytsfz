// Gemini Model Configuration
// 統一管理模型名稱，方便切換不同版本
// 當前使用：Gemini 2.0 Flash（免費版，RPM 15, RPD 1,500）
// 注意：如果遇到 limit: 0 錯誤，表示 API Key 對 2.0 Flash 沒有免費層配額，需要升級到付費方案
export const CURRENT_MODEL_NAME = "gemini-2.0-flash"; // 主要用於文字生成（2.0 Flash 免費版）
export const CURRENT_VISION_MODEL_NAME = "gemini-2.0-flash"; // 用於 Vision API（2.0 Flash 支持 Vision）

// Auditor Model Configuration
// 審計員模型（用於背景審計系統，需要更好的推理能力）
// 已驗證：gemini-2.5-pro 可用（2025年1月8日驗證）
// Pro 模型比 Flash 模型有更好的推理能力，適合用於審計任務
export const AUDITOR_MODEL_NAME = "gemini-2.5-pro"; // 審計員模型（已驗證可用）
// 報告生成模型（高價值輸出，必須使用 Pro 等級）
export const REPORT_MODEL_NAME = "gemini-1.5-pro";

// RPM (Requests Per Minute) 速率限制配置
// 當前使用：Gemini 2.0 Flash 免費版（RPM 15）
export const RPM_LIMIT = 15; // 當前：2.0 Flash 免費版（RPM 15）
// export const RPM_LIMIT = 2000; // 付費版：如果升級到付費版，取消註釋此行並註釋上一行

// 根據 RPM 計算最小請求間隔（毫秒）
// 公式：60秒 / RPM = 每次請求間隔（秒）
// 保守起見，增加 10% 緩衝時間
export const MIN_REQUEST_INTERVAL_MS = Math.ceil((60 / RPM_LIMIT) * 1000 * 1.1);
export const APP_ID = 'default-app-id';

export const ADMIN_USER = {
    id: 'admin_dev_id', 
    name: 'Admin Teacher',
    email: 'admin@test.com',
    level: 'P6', 
    xp: 9999,
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=admin',
    role: 'admin',
    school: 'Test Academy',
    institutionName: '',
    institutionRole: null,
    institutionStatus: null,
    gender: 'boy',
    age: 30,
    isPremium: true // 測試帳號設為全權限模式
};

export const SAMPLE_PAST_PAPERS = [
  {
    grade: "P4",
    term: "上學期",
    topic: "除法",
    type: "word_problem",
    question: "【校內試題】有 45 粒糖果，平均分給 7 位小朋友，每人可得幾粒？還剩下幾粒？",
    answer: "6...3" 
  },
  {
    grade: "P4",
    term: "上學期",
    topic: "周界",
    type: "word_problem",
    question: "【校內試題】王先生有一個正方形的花園，邊長是 8 米。請問他在花園圍上一圈鐵絲網，需要多少米長的鐵絲網？",
    answer: "32"
  },
];