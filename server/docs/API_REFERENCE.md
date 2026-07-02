# API 参考文档

## 概述

- **基础 URL**: `http://localhost:5000`
- **认证方式**: Bearer Token（除登录外所有 v1 API 需要认证）
- **响应格式**: JSON `{ code, data?, message?, ... }`
- **多租户**: 所有查询通过 `ds` 参数或 JWT 中的 `databaseName` 过滤

### 通用响应格式

```json
// 成功
{ "code": 200, "data": { ... }, "message": "操作成功" }

// 失败
{ "code": 400, "message": "参数错误" }

// 未授权
{ "code": 401, "message": "未授权" }

// 未找到
{ "code": 404, "message": "资源不存在" }

// 服务器错误
{ "code": 500, "message": "服务器内部错误" }
```

### 认证方式

所有受保护端点需要在请求头中添加：

```
Authorization: Bearer <jwt_token>
```

---

## 认证 Auth

### 登录

```
POST /api/v1/auth/login
Auth: None
```

**请求体 (JSON)**:

```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "statu": 1,
      "userinfo": {
        "name": "管理员",
        "ds": "smartdoor",
        "registrant": "昊艺门窗",
        "defaulted": 1,
        "sync": 0,
        "token": "eyJhbGciOiJIUzI1NiIs..."
      },
      "registrant": {
        "declaration": "声明内容",
        "diao_column": [...],
        "ping_column": [...],
        "direction_mode": "standard",
        "template": [...],
        "user_column_settings": null
      }
    }
  ]
}
```

**错误**:

| 状态码 | message |
|--------|---------|
| 401 | 用户名或密码错误 |
| 403 | 账户已被禁用 |
| 403 | 试用次数已用完，请联系管理员 |

---

### 修改密码

```
POST /api/v1/auth/change-password
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "oldPassword": "123456",
  "newPassword": "newpass123"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": null,
  "message": "密码修改成功"
}
```

---

### 获取用户配置

```
GET /api/v1/auth/config
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称，默认使用 JWT 中的 databaseName |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "name": "管理员",
    "ds": "smartdoor",
    "registrant": "昊艺门窗",
    "defaulted": 1,
    "sync": 0
  }
}
```

---

### 获取工序

```
GET /api/v1/auth/procedures
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "工序1": "下料",
    "工序2": "焊接",
    "工序3": "打磨"
  }
}
```

---

## 客户管理 Client

### 客户列表

```
GET /api/v1/clients
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |
| keyword | string | 否 | 搜索关键词（匹配名称、品牌、电话、联系人、客户编号） |

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "databaseName": "smartdoor",
      "clientCode": "C202606260001",
      "name": "张三",
      "brand": "品牌A",
      "address": "北京市朝阳区",
      "phone": "13800138000",
      "contactPerson": "李四",
      "logisticsProvider": "物流公司",
      "logisticsPhone": "13900139000",
      "deliveryPhone": null,
      "householdRegistration": null,
      "createdAt": "2026-06-26T00:00:00.000Z",
      "updatedAt": "2026-06-26T00:00:00.000Z"
    }
  ]
}
```

---

### 最新客户

```
GET /api/v1/clients/latest
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |
| keyword | string | 否 | 搜索关键词 |

**响应 200**: 同客户列表，最多返回 50 条。

---

### 查找或创建客户

```
POST /api/v1/clients/check
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "ds": "smartdoor",
  "name": "张三",
  "phone": "13800138000"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "databaseName": "smartdoor",
    "clientCode": "C20260626ABCD",
    "name": "张三",
    "phone": "13800138000"
  }
}
```

---

### 创建回执单

```
POST /api/v1/clients/receipt
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "ds": "smartdoor",
  "name": "张三",
  "phone": "13800138000",
  "brand": "品牌A",
  "address": "北京市朝阳区",
  "orderNo": "DD20260626ABCDEF",
  "doorType": "diao",
  "doorCount": 2,
  "doorSpecs": [
    { "width": 1000, "height": 2000, "quantity": 2 }
  ],
  "totalAmount": 5000,
  "paidAmount": 2000,
  "notes": "备注信息"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "client": { ... },
    "order": { ... },
    "financeOrder": { ... }
  },
  "message": "回执单创建成功"
}
```

---

### 更新客户信息

```
PUT /api/v1/clients
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "ds": "smartdoor",
  "id": 1,
  "name": "张三",
  "phone": "13800138001",
  "brand": "品牌B"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "id": 1, "name": "张三", ... },
  "message": "客户信息更新成功"
}
```

---

### 删除客户

```
DELETE /api/v1/clients/:id
Auth: Bearer Token
```

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 客户 ID、clientCode 或名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": { "deleted": true, "clientId": 1 },
  "message": "客户已删除"
}
```

