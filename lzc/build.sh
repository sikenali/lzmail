#!/bin/sh
set -e

# 脚本所在目录（lzc/）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# 项目根目录
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 版本号：优先使用 LPK_VERSION 环境变量（自动剥离 v 前缀），其次从 git tag 提取，最后回退 0.0.0
LPK_TAG="${LPK_VERSION:-}"
LPK_TAG="${LPK_TAG#v}"
VERSION="${LPK_TAG:-$(cd "$PROJECT_ROOT" && git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || true)}"
VERSION="${VERSION:-0.0.0}"
echo "Building version: $VERSION"

# 动态写入 package.yml
cat > "$SCRIPT_DIR/package.yml" <<PKGEOF
package: cloud.lazycat.app.lzmail
version: ${VERSION}
name: 懒猫微邮
description: 自托管多账号聚合 IMAP 邮件客户端，支持 Gmail/Outlook/QQ/网易/iCloud 等
author: sikenali
license: MIT
homepage: https://github.com/sikenali/lzmail
min_os_version: 1.5.0
unsupported_platforms:
  - ios
locales:
  zh-CN:
    name: 懒猫微邮
    description: 自托管多账号聚合 IMAP 邮件客户端
  en:
    name: LZMail
    description: Self-hosted multi-account IMAP email client
permissions:
  required:
    - net.internet
PKGEOF

# 清理旧产物，避免残留 node_modules/node 等
rm -rf "$SCRIPT_DIR/_lpk_content"
mkdir -p "$SCRIPT_DIR/_lpk_content/backend"
(cd "$PROJECT_ROOT/backend" && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o "$SCRIPT_DIR/_lpk_content/backend/lzmail" ./cmd/lzmail/)


# 重新构建前端（Next.js 静态导出）：每次先清空 out，确保产物最新
echo "Building frontend..."
rm -rf "$PROJECT_ROOT/frontend/out"
(
  cd "$PROJECT_ROOT/frontend" && npm run build
)
if [ ! -f "$PROJECT_ROOT/frontend/out/index.html" ]; then
  echo "ERROR: frontend build failed, out/index.html missing"
  exit 1
fi

# 复制前端产物
mkdir -p "$SCRIPT_DIR/_lpk_content/frontend"
cp -a "$PROJECT_ROOT/frontend/out/." "$SCRIPT_DIR/_lpk_content/frontend/"

# 写入版本文件，供前端 "关于" 页面动态读取
echo "{\"version\":\"${VERSION}\"}" > "$SCRIPT_DIR/_lpk_content/frontend/version.json"

# lzcinit 静态服务把无扩展名路径 fallback 到 index.html。
# 保留原 .html 文件（直接访问 /mail.html 仍可用），同时生成目录形式
# xxx/index.html 供 lzcinit 目录索引使用（部分版本支持）。
(
  cd "$SCRIPT_DIR/_lpk_content/frontend"
  for f in *.html; do
    case "$f" in
      index.html|404.html) continue ;;
    esac
    name="${f%.html}"
    if [ -n "$name" ]; then
      mkdir -p "$name"
      cp "$f" "$name/index.html"
    fi
  done
)

# 创建启动脚本
mkdir -p "$SCRIPT_DIR/_lpk_content/scripts"
cat > "$SCRIPT_DIR/_lpk_content/scripts/start.sh" << 'STARTSCRIPT'
#!/bin/sh
set -e

# 使用持久化卷路径（DATA_DIR 下的 archives 子目录，与 lzc-manifest.yml 一致）
mkdir -p /lzcapp/var/data/archives /app/logs
chmod -R 777 /lzcapp/var/data || true

# 启动后端，归档目录自动使用 DATA_DIR/archives（持久化存储）
PORT=$BACKEND_PORT DATA_DIR=/lzcapp/var/data \
  /lzcapp/pkg/content/backend/lzmail >>/app/logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端就绪（最多60秒）
for i in $(seq 1 30); do
  sleep 2
  if wget -qO- http://127.0.0.1:$BACKEND_PORT/api/v1/health >/dev/null 2>&1; then
    echo "backend healthy after ${i}x2s"
    break
  fi
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "backend exited with code $?, logs:"
    cat /app/logs/backend.log
    exit 1
  fi
done

# 启动前端
# 前端由 lzcinit 静态服务，无需额外启动
# 任一进程退出则结束容器
while kill -0 $BACKEND_PID 2>/dev/null; do
  sleep 2
done

echo "container stopped: backend=$BACKEND_PID"
echo "=== backend log ==="
cat /app/logs/backend.log
exit 0
STARTSCRIPT
chmod +x "$SCRIPT_DIR/_lpk_content/scripts/start.sh"
