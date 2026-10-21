#!/bin/sh
# LZMail 前端全量 UI 功能自测
#   ./run.sh                              # 自动拉起本地后端 + 静态服务 + Chrome
#   E2E_URL=https://x.example ./run.sh    # 直接测已在运行的站点
#   E2E_REBUILD=1 ./run.sh                # 强制重新编译后端
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules/puppeteer-core ]; then
  npm install --no-audit --no-fund
fi
node run.mjs "$@"