> 删除客户会级联删除相关订单、进度记录、财务记录、付款记录。

---

## 订单管理 Order

### 订单列表

```
GET /api/v1/orders
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| keyword | string | 否 | 搜索关键词（单号、客户名、品牌） |
| page | number | 否 | 页码（默认 1） |
| perPage | number | 否 | 每页条数（默认 20） |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "data": [
      {
        "id": 1,
        "databaseName": "smartdoor",
        "orderNo": "DD20260626ABCDEF",
        "customerName": "张三",
        "brand": "品牌A",
        "status": "pending",
        "totalAmount": 5000,
        "paidAmount": 2000,
        "unpaidAmount": 3000,
        "doorType": "diao",
        "doorCount": 2,
        "orderDate": "2026-06-26",
        "deliveryDate": null,
        "notes": ""
      }
    ],
    "total": 100,
    "page": 1,
    "pages": 5,
    "perPage": 20
  }
}
```

---

### 订单表格数据

```
GET /api/v1/orders/table
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| keyword | string | 否 | 搜索关键词 |
| address | string | 否 | 地址筛选（关联客户地址） |
| startDate | string | 否 | 开始日期（格式：YYYY-MM-DD） |
| endDate | string | 否 | 结束日期（格式：YYYY-MM-DD） |

**响应 200**: 包含关联的客户信息和进度记录的订单列表。

---

### 终端订单查询

```
GET /api/v1/orders/table/terminal
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 格式为 `{databaseName}_{clientId}` |

**响应 200**: 指定客户的全部订单（包含关联数据）。

---

### 订单详情

```
GET /api/v1/orders/detail
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| orderNo | string | 是 | 订单号 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "orderNo": "DD20260626ABCDEF",
    "customerName": "张三",
    "doorSpecs": {
      "ping_hui": { ... },
      "diao_hui": { ... }
    },
    "pingHui": { ... },
    "diaoHui": { ... },
    "client": { ... },
    "progressRecords": [...],
    "payments": [...],
    "financeOrders": [...]
  }
}
```

---

### 合并订单

```
POST /api/v1/orders/combine
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "targetOrderNo": "DD20260626TARGET",
  "sourceOrderNos": ["DD20260626A", "DD20260626B"]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "targetOrderNo": "DD20260626TARGET",
    "mergedSourceCount": 2
  },
  "message": "合并成功"
}
```

---

### 删除订单

```
DELETE /api/v1/orders
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "orderRef": "DD20260626ABCDEF"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "deleted": 1 },
  "message": "删除成功"
}
```

---

### 更新订单

```
PUT /api/v1/orders
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "rowId": 1,
  "客户名称": "张三",
  "总金额": 6000,
  "已付金额": 3000,
  "备注": "更新备注"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "id": 1, ... },
  "message": "更新成功"
}
```

---

### 分页订单

```
GET /api/v1/orders/more
Auth: Bearer Token
```

**查询参数**: 同 GET /api/v1/orders

**响应 200**: 同订单列表。

---

## 生产进度 Progress

### 进度列表

```
GET /api/v1/progress
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| orderNo | string | 否 | 按订单号筛选 |

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "databaseName": "smartdoor",
      "orderId": 1,
      "orderNo": "DD20260626ABCDEF",
      "customerName": "张三",
      "procedureName": "下料",
      "procedureStatus": "completed",
      "completedAt": "2026-06-26T10:00:00.000Z",
      "operatorName": null,
      "notes": null,
      "order": {
        "id": 1,
        "orderNo": "DD20260626ABCDEF",
        "doorType": "diao",
        "status": "processing",
        "client": { ... }
      }
    }
  ]
}
```

---

### 标签数据

```
GET /api/v1/progress/labels
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| orderNo | string | 否 | 订单号（逗号分隔，支持多个） |

**响应 200**: 订单列表（含客户和进度记录），用于生产标签打印。

---

### 二维码扫码数据

```
GET /api/v1/progress/qrcode
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |
| orderNo | string | 否 | 订单号（逗号分隔，支持多个） |

**响应 200**: 适用于扫码设备显示的订单数据（含门扇规格解析）。

---

### 工序计数

```
GET /api/v1/progress/counts
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "procedures": ["下料", "焊接", "打磨"],
    "counts": {
      "下料": 50,
      "焊接": 35,
      "打磨": 20,
      "total": 100,
      "not_started": 10
    }
  }
}
```

---

### 更新进度

