# Session Log: Firebase and API Key Debugging (April 12, 2026)

## Conversation Summary with Antigravity AI
During this session, we accomplished the following debugging and environment configuration tasks:

1. **Firebase Authentication Rejection Analysis**:
   - Encountered `(連線錯誤) 註冊失敗 請稍後再試` when attempting to register as an admin user.
   - Identified the root cause as `auth/admin-restricted-operation` originating from the live Firebase Project (`tutoring-classes-18476`).
   - Concluded that the Firebase project administrator explicitly blocked new account sign-ups on the server level, meaning client-side registration cannot proceed without developer whitelisting or switching to a new Firebase instance.

2. **Google Gemini API Configuration**:
   - Encountered `API Key not configured` error modal in the application UI preventing math question generation.
   - Discovered that the `.env.local` file was missing from the local directory.
   - Created a new `.env.local` file containing the `GOOGLE_GEMINI_API_KEY` placeholder.
   - Diagnosed an `INVALID_ARGUMENT (400)` error when the server attempted to read the literal string "your_actual_api_key_here".
   - The user successfully pasted a valid `AIzaSy...` key, saved the file, and we successfully manually restarted the Next.js development server to detect and load it.

3. **Knowledge Transfer:**
   - Explained how Firebase billing works strictly by operations (reads/writes) rather than character tokens (like Gemini).
   - Detailed the step-by-step logic of the AI question generator in `ai-service.js` (including its 3-question background pre-loading cache to mask the 5-7 second Gemini API latency).
   - Discussed strategies for using Git alongside Google Drive to manage codebase states across multiple PCs without thrashing `node_modules`.

## Files Modified
* Added `.env.local` to successfully mount local secret keys.
* Updated `SESSION_LOG_APR_2026.md` to persist this conversation.
