# 🚪 Smart Door — 昊艺门窗管理系统

门窗制造行业全流程管理系统，涵盖订单、工序、财务、客户、材料公式等模块。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL 16 |
| ORM | Prisma |
| 缓存 | Redis 7 |
| 图片存储 | PostgreSQL `imageBlob` |
| 前端 | Vue 3 SPA (静态部署) |
| 反向代理 | Nginx |
| 部署 | Docker Compose |

## 项目结构

```
door/
├── frontend/              # 前端静态文件 (Vue SPA)
└── server/
    ├── src/
    │   ├── modules/
    │   │   ├── auth/       # 认证模块 (JWT)
    │   │   ├── client/     # 客户管理
    │   │   ├── order/      # 订单管理
    │   │   ├── progress/   # 工序进度跟踪
    │   │   ├── finance/    # 财务管理 (收付款/余额/流水)
    │   │   ├── formula/    # 材料公式
    │   │   ├── settings/   # 系统设置
    │   │   ├── file/       # 文件管理 (数据库图片存储)
    │   │   ├── scanner/    # 扫码枪
    │   │   └── shortlink/  # 短链接
    │   ├── middleware/      # 认证/错误/响应中间件
    │   ├── database/       # Prisma 客户端
    │   ├── redis/          # Redis 客户端
    │   └── utils/          # 工具函数 (JWT/加密/序列化)
    ├── prisma/             # Schema + 迁移文件
    ├── docker/             # Dockerfile + Nginx 配置
    ├── scripts/            # 部署脚本 + 数据库初始化
    └── certs/              # SSL 证书
```

## 快速部署

### 前置要求

- Docker & Docker Compose
- 域名 + SSL 证书（可选）

### 1. 获取代码

```bash
git clone https://github.com/lu2009/door.git
cd door/server
```

### 2. 修改配置

编辑 `.env`，替换 JWT 密钥：

```bash
sed -i "s/change-me-to-a-random-string/$(openssl rand -hex 32)/" .env
```

### 3. 启动

```bash
docker compose up -d
```

服务启动后：
- 前端页面：`http://服务器IP`
- 健康检查：`http://服务器IP/healthz`

### 4. 一键部署脚本

```bash
bash scripts/deploy.sh
```

## 服务架构

```
浏览器 ──→ Nginx (:80/443) ──→ 前端静态文件
                    │
                    └──→ Backend (:5000) ──→ PostgreSQL (:5432)
                                     └──→ Redis (:6379)
```

## 默认账户

部署后通过 seed 自动创建，详见 `scripts/init-db.sql`。

## API 概览

所有接口前缀 `/api/v1`：

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/v1/auth` | 登录/登出/修改密码 |
| 客户 | `/api/v1/clients` | 客户 CRUD |
| 订单 | `/api/v1/orders` | 订单管理 |
| 进度 | `/api/v1/progress` | 工序跟踪 |
| 财务 | `/api/v1/finance` | 收付款/余额/流水 |
| 公式 | `/api/v1/formulas` | 材料公式 |
| 设置 | `/api/v1/settings` | 系统配置 |
| 文件 | `/api/v1/files` | 文件上传 |
| 扫码 | `/api/v1/scanner` | 扫码枪 |
| 短链接 | `/api/v1/shortlink` | 短链接管理 |

健康检查：
- `GET /healthz` — 存活检查
- `GET /readyz` — 就绪检查 (含数据库连通性)

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f backend

# 重启后端
docker compose restart backend

# 水平扩展
docker compose up -d --scale backend=3

# 运行数据库迁移
docker compose exec backend npx prisma migrate deploy

# 备份数据库
docker compose exec postgres pg_dump -U smartdoor smartdoor > backup.sql
```
