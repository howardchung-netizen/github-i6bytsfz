# AI Model Migration Audit Report
## Gemini 2.5-flash → Gemini 2.0-flash Migration Feasibility Analysis

**Date**: 2024-12  
**Auditor**: Senior Backend Architect & AI Prompt Engineer  
**Objective**: Analyze codebase readiness for migrating to gemini-2.0-flash with advanced prompt engineering strategies

---

## 1. Current Logic Assessment

### 1.1 Prompt Structure Analysis

#### Current Prompt Construction Location
**File**: `app/lib/ai-service.js`  
**Function**: `AI_SERVICE.generateQuestion()` (Lines 27-219)

#### Current Prompt Structure:
```javascript
const promptText = `
    Role: Professional HK Primary Math Teacher.
    Task: Create a NEW variation of the following seed question.
    Seed: "${activeSeed.question}" (Topic: ${activeSeed.topic})
    Level: ${level}
    
    Constraints:
    1. Maintain the same difficulty and mathematical concept.
    2. Change the names, context, and numbers.
    3. If it is a division word problem, ensure you calculate the new answer properly.
    4. Output strict JSON only.
    5. IMPORTANT: Ensure all strings are valid JSON. Escape all backslashes.
    6. [Conditional: Math MCQ with 8 options or 4 options]
    
    [Optional: Developer Feedback Section]
    
    Output JSON Schema: {...}
`;
```

#### Key Observations:

**✅ Strengths:**
- Prompt is dynamically constructed (allows injection)
- Supports conditional logic based on `isMathSubject`
- Already includes feedback injection mechanism (`relevantFeedback`)
- JSON schema is dynamically generated

**⚠️ Limitations:**
- **Single-step output only**: Current prompt expects direct JSON output, no intermediate "thinking" step
- **No explicit Seed DNA analysis**: Prompt mentions "maintain same difficulty" but doesn't instruct AI to analyze seed properties (remainder, decimal, tense, etc.)
- **Category passed as string**: Only passes topic name (e.g., "除法") without structured tag mapping
- **No verification loop**: No self-checking or validation step before final output

#### Current Model Usage Analysis:

**⚠️ IMPORTANT CLARIFICATION:**

**Actual Model in Use (Code):**
- **File**: `app/api/chat/route.ts` (Line 18)
- **Model**: `gemini-flash-latest` → **This is Gemini 1.5 Flash (NOT 2.5-flash)**
- **Comment in code**: "這對應到 1.5 Flash 穩定版"

**Declared Model (Constants):**
- **File**: `app/lib/constants.js` (Line 1)
- **Constant**: `CURRENT_MODEL_NAME = "gemini-2.0-flash-exp"`
- **Status**: ❌ **NOT USED** - This constant is declared but never referenced in API calls

**User's Understanding:**
- User believed they were using 2.5-flash
- User experienced rate limit errors (per minute limit)
- **Actual situation**: Code uses 1.5 Flash, but user may have manually changed API endpoint or there's a configuration mismatch
- **Note**: Both 1.5 and 2.0 Flash have RPM 15, so RPM 5 errors suggest a different issue (different model version, account quota, or API endpoint)

**2.0-flash Actual Limits (User Confirmed):**
- **RPM**: 15 requests/minute ✅ (Same as 1.5 Flash)
- **RPD**: 1,500 requests/day ✅ (Same as 1.5 Flash)
- **Note**: Previous report incorrectly stated RPD 20 and RPM 5. User has confirmed actual limits.

**Compatibility Assessment**: ⚠️ **PARTIAL**
- Output format: ✅ Compatible
- Reasoning requirements: ❌ Needs enhancement (Strategy I, II, III)
- Rate limits: ✅ Better than expected (1,500/day is reasonable)

---

## 2. Gap Analysis

### 2.1 Strategy I: Seed DNA Imitation (Dynamic Attribute Preservation)

#### Missing Components:

**❌ Seed Property Analysis Function**
- **Location Needed**: `app/lib/ai-service.js` (new function)
- **Purpose**: Analyze seed question for:
  - Numerical properties: remainder (餘數), decimal places, negative numbers, fractions
  - Grammatical properties: past tense, future tense, conditional statements
  - Structural properties: MCQ vs text, geometry vs arithmetic
- **Current State**: No such analysis exists

**❌ Seed DNA Extraction Logic**
- **Location Needed**: Before prompt construction (Line 108 in `ai-service.js`)
- **Purpose**: Extract and encode seed properties into prompt instructions
- **Example Required**:
  ```
  Seed Analysis:
  - Has remainder: YES (seed answer: "6...3")
  - Uses decimals: NO
  - Tense: Present
  - Question type: Word problem with division
  ```

