/**
 * 能力維度映射配置
 * 用於將單元/子單元映射到對應的能力維度
 * 
 * 日後可以通過管理介面添加新的映射關係
 */

/**
 * 單元/子單元到能力維度的映射表
 * 格式：{ 科目: { 單元名稱: 能力維度, 子單元名稱: 能力維度 } }
 */
export const UNIT_TO_ABILITY_MAPPING = {
  math: {
    // 單元級別映射
    '運算': '運算',
    '加法': '運算',
    '減法': '運算',
    '乘法': '運算',
    '除法': '運算',
    '分數': '運算',
    '小數': '運算',
    '四則運算': '運算',
    '混合運算': '運算',
    
    '幾何': '幾何',
    '周界': '幾何',
    '面積': '幾何',
    '體積': '幾何',
    '圖形': '幾何',
    '角度': '幾何',
    '對稱': '幾何',
    
    '邏輯': '邏輯',
    '推理': '邏輯',
    '模式': '邏輯',
    '序列': '邏輯',
    '比較': '邏輯',
    '排序': '邏輯',
    
    '應用題': '應用題',
    '文字題': '應用題',
    '情境題': '應用題',
    
    '數據': '數據',
    '統計': '數據',
    '圖表': '數據',
    '平均': '數據',
    '概率': '數據',
    
    // 子單元級別映射（更精確）
    '加法概念': '運算',
    '減法概念': '運算',
    '不進位加法': '運算',
    '進位加法': '運算',
    '不退位減法': '運算',
    '退位減法': '運算',
    '兩位乘一位': '運算',
    '三位乘一位': '運算',
    '三位數除法': '運算',
    '通分': '運算',
    '擴分與約分': '運算',
    '異分母加減': '運算',
    '百分數與分數互換': '運算',
    '折扣': '應用題',
    '單利息': '應用題',
    
    '正方形周界': '幾何',
    '長方形周界': '幾何',
    '不規則圖形周界': '幾何',
  },
  
  chi: {
    // 單元級別映射
    '閱讀': '閱讀',
    '閱讀理解': '閱讀',
    '理解': '閱讀',
    '篇章': '閱讀',
    '文章': '閱讀',
    
    '寫作': '寫作',
    '作文': '寫作',
    '創作': '寫作',
    '表達': '寫作',
    
    '成語': '成語',
    '諺語': '成語',
    '俗語': '成語',
    '四字詞': '成語',
    
    '文法': '文法',
    '語法': '文法',
    '詞性': '文法',
    '句型': '文法',
    '修飾': '文法',
    
    '修辭': '修辭',
    '比喻': '修辭',
    '擬人': '修辭',
    '誇張': '修辭',
    '對偶': '修辭',
    
    // 子單元級別映射（可以根據實際輸入添加）
  },
  
  eng: {
    // 單元級別映射
    'Grammar': 'Grammar',
    'grammar': 'Grammar',
    '語法': 'Grammar',
    '時態': 'Grammar',
    'tense': 'Grammar',
    '動詞': 'Grammar',
    'verb': 'Grammar',
    '名詞': 'Grammar',
    'noun': 'Grammar',
    '形容詞': 'Grammar',
    'adjective': 'Grammar',
    '副詞': 'Grammar',
    'adverb': 'Grammar',
    '介詞': 'Grammar',
    'preposition': 'Grammar',
    '連接詞': 'Grammar',
    'conjunction': 'Grammar',
    
    'Vocab': 'Vocab',
    'vocab': 'Vocab',
    'vocabulary': 'Vocab',
    '詞彙': 'Vocab',
    '單字': 'Vocab',
    '單詞': 'Vocab',
    '拼字': 'Vocab',
    'spelling': 'Vocab',
    
    'Reading': 'Reading',
    'reading': 'Reading',
    '閱讀': 'Reading',
    '閱讀理解': 'Reading',
    'comprehension': 'Reading',
    '理解': 'Reading',
    
    'Listening': 'Listening',
    'listening': 'Listening',
    '聽力': 'Listening',
    '聆聽': 'Listening',
    '聽': 'Listening',
    
    'Speaking': 'Speaking',
    'speaking': 'Speaking',
    '口語': 'Speaking',
    '說話': 'Speaking',
    '會話': 'Speaking',
    'conversation': 'Speaking',
    
    // 子單元級別映射（可以根據實際輸入添加）
  }
};

/**
 * 根據單元和子單元獲取能力維度
 * @param {string} subject - 科目：'math' | 'chi' | 'eng'
 * @param {string} topicName - 單元名稱
 * @param {string} subTopicName - 子單元名稱（可選）
 * @returns {string|null} 能力維度名稱，如果無法映射則返回 null
 */
export function getAbilityFromUnit(subject, topicName, subTopicName = null) {
  const mapping = UNIT_TO_ABILITY_MAPPING[subject];
  if (!mapping) return null;
  
  // 優先使用子單元映射（更精確）
  if (subTopicName && mapping[subTopicName]) {
    return mapping[subTopicName];
  }
  
  // 使用單元映射
  if (topicName && mapping[topicName]) {
    return mapping[topicName];
  }
  
  // 嘗試模糊匹配（不區分大小寫）
  const topicLower = (topicName || '').toLowerCase();
  const subTopicLower = (subTopicName || '').toLowerCase();
  
  for (const [key, ability] of Object.entries(mapping)) {
    const keyLower = key.toLowerCase();
    if (subTopicLower && subTopicLower.includes(keyLower)) {
      return ability;
    }
    if (topicLower && topicLower.includes(keyLower)) {
      return ability;
    }
  }
  
  return null;
}

/**
 * 添加新的映射關係（用於日後擴展）
 * @param {string} subject - 科目
 * @param {string} unitName - 單元或子單元名稱
 * @param {string} ability - 能力維度
 */
export function addUnitMapping(subject, unitName, ability) {
  if (!UNIT_TO_ABILITY_MAPPING[subject]) {
    UNIT_TO_ABILITY_MAPPING[subject] = {};
  }
  UNIT_TO_ABILITY_MAPPING[subject][unitName] = ability;
}

/**
 * 獲取所有能力維度列表
 * @param {string} subject - 科目
 * @returns {Array} 能力維度列表
 */
export function getAbilitiesForSubject(subject) {
  const abilityMap = {
    math: ['運算', '幾何', '邏輯', '應用題', '數據'],
    chi: ['閱讀', '寫作', '成語', '文法', '修辭'],
    eng: ['Grammar', 'Vocab', 'Reading', 'Listening', 'Speaking']
  };
  return abilityMap[subject] || [];
}
