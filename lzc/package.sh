#!/bin/bash
# 本地打包脚本：构建 contentdir → 生成 LPK → 重命名为版本化文件名
set -euo pipefail

# 版本号：优先使用 LPK_VERSION 环境变量，其次从 git tag 获取
LPK_TAG="${LPK_VERSION:-}"
LPK_TAG="${LPK_TAG#v}"
if [ -z "$LPK_TAG" ]; then
  LPK_TAG=$(git -C "$(dirname "$0")/.." describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "0.0.0")
fi
export LPK_VERSION="$LPK_TAG"
echo "Packaging version: $LPK_VERSION"

# 1. 运行 build.sh（build.sh 读取 LPK_VERSION 环境变量）
bash "$(dirname "$0")/build.sh"

# 2. 调用 lzc-cli 生成 LPK
CLI_BIN="/tmp/package/scripts/cli.js"
if [ -f "/usr/local/lib/node_modules/@lazycatcloud/lzc-cli/scripts/cli.js" ]; then
  CLI_BIN="/usr/local/lib/node_modules/@lazycatcloud/lzc-cli/scripts/cli.js"
fi
$CLI_BIN project release -o output.lpk

# 3. 重命名
LPK_NAME="cloud.lazycat.app.lzmail-${LPK_VERSION}.lpk"
if [ -f output.lpk ]; then
  mv output.lpk "$LPK_NAME"
  echo "Done: $LPK_NAME"
fi
