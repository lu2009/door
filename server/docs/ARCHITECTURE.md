# 系统架构文档

## 整体架构

### 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 运行环境 | Node.js / TypeScript | 20+ / 5.7+ |
| Web 框架 | Express.js | 4.21 |
| ORM | Prisma | 6.1 |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis | 7 |
| 文件存储 | MinIO (S3 兼容) | 最新 |
| 反向代理 | Nginx | 1.27 |
| 容器化 | Docker + Docker Compose | 最新 |
| 认证 | JWT + bcryptjs | — |
| 实时通信 | Socket.IO | 4.8 |
| 日志 | Winston | 3.15 |
| 输入验证 | Zod | 3.23 |

### 架构图

```
                           ┌─────────────┐
                           │   Nginx     │  ← 负载均衡 / SSL 终止 / 静态文件
                           └──────┬──────┘
                                  │
                  ┌───────────────┼────────────────┐
                  │               │                │
             ┌────┴────┐    ┌────┴────┐     ┌─────┴─────┐
             │Backend 1 │    │Backend 2 │     │Backend N  │  ← 水平扩展（无状态）
             └────┬────┘    └────┬────┘     └─────┬─────┘
                  │              │                 │
                  └──────────────┼─────────────────┘
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
                ┌────┴───┐  ┌───┴────┐  ┌───┴─────┐
                │PostgreSQL│  │ Redis  │  │ MinIO   │
                └─────────┘  └────────┘  └─────────┘
```

### 请求生命周期

```
客户端请求
    │
    ▼
Nginx（反向代理 / SSL 终止 / 限流）
    │
    ▼
Express 中间件链:
    ├── cors
    ├── express.json (limit 50mb)
    ├── express.urlencoded
    │
    ▼
路由匹配 /api/v1/{module}/*
    │
    ├── [requireAuth] — JWT 验证中间件
    │       │
    │       ▼
    │   AuthRequest (req.user 注入)
    │
    ▼
Controller / Handler（参数提取 + 响应格式化）
    │
    ▼
Service Layer（业务逻辑 / 事务管理）
    │
    ▼
Repository / Prisma Client（数据访问）
    │
    ▼
PostgreSQL / Redis / MinIO
    │
    ▼
响应返回（格式化: { code, data, message }）
```

## 项目结构

```
server/
├── prisma/
│   ├── schema.prisma       ← 数据库模型定义
│   └── migrations/          ← 数据库迁移文件
├── src/
│   ├── index.ts             ← 应用入口（启动服务器）
│   ├── app.ts               ← Express 应用配置（路由挂载、中间件）
│   ├── config/
│   │   └── index.ts         ← 配置（环境变量、常量）
│   ├── database/
│   │   └── index.ts         ← Prisma Client 实例
│   ├── redis/
│   │   └── index.ts         ← Redis 客户端 + 缓存工具
│   ├── minio/
│   │   └── index.ts         ← MinIO 文件存储客户端
│   ├── middleware/
│   │   ├── auth.ts          ← JWT 认证中间件（requireAuth / optionalAuth）
│   │   ├── error.ts         ← 全局错误处理（AppError）
│   │   └── response.ts      ← 响应格式化工具（ok / fail / notFound）
│   ├── modules/
│   │   ├── legacy-dispatch.ts  ← 传统 API 兼容调度
│   │   ├── repository.interface.ts  ← 仓库接口定义
│   │   ├── auth/            ← 身份认证模块
│   │   ├── client/          ← 客户管理模块
│   │   ├── order/           ← 订单管理模块
│   │   ├── progress/        ← 生产进度模块
│   │   ├── finance/         ← 财务管理模块
│   │   ├── formula/         ← 物料公式模块
│   │   ├── settings/        ← 系统设置模块
│   │   ├── file/            ← 文件管理模块
│   │   ├── scanner/         ← 扫码设备模块
│   │   └── shortlink/       ← 短链接模块
│   └── utils/
│       ├── crypto.ts        ← 密码哈希（bcryptjs）
│       ├── jwt.ts           ← JWT token 创建/验证
│       ├── helpers.ts       ← 通用工具函数
│       └── serializer.ts    ← 序列化工具
├── dist/                    ← TypeScript 编译输出
├── package.json
├── tsconfig.json
└── Dockerfile
```