```
POST /api/v1/progress/update
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "procedure": "焊接",
  "orderIds": ["DD20260626ABCDEF", "DD20260626GHIJKL"]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": [
    { "orderNo": "DD20260626ABCDEF", "success": true },
    { "orderNo": "DD20260626GHIJKL", "success": true }
  ],
  "message": "进度更新成功"
}
```

---

### 更新收款

```
POST /api/v1/progress/payment
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "param3": "DD20260626ABCDEF",
  "param4": { "amount": 1000, "paymentMethod": "现金" }
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true },
  "message": "收款更新成功"
}
```

---

### 删除进度

```
DELETE /api/v1/progress
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
{
  "procedureName": "焊接",
  "orderRefs": ["DD20260626ABCDEF"]
}
```

或删除特定单元格：

```json
{
  "slot": "2",
  "rowRef": "DD20260626ABCDEF",
  "procedureName": "焊接"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "deleted": 1 },
  "message": "删除成功"
}
```

---

### 设置工序

```
POST /api/v1/progress/procedures
Auth: Bearer Token
```

**查询参数**: `?ds=xxx`

**请求体 (JSON)**:

```json
["下料", "焊接", "打磨", "组装", "检验"]
```

或：

```json
[
  { "name": "下料", "orderIndex": 1, "description": "铝材切割" },
  { "name": "焊接", "orderIndex": 2, "description": "框架焊接" }
]
```

**响应 200**:

```json
{
  "code": 200,
  "data": [...],
  "message": "工序设置成功"
}
```

---

### 获取工序定义

```
GET /api/v1/progress/procedures
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 是 | 数据库名称 |

**响应 200**: 工序定义列表。

---

## 财务管理 Finance

### 订单财务汇总

```
GET /api/v1/finance/summary
Auth: Bearer Token
```

**查询参数**: 无（从 JWT 获取 databaseName）

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "totalOrders": 200,
    "totalAllocated": 500000,
    "totalUnpaid": 150000,
    "totalAdjust": 5000,
    "byMonth": [
      { "month": "2026-06", "count": 30, "allocated": 80000, "unpaid": 20000 }
    ]
  }
}
```

---

### 检查付款状态

```
POST /api/v1/finance/check-payment
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "orders": ["DD20260626ABCDEF", "DD20260626GHIJKL"]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "orderNo": "DD20260626ABCDEF",
      "customerName": "张三",
      "allocatedAmount": 3000,
      "unpaidAmount": 2000,
      "statusText": "部分付款",
      "payments": [
        { "id": 1, "amount": 1000, "paymentDate": "2026-06-26", "method": "转账", "notes": "" }
      ]
    }
  ]
}
```

---

### 添加收款

```
POST /api/v1/finance/add-payment
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "客户编号": "C20260626AAAA",
  "客户名称": "张三",
  "收款金额": 5000,
  "收款日期": "2026-06-26",
  "收款方式": "转账",
  "备注": "预付款",
  "payAmount": 5000,
  "allocatedOrders": [
    { "orderNo": "DD20260626ABCDEF", "allocAmount": 3000 },
    { "orderNo": "DD20260626GHIJKL", "allocAmount": 2000 }
  ]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "paymentId": 1 }
}
```

---

### 添加订单收款

```
POST /api/v1/finance/add-order-payment
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "orderNo": "DD20260626ABCDEF",
  "收款金额": 2000,
  "收款日期": "2026-06-26",
  "收款方式": "现金",
  "备注": ""
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "paymentId": 1, "orderNo": "DD20260626ABCDEF" }
}
```

---

### 添加客户调整

```
POST /api/v1/finance/add-customer-adjustment
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "客户编号": "C20260626AAAA",
  "客户名称": "张三",
  "调整金额": -100,
  "调整类型": "抹零",
  "备注": "零头抹除"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "adjustmentId": 1 }
}
```

---

### 添加订单调整

```
POST /api/v1/finance/add-order-adjustment
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "orderNo": "DD20260626ABCDEF",
  "调整金额": 200,
  "调整类型": "订单调整",
  "备注": "补差价"
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "adjustmentId": 1 }
}
```

---

### 收款统计

```
GET /api/v1/finance/payment-stats
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | string | 否 | 客户编号 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "totalPayments": 500,
    "totalAmount": 1000000,
    "byMonth": [
      { "month": "2026-06", "count": 50, "total": 200000 }
    ],
    "byYear": [
      { "year": "2026", "count": 500, "total": 1000000 }
    ]
  }
}
```

---

### 客户对账单

