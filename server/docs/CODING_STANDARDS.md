# Smart Door 后端编码规范

## 1. 项目架构

### 1.1 分层架构

```
┌─────────────────────────────────────┐
│           HTTP Router               │  ← Express Router（路由 + 参数验证）
├─────────────────────────────────────┤
│         Controller / Handler        │  ← 请求处理（数据提取、响应格式化）
├─────────────────────────────────────┤
│           Service Layer             │  ← 业务逻辑（事务管理、领域规则）
├─────────────────────────────────────┤
│          Repository Layer           │  ← 数据访问（Prisma ORM 封装）
├─────────────────────────────────────┤
│            Database                 │  ← PostgreSQL
└─────────────────────────────────────┘
```

### 1.2 模块职责

每个模块只做一件事：

| 模块 | 职责 | 主要文件 |
|------|------|----------|
| **auth** | 身份认证、密码管理、用户配置 | `modules/auth/*` |
| **client** | 客户信息 CRUD、开单 | `modules/client/*` |
| **order** | 订单管理、合并、详情 | `modules/order/*` |
| **progress** | 生产进度追踪 | `modules/progress/*` |
| **finance** | 财务收款、对账、预付款 | `modules/finance/*` |
| **formula** | 物料公式管理 | `modules/formula/*` |
| **settings** | 系统配置、加价项目、玻璃孔位 | `modules/settings/*` |
| **file** | 图片上传/下载、模板 | `modules/file/*` |
| **scanner** | 扫码设备管理 | `modules/scanner/*` |
| **shortlink** | 短链接服务 | `modules/shortlink/*` |

### 1.3 模块可替换性

每个模块通过 Repository Interface 解耦：

- 模块间仅通过 Service 方法调用，不直接访问数据库
- Repository Interface 定义数据访问契约
- 替换实现只需实现对应接口（如：PrismaRepository → MockRepository）
- 接口定义在 `modules/repository.interface.ts`

```typescript
// 示例：auth.repository.ts 实现 IAuthRepository
export interface IAuthRepository {
  findByUsername(username: string): Promise<Record<string, unknown> | null>;
  findByDatabaseName(ds: string): Promise<Record<string, unknown> | null>;
  updateLoginDate(userId: number): Promise<void>;
  updatePassword(userId: number, hash: string): Promise<void>;
  getSettings(ds: string): Promise<Record<string, unknown>[]>;
  getProcedures(ds: string): Promise<Record<string, unknown>[]>;
  getTemplates(ds: string): Promise<Record<string, unknown>[]>;
  getUpdateInfo(ds: string): Promise<Record<string, unknown> | null>;
}
```

### 1.4 模块依赖关系

```
auth ──→ client ──→ order ──→ progress
  │                    │
  └──── settings ──────┤
                       │
                  finance ──→ order

formula (独立)
file (独立)
scanner → settings
shortlink (独立)
```

## 2. 文件命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 路由文件 | `*.routes.ts` | `auth.routes.ts` |
| 服务文件 | `*.service.ts` | `auth.service.ts` |
| 仓库接口文件 | `*.interface.ts` | `repository.interface.ts` |
| 类型文件 | `*.types.ts` | — |
| 配置文件 | `index.ts` (在 config 目录) | `config/index.ts` |
| 中间件 | 功能命名 | `auth.ts`, `error.ts`, `response.ts` |
| 工具函数 | 功能命名 | `jwt.ts`, `crypto.ts`, `helpers.ts` |

路由文件使用 kebab-case（连字符分隔）：`shortlink.routes.ts`。

## 3. 代码风格

### 3.1 TypeScript 配置

- 使用 TypeScript strict 模式
- 严格类型检查启用
- 不使用 `any` 类型（除非必要场景使用 `@ts-expect-error`）
- 使用 ES2022 模块系统

### 3.2 函数定义

- 使用 `export async function` 导出，不使用箭头函数导出
- 路由处理函数签名：`async (req, res, next) => { ... }`
- 服务层函数使用 `export async function` 声明

```typescript
// 正确
export async function login(username: string, password: string) { ... }

// 错误
export const login = async (username: string, password: string) => { ... }
```

### 3.3 命名约定

| 类别 | 规则 | 示例 |
|------|------|------|
| 接口 | `I` 前缀 + PascalCase | `IAuthRepository`, `IClientRepository` |
| 类型 | PascalCase | `AuthRequest`, `ApiResponse`, `OrderStatus` |
| 变量/函数 | camelCase | `getUserConfig`, `databaseName` |
| 常量 | UPPER_SNAKE_CASE | `SALT_ROUNDS`, `BASE_URL` |
| 枚举成员 | PascalCase | — |
| 文件名 | kebab-case | `auth.routes.ts`, `shortlink.service.ts` |
| 类名 | PascalCase | `AppError` |