## 模块架构

### 认证模块 (auth)

```
auth.routes.ts
├── POST /login          ← 登录认证，返回 JWT token
├── POST /change-password  ← 修改密码（需认证）
├── GET  /config          ← 获取用户配置（需认证）
└── GET  /procedures     ← 获取工序设置（需认证）

auth.service.ts
├── login()              ← 用户登录验证
├── changePassword()     ← 修改密码
├── getUserConfig()      ← 获取用户配置
├── getProcedures()      ← 获取工序数据
└── buildLoginResponse() ← 构建登录响应
```

### 客户模块 (client)

```
client.routes.ts
├── GET    /             ← 客户列表（?keyword 搜索）
├── GET    /latest       ← 最新客户
├── POST   /check        ← 查找或创建客户
├── POST   /receipt      ← 创建回执单
├── PUT    /             ← 更新客户信息
└── DELETE /:id          ← 删除客户

client.service.ts
├── getClients()         ← 获取全部客户
├── getLatestClients()   ← 按关键词搜索客户
├── checkClient()        ← 按名称+电话查找/创建
├── updateCustomer()     ← 更新客户（含嵌入订单）
├── makeReceipt()        ← 创建完整回执单
└── deleteClient()       ← 删除客户（级联删除订单/财务/进度）
```

### 订单模块 (order)

```
order.routes.ts
├── GET  /              ← 订单列表（分页）
├── GET  /table         ← 订单表格（含高级筛选）
├── GET  /table/terminal ← 终端订单查询
├── GET  /detail        ← 订单详情
├── POST /combine       ← 合并订单
├── DELETE /            ← 删除订单
├── PUT  /              ← 更新订单
└── GET  /more          ← 分页订单

order.service.ts
├── getOrders()          ← 分页查询
├── getTableData()       ← 包含关联数据的表格查询
├── getTableDataForTerminal()  ← 终端专属查询
├── getDetail()          ← 完整详情（含门扇规格解析）
├── combine()            ← 合并订单
├── deleteRow()          ← 删除订单（含关联表）
└── updateRow()          ← 更新订单字段
```

### 进度模块 (progress)

```
progress.routes.ts
├── GET  /           ← 进度列表
├── GET  /labels     ← 标签数据
├── GET  /qrcode     ← 二维码扫码数据
├── GET  /counts     ← 工序计数
├── POST /update     ← 更新进度
├── POST /payment    ← 更新收款
├── DELETE /         ← 删除进度
├── POST /procedures ← 设置工序
└── GET  /procedures ← 获取工序

progress.service.ts
├── getProgress()         ← 查询进度
├── getLabelData()        ← 标签数据
├── getScanQrCode()       ← 扫码数据
├── getProcessCounts()    ← 工序统计
├── updateProgress()      ← 更新工序状态
├── updatePaymentCollection()  ← 收款更新
├── deleteProgress()      ← 删除进度
├── deleteProgressCell()  ← 删除指定单元格
└── setProcedures()       ← 设置工序定义
```

### 财务模块 (finance)