```
GET /api/v1/finance/customer-statement
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | string | 是 | 客户编号 |
| days | string | 否 | 回溯天数（默认 90） |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "customerId": "C20260626AAAA",
    "customerName": "张三",
    "prepaidBalance": 5000,
    "totalTopup": 50000,
    "totalSpent": 45000,
    "entries": [
      {
        "type": "order",
        "date": "2026-06-26",
        "orderNo": "DD20260626ABCDEF",
        "description": "订单 #DD20260626ABCDEF (张三)",
        "debit": 5000,
        "credit": 0,
        "balance": 2000,
        "status": "部分付款"
      },
      {
        "type": "payment",
        "date": "2026-06-25",
        "orderNo": "DD20260626ABCDEF",
        "description": "收款-转账",
        "debit": 0,
        "credit": 3000,
        "notes": ""
      },
      {
        "type": "adjustment",
        "date": "2026-06-24",
        "description": "调整-抹零",
        "debit": 0,
        "credit": 100,
        "notes": ""
      },
      {
        "type": "prepayment",
        "date": "2026-06-20",
        "description": "预付款-转账",
        "debit": 0,
        "credit": 5000,
        "notes": ""
      }
    ]
  }
}
```

---

### 订单财务详情

```
GET /api/v1/finance/order-detail
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | string | 是 | 订单号 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "orderNo": "DD20260626ABCDEF",
    "customerName": "张三",
    "allocatedAmount": 3000,
    "unpaidAmount": 2000,
    "orderAdjustTotal": 0,
    "monthTag": "2026-06",
    "statusText": "部分付款",
    "order": {
      "id": 1,
      "orderNo": "DD20260626ABCDEF",
      "totalAmount": 5000,
      "paidAmount": 3000,
      "unpaidAmount": 2000,
      "status": "processing",
      "orderDate": "2026-06-26",
      "deliveryDate": null
    },
    "payments": [...],
    "adjustments": [...]
  }
}
```

---

### 客户余额

```
GET /api/v1/finance/customer-balance
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| customerId | string | 否 | 客户编号 |
| days | string | 否 | 近期活跃天数（默认 30） |

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "clientCode": "C20260626AAAA",
      "customerName": "张三",
      "prepaidBalance": 5000,
      "totalTopup": 50000,
      "totalSpent": 45000,
      "recentPayments": 5
    }
  ]
}
```

---

### 预览分配

```
POST /api/v1/finance/preview-allocation
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "客户编号": "C20260626AAAA",
  "收款金额": 5000
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "customerCode": "C20260626AAAA",
    "totalAmount": 5000,
    "allocated": 5000,
    "remaining": 0,
    "allocation": [
      {
        "orderNo": "DD20260626ABCDEF",
        "customerName": "张三",
        "unpaidAmount": 3000,
        "allocAmount": 3000
      },
      {
        "orderNo": "DD20260626GHIJKL",
        "customerName": "张三",
        "unpaidAmount": 2000,
        "allocAmount": 2000
      }
    ]
  }
}
```

---

### 预览预付款分配

```
POST /api/v1/finance/preview-prepayment-allocation
Auth: Bearer Token
```

同 `/api/v1/finance/preview-allocation`。

---

### 执行预付款分配

```
POST /api/v1/finance/execute-prepayment-allocation
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "clientCode": "C20260626AAAA",
  "客户编号": "C20260626AAAA",
  "allocatedOrders": [
    { "orderNo": "DD20260626ABCDEF", "allocAmount": 3000 },
    { "orderNo": "DD20260626GHIJKL", "allocAmount": 2000 }
  ]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "success": true,
    "totalAllocated": 5000,
    "remainingBalance": 0
  }
}
```

---

### 清零订单

```
POST /api/v1/finance/clear-selected-orders
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "orderNos": ["DD20260626ABCDEF", "DD20260626GHIJKL"]
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "clearedCount": 2 }
}
```

---

## 物料公式 Formula

### 初始化吊门数据

```
GET /api/v1/formulas/diao-init
Auth: Bearer Token
```

**查询参数**: 无（从 JWT 获取 databaseName）

**响应 200**:

```json
{
  "code": 200,
  "data": { "initialized": true, "count": 3 }
}
```

---

### 初始化平门数据

```
GET /api/v1/formulas/ping-init
Auth: Bearer Token
```

同上，初始化平门默认公式。

---

### 公式列表

```
GET /api/v1/formulas
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 否 | 公式类型（diao / ping） |

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "materialSize": "1000x2000",
      "formulaId": "diao_1000x2000",
      "formulaType": "diao",
      "lineType": "标准",
      "trackType": "单轨",
      "square": "2.0",
      "formulaData": { ... },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### 公式名称映射

```
GET /api/v1/formulas/names
Auth: Bearer Token
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "diao_1000x2000": { "size": "1000x2000", "type": "diao" },
    "ping_900x2000": { "size": "900x2000", "type": "ping" }
  }
}
```

---

### 吊门价格

```
GET /api/v1/formulas/diao-price
Auth: Bearer Token
```

**响应 200**: 吊门相关的加价项目列表。

---

### 平门价格

```
GET /api/v1/formulas/ping-price
Auth: Bearer Token
```

**响应 200**: 平门相关的加价项目列表。

---

### 吊门公式

```
GET /api/v1/formulas/diao
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 公式名称（逗号分隔支持多个） |