### 3.4 导入顺序

文件内顶部导入，按顺序分组（每组间空一行）：

```typescript
// 1. 内置模块
import crypto from 'crypto';

// 2. 第三方模块
import express from 'express';
import jwt from 'jsonwebtoken';

// 3. 内部模块（相对路径）
import { AuthRequest } from '../../types';
import { requireAuth } from '../../middleware/auth';
import * as authService from './auth.service';
```

### 3.5 格式化

- 缩进：2 空格
- 引号：单引号
- 行尾：无分号
- 行长度：不超过 120 字符
- 逗号：多行末尾加逗号

## 4. 错误处理

### 4.1 错误层次

| 层次 | 错误处理方式 | 说明 |
|------|-------------|------|
| **路由层** | try-catch 后调用 `next(err)` 或直接使用 `ok/fail` 响应 | 捕获异常，格式化响应 |
| **服务层** | 抛出 `AppError` 或标准 Error，不直接返回 HTTP 响应 | 业务规则校验失败时抛出 |
| **仓库层** | 不处理业务错误，仅处理数据库异常 | 数据库连接、唯一约束等 |

### 4.2 AppError 类

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 4.3 响应格式

```typescript
// 成功
{ code: 200, data: { ... }, message?: '操作成功' }

// 失败
{ code: 400, message: '参数错误' }

// 未授权
{ code: 401, message: '未授权' }

// 未找到
{ code: 404, message: '资源不存在' }

// 服务器错误
{ code: 500, message: '服务器内部错误' }
```

### 4.4 服务层错误示例

```typescript
// 在服务层中抛出错误
export async function login(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw Object.assign(new Error('用户名或密码错误'), { statusCode: 401 });
  }
}

// 在路由中处理
authRouter.post('/login', async (req, res, next) => {
  try {
    const result = await authService.login(username, password);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode) {
      fail(res, e.message, e.statusCode, e.statusCode);
      return;
    }
    next(err);
  }
});
```

## 5. 事务管理

- 涉及多表操作必须使用 Prisma 事务 `prisma.$transaction()`
- 财务相关操作必须使用事务保证数据一致性
- 避免长事务，单次请求事务不超过 5 秒

### 5.1 事务使用示例

```typescript
// 批量删除账号数据
export async function clearAccount(ds: string) {
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { databaseName: ds } }),
    prisma.financeOrder.deleteMany({ where: { databaseName: ds } }),
    prisma.client.deleteMany({ where: { databaseName: ds } }),
    // ... 其他表
  ]);
  return { success: true };
}

// 收款 + 更新余额（涉及多表）
export async function addPayment(ds: string, body) {
  // 1. 创建 Payment 记录
  // 2. 更新 CustomerBalance
  // 3. 更新 FinanceOrder
  // 全部在一个事务中完成
}
```

## 6. 数据访问

### 6.1 分层规则

- 所有数据库操作通过 Repository 层（接口定义在 `repository.interface.ts`）
- Service 层不直接调用 Prisma（新模块需遵循，现有模块逐步迁移）
- 多租户查询必须带 `databaseName` 过滤

### 6.2 多租户查询

所有查询必须包含 `databaseName` 条件：

```typescript
// 正确
const orders = await prisma.order.findMany({
  where: { databaseName: ds },
});

// 错误 — 缺少多租户过滤
const orders = await prisma.order.findMany({});
```

### 6.3 分页

- 列表查询默认分页，单页不超过 100 条
- 使用 `helpers.ts` 中的 `paginate()` 工具函数

```typescript
export async function getOrders(ds: string, page = 1, perPage = 20) {
  const { skip, take } = paginate(page, perPage);
  const [data, total] = await Promise.all([
    prisma.order.findMany({ where: { databaseName: ds }, skip, take }),
    prisma.order.count({ where: { databaseName: ds } }),
  ]);
  return { data, total, page, pages: Math.ceil(total / take), perPage };
}
```

### 6.4 复杂查询

- 复杂查询使用 Prisma 交互式事务或 SQL raw 查询
- 避免 N+1 查询问题，使用 `include` 或 `Promise.all`

## 7. 缓存策略

### 7.1 Redis 缓存

- 读多写少的数据使用 Redis 缓存（如配置、模板）
- 缓存 TTL 不超过 5 分钟（默认 300 秒）
- 写操作后主动清除相关缓存

### 7.2 缓存工具

```typescript
// redis/index.ts 提供缓存帮助函数
export async function cacheGet<T>(key: string): Promise<T | null>;
export async function cacheSet(key: string, value: unknown, ttl = 300): Promise<void>;
export async function cacheDel(key: string): Promise<void>;
export async function cacheDelPattern(pattern: string): Promise<void>;
```

