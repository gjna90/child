#!/bin/sh
# 유보통합포털 요강 수집 (Mac) — cron 또는 수동 실행
# 처음 한 번: npm i --no-save playwright && npx playwright install chromium
cd "$(dirname "$0")/../.." || exit 1
git pull --rebase origin stage1-api-extras
node scripts/portal/collect-portal.js --push "$@"