---

### 单个吊门公式

```
GET /api/v1/formulas/diao-single
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderDs | string | 是 | 订单对应的 formulaId |

---

### 查询公式

```
GET /api/v1/formulas/query
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 公式名称 |

---

### 保存公式

```
POST /api/v1/formulas
Auth: Bearer Token
```

**请求体 (JSON)**:

```json
{
  "materialSize": "1000x2000",
  "formulaId": "diao_1000x2000",
  "formulaType": "diao",
  "lineType": "标准",
  "trackType": "单轨",
  "square": "2.0",
  "formulaData": { "price": 500, "material": "铝合金" }
}
```

**响应 200**:

```json
{
  "code": 200,
  "data": { "success": true, "formula": { ... } }
}
```

---

### 删除公式

```
DELETE /api/v1/formulas
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 否 | 公式 ID |
| name | string | 否 | 公式名称 |
| size | string | 否 | 尺寸 |
| formulaId | string | 否 | formulaId |

需要至少提供一个参数。

---

### 玻璃宽度查询

```
GET /api/v1/formulas/glass-width
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 名称 |

**响应 200**: 玻璃孔位配置列表。

---

### 加价查询

```
GET /api/v1/formulas/extra-price
Auth: Bearer Token
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 名称 |

**响应 200**: 加价项目列表。

---

## 系统设置 Settings

### 加价项目列表

```
GET /api/v1/settings/add-prices
Auth: Bearer Token (查询无认证)
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "超长轨道",
      "price": 100,
      "unit": "米",
      "remark": "",
      "lockway": "单锁",
      "direction": "吊"
    }
  ]
}
```

---

### 添加加价项目

```
POST /api/v1/settings/add-prices
Auth: Bearer Token
```

```json
{
  "name": "超长轨道",
  "price": 100,
  "unit": "米",
  "remark": "",
  "lockway": "单锁",
  "direction": "吊"
}
```

---

### 编辑加价项目

```
PUT /api/v1/settings/add-prices
Auth: Bearer Token
```

```json
{
  "id": 1,
  "name": "超长轨道",
  "price": 120,
  "unit": "米"
}
```

---

### 删除加价项目

```
DELETE /api/v1/settings/add-prices?id=1
Auth: Bearer Token
```

---

### 更新声明文本

```
POST /api/v1/settings/declaration
Auth: Bearer Token
```

```json
{
  "text": "本回执单仅作为生产凭证..."
}
```

---

### 玻璃孔位列表

```
GET /api/v1/settings/glass-holes
Auth: Bearer Token (查询无认证)
```

**查询参数**: `?ds=xxx`

---

### 保存玻璃孔位

```
POST /api/v1/settings/glass-holes
Auth: Bearer Token
```

```json
{
  "id": 1,
  "name": "圆形孔",
  "config": { "radius": 50 }
}
```

省略 `id` 创建新记录，包含 `id` 更新已有记录。

---

### 删除玻璃孔位

```
DELETE /api/v1/settings/glass-holes?id=1
Auth: Bearer Token
```

---

### 获取绘图行为配置

```
GET /api/v1/settings/drawing-behaviors
Auth: Bearer Token (查询无认证)
```

**查询参数**: `?ds=xxx`

---

### 设置绘图行为配置

```
POST /api/v1/settings/drawing-behaviors
Auth: Bearer Token
```

```json
{
  "snapToGrid": true,
  "gridSize": 10
}
```

---

### 更改计价方式

```
POST /api/v1/settings/square
Auth: Bearer Token
```

```json
{
  "method": "面积计价",
  "value": "area"
}
```

---

### 更改方向模式

```
POST /api/v1/settings/direction-mode
Auth: Bearer Token
```

```json
{
  "mode": "standard"
}
```

---

### 反转方向

```
POST /api/v1/settings/reverse-direction
Auth: Bearer Token
```

**响应 200**: 反转锁方向设置。

---

### 保存自定义方向名称

```
POST /api/v1/settings/custom-direction-names
Auth: Bearer Token
```

```json
{
  "left": "左开",
  "right": "右开"
}
```

---

### 清除账号数据

```
POST /api/v1/settings/clear-account
Auth: Bearer Token
```

**响应 200**: 删除当前数据库所有业务数据（保留用户账号）。

---

### 创建注册用户

```
POST /api/v1/settings/registrant-user
Auth: Bearer Token
```

```json
{
  "username": "newuser",
  "password": "123456",
  "displayName": "新用户",
  "companyName": "公司名"
}
```

---

### 参数化图案列表

```
GET /api/v1/settings/parametric-patterns
Auth: Bearer Token (查询无认证)
```

**查询参数**: `?ds=xxx`

---

### 保存参数化图案

```
POST /api/v1/settings/parametric-patterns
Auth: Bearer Token
```

```json
{
  "id": "uuid-or-undefined",
  "name": "花纹1",
  "data": { ... }
}
```

---

### 删除参数化图案

```
DELETE /api/v1/settings/parametric-patterns?id=xxx
Auth: Bearer Token
```

---

### 版本信息

```
GET /api/v1/settings/version
Auth: None
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "version": "2.0.0",
    "name": "Smart Door",
    "description": "Smart Door Backend System",
    "nodeVersion": "v20.x.x",
    "platform": "darwin",
    "buildDate": "2026-06-26"
  }
}
```

---

## 文件管理 File

### 上传图片

```
POST /api/v1/files/upload
Auth: Bearer Token
Content-Type: multipart/form-data
```

**表单字段**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image | file | 是 | 图片文件（最大 50MB） |
| id | string | 否 | 图片 ID（不传则自动生成 UUID） |
| series | string | 否 | 图片系列标识 |

**响应 200**:

```json
{
  "code": 200,
  "data": { "id": "uuid", "url": "smartdoor/uuid.png" }
}
```

---

### 获取图片

```
GET /api/v1/files/:id
Auth: None
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称（用于多租户隔离） |