### 7.3 缓存 Key 格式

```
cache:{module}:{id}
```

示例：`cache:settings:add_prices`, `cache:file:templates`

### 7.4 Cache-Aside 模式

```typescript
// 读：先查缓存，未命中则查 DB 并回填缓存
let data = await cacheGet(key);
if (!data) {
  data = await queryDatabase();
  await cacheSet(key, data);
}

// 写：先更新 DB，再删除缓存
await updateDatabase();
await cacheDel(key);
```

## 8. 安全规范

### 8.1 密码安全

- 密码使用 bcryptjs 哈希，不存明文
- 盐值轮数：10

```typescript
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}
```

### 8.2 JWT 安全

- JWT token 过期时间不超过 24 小时
- JWT 密钥使用强随机字符串，通过环境变量配置
- Token 中包含：`sub`(用户名), `ds`(数据库名), `name`(显示名), `registrant`(公司名)

### 8.3 文件上传

- 验证 MIME 类型和扩展名
- 上传大小限制：50MB
- 使用 MinIO 作为文件存储

### 8.4 输入验证

- 所有用户输入必须经过验证（使用 zod schema）
- 字符串参数检查空值
- 数值参数转换为合适类型

### 8.5 速率限制

- API 添加速率限制（Rate Limiting，通过 express-rate-limit）
- 敏感接口（登录等）实施更严格的速率限制

### 8.6 请求验证

```typescript
// 路由层基本参数校验
if (!username || !password) {
  fail(res, '用户名和密码不能为空');
  return;
}
if (newPassword.length < 6) {
  fail(res, '新密码长度不能少于6位');
  return;
}
```

## 9. 索引规范

- 所有外键字段必须有索引
- 多租户查询常用字段建复合索引：`(databaseName, field)`
- 高频查询字段建索引：`order_no`, `client_code`, `username`
- 排序字段考虑建索引：`created_at`, `order_date`

### 9.1 现有索引

| 表名 | 索引字段 | 类型 |
|------|----------|------|
| `clients` | `(databaseName, clientCode)` | 复合唯一索引 |
| `clients` | `name`, `brand`, `contactPerson` | 单列索引 |
| `orders` | `(databaseName, orderNo)` | 复合唯一索引 |
| `orders` | `customerName`, `status` | 单列索引 |
| `progress_records` | `(databaseName, orderId, procedureName)` | 复合唯一索引 |
| `progress_records` | `orderNo`, `procedureName` | 单列索引 |
| `finance_orders` | `(databaseName, orderNo)` | 复合唯一索引 |
| `finance_orders` | `customerName`, `unpaidAmount` | 单列索引 |
| `material_formulas` | `(databaseName, formulaId)` | 复合唯一索引 |
| `settings` | `(databaseName, key)` | 复合唯一索引 |
| `glass_holes` | `(databaseName, name)` | 复合唯一索引 |
| `templates` | `(databaseName, name, templateType)` | 复合唯一索引 |
| `scanners` | `(databaseName, name)` | 复合唯一索引 |

## 10. 注释规范

### 10.1 文件头注释

每个模块文件开头应有简短描述：

```typescript
/**
 * Repository Interface Pattern
 *
 * Each module has a Repository interface that defines data access methods.
 * The PrismaRepository implements it; a MockRepository can be used for tests.
 */
```

### 10.2 函数注释

公开 API 函数使用 JSDoc 注释：

```typescript
/**
 * Authenticate a user.
 * Validates credentials with bcryptjs, handles trial attempt counting,
 * and returns the full login response matching the production format.
 */
export async function login(username: string, password: string) { ... }
```

### 10.3 内联注释

- 复杂逻辑需要添加解释性注释
- 使用中文或英文均可，保持统一
- 注释说明"为什么"而不仅是"是什么"

## 11. 日志规范

- 使用 `winston` 日志库（见 `package.json`）
- 日志级别：`error` > `warn` > `info` > `debug`
- 生产环境日志级别不低于 `info`
- 错误日志必须包含错误栈信息

## 12. 部署规范

### 12.1 构建流程

```bash
npm run build    # TypeScript 编译 + Prisma 生成
npm start        # 启动生产服务
npm run dev      # 开发模式（热重载）
```

### 12.2 环境检查

- `/healthz` — 基础健康检查（返回 `{ status: 'ok' }`）
- `/readyz` — 就绪检查（检查数据库连接）

### 12.3 优雅关闭

```typescript
const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
```

## 13. Git 规范

- 分支命名：`feature/xxx`, `fix/xxx`, `refactor/xxx`
- 提交信息格式：`type(scope): description`（如 `feat(auth): add login endpoint`）
- 提交时自动追加 `Co-Authored-By: Claude <noreply@anthropic.com>`