**❌ Dynamic Constraint Injection**
- **Location Needed**: Prompt construction (Line 108-132)
- **Purpose**: Inject seed DNA properties as explicit constraints
- **Current State**: Only generic "maintain same difficulty" constraint

**Implementation Readiness**: 🔴 **NOT READY**
- **Files to Create**: None
- **Files to Modify**: `app/lib/ai-service.js` (add seed analysis function, modify prompt)

---

### 2.2 Strategy II: Tag-Based Constraint Injection

#### Missing Components:

**❌ Tag-to-Rule Mapping Structure**
- **Location Needed**: `app/lib/constants.js` (recommended) OR new file `app/lib/tag-constraints.js`
- **Purpose**: Store mapping like:
  ```javascript
  export const TAG_CONSTRAINTS = {
    'MATH_DIV_REM': 'Ensure the dividend is not divisible by the divisor. Answer must include remainder format: "quotient...remainder"',
    'MATH_DIV_NO_REM': 'Ensure the dividend is divisible by the divisor. Answer must be a whole number.',
    'MATH_DECIMAL': 'Use decimal numbers in calculation. Answer must be a decimal (e.g., 3.5)',
    'MATH_NEGATIVE': 'Include negative numbers in the problem context',
    // ... more mappings
  };
  ```
- **Current State**: No tag mapping exists

**❌ Category-to-Tag Translation**
- **Location Needed**: `app/lib/ai-service.js` (new function)
- **Purpose**: Convert category names (e.g., "除法") to tags (e.g., "MATH_DIV_REM")
- **Current State**: Categories passed as plain strings (Line 111: `activeSeed.topic`)

**❌ Tag Extraction from Seed**
- **Location Needed**: Seed analysis function (Strategy I)
- **Purpose**: Extract tags from seed question (e.g., detect remainder from answer format)
- **Current State**: No tag extraction

**❌ Two-Step Pipeline for Unknown Categories**
- **Location Needed**: Prompt construction (Line 108-132)
- **Purpose**: Implement Step 1 (Analyze Feature) → Step 2 (Generate)
- **Current State**: Single-step generation only

**Implementation Readiness**: 🔴 **NOT READY**
- **Files to Create**: `app/lib/tag-constraints.js` (recommended)
- **Files to Modify**: 
  - `app/lib/constants.js` (if storing tags here)
  - `app/lib/ai-service.js` (add tag translation, modify prompt for 2-step pipeline)

---

### 2.3 Strategy III: COT (Chain of Thought) Verification

#### Missing Components:

**❌ Multi-Step Output Schema**
- **Location Needed**: Prompt construction (Line 108-132)
- **Purpose**: Change output format to support:
  ```
  Step 1: Draft question
  Step 2: Self-verify (solve and check)
  Step 3: Final output (only if verification passes)
  ```
- **Current State**: Expects strict JSON only (Line 118: "Output strict JSON only")

**❌ Verification Instruction**
- **Location Needed**: Prompt construction
- **Purpose**: Instruct AI to:
  1. Solve the generated question
  2. Check for integer/remainder/logic consistency
  3. Only output if verification passes
- **Current State**: No verification step

**❌ Response Parsing for Multi-Step Output**
- **Location Needed**: `app/lib/ai-service.js` (Lines 159-172)
- **Purpose**: Parse multi-step response and extract final JSON
- **Current State**: Expects single JSON response

**❌ Fallback Handling for Failed Verification**
- **Location Needed**: Error handling (Lines 187-219)
- **Purpose**: Handle cases where AI fails verification (regenerate or use fallback)
- **Current State**: Basic error handling exists but no verification-specific handling

**Implementation Readiness**: 🔴 **NOT READY**
- **Files to Create**: None
- **Files to Modify**: 
  - `app/lib/ai-service.js` (modify prompt, add parsing logic, enhance error handling)

---

## 3. Conflict & Redundancy Warnings

### 3.1 Hardcoded Validations

**⚠️ CONFLICT RISK: Answer Validation Logic**

**Location**: `app/page.tsx` (Lines 561-608)
```javascript
const checkAnswer = (answerToCheck) => {
    const finalAnswer = answerToCheck.toString().trim();
    const isCorrect = (typeof currentQuestion.answer === 'number') ?
        parseFloat(finalAnswer) === parseFloat(currentQuestion.answer) :
        finalAnswer.toString().trim() === currentQuestion.answer.toString().trim();
    // ...
}
```