**响应**: 图片二进制内容（Content-Type: image/png）。

---

### 删除图片

```
DELETE /api/v1/files?id=xxx
Auth: Bearer Token (可选)
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 图片 ID |
| ds | string | 否 | 数据库名称 |
| relatedId | string | 否 | 关联 ID |
| orderDs | string | 否 | 订单 DS |

---

### 获取模板

```
GET /api/v1/files/templates
Auth: None
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "name1__type1": "content...",
    "name2__type2": "content..."
  }
}
```

---

### 获取更新信息

```
GET /api/v1/files/update-info
Auth: None
```

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| ds | string | 否 | 数据库名称 |

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "message": "更新内容",
    "version": "2.0.0",
    "createdAt": "2026-06-26T00:00:00.000Z"
  }
}
```

---

## 扫码设备 Scanner

### 添加扫码设备

```
POST /api/v1/scanner
Auth: Bearer Token
```

```json
{
  "name": "扫码枪1",
  "scannerType": "barcode",
  "config": { "port": "/dev/ttyUSB0" }
}
```

---

### 删除扫码设备

```
DELETE /api/v1/scanner?id=1
Auth: Bearer Token
```

---

### 设置打印机

```
POST /api/v1/scanner/printers
Auth: Bearer Token
```

```json
{
  "printer1": "标签打印机A",
  "printer2": "标签打印机B"
}
```

---

## 短链接 ShortLink

### 创建短链接

```
POST /api/v1/shortlink
Auth: Bearer Token
```

**请求体** (JSON):

```json
{
  "url": "https://example.com/long-url"
}
```

或直接传字符串：

```
POST /api/v1/shortlink
Content-Type: text/plain

https://example.com/long-url
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "id": "a1b2c3d4",
    "url": "https://example.com/long-url",
    "short_url": "/s/a1b2c3d4"
  }
}
```

---

### 获取短链接

```
GET /api/v1/shortlink/:id
Auth: Bearer Token
```

**响应 200**:

