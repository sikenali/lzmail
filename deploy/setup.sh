#!/bin/bash
set -e

DOMAIN="lzmail.10012049.xyz"
BINARY="lzmail-server"

echo "=== 1. 创建目录 ==="
mkdir -p /opt/lzmail/data /opt/lzmail/archives

echo "=== 2. 复制二进制 ==="
cp "$BINARY" /opt/lzmail/lzmail-server
chmod +x /opt/lzmail/lzmail-server

echo "=== 3. 安装 systemd 服务 ==="
cp lzmail.service /etc/systemd/system/lzmail.service
systemctl daemon-reload
systemctl enable lzmail
systemctl restart lzmail

echo "=== 4. 安装 Nginx 反代 ==="
apt-get install -y nginx

cat > /etc/nginx/sites-available/lzmail <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 前端静态文件（可选，如果前端也部署在 VPS 上）
    root /opt/lzmail/frontend;
    index index.html;

    # API 反代到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400s;
    }

    # SSE 事件流
    location /api/v1/events {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 86400s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lzmail /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "=== 5. 安装 SSL 证书 ==="
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m admin@$DOMAIN || echo "SSL 安装失败，请手动执行: certbot --nginx -d $DOMAIN"

echo "=== 部署完成 ==="
echo "后端: https://$DOMAIN/api/v1/health"
echo "前端: 需要设置 Vercel 环境变量 NEXT_PUBLIC_API_URL=https://$DOMAIN"