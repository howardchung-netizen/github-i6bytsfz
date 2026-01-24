/**
 * 能力維度映射配置
 * 用於將單元/子單元映射到對應的能力維度
 * 
 * 日後可以通過管理介面添加新的映射關係
 */

import { getUnitAbilityMappingRules, getAbilityScoringRules } from './logic-rules';

/**
 * 單元/子單元到能力維度的映射表
 * 格式：{ 科目: { 單元名稱: 能力維度, 子單元名稱: 能力維度 } }
 */
export const UNIT_TO_ABILITY_MAPPING = getUnitAbilityMappingRules();

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
  const rules = getAbilityScoringRules();
  const subjectRules = rules?.subjects?.[subject];
  if (subjectRules?.abilities?.length) {
    return subjectRules.abilities;
  }
  return [];
}
