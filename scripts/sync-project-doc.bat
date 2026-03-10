@echo off
setlocal
chcp 65001 >nul

set "SRC1=C:\ai totur\github-i6bytsfz\docs\PROJECT_FUNCTIONS_ARCH_TODO.md"
set "SRC2=C:\ai totur\github-i6bytsfz\docs\SESSION_LOG_2024.md"
set "DEST_DIR=G:\我的雲端硬碟\ai tutor-todolist"
set "DEST1=%DEST_DIR%\PROJECT_FUNCTIONS_ARCH_TODO.md"
set "DEST2=%DEST_DIR%\SESSION_LOG_2024.md"

echo.
echo [Sync Docs] Start...

if not exist "%SRC1%" (
  echo Source not found: %SRC1%
  pause
  exit /b 1
)

if not exist "%SRC2%" (
  echo Source not found: %SRC2%
  pause
  exit /b 1
)

if not exist "%DEST_DIR%" (
  echo TargetDir not found: %DEST_DIR%
  pause
  exit /b 1
)

copy /Y "%SRC1%" "%DEST1%" >nul
if errorlevel 1 (
  echo Sync failed: PROJECT_FUNCTIONS_ARCH_TODO.md
  pause
  exit /b 1
)

copy /Y "%SRC2%" "%DEST2%" >nul
if errorlevel 1 (
  echo Sync failed: SESSION_LOG_2024.md
  pause
  exit /b 1
)

echo.
echo ✅ 同步成功
echo - %DEST1%
echo - %DEST2%
echo.
pause
exit /b 0