```
finance.routes.ts
├── GET  /summary                   ← 订单财务汇总
├── POST /check-payment             ← 检查付款状态
├── POST /add-payment               ← 添加收款
├── POST /add-order-payment         ← 订单收款
├── POST /add-customer-adjustment   ← 客户调整
├── POST /add-order-adjustment      ← 订单调整
├── GET  /payment-stats             ← 收款统计
├── GET  /customer-statement        ← 客户对账单
├── GET  /order-detail              ← 订单财务详情
├── GET  /customer-balance          ← 客户余额
├── POST /preview-allocation        ← 预览分配
├── POST /preview-prepayment-allocation ← 预览预付款分配
├── POST /execute-prepayment-allocation  ← 执行预付款分配
└── POST /clear-selected-orders     ← 清零订单

finance.service.ts
├── getOrderSummary()               ← 财务汇总
├── checkOrderPayment()             ← 付款检查
├── addPayment()                    ← 收款（含预付款）
├── addOrderPayment()               ← 订单收款
├── addCustomerAdjustment()         ← 客户级调整
├── addOrderAdjustment()            ← 订单级调整
├── getPaymentStats()               ← 付款统计
├── getCustomerStatement()          ← 对账单
├── getOrderDetail()                ← 订单财务详情
├── getCustomerBalance()            ← 客户余额
├── previewAllocation()             ← 预分配预览
├── executePrepaymentAllocation()   ← 预付款分配执行
├── clearSelectedOrders()           ← 批量清零
└── checkSystem()                   ← 系统状态检查
```

### 公式模块 (formula)

```
formula.routes.ts
├── GET  /             ← 公式列表（?type 过滤）
├── GET  /names        ← 公式名称映射
├── GET  /diao-init    ← 初始化吊门数据
├── GET  /ping-init    ← 初始化平门数据
├── GET  /diao-price   ← 吊门价格
├── GET  /ping-price   ← 平门价格
├── GET  /diao         ← 吊门公式
├── GET  /diao-single  ← 单个吊门公式
├── GET  /query        ← 查询公式
├── POST /             ← 保存/更新公式
├── DELETE /           ← 删除公式
├── GET  /glass-width  ← 玻璃宽度查询
└── GET  /extra-price  ← 加价查询

formula.service.ts
├── getDiaoFormulas()         ← 吊门公式
├── getDiaoFormulasByPayload()
├── getDiaoFormulasSingle()   ← 单个吊门公式
├── initializDiao()           ← 初始化吊门默认数据
├── initializPing()           ← 初始化平门默认数据
├── getFormulas()             ← 公式列表
├── getFormulaName()          ← 公式名称
├── getDiaoPrice()            ← 吊门加价
├── getPingPrice()            ← 平门加价
├── saveFormula()             ← 保存公式
├── deleteFormula()           ← 删除公式
└── queryFormula()            ← 公式查询（含玻璃宽度/加价）
```

### 设置模块 (settings)

```
settings.routes.ts
├── GET    /add-prices             ← 加价项目列表
├── POST   /add-prices             ← 添加加价项目
├── PUT    /add-prices             ← 编辑加价项目
├── DELETE /add-prices             ← 删除加价项目
├── POST   /declaration            ← 更新声明文本
├── GET    /glass-holes            ← 玻璃孔位列表
├── POST   /glass-holes            ← 保存玻璃孔位
├── DELETE /glass-holes            ← 删除玻璃孔位
├── GET    /drawing-behaviors      ← 绘图行为配置
├── POST   /drawing-behaviors      ← 设置绘图行为
├── POST   /square                 ← 更改计价方式
├── POST   /direction-mode         ← 更改方向模式
├── POST   /reverse-direction      ← 反转方向
├── POST   /custom-direction-names  ← 保存自定义方向名称
├── POST   /clear-account          ← 清除账号数据
├── POST   /registrant-user        ← 创建注册用户
├── GET    /parametric-patterns    ← 参数化图案列表
├── POST   /parametric-patterns    ← 保存参数化图案
├── DELETE /parametric-patterns    ← 删除参数化图案
└── GET    /version                ← 版本信息

settings.service.ts
├── getAddPrice() / addAddPrice() / editAddPrice() / deleteAddPrice()
├── changeDecleration()
├── getGlassHoles() / saveGlassHole() / deleteGlassHole()
├── drawingBehaviorsGet() / drawingBehaviorsSet()
├── changeSquare() / changeDirectionMode() / reverseDirection()
├── saveCustomDirectionNames()
├── clearAccount() (多表事务删除)
├── createUser()
├── getParametricPatterns() / upsertParametricPattern() / deleteParametricPattern()
└── getVersionInfo()
```