**Conflict**: 
- Uses `parseFloat()` which may round decimals
- String comparison may not handle remainder format ("6...3" vs "6餘3")
- **Risk**: If AI generates decimal answer but validation expects integer, or vice versa

**Recommendation**: 
- Align validation logic with Seed DNA strategy
- Support multiple answer formats (remainder, decimal, fraction)

---

**⚠️ CONFLICT RISK: Math.round() Usage**

**Locations Found**:
- `app/components/TeacherView.tsx` (Lines 616, 1219, 1263)
- `app/components/ParentView.tsx` (Line 166)

**Conflict**: 
- Used for percentage calculations (UI display only)
- **Low risk** but worth noting: If AI generates decimal percentages, rounding may cause display inconsistency

**Recommendation**: 
- No action needed (UI display only)
- Document that rounding is intentional for UI

---

### 3.2 Duplicate Logic Layers

**✅ NO REDUNDANCY DETECTED**

**Analysis**:
- No Python/backend validation that forcibly rounds numbers
- No duplicate filtering of negative numbers
- Answer validation is only in frontend (`app/page.tsx`)

**Conclusion**: No redundant logic that would conflict with AI instructions.

---

### 3.3 Model Configuration Conflicts

**⚠️ CRITICAL INCONSISTENCY: Model Configuration Mismatch**

**Location**: `app/lib/constants.js` (Line 1) vs `app/api/chat/route.ts` (Line 18)

**Issue**: 
- **Constant declared**: `CURRENT_MODEL_NAME = "gemini-2.0-flash-exp"` (2.0 Flash)
- **Actually used**: `gemini-flash-latest` (1.5 Flash) - hardcoded in API route
- **User's expectation**: Thought they were using 2.5-flash
- **Reality**: Code uses 1.5 Flash, constant is ignored

**Root Cause Analysis:**
- Constant was created but never integrated into API calls
- API route has hardcoded model name with comment "1.5 Flash 穩定版"
- This explains why user experienced different rate limits than expected

**Recommendation**: 
1. **Immediate**: Update `app/api/chat/route.ts` to use `CURRENT_MODEL_NAME` constant
2. **Or**: Create environment variable `NEXT_PUBLIC_GEMINI_MODEL` for flexible model selection
3. **Verify**: Check if user manually changed API endpoint elsewhere (environment variable, Vercel config)

---

## 4. Implementation Roadmap (Files to Touch)

### 4.1 Files Requiring Modification

#### **Priority 1: Core AI Service**

**File**: `app/lib/ai-service.js`
- **Function**: `generateQuestion()` (Lines 27-219)
- **Changes Required**:
  1. Add seed analysis function (extract DNA properties)
  2. Add tag translation function (category → tag → constraint)
  3. Modify prompt construction to include:
     - Seed DNA analysis instructions (Strategy I)
     - Tag-based constraints (Strategy II)
     - COT verification steps (Strategy III)
  4. Update response parsing for multi-step output
  5. Enhance error handling for verification failures

**Estimated Complexity**: 🔴 **HIGH** (200+ lines of changes)

---

**File**: `app/lib/ai-service.js`
- **Function**: `generateVariationFromMistake()` (Lines 232-352)
- **Changes Required**:
  1. Apply same strategies to mistake-based generation
  2. Extract DNA from original mistake question
  3. Apply tag constraints

**Estimated Complexity**: 🟡 **MEDIUM** (100+ lines of changes)

---

#### **Priority 2: Configuration & Constants**

**File**: `app/lib/constants.js` OR **New File**: `app/lib/tag-constraints.js`
- **Changes Required**:
  1. Create `TAG_CONSTRAINTS` mapping object
  2. Define all tag-to-rule mappings
  3. Export for use in `ai-service.js`

**Estimated Complexity**: 🟢 **LOW** (50-100 lines)

---

**File**: `app/api/chat/route.ts`
- **Changes Required**:
  1. Use `CURRENT_MODEL_NAME` constant instead of hardcoded model
  2. Update model URL to `gemini-2.0-flash-exp` (or environment variable)
  3. Consider adding retry logic for rate limits (RPM 15 - same for both models)

**Estimated Complexity**: 🟡 **MEDIUM** (20-30 lines)

---

#### **Priority 3: Answer Validation (Conflict Resolution)**

**File**: `app/page.tsx`
- **Function**: `checkAnswer()` (Lines 561-608)
- **Changes Required**:
  1. Support multiple answer formats (remainder, decimal, fraction)
  2. Align with Seed DNA strategy (handle "6...3" vs "6餘3")
  3. Document validation logic

