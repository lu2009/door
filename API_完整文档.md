# Smart Door 后端 REST API 完整文档

> 基于 `backend-new_副本` 代码解析生成（覆盖 100% API 接口）
>
> 基于 `backend-new_副本` 代码解析生成（覆盖 100% dispatch + handlers 接口）
>
> **入口：** `POST/GET /1?param1=<action>&param2=<ds>&param3=&param4=`
> 或 `POST/GET /login?param1=<action>&param2=<ds>`
>
> 请求体：`application/json` 或 `application/x-www-form-urlencoded`
>
> 此外还有独立路由：`/s/<link_id>`（短链接）、`/healthz` / `/readyz`（健康检查）、Socket.IO（实时推送）

---

## 目录

1. [认证模块](#1-认证模块)
2. [客户管理模块](#2-客户管理模块)
3. [订单模块](#3-订单管理模块)
4. [进度管理模块](#4-进度管理模块)
5. [财务模块](#5-财务管理模块)
6. [文件/图片模块](#6-文件图片模块)
7. [公式/物料模块](#7-公式物料模块)
8. [设置模块](#8-系统设置模块)
9. [扫码/打印模块](#9-扫码打印模块)
10. [短链接模块](#10-短链接模块)
11. [装饰件/参数化模块](#11-装饰件参数化模块)
12. [短链接重定向](#12-短链接重定向)
13. [健康检查端点](#13-健康检查端点)
14. [Socket.IO 实时事件](#14-socketio-实时事件)
15. [全局错误处理](#15-全局错误处理)

---

## 通用参数说明

| 参数 | 位置 | 说明 |
|------|------|------|
| `param1` | URL Query / Body | 接口标识（action name），大小写不敏感 |
| `param2` | URL Query / Body | 租户数据库名（ds），大多数接口必填 |
| `param3` | URL Query / Body | 次级参数（含义因接口而异） |
| `param4` | URL Query / Body | 三级参数（含义因接口而异） |

## 通用响应格式

```json
// 成功
{"code": 200, "data": {...}, "message": "操作成功"}

// 失败
{"code": 400, "data": null, "message": "错误描述"}
{"code": 404, "data": null, "message": "资源不存在"}
{"code": 500, "data": null, "message": "服务器内部错误"}
```

---

## 1. 认证模块

文件：`handlers/auth.py`

### 1.1 登录

| 项目 | 内容 |
|------|------|
| **param1** | `login` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 否 | 用户名，也接受 `username`/`name`/`user` |
| param3 | Query/Body | 否 | 密码，也接受 `password`/`pwd` |
| username | Body | 否 | 用户名 |
| password | Body | 否 | 密码 |

**返回值：** `200`

```json
[
  {
    "statu": 1,
    "userinfo": {
      "name": "用户名",
      "ds": "租户库名",
      "registrant": "注册商",
      "token": "登录token",
      "config": "{...}"
    },
    "msg": "登录成功"
  }
]
```

> 支持多种状态返回：`no_password`（请先设置密码）、`trial_expired`（试用次数已用完）、`wrong_password`（密码错误）、`customer_temp_success`（客户临时登录）

---

### 1.2 修改密码

| 项目 | 内容 |
|------|------|
| **param1** | `change_password` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 是 | 用户名 |
| param3 | Query/Body | 是 | 旧密码（也接受 `old_password`/`oldPassword`/`oldPwd`/`password`） |
| param4 | Query/Body | 是 | 新密码（也接受 `new_password`/`newPassword`/`newPwd`） |

**返回值：**

```json
// 成功
{"statu": 1, "message": "密码修改成功"}
// 失败
{"statu": 0, "message": "错误信息"}
```

---

### 1.3 获取用户配置

| 项目 | 内容 |
|------|------|
| **param1** | `getuserconfig` |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 是 | 用户名(ds) |

**返回值：** `200`

```json
[
  {
    "statu": 1,
    "userinfo": {
      "name": "用户名",
      "ds": "租户库名",
      "registrant": "注册商"
    },
    "msg": "登录成功"
  }
]
```

---

### 1.4 获取工序配置

| 项目 | 内容 |
|------|------|
| **param1** | `GetProcedures` / `getprocedures` |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 是 | 租户ds |

**返回值：**

```json
{"code": 200, "data": [...工序列表...], "message": "获取成功"}
```

---

## 2. 客户管理模块

文件：`handlers/clients.py`

### 2.1 获取客户列表

| 项目 | 内容 |
|------|------|
| **param1** | `getClientsInfo` / `getclientsinfo` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": [...客户列表...], "message": null}
```

---

### 2.2 获取最新客户列表

| 项目 | 内容 |
|------|------|
| **param1** | `getLatestClientsInfo` / `getlatestclientsinfo` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 搜索关键字 |

**返回值：**

```json
{"code": 200, "data": [...客户列表...], "message": null}
```

---

### 2.3 更新客户信息

| 项目 | 内容 |
|------|------|
| **param1** | `updateCustomerInfo` / `updateClientsInfo` / `UpdateClientsInfo` / `updateClientInfo` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 客户名 |
| param4 | Query/Body | 否 | 电话 |
| param5 | Query | 否 | 客户编号（当 param3 存在时，param4=字段值, param5=客户编码） |

**Body 支持字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| 回执单号 / order_no / orderNo / OrderID / orderId / 单号 | string | 订单编号（更新订单相关字段时必填） |
| 日期 / 截止日期 / order_date / delivery_date / date / lastDay | string | 日期更新 |
| 订单备注 | string | 订单备注 |
| 定金 | number | 定金金额 |
| 安装地址 | string | 安装地址 |
| ping_hui / diao_hui / door_specs | - | 门扇规格数据 |
| 客户 / name | string | 客户名称 |
| 电话 | string | 联系电话 |

**返回值：**

```json
// 简单更新
{"code": 200, "message": "更新成功"}

// 订单相关更新
{"code": 200, "data": {...更新后数据...}, "message": "更新成功"}
```

---

### 2.4 检查客户

| 项目 | 内容 |
|------|------|
| **param1** | `checkClient` / `checkclient` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 客户名称 |
| param4 | Query/Body | **是** | 电话号码 |

**返回值：**

```json
{"code": 200, "data": {...客户数据...}}
```

---

### 2.5 录入订单（开单）

| 项目 | 内容 |
|------|------|
| **param1** | `makeReceipt` / `makereceipt` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**Body：** 客户信息及订单明细（JSON Object）

**返回值：**

```json
{"code": 200, "data": {...订单数据...}, "message": "录入成功"}
```

---

### 2.6 删除客户信息

| 项目 | 内容 |
|------|------|
| **param1** | `deleteClientInfo` / `deleteclientinfo` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 / id | Query/Body | **是** | 客户标识（支持：id / 编号 / 客户编号 / client_code / customerCode / code / 客户 / customer_name / customer / client / name / 客户名 / clientName） |

**返回值：**

```json
{"code": 200, "message": "删除成功"}
```

---

## 3. 订单管理模块

文件：`handlers/orders.py`

### 3.1 获取订单列表

| 项目 | 内容 |
|------|------|
| **param1** | `getorders` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param4 | Query/Body | 否 | 扩展参数 |

**Body：**
- 若为数组：视为订单编号列表，返回对应订单详情
- 若为对象：传给 `OrderService.get_orders()` 进行筛选查询

**返回值：**

```json
// 数组查询（按单号详情）
{"code": 200, "data": {...单号->详情映射...}, "message": "数据获取成功"}

// 对象查询
{"code": 200, "data": [...订单列表...], "message": "数据获取成功"}
```

---

### 3.2 获取表格数据

| 项目 | 内容 |
|------|------|
| **param1** | `getTableData` / `gettabledata` |
| **HTTP** | **GET only** |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query | **是** | 租户数据库名 |
| param3 | Query | 否 | 搜索关键字 |
| param4 | Query | 否 | 安装地址 |
| keyword | Query | 否 | 搜索关键字 |
| address | Query | 否 | 安装地址 |
| startDate / start_date | Query | 否 | 开始日期 |
| endDate / end_date | Query | 否 | 结束日期 |

**返回值：**

```json
{"code": 200, "data": {...表格数据...}, "message": "数据获取成功"}
```

---

### 3.3 获取更多订单（分页）

| 项目 | 内容 |
|------|------|
| **param1** | `getMoreOrders` / `getmoreorders` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 搜索关键字 |
| keyword | Query/Body | 否 | 搜索关键字 |
| page | Query/Body | 否 | 页码（默认1） |
| per_page / pageSize | Query/Body | 否 | 每页条数（默认50） |

**返回值：**

```json
{
  "code": 200,
  "data": [...订单列表...],
  "total": 100,
  "page": 1,
  "pages": 10
}
```

---

### 3.4 获取更多表格数据

| 项目 | 内容 |
|------|------|
| **param1** | `getMoreTableDate` / `getmoretabledate` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

同 `gettabledata`，参数完全一致。

---

### 3.5 获取订单详情

| 项目 | 内容 |
|------|------|
| **param1** | `detail` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 单号（也接受 `order_no`/`orderNo`/`OrderID`/`order_id`/`orderId`/`回执单号`/`单号`/`id`） |
| id | Body | 否 | 订单ID |

**返回值：**

```json
{"code": 200, "data": {"diao_hui": [...], "ping_hui": [...]}, "message": "数据获取成功"}
```

---

### 3.6 合并订单

| 项目 | 内容 |
|------|------|
| **param1** | `combine` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| Body | - | **是** | 合并数据 |

**返回值：**

```json
{"code": 200, "message": "合并成功"}
```

---

### 3.7 删除记录（单行/回执）

| 项目 | 内容 |
|------|------|
| **param1** | `deleteHui` / `deleteRow` / `deleterow`/ `deletehui` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 待删除的单号/ID |
| Body / args | Body/Query | 否 | 可包含 `id`、`order_no`、`回执单号` 等 |

**返回值：**

```json
// 全部成功
{"code": 200, "data": {"deleted": ["id1", "id2"]}, "message": "删除成功"}
// 部分失败
{"code": 200, "data": {"deleted": ["id1"], "missing": ["id2"]}, "message": "删除成功 1 条，未找到 1 条"}
```

---

### 3.8 更新行数据

| 项目 | 内容 |
|------|------|
| **param1** | `updateRowData` / `updaterowdata` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**Body：** `{"id": "单号", ...要更新的字段...}`（JSON Object）

**返回值：**

```json
{"code": 200, "message": "数据更新成功"}
```

---

### 3.9 终端获取表格数据

| 项目 | 内容 |
|------|------|
| **param1** | `getTableDataForTerminal` / `gettabledataforterminal` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query | **是** | 租户ds_终端ID（格式：`ds_id`，会自动拆分） |

**返回值：**

```json
{"code": 200, "data": {"tableData": [...]}, "message": "数据获取成功"}
```

---

## 4. 进度管理模块

文件：`handlers/progress.py`

### 4.1 获取生产进度（多别名）

| 项目 | 内容 |
|------|------|
| **param1** | `getProgress` / `getprogressdata` / `getprogresslist` / `getproductionprogress` / `getproductionprogressdata` / `getprogressforterminal` / `getmoreprogress` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名（支持 `ds_月份` 格式） |
| param3 | Query/Body | 否 | 单号（`getmoreprogress` 忽略此参数） |
| order_no | Body | 否 | 单号 |

**返回值：**

```json
{"code": 200, "data": {"progressData": [...进度记录...]}, "message": "数据获取成功"}
```

---

### 4.2 获取标签数据

| 项目 | 内容 |
|------|------|
| **param1** | `getLabelData` / `getlabeldata` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 单号 |

**返回值：**

```json
{"code": 200, "data": [...标签行...], "message": "查询成功"}
```

---

### 4.3 扫码查询

| 项目 | 内容 |
|------|------|
| **param1** | `getScanQRcode` / `getscanqrcode` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：** 同 `getlabeldata`

**返回值：**

```json
{"code": 200, "data": [...扫码进度行...], "message": "查询成功"}
```

---

### 4.4 获取工序数量统计

| 项目 | 内容 |
|------|------|
| **param1** | `getProcessCounts` / `getprocesscounts` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {"progressData": [...全部进度记录...]}, "message": "数据获取成功"}
```

---

### 4.5 更新生产进度

| 项目 | 内容 |
|------|------|
| **param1** | `updateProgress` / `updataProgress` / `updataprogress` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 工序标签（如 `工序1`） |
| param4 | Query/Body | 否 | 扩展工序名 |

**Body：** 单号数组（`["单号1", "单号2"]`）或对象

**返回值：**

```json
{"code": 200, "message": "更新成功，共更新 N 条记录"}
```

---

### 4.6 更新收款

| 项目 | 内容 |
|------|------|
| **param1** | `PaymentCollection` / `updatePaymentCollection` / `updataPaymentCollection` / `updatePayment` / `paymentcollection` / `updatepaymentcollection` / `updatepayment` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 单号 |
| param4 | Query/Body | 否 | 收款金额 |

**返回值：**

```json
{"code": 200, "data": {...数据...}, "message": "收款更新成功"}
```

---

### 4.7 删除进度

| 项目 | 内容 |
|------|------|
| **param1** | `deleteProgress` / `deleteProgressForFullOrder` / `clearProgress` / `deleteprogress` / `deleteprogressforfullorder` / `clearprogress` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 工序名 |
| param4 | Query/Body | 否 | 单号（GET模式） |

**Body（POST模式）：** 单号数组 `["单号1", "单号2"]`

**返回值：**

```json
{"code": 200, "message": "进度删除成功"}
```

---

### 4.8 设置工序

| 项目 | 内容 |
|------|------|
| **param1** | `setProcedures` / `SetProcedures` / `setprocedures` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**Body：** 工序数据对象

**返回值：**

```json
{"code": 200, "data": null, "message": "工序设置保存成功"}
```

---

## 5. 财务管理模块

文件：`handlers/finance.py`

### 5.1 检测财务系统

| 项目 | 内容 |
|------|------|
| **param1** | `finance_checkSystem` / `finance_checksystem` |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | 否 | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {"hasNewFinance": true/false}, "message": "ok"}
```

---

### 5.2 获取订单财务汇总

| 项目 | 内容 |
|------|------|
| **param1** | `finance_getOrderFinanceSummary` / `finance_getorderfinancesummary` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {...财务汇总...}, "message": "ok"}
```

---

### 5.3 检查订单付款状态

| 项目 | 内容 |
|------|------|
| **param1** | `finance_checkOrderPayment` / `finance_checkorderpayment` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |

**Body：** 订单数据数组

**返回值：**

```json
{"code": 200, "data": {"orders": {...映射...}}, "message": "ok"}
```

---

### 5.4 新增收款记录

| 项目 | 内容 |
|------|------|
| **param1** | `finance_addPayment` / `finance_addpayment` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 客户编号 | string | 客户编号 |
| 收款金额 | number | 必须非零 |
| 收款日期 | string | 日期字符串 |

**返回值：**

```json
{"code": 200, "data": {...}, "message": "收款成功"}
```

---

### 5.5 新增订单付款

| 项目 | 内容 |
|------|------|
| **param1** | `finance_addOrderPayment` / `finance_addorderpayment` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 客户编号 | string | 客户编号 |
| 收款金额 | number | 必须为正 |
| 收款日期 | string | 日期字符串 |

**返回值：** `{"code": 200, "data": {...}, "message": "..."}`

---

### 5.6 新增订单调整

| 项目 | 内容 |
|------|------|
| **param1** | `finance_addOrderAdjustment` / `finance_addorderadjustment` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 回执单号 | string | 订单编号 |
| 调整金额 | number | 必须非零 |

**返回值：**

```json
{"code": 200, "data": null, "message": "调整成功"}
```

---

### 5.7 新增客户调整

| 项目 | 内容 |
|------|------|
| **param1** | `finance_addCustomerAdjustment` / `finance_addcustomeradjustment` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 客户编号 | string | 客户编号 |
| 调整金额 | number | 必须非零 |

**返回值：**

```json
{"code": 200, "data": null, "message": "调整成功"}
```

---

### 5.8 获取付款统计

| 项目 | 内容 |
|------|------|
| **param1** | `finance_getPaymentStats` / `finance_getpaymentstats` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds + 客户编号 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 客户编号 |

**返回值：**

```json
{"code": 200, "data": {...付款统计...}, "message": "ok"}
```

---

### 5.9 获取客户对账单

| 项目 | 内容 |
|------|------|
| **param1** | `finance_getCustomerStatement` / `finance_getcustomerstatement` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds + 客户编号 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 客户编号 |
| param4 | Query/Body | 否 | 查询范围参数 |

**返回值：**

```json
{"code": 200, "data": {...对账单...}, "message": "ok"}
```

---

### 5.10 获取订单财务明细

| 项目 | 内容 |
|------|------|
| **param1** | `finance_getOrderDetail` / `finance_getorderdetail` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | 否 | 回执单号 |

**返回值：**

```json
{"code": 200, "data": {...订单财务明细...}, "message": "ok"}
```

---

### 5.11 获取客户余额

| 项目 | 内容 |
|------|------|
| **param1** | `finance_getCustomerBalance` / `finance_getcustomerbalance` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds + 客户编号 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / body.ds | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 客户编号 |
| param4 | Query/Body | 否 | 天数范围 |

**返回值：**

```json
{"code": 200, "data": {...余额数据...}, "message": "ok"}
```

---

### 5.12 预览预收款分配

| 项目 | 内容 |
|------|------|
| **param1** | `finance_previewPrepaymentAllocation` / `finance_previewprepaymentallocation` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 客户编号 | string | 客户编号 |
| 分配金额 | number | 必须为正 |

**返回值：**

```json
{"code": 200, "data": {...预览结果...}, "message": "ok"}
```

---

### 5.13 执行预收款分配

| 项目 | 内容 |
|------|------|
| **param1** | `finance_executePrepaymentAllocation` / `finance_executeprepaymentallocation` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：** 同预览接口

**返回值：**

```json
{"code": 200, "data": {...分配结果...}, "message": "分配成功"}
```

---

### 5.14 预览收款分配

| 项目 | 内容 |
|------|------|
| **param1** | `finance_previewAllocation` / `finance_previewallocation` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**Body 必填字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| ds | string | 租户数据库名 |
| 客户编号 | string | 客户编号 |
| 收款金额 | number | 必须为正 |

**返回值：**

```json
{"code": 200, "data": {...预览结果...}, "message": "ok"}
```

---

## 6. 文件/图片模块

文件：`handlers/files.py`

### 6.1 保存图片

| 项目 | 内容 |
|------|------|
| **param1** | `saveImage` / `saveimage` |
| **HTTP** | POST (multipart/form-data) |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 图片命名空间(ds) |
| param3 | Query/Body | 否 | 订单数据库名 |
| id | Form | **是** | 图片ID |
| series | Form | **是** | 图片系列 |
| image | File | **是** | 图片文件（仅支持 PNG/JPG/JPEG） |

**返回值：**

```json
{"code": 200, "data": {"saved_id": "图片ID"}, "message": "图片保存成功"}
```

---

### 6.2 获取图片

| 项目 | 内容 |
|------|------|
| **param1** | `getimage` |
| **HTTP** | GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query | **是** | 图片ID |
| param3 / param4 | Query | 否 | 图片命名空间(ds) |

**返回值：** `image/jpeg` 二进制流（Cache-Control: no-store）

---

### 6.3 删除图片

| 项目 | 内容 |
|------|------|
| **param1** | `deleteImage` / `deleteimage` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 否 | 注册商/命名空间 |
| param3 | Query/Body | 否 | 图片ID |
| param4 | Query/Body | 否 | 关联ID |
| param5 | Query/Body | 否 | 订单数据库名 |

**返回值：**

```json
{"code": 200, "message": "图片删除并更新成功"}
```

---

### 6.4 获取模板

| 项目 | 内容 |
|------|------|
| **param1** | `getTemplates` / `gettemplates` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds/公司名/用户名 |

**返回值：** 模板对象（格式由 `FileService.get_templates` 决定）

---

### 6.5 获取更新通知

| 项目 | 内容 |
|------|------|
| **param1** | `getUpdataInfo` / `getupdatainfo` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds/公司名/用户名 |

**返回值：**

```json
// 有更新
{"code": 200, "data": null, "message": "更新内容", "version": "版本号"}
// 无更新
{"code": 200, "message": "none"}
```

---

## 7. 公式/物料模块

文件：`handlers/formulas.py`

### 7.1 初始化吊柜公式

| 项目 | 内容 |
|------|------|
| **param1** | `initializDiao` / `initializdiao` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {...初始数据...}}
```

---

### 7.2 初始化平柜公式

| 项目 | 内容 |
|------|------|
| **param1** | `initializPing` / `initializping` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {...初始数据...}}
```

---

### 7.3 获取公式列表

| 项目 | 内容 |
|------|------|
| **param1** | `getFormulas` / `getformulas` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 | Query/Body | **是** | 公式类型 |

**返回值：**

```json
{"code": 200, "data": [...公式列表...], "message": "获取公式成功"}
```

---

### 7.4 保存公式

| 项目 | 内容 |
|------|------|
| **param1** | `saveFormula` / `saveformula` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**Body：** 公式数据对象

**返回值：**

```json
{"code": 200, "message": "保存成功"}
```

---

### 7.5 删除公式

| 项目 | 内容 |
|------|------|
| **param1** | `deleteFormula` / `deleteformula` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |
| param3 / body.id | Query/Body | **是** | 公式ID |

**返回值：**

```json
{"code": 200, "message": "删除成功"}
```

---

### 7.6 查询公式

| 项目 | 内容 |
|------|------|
| **param1** | `queryFormula` / `queryformula` |
| **HTTP** | **GET only** |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query | **是** | 租户数据库名 |
| param3 | Query | **是** | 公式名称 |

**返回值：**

```json
{"code": 200, "data": {...公式数据...}, "message": "成功"}
```

---

### 7.7 获取吊柜公式列表

| 项目 | 内容 |
|------|------|
| **param1** | `getDiaoFormulas` / `getdiaoformulas` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 公式数据库名 |
| param3 | Query/Body | 否 | 公式名称 |

**返回值：**

```json
{"code": 200, "data": {...公式数据...}}
```

---

### 7.8 获取单条吊柜公式

| 项目 | 内容 |
|------|------|
| **param1** | `getDiaoFormulasSingle` / `getdiaoformulassingle` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 公式数据库名 |
| param3 | Query/Body | **是** | 订单数据库名 |

**返回值：**

```json
{"code": 200, "data": {...公式数据...}}
```

---

### 7.9 获取公式名称列表

| 项目 | 内容 |
|------|------|
| **param1** | `getFormulaName` / `getformulaname` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": [...公式名称列表...]}
```

---

### 7.10 获取吊柜价格

| 项目 | 内容 |
|------|------|
| **param1** | `getDiaoPrice` / `getdiaoprice` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {...价格数据...}, "message": "获取公式成功"}
```

---

### 7.11 获取平柜价格

| 项目 | 内容 |
|------|------|
| **param1** | `getPingPrice` / `getpingprice` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户数据库名 |

**返回值：**

```json
{"code": 200, "data": {...价格数据...}, "message": "获取公式成功"}
```

---

### 7.12 门玻璃宽查询

| 项目 | 内容 |
|------|------|
| **param1** | `门玻璃宽` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 公式数据库名 |
| param3 | Query/Body | **是** | 公式名称 |

**返回值：**

```json
{"code": 200, "data": {...查询结果...}}
```

---

### 7.13 加价项目-轨道超长查询

| 项目 | 内容 |
|------|------|
| **param1** | `加价项目-轨道超长` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：** 同门玻璃宽

**返回值：**

```json
{"code": 200, "data": {...查询结果...}}
```

---

## 8. 系统设置模块

文件：`handlers/settings.py`

### 8.1 版本检测

| 项目 | 内容 |
|------|------|
| **param1** | `CheckVersionAPP` / `checkversionapp` |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：** 无（忽略所有参数）

**返回值：**

```json
{
  "code": 0,
  "apkUpdateMessage": "1.0.3 修复了一些已知问题",
  "apkUrl": "https://www.samrtdoor.com.cn/apk/smartdoor-1.0.3.apk",
  "apkVersion": "1.0.3",
  "forceApkUpdate": false,
  "forceWebUpdate": false,
  "webUpdateMessage": "样式更新",
  "webUpdateUrl": "https://www.samrtdoor.com.cn/hotupdate/dist-2.2.3.zip",
  "webVersion": "2.2.3"
}
```

---

### 8.2 获取加价项目

| 项目 | 内容 |
|------|------|
| **param1** | `getAddPrice` / `getaddprice` |
| **HTTP** | POST/GET |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "data": [...加价项目列表...], "message": "数据获取成功"}
```

---

### 8.3 添加加价项目

| 项目 | 内容 |
|------|------|
| **param1** | `addAddPrice` / `addaddprice` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds（记录操作日志） |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "data": {...添加的数据...}, "message": "加价项目添加成功"}
```

---

### 8.4 编辑加价项目

| 项目 | 内容 |
|------|------|
| **param1** | `editPrice` / `editprice` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds（记录操作日志） |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "data": {...编辑的数据...}, "message": "加价项目编辑成功"}
```

---

### 8.5 删除加价项目

| 项目 | 内容 |
|------|------|
| **param1** | `deleteAddPrice` / `deleteaddprice` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds（记录操作日志） |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |
| param3 / body.id | Body | 否 | 加价项目ID |

**返回值：**

```json
{"code": 200, "data": {...}, "message": "加价项目删除成功"}
```

---

### 8.6 修改配置声明

| 项目 | 内容 |
|------|------|
| **param1** | `changeDecleration` / `changedecleration` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "data": {...}, "message": "declaration 更新成功"}
```

---

### 8.7 玻璃孔位操作

| 项目 | 内容 |
|------|------|
| **GET:** `glasshole` — 获取玻璃孔位列表 |
| **POST:** `glasshole` — 保存玻璃孔位 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值（GET）：**

```json
{"code": 200, "data": [...玻璃孔位列表...], "message": "数据获取成功"}
```

**返回值（POST）：**

```json
{"code": 200, "message": "保存成功"}
```

---

### 8.8 删除玻璃孔位

| 项目 | 内容 |
|------|------|
| **param1** | `deleteGlassHole` / `deleteglasshole` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds（记录操作日志） |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |
| param3 / body.id | Body | 否 | 孔位ID |

**返回值：**

```json
{"code": 200, "message": "删除成功"}
```

---

### 8.9 绘图行为配置

| 项目 | 内容 |
|------|------|
| **param1** | `drawingBehaviors` / `DrawingBehaviors` / `drawingbehaviors` |
| **HTTP** | GET（查询）/ POST（设置） |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query | **是** | 租户ds（支持 `ds_action` 格式拆分） |

**返回值（GET）：** `{"code": 200, "message": "ok"}`
**返回值（POST）：** `{"code": 200, "message": "绘图行为已更新"}`

---

### 8.10 修改计价方式

| 项目 | 内容 |
|------|------|
| **param1** | `changeSquare` / `changesquare` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "message": "计价方式已更新"}
```

---

### 8.11 修改开向模式

| 项目 | 内容 |
|------|------|
| **param1** | `changeDirectionMode` / `changedirectionmode` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |
| mode / directionMode / param3 | Body/Query | 否 | 开向模式（默认 `default`） |

**返回值：**

```json
{"code": 200, "data": {...}, "message": "开向模式设置成功"}
```

---

### 8.12 锁向反转

| 项目 | 内容 |
|------|------|
| **param1** | `reverseDirection` / `reversedirection` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**返回值：**

```json
{"code": 200, "data": {...}, "message": "锁向反转成功"}
```

---

### 8.13 保存自定义方向名称

| 项目 | 内容 |
|------|------|
| **param1** | `saveCustomDirectionNames` / `savecustomdirectionnames` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**Body：** `{"names": {...方向名称映射...}}` 或直接传方向名称对象

**返回值：**

```json
{"code": 200, "message": "自定义方向名称已保存"}
```

---

### 8.14 清理账户数据

| 项目 | 内容 |
|------|------|
| **param1** | `clearaccount` |
| **HTTP** | POST |
| **权限** | 需要 ops 后台登录会话 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**Body：** 若为数组或包含 `data/rows/selectedRows/selected/orders/list/items` 数组 → 视为清理选中订单
**返回值：**

```json
// 批量清理订单
{"code": 200, "data": {...}, "message": "清理成功"}
// 全量清理
{"code": 200, "message": "账户数据已清理"}
```

---

### 8.15 注册商用户创建

| 项目 | 内容 |
|------|------|
| **param1** | `registrantuser` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 用户名 |
| param3 | Query/Body | **是** | 密码 |

**返回值：**

```json
{"code": 200, "data": {"username": "新用户名"}, "message": "用户 xxx 创建成功"}
```

---

## 9. 扫码/打印模块

文件：`handlers/scanner.py`

### 9.1 添加扫码设备

| 项目 | 内容 |
|------|------|
| **param1** | `addScanner` / `AddScanner` / `addscanner` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |
| param3 | Query/Body | 否 | 注册商 |
| param4 / param5 | Query | 否 | GET 模式：param4=用户名, param5=密码（创建新用户） |

**Body：** `{"scanner": {...}}` 或 `{"data": {...}}`

**返回值：**

```json
{"code": 200, "data": {"id": "设备ID"}, "message": "扫码设备添加成功"}
```

---

### 9.2 删除扫码设备

| 项目 | 内容 |
|------|------|
| **param1** | `DeleteScanner` / `deletescanner` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |
| param3 / body.id | Body/Query | 否 | 设备ID |

**返回值：**

```json
{"code": 200, "message": "扫码设备删除成功"}
```

---

### 9.3 设置打印机

| 项目 | 内容 |
|------|------|
| **param1** | `setPrinters` / `SetPrinters` / `setprinters` |
| **HTTP** | POST |
| **权限** | 需要有效的租户ds |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 租户ds |

**Body：** `{"printers": {...}}` 或 `{"printer": {...}}`

**返回值：**

```json
{"code": 200, "message": "打印机设置已保存"}
```

---

## 10. 短链接模块

文件：`handlers/shortlink.py`

### 10.1 创建短链接

| 项目 | 内容 |
|------|------|
| **param1** | `shortlink_create` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| url | Body/Query | 否 | 目标URL（也接受 `link`/`href`/`target`/`target_url`/`targetUrl`） |
| Body | - | 否 | 若没有URL，则将JSON序列化为短链接内容 |

**返回值：**

```json
{"code": 200, "data": {...短链接数据...}}
```

---

### 10.2 获取短链接

| 项目 | 内容 |
|------|------|
| **param1** | `shortlink_get` |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 / param3 / id | Query/Body | **是** | 链接ID |

**返回值：**

```json
{"code": 200, "data": {...短链接数据...}}
```

---

## 11. 装饰件/参数化模块

文件：`handlers/settings.py`

### 11.1 装饰件/参数化图案 CRUD

支持以下多个 param1 别名：

| 别名 | 说明 |
|------|------|
| `parametricPatterns` / `parametricpatterns` / `parametricPattern` / `parametricpattern` | 获取装饰件列表 |
| `getParametricPatterns` / `getparametricpatterns` / `getParametricPattern` / `getparametricpattern` | 获取装饰件列表 |
| `patterns` / `getPatterns` / `getpatterns` / `getPattern` / `getpattern` | 获取装饰件列表 |
| `doorFlowers` / `doorflowers` / `getDoorFlowers` / `getdoorflowers` / `doorFlower` / `doorflower` / `getDoorFlower` / `getdoorflower` | 获取装饰件列表 |
| `upsertParametricPattern` / `upsertparametricpattern` | 创建/更新装饰件 |
| `deleteParametricPattern` / `deleteparametricpattern` | 删除装饰件 |

---

### 11.2 获取装饰件列表

| 项目 | 内容 |
|------|------|
| **param1** | *多个别名（见上表）* |
| **HTTP** | POST/GET |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | 否 | 默认取 `smartdoor` |

**返回值：**

```json
{"code": 200, "data": [...装饰件列表...], "message": "ok"}
```

---

### 11.3 创建/更新装饰件

| 项目 | 内容 |
|------|------|
| **param1** | `upsertParametricPattern` / `upsertparametricpattern` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 装饰件ID (pattern_id) |

**Body：** 装饰件数据

**返回值：**

```json
{"code": 200, "data": {...保存后的数据...}, "message": "保存成功"}
```

---

### 11.4 删除装饰件

| 项目 | 内容 |
|------|------|
| **param1** | `deleteParametricPattern` / `deleteparametricpattern` |
| **HTTP** | POST |
| **权限** | 无 |

**参数：**

| 参数 | 来源 | 必填 | 说明 |
|------|------|------|------|
| param2 | Query/Body | **是** | 装饰件ID (pattern_id) |

**返回值：**

```json
{"code": 200, "message": "删除成功"}
```

---

## 附录 A：param1 完整索引

按 param1 原文（大小写）索引 -> 对应 Handler 文件：

| param1 | 文件 | 函数名 |
|--------|------|--------|
| `login` | auth.py | `_handle_login` |
| `change_password` | auth.py | `_handle_change_password` |
| `getuserconfig` | auth.py | `_handle_get_user_config` |
| `getprocedures` | auth.py | `_handle_get_procedures` |
| `getclientsinfo` | clients.py | `_handle_get_clients_info` |
| `getlatestclientsinfo` | clients.py | `_handle_get_latest_clients_info` |
| `updateclientinfo` / `updateclientsinfo` / `updatecustomerinfo` | clients.py | `_handle_update_customer_info` |
| `checkclient` | clients.py | `_handle_check_client` |
| `makereceipt` | clients.py | `_handle_make_receipt` |
| `deleteclientinfo` | clients.py | `_handle_delete_client_info` |
| `getorders` | orders.py | `_handle_get_orders` |
| `gettabledata` | orders.py | `_handle_get_table_data` |
| `gettabledataforterminal` | orders.py | `_handle_get_table_data_for_terminal` |
| `getmoretabledate` | orders.py | `_handle_get_more_table_date` |
| `getmoreorders` | orders.py | `_handle_get_more_orders` |
| `detail` | orders.py | `_handle_detail` |
| `combine` | orders.py | `_handle_combine` |
| `deleterow` / `deletehui` | orders.py | `_handle_delete_row` |
| `updaterowdata` | orders.py | `_handle_update_row_data` |
| `getprogress` / `getprogressdata` / `getprogresslist` / `getproductionprogress` / `getproductionprogressdata` / `getprogressforterminal` / `getmoreprogress` | progress.py | `_handle_get_progress` |
| `getlabeldata` | progress.py | `_handle_get_label_data` |
| `getscanqrcode` | progress.py | `_handle_get_scan_qrcode` |
| `getprocesscounts` | progress.py | `_handle_get_process_counts` |
| `updataprogress` / `updatepaymentcollection` / `paymentcollection` / `updatepayment` / `updatapaymentcollection` | progress.py | `_handle_update_payment_collection` / `_handle_update_progress` |
| `deleteprogress` / `deleteprogressforfullorder` / `clearprogress` | progress.py | `_handle_delete_progress_for_full_order` |
| `setprocedures` | progress.py | `_handle_set_procedures` |
| `finance_checksystem` | finance.py | `_handle_check_system` |
| `finance_getorderfinancesummary` | finance.py | `_handle_get_order_finance_summary` |
| `finance_checkorderpayment` | finance.py | `_handle_check_order_payment` |
| `finance_addpayment` | finance.py | `_handle_add_payment` |
| `finance_addorderpayment` | finance.py | `_handle_add_order_payment` |
| `finance_addorderadjustment` | finance.py | `_handle_add_order_adjustment` |
| `finance_addcustomeradjustment` | finance.py | `_handle_add_customer_adjustment` |
| `finance_getpaymentstats` | finance.py | `_handle_get_payment_stats` |
| `finance_getcustomerstatement` | finance.py | `_handle_get_customer_statement` |
| `finance_getorderdetail` | finance.py | `_handle_get_order_detail` |
| `finance_getcustomerbalance` | finance.py | `_handle_get_customer_balance` |
| `finance_previewallocation` | finance.py | `_handle_preview_allocation` |
| `finance_previewprepaymentallocation` | finance.py | `_handle_preview_prepayment_allocation` |
| `finance_executeprepaymentallocation` | finance.py | `_handle_execute_prepayment_allocation` |
| `saveimage` | files.py | `_handle_save_image` |
| `getimage` | files.py | `_handle_get_image` |
| `deleteimage` | files.py | `_handle_delete_image` |
| `gettemplates` | files.py | `_handle_get_templates` |
| `getupdatainfo` | files.py | `_handle_get_update_info` |
| `initializdiao` | formulas.py | `_handle_initializ_diao` |
| `initializping` | formulas.py | `_handle_initializ_ping` |
| `getformulas` | formulas.py | `_handle_get_formulas` |
| `saveformula` | formulas.py | `_handle_save_formula` |
| `deleteformula` | formulas.py | `_handle_delete_formula` |
| `queryformula` | formulas.py | `_handle_query_formula` |
| `getdiaoformulas` | formulas.py | `_handle_get_diao_formulas` |
| `getdiaoformulassingle` | formulas.py | `_handle_get_diao_formulas_single` |
| `getformulaname` | formulas.py | `_handle_get_formula_name` |
| `getdiaoprice` | formulas.py | `_handle_get_diao_price` |
| `getpingprice` | formulas.py | `_handle_get_ping_price` |
| `门玻璃宽` | formulas.py | `_handle_men_bo_li_kuan` |
| `加价项目-轨道超长` | formulas.py | `_handle_jia_jia_xiang_mu` |
| `checkversionapp` | settings.py | `_handle_check_version_app` |
| `getaddprice` | settings.py | `_handle_get_add_price` |
| `addaddprice` | settings.py | `_handle_add_add_price` |
| `editprice` | settings.py | `_handle_edit_price` |
| `deleteaddprice` | settings.py | `_handle_delete_add_price` |
| `changedecleration` | settings.py | `_handle_change_decleration` |
| `glasshole` | settings.py | `_handle_glass_hole` |
| `deleteglasshole` | settings.py | `_handle_delete_glass_hole` |
| `drawingbehaviors` | settings.py | `_handle_drawing_behaviors` |
| `changesquare` | settings.py | `_handle_change_square` |
| `changedirectionmode` | settings.py | `_handle_change_direction_mode` |
| `reversedirection` | settings.py | `_handle_reverse_direction` |
| `savecustomdirectionnames` | settings.py | `_handle_save_custom_direction_names` |
| `clearaccount` | settings.py | `_handle_clear_account` |
| `registrantuser` | settings.py | `_handle_registrant_user` |
| `addscanner` | scanner.py | `_handle_add_scanner` |
| `deletescanner` | scanner.py | `_handle_delete_scanner` |
| `setprinters` | scanner.py | `_handle_set_printers` |
| `shortlink_create` | shortlink.py | `_handle_create` |
| `shortlink_get` | shortlink.py | `_handle_get` |
| `parametricpatterns` / `parametricpattern` / `getparametricpatterns` / `getparametricpattern` / `patterns` / `getpatterns` / `getpattern` / `doorflowers` / `doorflower` / `getdoorflowers` / `getdoorflower` | settings.py | `_handle_get_parametric_patterns` |
| `upsertparametricpattern` | settings.py | `_handle_upsert_parametric_pattern` |
| `deleteparametricpattern` | settings.py | `_handle_delete_parametric_pattern` |

---

---

## 12. 短链接重定向

| 项目 | 内容 |
|------|------|
| **路径** | `GET /s/<link_id>` |
| **权限** | 无 |

**说明：** 根据 ShortLink ID 查找目标 URL，302 重定向。未找到时返回 404。

**返回值：** HTTP 302 重定向，或 `Link not found`（404）

---

## 13. 健康检查端点

### 14.1 存活检查

| 项目 | 内容 |
|------|------|
| **路径** | `GET /healthz` |
| **权限** | 无 |

**返回值：** `{"status": "ok"}`

---

### 14.2 就绪检查（含数据库验证）

| 项目 | 内容 |
|------|------|
| **路径** | `GET /readyz` |
| **权限** | 无 |

**说明：** 执行 `SELECT 1` 验证数据库连接。

**返回值：** `{"status": "ready"}`

---

## 14. Socket.IO 实时事件

> 命名空间：默认 `/`
>
> 认证方式：无（内部信任模型，ds + order_no 即授权）

### 15.1 连接

| 事件 | 方向 | 说明 |
|------|------|------|
| `connect` | Client → Server | 建立连接 |
| `connected` | Server → Client | 确认连接，返回 `{"status": "ok"}` |

### 15.2 订阅进度更新

| 事件 | 方向 | 说明 |
|------|------|------|
| `subscribe_progress` | Client → Server | 订阅订单进度变更 |
| `progress_subscribed` | Server → Client | 确认订阅，返回 `{"room": "...", "order_no": "..."}` |
| `progress_error` | Server → Client | 订阅失败，返回 `{"error": "..."}` |

**Client 发送 payload：**

```json
{"ds": "tenant_db", "order_no": "ORD-001"}
```

### 15.3 订阅打印通知

| 事件 | 方向 | 说明 |
|------|------|------|
| `subscribe_print` | Client → Server | 订阅打印服务通知 |
| `print_subscribed` | Server → Client | 确认订阅，返回 `{"room": "..."}` |
| `print_error` | Server → Client | 订阅失败 |

**Client 发送 payload：**

```json
{"ds": "tenant_db"}
```

### 15.4 心跳

| 事件 | 方向 | 说明 |
|------|------|------|
| `ping` | Client → Server | 心跳请求 |
| `pong` | Server → Client | 心跳响应，返回 `{}` |

---

## 15. 全局错误处理

所有非正常请求统一返回 JSON 格式错误，不会返回 HTML。

| HTTP 状态码 | 响应 |
|-------------|------|
| 400 | `{"code": 400, "message": "请求格式错误"}` |
| 401 | `{"code": 401, "message": "未授权"}` |
| 403 | `{"code": 403, "message": "禁止访问"}` |
| 404 | `{"code": 404, "message": "接口不存在"}` |
| 405 | `{"code": 405, "message": "请求方法不允许"}` |
| 413 | `{"code": 413, "message": "文件大小超过限制（最大50MB）"}` |
| 500 | `{"code": 500, "message": "服务器内部错误"}`（含 `request_id` 字段） |

---

## 附录 B：路由入口一览

> 以下仅包含 dispatch 体系之外的独立路由，dispatch API 统一通过 `/1` 和 `/login` 进入。

| 路径 | 方法 | 说明 | 来源 |
|------|------|------|------|
| `/1` | GET/POST | Legacy API 统一入口 | `routes.py` |
| `/login` | GET/POST | Legacy API 统一入口（含登录 SPA） | `routes.py` |
| `/s/<link_id>` | GET | 短链接重定向 | `__init__.py` |
| `/admin/...` | * | 后台管理（BluePrint） | `admin/routes.py` |
| `/healthz` | GET | 健康检查 | `health/routes.py` |
| `/readyz` | GET | 就绪检查（含 DB） | `health/routes.py` |
| Socket.IO `/` | ws | 实时事件 | `realtime/handlers.py` |

---

> ⚠️ **注意：** 以下接口已注册 `@register` 但**不在** `_PRODUCTION_ACTION_MAP` 中，因此**无法通过常规 dispatch 流程调用**（`param1` 映射不到 handler）：
> - `clearaccount`（settings.py）
> - `registrantuser`（settings.py）
> - `门玻璃宽`（formulas.py）
> - `加价项目-轨道超长`（formulas.py）
>
> 这些 handler 仅通过直接的装饰器注册存在，但缺少 `_PRODUCTION_ACTION_MAP` 入口映射。

> 文档生成日期：2026-06-26
> 来源：`backend-new_副本` 项目代码完全解析