### 文件模块 (file)

```
file.routes.ts
├── POST  /upload      ← 上传图片（multipart）
├── GET   /:id         ← 获取图片
├── DELETE /           ← 删除图片
├── GET   /templates   ← 获取模板
└── GET   /update-info ← 获取更新信息

file.service.ts
├── saveImage()       ← 保存图片到 MinIO + DB
├── getImage()        ← 从 MinIO/DB 获取图片
├── deleteImage()     ← 删除图片
├── getTemplates()    ← 获取模板配置
└── getUpdateInfo()   ← 获取更新信息
```

### 扫码设备模块 (scanner)

```
scanner.routes.ts
├── POST /         ← 添加扫码设备
├── DELETE /       ← 删除扫码设备
└── POST /printers ← 设置打印机

scanner.service.ts
├── addScanner()
├── deleteScanner()
└── setPrinters()
```

### 短链接模块 (shortlink)

```
shortlink.routes.ts
├── POST /      ← 创建短链接
├── GET  /:id   ← 获取短链接
└── (redirect) GET /s/:linkId ← 短链接重定向

shortlink.service.ts
├── create()  ← 创建短链接（生成 8 位 UUID）
└── get()     ← 查询短链接
```

## 路由设计

### API 路由表

```
/1                              ← 遗留兼容 API（param1 分发）
/login                          ← 遗留兼容登录
/api/v1/auth/*                  ← 认证相关
/api/v1/clients/*               ← 客户管理
/api/v1/orders/*                ← 订单管理
/api/v1/progress/*              ← 进度管理
/api/v1/finance/*               ← 财务管理
/api/v1/formulas/*              ← 公式管理
/api/v1/settings/*              ← 系统设置
/api/v1/files/*                 ← 文件管理
/api/v1/scanner/*               ← 扫码设备
/api/v1/shortlink/*             ← 短链接
/s/:linkId                      ← 短链接重定向
/healthz                        ← 健康检查
/readyz                         ← 就绪检查
```

### 路由中间件链

```
Route Request
    │
    ├── cors()                    ← CORS 跨域
    ├── express.json()            ← JSON 请求体解析（50MB 限制）
    ├── express.urlencoded()      ← URL 编码解析
    │
    ├── [requireAuth]             ← 可选：JWT 验证
    │       │
    │       └── req.user = { ... } ← 注入用户信息
    │
    └── [errorHandler]            ← 全局错误处理
```

## 数据模型

### 实体关系图

```
User (1) ──→ (N) Client
User (1) ──→ (N) Order
User (1) ──→ (N) Procedure
User (1) ──→ (N) Progress
User (1) ──→ (N) FinanceOrder
User (1) ──→ (N) Setting
User (1) ──→ (N) MaterialFormula
User (1) ──→ (N) AddPrice
User (1) ──→ (N) GlassHole
User (1) ──→ (N) Template
User (1) ──→ (N) Scanner
User (1) ──→ (N) UpdateInfo

Client (1) ──→ (N) Order
Client (1) ──→ (N) CustomerBalance

Order (1) ──→ (N) Progress
Order (1) ──→ (N) FinanceOrder
Order (1) ──→ (N) Payment

FinanceOrder (1) ──→ (N) Payment
```