**Estimated Complexity**: 🟡 **MEDIUM** (30-50 lines)

---

### 4.2 Files Requiring Review (No Changes Expected)

**File**: `app/lib/rag-service.js`
- **Review**: Ensure seed question structure supports DNA extraction
- **Action**: Verify seed questions include answer format metadata

**File**: `app/lib/db-service.js`
- **Review**: Check if feedback system can store tag-based constraints
- **Action**: Verify `getActiveFeedback()` supports tag filtering

---

## 5. Implementation Readiness Summary

### Overall Readiness: 🔴 **NOT READY**

| Strategy | Readiness | Estimated Effort | Risk Level |
|----------|-----------|------------------|------------|
| Strategy I: Seed DNA | 🔴 Not Ready | High (3-5 days) | Medium |
| Strategy II: Tag Mapping | 🔴 Not Ready | Medium (2-3 days) | Low |
| Strategy III: COT Verification | 🔴 Not Ready | High (3-5 days) | High |

### Critical Blockers:

1. **No Seed DNA Analysis**: Must implement property extraction
2. **No Tag Mapping System**: Must create tag-to-constraint mapping
3. **Single-Step Output Only**: Must refactor for multi-step COT
4. **Answer Validation Mismatch**: Must align validation with Seed DNA

### Recommended Implementation Order:

1. **Phase 1**: Create tag mapping system (`tag-constraints.js`)
2. **Phase 2**: Implement Seed DNA analysis function
3. **Phase 3**: Modify prompt for Strategy I & II
4. **Phase 4**: Implement Strategy III (COT) with multi-step parsing
5. **Phase 5**: Update answer validation to support multiple formats
6. **Phase 6**: Update model configuration and retry logic

### Estimated Total Effort: **10-15 days**

---

## 6. Additional Recommendations

### 6.1 Model Selection Reconsideration

**⚠️ CORRECTION - Updated Information:**

**Current Actual Usage (Code):**
- **Model**: Gemini 1.5 Flash (`gemini-flash-latest`)
- **Rate Limits**: RPM 15, RPD 1,500 (free tier)

**Target Migration:**
- **Model**: Gemini 2.0 Flash (`gemini-2.0-flash-exp`)
- **Rate Limits (User Confirmed)**: 
  - **RPM**: 15 requests/minute ✅ (Same as 1.5 Flash)
  - **RPD**: 1,500 requests/day ✅ (Same as 1.5 Flash)

**Key Finding:**
- **Rate limits are IDENTICAL** for both 1.5 and 2.0 Flash (RPM 15, RPD 1,500)
- **No rate limit advantage** in staying on 1.5 Flash vs migrating to 2.0 Flash
- **Current code uses 1.5 Flash**, not 2.5-flash as user thought
- **User's RPM 5 errors**: Likely from a different source (different API endpoint, different model version, or account-specific quota)

**Recommendation**: 
- **Rate limits are identical** (RPM 15, RPD 1,500) for both models, so no rate limit advantage in either direction
- **Migration decision should be based on**: Model capabilities, stability, and reasoning quality
- **Enhanced prompts (Strategy I, II, III) are still recommended** for 2.0 Flash's potentially lower reasoning capability
- **Investigate RPM 5 errors**: May be from a different API endpoint or account configuration issue

---

### 6.2 Rate Limit Handling

**Current State**: Basic quota detection exists  
**Enhancement Needed**:
- Implement exponential backoff for RPM limits
- Queue system for batch generation (teacher paper creation)
- User-friendly error messages with retry suggestions

---

### 6.3 Testing Strategy

**Required Test Cases**:
1. Seed with remainder → Generated question must have remainder
2. Seed with decimal → Generated question must use decimals
3. Unknown category → Two-step pipeline must work
4. Verification failure → Must regenerate or fallback gracefully

---

## 7. Conclusion

The codebase is **NOT READY** for direct migration to gemini-2.0-flash with the proposed advanced prompt engineering strategies. Significant refactoring is required across multiple files, particularly:

1. **Core AI Service** (`ai-service.js`): Major refactoring needed
2. **Tag Mapping System**: New component required
3. **Prompt Structure**: Complete redesign for multi-step COT
4. **Answer Validation**: Alignment with Seed DNA strategy

**Recommendation**: 
- Implement strategies incrementally (Phase 1-6)
- Test each phase thoroughly before proceeding
- Consider testing on 1.5 Flash first (better rate limits)
- Allocate 2-3 weeks for full implementation and testing

---

**Report Generated**: 2024-12  
**Next Steps**: Review and approve implementation roadmap before code modifications begin.