```json
{
  "code": 200,
  "data": {
    "id": "a1b2c3d4",
    "url": "https://example.com/long-url",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 短链接重定向

```
GET /s/:linkId
Auth: None
```

**响应**: 302 重定向到目标 URL。

---

## 健康检查

### 基础健康检查

```
GET /healthz
Auth: None
```

**响应 200**:

```json
{ "status": "ok" }
```

---

### 就绪检查

```
GET /readyz
Auth: None
```

**响应 200**:

```json
{ "status": "ready", "db": "ok" }
```

**响应 503**（数据库不可用）:

```json
{ "status": "not ready", "db": "unreachable" }
```

---

## 传统兼容接口

以下端点保留以兼容旧版客户端：

| 端点 | 说明 |
|------|------|
| `POST /1` | 传统 API 兼容入口（通过 `param1` 参数分发） |
| `POST /login` | 传统登录接口（转发至 `/1`） |

### 传统接口调度机制

旧版客户端使用 `POST /1` 发送请求，通过 `param1` 参数指定操作类型。系统通过 `ACTION_MAP` 将旧参数映射到新版 Service 函数。

### param1 映射表

| param1 | 映射到 | 对应 v1 端点 |
|--------|--------|-------------|
| `login` | 登录认证 | `POST /api/v1/auth/login` |
| `change_password` | 修改密码 | `POST /api/v1/auth/change-password` |
| `getUserConfig` | 获取用户配置 | `GET /api/v1/auth/config` |
| `GetProcedures` | 获取工序 | `GET /api/v1/auth/procedures` |
| `getClientsInfo` | 客户列表 | `GET /api/v1/clients` |
| `getLatestClientsInfo` | 最新客户 | `GET /api/v1/clients/latest` |
| `checkClient` | 查找/创建客户 | `POST /api/v1/clients/check` |
| `updateClientInfo` / `updateClientsInfo` / `UpdateClientsInfo` / `updateCustomerInfo` | 更新客户 | `PUT /api/v1/clients` |
| `deleteClientInfo` | 删除客户 | `DELETE /api/v1/clients/:id` |
| `makeReceipt` | 创建回执 | `POST /api/v1/clients/receipt` |
| `getTableData` | 表格数据 | `GET /api/v1/orders/table` |
| `getTableDataForTerminal` | 终端数据 | `GET /api/v1/orders/table/terminal` |
| `getMoreTableDate` | 更多表格数据 | `GET /api/v1/orders/table` |
| `getMoreOrders` | 分页订单 | `GET /api/v1/orders/more` |
| `getorders` | 订单列表 | `GET /api/v1/orders` |
| `detail` | 订单详情 | `GET /api/v1/orders/detail` |
| `combine` | 合并订单 | `POST /api/v1/orders/combine` |
| `deleteHui` / `deleteRow` | 删除订单 | `DELETE /api/v1/orders` |
| `updateRowData` | 更新订单 | `PUT /api/v1/orders` |
| `getProgress` / `getProgressData` / `getProgressList` | 进度列表 | `GET /api/v1/progress` |
| `getProgressForTerminal` | 终端进度 | `GET /api/v1/progress` |
| `getProductionProgressData` / `getProductionProgress` / `getMoreProgress` | 生产进度 | `GET /api/v1/progress` |
| `getLabelData` | 标签数据 | `GET /api/v1/progress/labels` |
| `getScanQRcode` | 扫码数据 | `GET /api/v1/progress/qrcode` |
| `getProcessCounts` | 工序计数 | `GET /api/v1/progress/counts` |
| `PaymentCollection` | 收款更新 | `POST /api/v1/progress/payment` |
| `updatePaymentCollection` | 收款更新 | `POST /api/v1/progress/payment` |
| `updateProgress` | 更新进度 | `POST /api/v1/progress/update` |
| `deleteProgress` | 删除进度 | `DELETE /api/v1/progress` |
| `deleteProgressForFullOrder` | 删除整单进度 | `DELETE /api/v1/progress` |
| `clearProgress` | 清除进度 | `DELETE /api/v1/progress` |
| `setProcedures` / `SetProcedures` | 设置工序 | `POST /api/v1/progress/procedures` |
| `finance_checkSystem` | 财务系统检查 | — |
| `finance_getOrderFinanceSummary` | 财务汇总 | `GET /api/v1/finance/summary` |
| `finance_checkOrderPayment` | 付款检查 | `POST /api/v1/finance/check-payment` |
| `finance_getPaymentStats` | 收款统计 | `GET /api/v1/finance/payment-stats` |
| `finance_getCustomerStatement` | 对账单 | `GET /api/v1/finance/customer-statement` |
| `finance_getOrderDetail` | 订单财务详情 | `GET /api/v1/finance/order-detail` |
| `finance_getCustomerBalance` | 客户余额 | `GET /api/v1/finance/customer-balance` |
| `finance_previewAllocation` | 预览分配 | `POST /api/v1/finance/preview-allocation` |
| `finance_previewPrepaymentAllocation` | 预览预付款分配 | `POST /api/v1/finance/preview-prepayment-allocation` |
| `finance_executePrepaymentAllocation` | 执行预付款分配 | `POST /api/v1/finance/execute-prepayment-allocation` |
| `finance_addPayment` | 添加收款 | `POST /api/v1/finance/add-payment` |
| `finance_addOrderPayment` | 订单收款 | `POST /api/v1/finance/add-order-payment` |
| `finance_addOrderAdjustment` | 订单调整 | `POST /api/v1/finance/add-order-adjustment` |
| `finance_addCustomerAdjustment` | 客户调整 | `POST /api/v1/finance/add-customer-adjustment` |
| `initializDiao` | 初始化吊门 | `GET /api/v1/formulas/diao-init` |
| `initializPing` | 初始化平门 | `GET /api/v1/formulas/ping-init` |
| `getFormulaName` | 公式名称 | `GET /api/v1/formulas/names` |
| `getDiaoFormulas` | 吊门公式 | `GET /api/v1/formulas/diao` |
| `getDiaoFormulasSingle` | 单个吊门公式 | `GET /api/v1/formulas/diao-single` |
| `getDiaoPrice` | 吊门价格 | `GET /api/v1/formulas/diao-price` |
| `getPingPrice` | 平门价格 | `GET /api/v1/formulas/ping-price` |
| `getFormulas` | 公式列表 | `GET /api/v1/formulas` |
| `queryFormula` | 查询公式 | `GET /api/v1/formulas/query` |
| `saveFormula` | 保存公式 | `POST /api/v1/formulas` |
| `deleteFormula` | 删除公式 | `DELETE /api/v1/formulas` |
| `getAddPrice` | 加价列表 | `GET /api/v1/settings/add-prices` |
| `addAddPrice` | 添加加价 | `POST /api/v1/settings/add-prices` |
| `deleteAddPrice` | 删除加价 | `DELETE /api/v1/settings/add-prices` |
| `editPrice` | 编辑加价 | `PUT /api/v1/settings/add-prices` |
| `glassHole` | 保存玻璃孔位 | `POST /api/v1/settings/glass-holes` |
| `deleteGlassHole` | 删除玻璃孔位 | `DELETE /api/v1/settings/glass-holes` |
| `drawingBehaviors` / `DrawingBehaviors` | 绘图行为 | `GET/POST /api/v1/settings/drawing-behaviors` |
| `changeSquare` | 改变计价方式 | `POST /api/v1/settings/square` |
| `changeDecleration` | 修改声明 | `POST /api/v1/settings/declaration` |
| `changeDirectionMode` | 方向模式 | `POST /api/v1/settings/direction-mode` |
| `reverseDirection` | 反转方向 | `POST /api/v1/settings/reverse-direction` |
| `saveCustomDirectionNames` | 自定义方向名 | `POST /api/v1/settings/custom-direction-names` |
| `getParametricPattern` / `getParametricPatterns` / `parametric-patterns` / `parametricPattern` / `parametricPatterns` | 参数化图案 | `GET /api/v1/settings/parametric-patterns` |
| `upsertParametricPattern` | 保存图案 | `POST /api/v1/settings/parametric-patterns` |
| `deleteParametricPattern` | 删除图案 | `DELETE /api/v1/settings/parametric-patterns` |
| `getPattern` / `getPatterns` / `getDoorFlower` / `getDoorFlowers` / `doorFlower` / `doorFlowers` | 图案查询 | `GET /api/v1/settings/parametric-patterns` |
| `getTemplates` | 获取模板 | `GET /api/v1/files/templates` |
| `getimage` | 获取图片 | `GET /api/v1/files/:id` |
| `saveImage` | 保存图片 | `POST /api/v1/files/upload` |
| `deleteImage` | 删除图片 | `DELETE /api/v1/files` |
| `CheckVersionAPP` | 版本检查 | `GET /api/v1/settings/version` |
| `getUpdataInfo` | 更新信息 | `GET /api/v1/files/update-info` |
| `addScanner` / `AddScanner` | 添加扫码设备 | `POST /api/v1/scanner` |
| `DeleteScanner` | 删除扫码设备 | `DELETE /api/v1/scanner` |
| `setPrinters` / `SetPrinters` | 设置打印机 | `POST /api/v1/scanner/printers` |
| `shortlink_create` | 创建短链接 | `POST /api/v1/shortlink` |
| `shortlink_get` | 获取短链接 | `GET /api/v1/shortlink/:id` |

## 附录

### 错误码参考

| Code | HTTP 状态码 | 说明 |
|------|-------------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未授权 / Token 无效 |
| 403 | 403 | 权限不足 / 账户禁用 |
| 404 | 404 | 资源不存在 |
| 500 | 500 | 服务器内部错误 |

### 订单状态枚举

| 值 | 说明 |
|------|------|
| `pending` | 待处理 |
| `processing` | 生产中 |
| `completed` | 已完成 |
| `cancelled` | 已取消 |

### 门类型枚举

| 值 | 说明 |
|------|------|
| `ping` | 平开 |
| `diao` | 吊滑 |

### 财务状态枚举

| 值 | 说明 |
|------|------|
| `未付清` | 未完全付款 |
| `部分付款` | 已部分付款 |
| `已结清` | 已完全结清 |
| `已结清(清零)` | 通过清零操作标记为已结清 |
