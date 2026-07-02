# 环境配置说明

## 环境变量

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| `NODE_ENV` | 运行环境（development / production） | `development` | 否 |
| `PORT` | HTTP 服务端口 | `5000` | 否 |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://smartdoor:smartdoor123@db:5432/smartdoor` | 是 |
| `REDIS_URL` | Redis 连接字符串 | `redis://redis:6379/0` | 是 |
| `JWT_SECRET` | JWT 签名密钥（生产环境必须设置为强随机字符串） | — | **是** |
| `JWT_EXPIRATION_HOURS` | JWT Token 过期时间（小时） | `24` | 否 |
| `CORS_ORIGINS` | CORS 允许的域名（逗号分隔，`*` 为全部允许） | `*` | 否 |
| `MINIO_ENDPOINT` | MinIO 服务地址 | `minio:9000` | 是 |
| `MINIO_ACCESS_KEY` | MinIO 访问密钥 | `smartdoor` | 是 |
| `MINIO_SECRET_KEY` | MinIO 密钥 | `smartdoor123` | 是 |
| `MINIO_BUCKET` | MinIO 存储桶名称 | `smartdoor` | 否 |
| `MINIO_SECURE` | MinIO 是否启用 HTTPS | `false` | 否 |
| `SHORT_LINK_BASE_URL` | 短链接基础 URL | `/s` | 否 |
| `UPLOAD_FOLDER` | 上传文件临时目录 | `./uploads` | 否 |
| `TEMPLATE_FOLDER` | 模板文件目录 | `./templates` | 否 |
| `UPDATE_INFO_FOLDER` | 更新信息目录 | `./updates` | 否 |
| `FRONTEND_DIST_FOLDER` | 前端编译产物目录 | `./frontend` | 否 |
| `LOG_LEVEL` | 日志级别（error / warn / info / debug） | `info` | 否 |

## 配置文件

所有环境变量通过 `.env` 文件加载。项目根目录的示例配置：

### `.env` 示例

```bash
# 运行环境
NODE_ENV=development
PORT=5000

# 数据库
DATABASE_URL=postgresql://smartdoor:smartdoor123@db:5432/smartdoor

# Redis
REDIS_URL=redis://redis:6379/0

# JWT（生产环境必须替换）
JWT_SECRET=your-strong-jwt-secret-here
JWT_EXPIRATION_HOURS=24

# CORS
CORS_ORIGINS=*

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=smartdoor
MINIO_SECRET_KEY=smartdoor123
MINIO_BUCKET=smartdoor
MINIO_SECURE=false

# 日志
LOG_LEVEL=info
```

## 本地开发

### 前置要求

- Node.js 20+
- npm 10+
- Docker Desktop（用于运行 PostgreSQL / Redis / MinIO）
- TypeScript 5.7+
- Prisma CLI

### 快速启动

```bash
# 1. 进入项目目录
cd server

# 2. 安装依赖
npm install

# 3. 生成 Prisma Client
npx prisma generate

# 4. 启动基础设施（数据库 + Redis + MinIO）
#（需要 docker-compose.yml 在上级目录或 server 目录）
docker compose up -d postgres redis minio

# 5. 运行数据库迁移
npx prisma migrate dev

# 6. 启动开发服务器（支持热重载）
npm run dev
```

### 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（tsx watch，热重载） |
| `npm run build` | TypeScript 编译 + Prisma Client 生成 |
| `npm start` | 启动生产服务器 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 推送 schema 变更到数据库 |
| `npm run db:migrate` | 创建新的数据库迁移 |
| `npm run db:migrate:prod` | 在生产环境执行迁移 |
| `npm run db:seed` | 运行数据库种子脚本 |

### 开发工作流

```bash
# 1. 修改 Prisma Schema
# 编辑 prisma/schema.prisma

# 2. 生成迁移
npx prisma migrate dev --name describe_change

# 3. 生成 Prisma Client
npx prisma generate

# 4. 修改功能代码
# TypeScript 文件热重载自动生效

# 5. 验证
curl http://localhost:5000/healthz
```

## 生产部署

### Docker 部署

#### 一键部署

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 手动部署

```bash
# 1. 构建 TypeScript
npm run build

# 2. 启动服务（Docker Compose）
docker compose up -d --build --scale backend=3

# 3. 执行数据库迁移
docker compose exec backend npx prisma migrate deploy

# 4. 验证部署
curl http://localhost/healthz
curl http://localhost/readyz
```

#### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

### 水平扩展

```bash
# 扩展到 5 个后端实例
docker compose up -d --scale backend=5

# Nginx 自动负载均衡（least_conn 策略）
```

### Nginx 配置参考

```nginx
upstream backend {
    least_conn;
    server backend:5000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 60M;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /s/ {
        proxy_pass http://backend;
    }

    location /healthz {
        proxy_pass http://backend;
    }

    location /readyz {
        proxy_pass http://backend;
    }
}
```

### Docker Compose 参考

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: smartdoor
      POSTGRES_USER: smartdoor
      POSTGRES_PASSWORD: smartdoor123
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: smartdoor
      MINIO_ROOT_PASSWORD: smartdoor123
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  backend:
    build: ./server
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://smartdoor:smartdoor123@postgres:5432/smartdoor
      REDIS_URL: redis://redis:6379/0
      JWT_SECRET: ${JWT_SECRET}
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: smartdoor
      MINIO_SECRET_KEY: smartdoor123

  nginx:
    image: nginx:1.27-alpine
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
  minio_data:
```

## 数据库管理

### 备份

```bash
#!/bin/bash
# scripts/backup.sh
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份 PostgreSQL
docker compose exec -T postgres pg_dump -U smartdoor smartdoor \
  | gzip > $BACKUP_DIR/smartdoor_$TIMESTAMP.sql.gz

# 备份 MinIO 文件
docker compose exec -T minio mc mirror /data $BACKUP_DIR/minio_$TIMESTAMP/

echo "Backup complete: $BACKUP_DIR/smartdoor_$TIMESTAMP.sql.gz"
```

### 恢复

```bash
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U smartdoor smartdoor
```

### 迁移

```bash
# 开发环境
npx prisma migrate dev --name migration_name

# 生产环境
npx prisma migrate deploy
```

## 验证

### 健康检查端点

```bash
# 基础健康检查（不依赖数据库）
curl http://localhost:5000/healthz
# → { "status": "ok" }

# 就绪检查（检查数据库连接）
curl http://localhost:5000/readyz
# → { "status": "ready", "db": "ok" }
```

### 测试 API

```bash
# 登录
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 获取客户列表
curl http://localhost:5000/api/v1/clients?ds=smartdoor \
  -H "Authorization: Bearer <token>"

# 订单列表
curl "http://localhost:5000/api/v1/orders?ds=smartdoor&page=1&perPage=20" \
  -H "Authorization: Bearer <token>"
```

## 监控

### 健康检查

- `/healthz` — 基础存活检查（始终返回 200）
- `/readyz` — 就绪检查（检查数据库连接）
- 建议配置 Prometheus + Grafana 监控

### 指标

推荐监控以下指标：

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| API 响应时间 (p99) | 请求处理延迟 | > 5s |
| 数据库连接数 | PostgreSQL 活跃连接 | > 池大小 80% |
| Redis 内存 | 缓存使用量 | > 1GB |
| MinIO 磁盘 | 文件存储使用 | > 磁盘 85% |
| HTTP 5xx 错误率 | 服务端错误比例 | > 1% |