### 核心数据表

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| `users` | 用户表 | username, passwordHash, databaseName, displayName |
| `clients` | 客户表 | databaseName, clientCode, name, phone, brand, address |
| `orders` | 订单表 | databaseName, orderNo, clientId, status, totalAmount |
| `procedures` | 工序定义 | databaseName, name, orderIndex |
| `progress_records` | 进度记录 | databaseName, orderId, procedureName, status |
| `finance_orders` | 财务订单 | databaseName, orderId, allocatedAmount, unpaidAmount |
| `payments` | 付款记录 | databaseName, amount, paymentDate, paymentMethod |
| `customer_balances` | 客户余额 | databaseName, clientCode, prepaidBalance |
| `customer_adjustments` | 客户调整 | databaseName, clientCode, adjustAmount |
| `order_adjustments` | 订单调整 | databaseName, orderNo, adjustAmount |
| `material_formulas` | 物料公式 | databaseName, materialSize, formulaId, formulaType |
| `add_prices` | 加价项目 | databaseName, name, price, unit, direction |
| `glass_holes` | 玻璃孔位 | databaseName, name, config |
| `images` | 图片记录 | id, databaseName, imageUrl (MinIO path) |
| `templates` | 模板 | databaseName, name, templateType, content |
| `scanners` | 扫码设备 | databaseName, name, scannerType, config |
| `shortlinks` | 短链接 | id, url |
| `settings` | 系统设置 | databaseName, key, value |
| `update_info` | 更新信息 | databaseName, message, version |

## 水平扩展

### 无状态设计

- 后端实例无状态，所有会话信息存储在 JWT + Redis 中
- JWT token 包含用户认证信息
- Redis 用于缓存和 Socket.IO 跨实例广播

### Nginx 配置

```nginx
upstream backend {
    least_conn;
    server backend:5000;
    # 扩展时自动添加:
    # server backend2:5000;
    # server backend3:5000;
}
```

### 扩展命令

```bash
# 扩展到 5 个后端实例
docker compose up -d --scale backend=5

# Nginx 自动负载均衡（least_conn 策略）
```

### 数据库连接池

```typescript
// 按实例数配置
const poolSize = Math.max(5, Math.floor(20 / instanceCount)); // pool_size = 20 / 实例数
```

### Socket.IO

- Socket.IO 使用 Redis Adapter 跨实例广播
- 确保实时进度更新在多实例下正常工作

## 数据一致性

### ACID 事务

- 财务操作使用数据库事务保证 ACID
- 多表更新使用 Prisma 交互式事务

```typescript
// Prisma 事务保证
await prisma.$transaction([
  prisma.payment.deleteMany({ where: { databaseName: ds } }),
  prisma.financeOrder.deleteMany({ where: { databaseName: ds } }),
  prisma.customerBalance.deleteMany({ where: { databaseName: ds } }),
]);
```

### 缓存一致性

- 使用 Cache-Aside 模式（先更新 DB，再删除缓存）
- 写操作后主动清除相关缓存

### 分布式锁

- Redis 提供分布式锁防止并发操作

## 多租户架构

### 租户隔离

系统使用 `databaseName` 字段实现多租户隔离：

- 每个租户（注册用户）有一个唯一的 `databaseName`
- 所有核心数据表都有 `databaseName` 字段
- 查询时始终使用 `databaseName` 过滤

### 租户数据隔离

```typescript
// 所有查询都按 databaseName 过滤
const orders = await prisma.order.findMany({
  where: { databaseName: ds },
});

// 唯一约束包含 databaseName
@@unique([databaseName, orderNo])
@@unique([databaseName, clientCode])
@@unique([databaseName, formulaId])
```

## 传统 API 兼容

### 遗留调度机制

系统保留 `POST /1` 和 `POST /login` 端点，通过 `legacy-dispatch.ts` 将旧版 `param1` 参数映射到新版 v1 API 的处理函数。

### 兼容层转发

```
旧客户端请求: POST /1?param1=getClientsInfo&param2=xxx
  │
  └──→ legacyDispatch()
        │
        └──→ ACTION_MAP['getClientsInfo'] → 'getclientsinfo'
              │
              └──→ clientService.getClients(ds)
```

现有 90+ 个 `param1` 命令通过 `ACTION_MAP` 转发到 10 个模块的 Service 函数。
