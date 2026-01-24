import abilityScoringRules from '../../docs/rules/ability-scoring-rules.json';
import unitAbilityMappingRules from '../../docs/rules/unit-ability-mapping.json';
import reportGenerationRules from '../../docs/rules/report-generation-rules.json';
import teacherPracticePlanRules from '../../docs/rules/teacher-practice-plan-rules.json';

export const ABILITY_SCORING_RULES = abilityScoringRules || {};
export const UNIT_ABILITY_MAPPING_RULES = unitAbilityMappingRules || {};
export const REPORT_GENERATION_RULES = reportGenerationRules || {};
export const TEACHER_PRACTICE_PLAN_RULES = teacherPracticePlanRules || {};

export const getAbilityScoringRules = () => ABILITY_SCORING_RULES || {};
export const getUnitAbilityMappingRules = () => UNIT_ABILITY_MAPPING_RULES || {};
export const getReportGenerationRules = () => REPORT_GENERATION_RULES || {};
export const getTeacherPracticePlanRules = () => TEACHER_PRACTICE_PLAN_RULES || {};
