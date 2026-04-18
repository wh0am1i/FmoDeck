# syntax=docker/dockerfile:1.7

# =============================================================
# 可调参数（直接改这里；改完 docker build 即生效）
# -------------------------------------------------------------
# BASE_PATH       静态资源部署路径，根域用 "/"，子路径用 "/fmodeck/"
# LISTEN_PORT     容器内 nginx 监听端口；宿主机映射端口另行在
#                 docker-compose.yml 或 `docker run -p` 指定
# VITE_AMAP_KEY   高德 Web 服务 key（可选）；没配则 fallback 到
#                 BigDataCloud 免 key 方案
# =============================================================
ARG BASE_PATH=/
ARG LISTEN_PORT=80
ARG VITE_AMAP_KEY=
ARG NODE_VERSION=20
ARG NGINX_VERSION=1.27

# -------------------------------------------------------------
# Stage 1: 构建静态资源
# -------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

ARG BASE_PATH
ARG VITE_AMAP_KEY
# Vite 在 build 阶段会把 import.meta.env.VITE_* 内联进产物 JS，
# 所以必须在 RUN 命令里把它放进 env
RUN VITE_AMAP_KEY="${VITE_AMAP_KEY}" pnpm exec vite build --base="${BASE_PATH}"

# -------------------------------------------------------------
# Stage 2: nginx 托管静态文件
# -------------------------------------------------------------
FROM nginx:${NGINX_VERSION}-alpine AS runtime

ARG LISTEN_PORT
ENV LISTEN_PORT=${LISTEN_PORT}

# nginx:alpine 会对 /etc/nginx/templates/*.template 执行 envsubst
# 并输出到 /etc/nginx/conf.d/，从而把 ${LISTEN_PORT} 注入配置。
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE ${LISTEN_PORT}

# 使用官方镜像默认 entrypoint（会跑 envsubst 再启动 nginx）
