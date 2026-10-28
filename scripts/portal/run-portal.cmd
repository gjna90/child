@echo off
REM 유보통합포털 요강 수집 (Windows) - 작업 스케줄러에 등록해 두면 자동 실행
REM 처음 한 번: 이 저장소 폴더에서  npm i --no-save playwright  그리고  npx playwright install chromium
cd /d "%~dp0\..\.."
git pull --rebase origin stage1-api-extras
node scripts\portal\collect-portal.js --push %*
