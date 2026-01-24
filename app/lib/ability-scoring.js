/**
 * 能力評分邏輯
 * 根據題目類型和答題結果計算並更新能力分數
 */

import { getAbilityFromUnit } from './ability-mapping';
import { getAbilityScoringRules } from './logic-rules';

/**
 * 分類題目屬於哪個能力維度（支持數學、中文、英文科）
 * @param {Object} question - 題目對象
 * @param {string} subject - 科目：'math' | 'chi' | 'eng'
 * @param {Array} topics - 所有單元列表（用於查找單元和子單元信息）
 * @returns {string} 能力維度名稱
 */
export function classifyQuestionAbility(question, subject = 'math', topics = []) {
  // 優先使用單元/子單元映射（最準確）
  const topicId = question.topic_id || question.topicId;
  if (topicId && topics && topics.length > 0) {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      const topicName = topic.name || '';
      const subTopicName = question.subTopic || question.sub_topic || null;
      
      // 嘗試從映射表獲取能力維度
      const mappedAbility = getAbilityFromUnit(subject, topicName, subTopicName);
      if (mappedAbility) {
        return mappedAbility;
      }
    }
  }
  
  // 如果沒有映射，使用文本分析（後備方案）
  return classifyQuestionAbilityByText(question, subject);
}

/**
 * 通過文本內容分類題目能力（後備方案）
 * @param {Object} question - 題目對象
 * @param {string} subject - 科目
 * @returns {string} 能力維度名稱
 */
function classifyQuestionAbilityByText(question, subject) {
  const questionText = (question.question || '').toLowerCase();
  const topic = (question.topic || question.category || '').toLowerCase();
  
  if (subject === 'math') {
    return classifyMathAbility(question, questionText, topic);
  } else if (subject === 'chi') {
    return classifyChineseAbility(question, questionText, topic);
  } else if (subject === 'eng') {
    return classifyEnglishAbility(question, questionText, topic);
  }
  
  // 默認返回第一個能力維度
  return getDefaultAbility(subject);
}

/**
 * 分類數學科能力
 */
function classifyMathAbility(question, questionText, topic) {
  // 幾何（優先判斷，因為可能有圖形）
  if (question.shape || question.type === 'geometry' || 
      topic.includes('幾何') || topic.includes('周界') || 
      topic.includes('面積') || topic.includes('體積') ||
      questionText.includes('周界') || questionText.includes('面積') ||
      questionText.includes('體積') || questionText.includes('長方形') ||
      questionText.includes('正方形') || questionText.includes('三角形') ||
      questionText.includes('圓形') || questionText.includes('梯形') ||
      questionText.includes('平行四邊形') || questionText.includes('角度')) {
    return '幾何';
  }
  
  // 數據
  if (topic.includes('數據') || topic.includes('統計') ||
      topic.includes('圖表') || questionText.includes('數據') ||
      questionText.includes('統計') || questionText.includes('圖表') ||
      questionText.includes('平均') || questionText.includes('概率') ||
      questionText.includes('最多') || questionText.includes('最少')) {
    return '數據';
  }
  
  // 應用題（包含實際情境）
  if (topic.includes('應用') || questionText.includes('應用題') ||
      questionText.includes('買') || questionText.includes('賣') ||
      questionText.includes('元') || questionText.includes('個') ||
      questionText.includes('時間') || questionText.includes('距離') ||
      questionText.includes('速度') || questionText.includes('價格') ||
      questionText.includes('數量') || questionText.includes('還剩下') ||
      questionText.includes('還剩') || questionText.includes('剩下')) {
    return '應用題';
  }
  
  // 邏輯
  if (topic.includes('邏輯') || topic.includes('推理') ||
      questionText.includes('邏輯') || questionText.includes('推理') ||
      questionText.includes('模式') || questionText.includes('序列') ||
      questionText.includes('比較') || questionText.includes('排序') ||
      questionText.includes('如果') || questionText.includes('那麼')) {
    return '邏輯';
  }
  
  // 運算（默認）
  return '運算';
}

/**
 * 分類中文科能力
 */
function classifyChineseAbility(question, questionText, topic) {
  // 閱讀
  if (topic.includes('閱讀') || topic.includes('理解') ||
      topic.includes('篇章') || topic.includes('文章') ||
      questionText.includes('閱讀') || questionText.includes('理解') ||
      questionText.includes('根據文章') || questionText.includes('根據上文')) {
    return '閱讀';
  }
  
  // 寫作
  if (topic.includes('寫作') || topic.includes('作文') ||
      topic.includes('創作') || topic.includes('表達') ||
      questionText.includes('寫作') || questionText.includes('作文') ||
      questionText.includes('請寫') || questionText.includes('請創作')) {
    return '寫作';
  }
  
  // 成語
  if (topic.includes('成語') || topic.includes('諺語') ||
      topic.includes('俗語') || topic.includes('四字詞') ||
      questionText.includes('成語') || questionText.includes('諺語') ||
      questionText.includes('俗語')) {
    return '成語';
  }
  
  // 修辭
  if (topic.includes('修辭') || topic.includes('比喻') ||
      topic.includes('擬人') || topic.includes('誇張') ||
      questionText.includes('修辭') || questionText.includes('比喻') ||
      questionText.includes('擬人') || questionText.includes('誇張')) {
    return '修辭';
  }
  
  // 文法（默認）
  return '文法';
}

