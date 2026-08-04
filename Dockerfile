FROM golang:1.25-alpine AS backend
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o lzmail ./cmd/lzmail/

FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend ./
RUN npm run build

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend /app/lzmail /lzmail
COPY --from=frontend /app/frontend/.next /app/.next
COPY --from=frontend /app/frontend/node_modules /app/node_modules
COPY --from=frontend /app/frontend/package.json /app/
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 8080
CMD ["/lzmail"]
