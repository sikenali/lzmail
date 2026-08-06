# 多阶段构建 Dockerfile for LZMail
# 单容器运行 前端(Next.js standalone) + 后端(Go)

ARG GO_BASE_IMAGE=golang:1.25-alpine
ARG NODE_BASE_IMAGE=node:20-alpine

# ── 阶段 1: 构建后端 Go 应用 ─────────────────────────────
FROM ${GO_BASE_IMAGE} AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/lzmail ./cmd/lzmail/

# ── 阶段 2: 构建前端 Next.js standalone 产物 ─────────────
FROM ${NODE_BASE_IMAGE} AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./

# 前端访问后端 API 的地址（构建时内联到客户端代码）
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NODE_ENV=production
RUN npm run build

# ── 阶段 3: 运行镜像（前后端同容器） ─────────────────────
FROM ${NODE_BASE_IMAGE}
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
WORKDIR /app

# 后端可执行文件
COPY --from=backend-builder /out/lzmail /app/backend/lzmail

# 前端 standalone 产物
COPY --from=frontend-builder /app/frontend/.next/standalone/frontend /app/frontend
COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static
COPY --from=frontend-builder /app/frontend/public /app/frontend/public

# 启动脚本：先后端(:8080)后前端(:3000)，任一进程退出则容器退出，
# 交由 restart 策略自动拉起
RUN cat > /app/start.sh << 'EOF' && chmod +x /app/start.sh
#!/bin/sh
set -e

mkdir -p /app/data /app/archives
chmod -R 777 /app/data || true
chmod +x /app/backend/lzmail

# 启动后端
PORT=$BACKEND_PORT DATA_DIR=/app/data ARCHIVE_DIR=/app/archives \
  /app/backend/lzmail &
BACKEND_PID=$!

# 启动前端
cd /app/frontend
PORT=$FRONTEND_PORT HOSTNAME=0.0.0.0 node server.js &
FRONTEND_PID=$!

# 任一进程退出则结束容器
while kill -0 $BACKEND_PID 2>/dev/null && kill -0 $FRONTEND_PID 2>/dev/null; do
  sleep 2
done
exit 1
EOF

ENV BACKEND_PORT=8080
ENV FRONTEND_PORT=3000
ENV STORAGE_LIMIT_GB=50

EXPOSE 3000 8080
VOLUME ["/app/data", "/app/archives"]
CMD ["/app/start.sh"]
