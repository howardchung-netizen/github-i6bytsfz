/**
 * ADHD 模式輔助工具函數
 * 用於關鍵字高亮和語音輔助
 */

// 關鍵動作詞（中文）
const KEY_ACTION_WORDS_ZH = [
  '買了', '賣了', '剩下', '還有', '給了', '拿走', '增加', '減少',
  '平均', '總共', '一共', '共', '各', '每', '各', '分別',
  '多', '少', '倍', '一半', '三分之一', '四分之一',
  '加', '減', '乘', '除', '等於', '是',
  '分成', '分給', '每人', '每個', '每份',
  '長', '寬', '高', '周長', '面積', '體積',
  '開始', '結束', '經過', '用了', '花費'
];

// 關鍵動作詞（英文）
const KEY_ACTION_WORDS_EN = [
  'bought', 'sold', 'left', 'have', 'gave', 'took', 'increase', 'decrease',
  'average', 'total', 'each', 'per', 'every', 'more', 'less', 'times',
  'add', 'subtract', 'multiply', 'divide', 'equals', 'is',
  'share', 'distribute', 'per person', 'per item',
  'length', 'width', 'height', 'perimeter', 'area', 'volume',
  'start', 'end', 'spent', 'cost'
];

// 單位詞（中文）
const UNIT_WORDS_ZH = [
  '元', '角', '分', '塊', '個', '隻', '條', '張', '本', '支',
  '厘米', '公分', '米', '公里', '毫米', 'cm', 'm', 'km',
  '克', '公斤', '千克', 'g', 'kg',
  '升', '毫升', 'L', 'ml',
  '平方厘米', '平方公分', '平方米', 'cm²', 'm²',
  '立方厘米', '立方公分', '立方米', 'cm³', 'm³',
  '小時', '分鐘', '秒', '時', '分', '秒'
];

// 單位詞（英文）
const UNIT_WORDS_EN = [
  'dollar', 'cent', 'piece', 'each', 'cm', 'm', 'km', 'mm',
  'g', 'kg', 'gram', 'kilogram',
  'L', 'ml', 'liter', 'milliliter',
  'cm²', 'm²', 'square', 'cubic',
  'hour', 'minute', 'second', 'hr', 'min', 'sec'
];

/**
 * 高亮題目中的關鍵字
 * @param {string} text - 題目文字
 * @param {string} lang - 語言 ('zh-HK' 或 'en-US')
 * @returns {Array} JSX 元素數組
 */
export function highlightKeywords(text, lang = 'zh-HK') {
  if (!text) return [text];
  
  const isZh = lang === 'zh-HK' || lang === 'zh-CN' || lang === 'zh-TW';
  const actionWords = isZh ? KEY_ACTION_WORDS_ZH : KEY_ACTION_WORDS_EN;
  const unitWords = isZh ? UNIT_WORDS_ZH : UNIT_WORDS_EN;
  
  // 合併所有關鍵字
  const allKeywords = [...actionWords, ...unitWords];
  
  // 數字正則表達式（包括小數、分數、百分比）
  const numberPattern = /(\d+\.?\d*|[\u00BC-\u00BE\u2150-\u215E]|\d+\/\d+|\d+%)/g;
  
  // 創建關鍵字正則表達式（按長度排序，先匹配長詞）
  const sortedKeywords = allKeywords.sort((a, b) => b.length - a.length);
  const keywordPattern = new RegExp(`(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  
  // 合併所有模式
  const combinedPattern = new RegExp(`(${numberPattern.source}|${keywordPattern.source})`, 'g');
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // 重置正則表達式
  combinedPattern.lastIndex = 0;
  
  while ((match = combinedPattern.exec(text)) !== null) {
    // 添加匹配前的文字
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // 檢查是否為數字
    const isNumber = /^\d+\.?\d*|[\u00BC-\u00BE\u2150-\u215E]|\d+\/\d+|\d+%$/.test(match[0]);
    
    // 檢查是否為關鍵字
    const isKeyword = allKeywords.some(kw => 
      match[0].toLowerCase().includes(kw.toLowerCase()) || 
      kw.toLowerCase().includes(match[0].toLowerCase())
    );
    
    // 添加高亮的關鍵字或數字
    if (isNumber) {
      parts.push(
        <span key={`num-${match.index}`} className="bg-yellow-300 text-yellow-900 font-black px-1.5 py-0.5 rounded-md shadow-sm border-2 border-yellow-400">
          {match[0]}
        </span>
      );
    } else if (isKeyword) {
      parts.push(
        <span key={`kw-${match.index}`} className="bg-blue-300 text-blue-900 font-black px-1.5 py-0.5 rounded-md shadow-sm border-2 border-blue-400">
          {match[0]}
        </span>
      );
    } else {
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加剩餘文字
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  // 如果沒有匹配到任何關鍵字，返回原文字
  if (parts.length === 0) {
    return [text];
  }
  
  return parts;
}

/**
 * 檢查瀏覽器是否支援語音合成
 */
export function isSpeechSynthesisSupported() {
  return 'speechSynthesis' in window;
}

/**
 * 優化的語音讀題功能（針對 ADHD 模式）
 * @param {string} text - 要讀取的文字
 * @param {string} lang - 語言代碼
 * @param {object} options - 選項
 */
export function speakTextForADHD(text, lang = 'zh-HK', options = {}) {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis not supported');
    return;
  }
  
  // 取消之前的語音
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // 設置語言
  if (lang === 'zh-HK' || lang === 'zh-CN' || lang === 'zh-TW') {
    utterance.lang = 'zh-HK';
  } else {
    utterance.lang = 'en-US';
  }
  
  // ADHD 模式優化設置
  utterance.rate = options.rate || 0.75; // 稍慢的語速，幫助理解
  utterance.pitch = options.pitch || 1.0;
  utterance.volume = options.volume || 1.0;
  
  // 錯誤處理
  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event);
  };
  
  window.speechSynthesis.speak(utterance);
  
  return utterance;
}
