# GitHub 設置指南（簡單版）

## 🤔 什麼是「推送到 GitHub」？

**簡單理解：**
- **GitHub** = 一個在線代碼倉庫（像 Google Drive，但專門存代碼）
- **推送（Push）** = 把您電腦上的代碼上傳到 GitHub

**為什麼需要？**
- Vercel 需要從 GitHub 讀取您的代碼來部署
- 就像您需要先把文件上傳到雲端，才能讓別人下載

---

## 📋 兩種情況

### 情況 A：您已經有 GitHub 倉庫（之前同步過）

如果您之前已經把代碼同步到 GitHub，只需要：

1. **檢查是否有未保存的變更**
2. **如果有，提交並推送**

### 情況 B：您還沒有 GitHub 倉庫（第一次設置）

需要：
1. 在 GitHub 創建新倉庫
2. 把代碼上傳到 GitHub

---

## 🚀 方法 1：使用 GitHub Desktop（最簡單，推薦）

### 步驟 1：下載 GitHub Desktop
1. 前往：https://desktop.github.com
2. 下載並安裝 GitHub Desktop
3. 登入您的 GitHub 帳號

### 步驟 2：添加現有專案
1. 打開 GitHub Desktop
2. 點擊 **File** → **Add Local Repository**
3. 選擇您的專案資料夾：`c:\ai totur\github-i6bytsfz`
4. 如果提示「這不是一個 Git 倉庫」，點擊 **Create a Repository**

### 步驟 3：提交代碼
1. 在左側會看到所有變更的文件
2. 在底部輸入提交訊息（例如：「準備部署到 Vercel」）
3. 點擊 **Commit to main**

### 步驟 4：推送到 GitHub
1. 如果還沒有連接到 GitHub 倉庫：
   - 點擊 **Publish repository**
   - 輸入倉庫名稱（例如：`tutoring-app`）
   - 選擇是否公開（Private 或 Public）
   - 點擊 **Publish Repository**

2. 如果已經連接：
   - 點擊 **Push origin** 按鈕

**完成！** 您的代碼現在已經在 GitHub 上了。

---

## 💻 方法 2：使用命令列（適合熟悉命令的用戶）

### 步驟 1：檢查是否已有 Git 倉庫
```bash
cd "c:\ai totur\github-i6bytsfz"
git status
```

**如果顯示「not a git repository」**，需要初始化：
```bash
git init
git add .
git commit -m "初始提交"
```

### 步驟 2：在 GitHub 創建新倉庫
1. 前往 https://github.com
2. 點擊右上角 **+** → **New repository**
3. 輸入倉庫名稱（例如：`tutoring-app`）
4. 選擇 **Private** 或 **Public**
5. **不要**勾選「Initialize this repository with a README」
6. 點擊 **Create repository**

### 步驟 3：連接並推送
GitHub 會顯示命令，類似這樣：
```bash
git remote add origin https://github.com/您的用戶名/tutoring-app.git
git branch -M main
git push -u origin main
```

複製這些命令到終端執行即可。

---

## ✅ 如何確認已成功推送？

### 方法 1：在 GitHub 網站查看
1. 前往 https://github.com
2. 找到您的倉庫
3. 應該能看到所有文件（`app/`, `docs/`, `package.json` 等）

### 方法 2：在 GitHub Desktop 查看
- 應該顯示「No local changes」或「Everything up to date」

### 方法 3：使用命令列
```bash
git status
```
應該顯示：
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

---

## 🎯 快速檢查清單

在部署到 Vercel 之前，確認：
- [ ] 已安裝 GitHub Desktop 或已設置 Git
- [ ] 已在 GitHub 創建倉庫
- [ ] 已把所有代碼推送到 GitHub
- [ ] 在 GitHub 網站能看到所有文件

---

## ❓ 常見問題

### Q1: 我沒有 GitHub 帳號怎麼辦？
**A:** 
1. 前往 https://github.com
2. 點擊 **Sign up**
3. 創建免費帳號（完全免費）

### Q2: 一定要用 GitHub 嗎？
**A:** 
- Vercel 也支持 GitLab 和 Bitbucket
- 但 GitHub 最常用，也最簡單

### Q3: 代碼會公開嗎？
**A:** 
- 可以選擇 **Private**（私有，只有您能看到）
- 或 **Public**（公開，所有人都能看到）
- Vercel 兩種都支持

### Q4: 推送後可以修改嗎？
**A:** 
- 可以！隨時可以修改代碼並再次推送
- Vercel 會自動重新部署

---

## 💡 推薦流程

1. **第一次設置**：使用 GitHub Desktop（最簡單）
2. **之後更新代碼**：
   - 修改代碼
   - 在 GitHub Desktop 提交並推送
   - Vercel 會自動部署新版本

---

**需要幫助？** 告訴我您現在的情況：
- 您有 GitHub 帳號嗎？
- 您之前同步過代碼到 GitHub 嗎？
- 您想用哪種方法（GitHub Desktop 或命令列）？