/**
 * 分類英文科能力
 */
function classifyEnglishAbility(question, questionText, topic) {
  // Grammar
  if (topic.includes('grammar') || topic.includes('語法') ||
      topic.includes('時態') || topic.includes('tense') ||
      topic.includes('動詞') || topic.includes('verb') ||
      questionText.includes('grammar') || questionText.includes('tense') ||
      questionText.includes('verb form') || questionText.includes('correct form')) {
    return 'Grammar';
  }
  
  // Vocab
  if (topic.includes('vocab') || topic.includes('詞彙') ||
      topic.includes('單字') || topic.includes('spelling') ||
      questionText.includes('vocabulary') || questionText.includes('spelling') ||
      questionText.includes('word') || questionText.includes('meaning')) {
    return 'Vocab';
  }
  
  // Reading
  if (topic.includes('reading') || topic.includes('閱讀') ||
      topic.includes('comprehension') || questionText.includes('reading') ||
      questionText.includes('comprehension') || questionText.includes('passage')) {
    return 'Reading';
  }
  
  // Listening
  if (topic.includes('listening') || topic.includes('聽力') ||
      topic.includes('聆聽') || questionText.includes('listening') ||
      questionText.includes('listen')) {
    return 'Listening';
  }
  
  // Speaking
  if (topic.includes('speaking') || topic.includes('口語') ||
      topic.includes('會話') || questionText.includes('speaking') ||
      questionText.includes('conversation')) {
    return 'Speaking';
  }
  
  // Grammar（默認）
  return 'Grammar';
}

/**
 * 獲取默認能力維度
 */
function getDefaultAbility(subject) {
  const rules = getAbilityScoringRules();
  const subjectRules = rules?.subjects?.[subject];
  if (subjectRules?.defaultAbility) {
    return subjectRules.defaultAbility;
  }
  const defaults = {
    math: '運算',
    chi: '文法',
    eng: 'Grammar'
  };
  return defaults[subject] || '運算';
}

/**
 * 計算能力分數變化
 * @param {Array} sessionQuestions - 試卷中的所有題目（包含 isCorrect 屬性）
 * @param {string} subject - 科目：'math' | 'chi' | 'eng'
 * @param {Object} currentScores - 當前能力分數對象
 * @param {Array} topics - 所有單元列表（用於單元/子單元映射，可選）
 * @returns {Object} 更新後的能力分數對象
 */
export function calculateAbilityScores(sessionQuestions, subject, currentScores, topics = null) {
  const rules = getAbilityScoringRules();
  const abilityList = rules?.subjects?.[subject]?.abilities;
  const abilities = Array.isArray(abilityList) && abilityList.length > 0
    ? abilityList.reduce((acc, ability) => ({ ...acc, [ability]: ability }), {})
    : { '運算': '運算', '幾何': '幾何', '邏輯': '邏輯', '應用題': '應用題', '數據': '數據' };
  const newScores = { ...currentScores };
  
  // 初始化每個能力的分數變化
  const changes = {};
  Object.keys(abilities).forEach(ability => {
    changes[ability] = 0;
  });
  
  const scoringRules = rules?.scoring || {};
  const correctBase = typeof scoringRules.correctBase === 'number' ? scoringRules.correctBase : 2;
  const incorrectBase = typeof scoringRules.incorrectBase === 'number' ? scoringRules.incorrectBase : -1;
  const applyDifficulty = scoringRules.difficultyMultiplier !== false;

  // 遍歷試卷中的所有題目
  sessionQuestions.forEach(question => {
    // 使用統一分類函數（支持所有科目）
    // 傳入 topics 以支持單元/子單元映射
    const ability = classifyQuestionAbility(question, subject, topics);
    
    if (!ability || !abilities[ability]) {
      return; // 跳過無法分類的題目
    }
    
    const isCorrect = question.isCorrect !== false; // 默認為 true
    const difficulty = question.difficulty || 1; // 1=簡單, 1.5=中等, 2=困難
    
    // 計算分數變化
    const multiplier = applyDifficulty ? difficulty : 1;

    if (isCorrect) {
      changes[ability] += correctBase * multiplier;
    } else {
      changes[ability] += incorrectBase * multiplier;
    }
  });
  
  // 更新能力分數（限制在 0-100 範圍內）
  const minScore = typeof rules?.scoring?.minScore === 'number' ? rules.scoring.minScore : 0;
  const maxScore = typeof rules?.scoring?.maxScore === 'number' ? rules.scoring.maxScore : 100;
  Object.keys(abilities).forEach(ability => {
    const currentScore = newScores[ability] || 50;
    const change = changes[ability] || 0;
    newScores[ability] = Math.max(minScore, Math.min(maxScore, currentScore + change));
  });
  
  return newScores;
}

/**
 * 將能力分數轉換為雷達圖數據格式
 * @param {Object} scores - 能力分數對象
 * @param {string} subject - 科目
 * @returns {Array} 雷達圖數據數組
 */
export function formatScoresForRadar(scores, subject) {
  const rules = getAbilityScoringRules();
  const abilities = rules?.subjects?.[subject]?.abilities
    || rules?.subjects?.math?.abilities
    || ['運算', '幾何', '邏輯', '應用題', '數據'];
  
  return abilities.map(ability => ({
    subject: ability,
    A: scores[ability] || 50,
    fullMark: 100
  }));
}
