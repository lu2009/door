# Door Server — 完整 API 文档

## 响应格式约定

**标准 REST API 成功响应** (`ok()` helper):
```json
{ "code": 200, "data": "<value>", "message": "..." }
```

**错误响应** (`fail()` / `notFound()`):
```json
{ "code": "<statusCode>", "message": "..." }
```
HTTP status 与 code 一致 (400/401/404/500)。

**Legacy `/1` 响应格式** 取决于 `LEGACY_CONTRACTS` 配置:

| Shape | 格式 |
|---|---|
| `raw-array` | 直接返回数组，不包装 |
| `raw-object` | 直接返回对象，不包装 |
| `wrapped` | `{ code: 200, data: "<result>", message: "..." }` |
| `auto` (默认) | 数组 → `{ code: 200, data: [<array>] }`；对象无 code/data/total → `{ code: 200, data: {<object>} }` |

Legacy 端点 500 错误可能返回 `text/html`，图片返回 binary。

---

## 1. Health & 特殊端点

### `GET /healthz`
- **Auth:** 无
- **响应:** `{ "status": "ok" }`

### `GET /readyz`
- **Auth:** 无
- **响应:** `{ "status": "ready", "db": "ok" }` 或 HTTP 503 `{ "status": "not ready", "db": "unreachable" }`

### `GET /s/:linkId`
- **Auth:** 无
- **响应:** HTTP 302 重定向到存储的 URL，或 HTTP 404 `"Link not found"`

---

## 2. Legacy Dispatch (`/1` 和 `/login`)

请求格式: `GET/POST /1?param1=<action>&param2=<ds>&param3=...&param4=...&param5=...&param6=...`

`/login` 路径同样映射到此 dispatcher。支持 GET、POST、multipart POST。`param2` 作为 ds (租户标识符)。

---

### 认证 (Auth)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `login` | GET | `param2`=ds, `param3`=密码 或 客户QR token | param3 匹配 `/^\d+af\d+$/` 时为客户扫码登录 |
| `change_password` | GET | `param2`=ds, `param3`=旧密码, `param4`=新密码 | |
| `getuserconfig` | any | `param2`=ds | 始终返回 400 (contract: `badRequest: true`) |
| `getprocedures` / `GetProcedures` | any | `param2`=ds | wrapped, `"获取成功"` |
| `setprocedures` / `SetProcedures` | any | `param2`=ds, body JSON | |
| `checkclientdevicelicense` | POST | 无 | raw-object, 固定返回 `{code:200, allowed:true, message:'ok'}` |
| `checkelectrondevicelicense` / `checkElectronDeviceLicense` | POST | 无 | 同上 |
| `registrantuser` | any | `param2`=ds, body JSON | 创建新租户用户 |

### 客户 (Client)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `getclientsinfo` / `getClientsInfo` | any | `param2`=ds | 获取客户列表 |
| `getlatestclientsinfo` / `getLatestClientsInfo` | any | `param2`=ds, `param3`=keyword | param3 必填 |
| `checkclient` / `checkClient` | GET | `param2`=ds, `param3`=name, `param4`=phone | raw-object |
| `makereceipt` / `makeReceipt` | POST | `param2`=ds, body=完整订单JSON | wrapped, `"录入成功"` |
| `updateclientinfo` / `updateClientInfo` | any | `param2`=ds, body/query params | 更新客户信息 |
| `updateclientsinfo` / `updateClientsInfo` | any | `param2`=ds, body/query params | 同上 |
| `updatecustomerinfo` / `updateCustomerInfo` | any | `param2`=ds, body/query params | 同上 |
| `deleteclientinfo` / `deleteClientInfo` | GET | `param2`=ds, `param3`=client code/id | param3 缺失返回 500 |

### 订单 (Order)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `gettabledata` / `getTableData` | any | `param2`=ds, `param3`=keyword, `param4`=address, query `startDate`/`endDate` | 结果经中文字段映射 |
| `gettabledataforterminal` | any | `param2`=ds (格式 `"ds_clientId"`), query `clientId` | 终端专用 |
| `getmoretabledate` / `getMoreTableDate` | any | `param2`=ds, `param3`=keyword, `param4`=address, `param5`=startDate, `param6`=endDate | 结果经映射 |
| `getmoreorders` / `getMoreOrders` | any | `param2`=ds, `param3`=keyword, `param4`=startDate, `param5`=endDate, query `page`/`perPage` | 默认 page=1, perPage=50 |
| `getorders` / `getOrders` | POST | `param2`=ds, body=订单引用数组 | |
| `detail` | any | `param2`=ds, `param3`=orderNo | 订单详情 |
| `combine` | any | `param2`=ds, body JSON | 合并订单 |
| `deletehui` / `deleteHui` / `deleterow` / `deleteRow` | GET/POST | `param2`=ds, `param3`=order ref, 或 POST body (数组或 `{id}`) | POST数组→批量删除, POST对象→删明细行, GET param3→删单个 |
| `updaterowdata` / `updateRowData` | any | `param2`=ds, body JSON (含 `id` 字段) | 更新明细行 |

### 进度 (Progress)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `getprogress` / `getProgress` | any | `param2`=ds, `param3`=orderNo (可选) | 结果经映射 |
| `getprogressdata` / `getProgressData` | any | `param2`=ds, `param3`=orderNo (可选) | 结果经映射 |
| `getprogresslist` / `getProgressList` | any | `param2`=ds, `param3`=orderNo (可选) | 结果经映射 |
| `getproductionprogress` / `getProductionProgress` | any | `param2`=ds, `param3`=orderNo (可选) | 结果经映射 |
| `getproductionprogressdata` / `getProductionProgressData` | any | `param2`=ds, `param3`=orderNo (可选) | 结果经映射 |
| `getprogressforterminal` / `getProgressForTerminal` | any | `param2`=ds, `param3`=orderNo (可选) | 终端专用，结果经映射 |
| `getmoreprogress` / `getMoreProgress` | any | `param2`=ds, `param3`=keyword, `param4`=address, `param5`=startDate, `param6`=endDate | 结果经映射 |
| `getlabeldata` / `getLabelData` | POST | `param2`=ds, body=订单引用数组 | raw-object |
| `getscanqrcode` / `getScanQRcode` | GET | `param2`=ds, `param3`=orderNo (必填) | param3 缺失返回 500 |
| `getprocesscounts` / `getProcessCounts` | any | `param2`=ds, `param3` (必填), `param4` (必填) | param3/param4 缺失返回 500 |
| `updataprogress` / `updateProgress` / `updataProgress` | any | `param2`=ds, `param3`=工序槽位, body=订单引用数组, `param4` | `updataProgress` + 非工序 → `updatePrintStatus`; `updataProgress` + `工序10` + param4 → 先 updateProgress 再 sync 打单操作 |
| `paymentcollection` / `PaymentCollection` | any | `param2`=ds, `param3` (必填), `param4` | param3 缺失返回 500 |
| `updatepaymentcollection` / `updatePaymentCollection` / `updatePayment` / `updatepayment` / `updataPaymentCollection` / `updatapaymentcollection` | any | `param2`=ds, `param3` (必填), `param4` | |
| `deleteprogress` / `deleteProgress` / `clearProgress` / `clearprogress` / `deleteprogressforfullorder` | any | `param2`=ds, `param3`=procedure, `param4`=rowRef, body=orderRefs, query `param5` | 多种删除路径 |

### 财务 (Finance)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `finance_checksystem` / `finance_checkSystem` | any | `param2`=ds | 检查财务系统 |
| `finance_getorderfinancesummary` | any | `param2`=ds | 订单财务汇总 |
| `finance_checkorderpayment` | any | `param2`=ds, body=订单引用数组 | |
| `finance_addpayment` / `finance_addPayment` | any | `param2`=ds, body JSON | 添加付款 |
| `finance_addorderpayment` | any | `param2`=ds, body JSON | 添加订单付款 |
| `finance_addcustomeradjustment` | any | `param2`=ds, body JSON | 客户调整 |
| `finance_addorderadjustment` | any | `param2`=ds, body JSON | 订单调整 |
| `finance_updateordercustomer` | any | `param2`=ds, body JSON | 更新订单客户 |
| `finance_getpaymentstats` | any | `param2`=ds, `param3`=customerId (可选) | |
| `finance_getcustomerstatement` | any | `param2`=ds, `param3`=customerId, `param4`=days | |
| `finance_getorderdetail` | any | `param2`=ds, `param3`=orderNo | |
| `finance_getcustomerbalance` | any | `param2`=ds, `param3`=customerId, `param4`=days | |
| `finance_previewallocation` | any | `param2`=ds, body JSON | |
| `finance_previewprepaymentallocation` | any | `param2`=ds, body JSON | |
| `finance_executeprepaymentallocation` | any | `param2`=ds, body JSON | |
| `clearselectedorders` | any | `param2`=ds, body JSON | |

### 公式 (Formula)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `getformulaname` / `getFormulaName` | any | `param2`=ds | wrapped |
| `getformulas` / `getFormulas` | any | `param2`=ds, `param3`=formula type | 始终返回 400 |
| `queryformula` / `queryFormula` | GET | `param2`=ds, `param3`=name, body JSON | |
| `getdiaoformulas` / `getDiaoFormulas` | POST | `param2`=ds, `param3`=name, body JSON | body 含 formula/id 数组时走 single 路径 |
| `getdiaoformulassingle` | POST | `param2`=ds, `param3`=orderDs, body JSON | |
| `getdiaoprice` / `getDiaoPrice` | any | `param2`=ds | |
| `getpingprice` / `getPingPrice` | any | `param2`=ds | |
| `initializdiao` / `initializDiao` | any | `param2`=ds | |
| `initializping` / `initializPing` | any | `param2`=ds | |
| `saveformula` / `saveFormula` | POST | `param2`=ds, body JSON | raw-object, `"保存成功"` |
| `deleteformula` / `deleteFormula` | GET | `param2`=ds, `param3`=formulaId | param3 缺失返回 404 |

### 设置 (Settings)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `checkversionapp` / `CheckVersionAPP` | any | 无需参数 | 返回版本信息 |
| `getaddprice` / `getAddPrice` | any | `param2`=ds | wrapped, `"数据获取成功"` |
| `addaddprice` / `addAddPrice` | any | `param2`=ds, body JSON | wrapped, `"加价项目添加成功"` |
| `editprice` / `editPrice` | any | `param2`=ds, body JSON | |
| `deleteaddprice` / `deleteAddPrice` | any | `param2`=ds, body JSON 或 param3=id | wrapped |
| `changedecleration` / `changeDecleration` | any | `param2`=ds, body JSON | |
| `glasshole` / `glassHole` | GET/POST | GET: `param2`=ds; POST: `param2`=ds + body JSON | POST 返回 `"保存成功"` |
| `deleteglasshole` / `deleteGlassHole` | any | `param2`=ds, `param3`=id | |
| `drawingbehaviors` / `drawingBehaviors` / `DrawingBehaviors` | any | `param2`=ds, body JSON | 固定返回 `{code:200, message:'ok'}` |
| `changesquare` / `changsquare` / `changeSquare` / `changSquare` | any | `param2`=ds, body JSON | |
| `changedirectionmode` / `changeDirectionMode` | any | `param2`=ds, `param3`=mode | param3 缺失返回 500 |
| `reversedirection` / `reverseDirection` | any | `param2`=ds | |
| `savecustomdirectionnames` | any | `param2`=ds, body JSON | |
| `clearaccount` / `clearAccount` | any | `param2`=ds, body JSON | |
| `registrantuser` / `registrantUser` | any | `param2`=ds, body JSON | |
| `parametric-patterns` | any | `param2`=ds | 直接同步生产；生产同步失败时返回错误 |
| `parametric_patterns` / `parametricpatterns` / `parametricpattern` / `getparametricpatterns` / `getparametricpattern` / `patterns` / `getpatterns` / `getpattern` | any | `param2`=ds | 同步生产，失败后读取本地 |
| `doorflowers` / `doorFlowers` / `getdoorflowers` / `getDoorFlowers` / `getdoorflower` / `getDoorFlower` / `doorflower` / `doorFlower` | any | `param2`=ds | 同步生产，失败后读取本地 |
| `upsertparametricpattern` / `upsertParametricPattern` | any | `param2`=ds, body JSON | |
| `deleteparametricpattern` | any | `param2`=ds, `param3`=id | param3 缺失返回 500 |

### 文件 (File)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `getimage` / `getImage` | any | `param2`=imageId, `param3`=imageDs, `param4`=fallbackId | raw-object. 可能返回 binary |
| `saveimage` / `saveImage` | POST (multipart) | `param2`=ds, `param3`=imageDs, body JSON, file (PNG/JPG/JPEG) | `"图片保存成功"` |
| `deleteimage` / `deleteImage` | any | `param2`=ds, `param3`=imageId, `param4`=relatedId, query `param5`=orderDs | param3 缺失返回 500 |
| `gettemplates` / `getTemplates` | any | `param2`=ds | raw-object |
| `getupdatainfo` / `getUpdataInfo` | any | `param2`=ds | |

### 扫码器 (Scanner)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `addscanner` / `addScanner` / `AddScanner` | GET | `param2`=ds, `param3`=registrant, `param4`=username, `param5`=password | raw-object. 缺参数返回 400 |
| `deletescanner` / `deleteScanner` | any | `param2`=ds, `param3`=id | param3 缺失返回 500 |
| `setprinters` / `setPrinters` | any | `param2`=ds, body JSON | |

### 短链接 (ShortLink)

| param1 | Method | 参数 | 说明 |
|--------|--------|------|------|
| `shortlink_create` | any | body JSON (stringified) | |
| `shortlink_get` | any | `param3`=linkId (必填) | param3 缺失返回 500 |

---

## 3. REST API (`/api/v1/*`)

所有 REST API 使用标准 `ok()`/`fail()` 响应格式。标注 "Bearer" 的路由需要 JWT 认证。

### Auth (`/api/v1/auth`)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/v1/auth/login` | 无 | Body: `{ username, password }`, 返回 JWT token |
| POST | `/api/v1/auth/change-password` | Bearer | Body: `{ oldPassword, newPassword }` |
| GET | `/api/v1/auth/config` | Bearer | Query: `?ds=xxx`, 返回用户配置 |
| GET | `/api/v1/auth/procedures` | Bearer | Query: `?ds=xxx`, 返回工序列表 |

### Clients (`/api/v1/clients`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/clients/` | Query: `?ds=xxx&keyword=xxx` |
| GET | `/api/v1/clients/latest` | Query: `?ds=xxx&keyword=xxx` |
| POST | `/api/v1/clients/check` | Body: `{ ds, name, phone }` |
| POST | `/api/v1/clients/receipt` | Body: 完整回执单数据 |
| PUT | `/api/v1/clients/` | Body: 客户字段 |
| DELETE | `/api/v1/clients/:id` | Path param `:id` |

### Orders (`/api/v1/orders`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/orders/` | Query: `?ds=xxx&keyword=&page=1&perPage=20` |
| GET | `/api/v1/orders/table` | Query: `?ds=xxx&keyword=&address=&startDate=&endDate=` |
| GET | `/api/v1/orders/table/terminal` | Query: `?ds=ds_clientId` |
| GET | `/api/v1/orders/detail` | Query: `?ds=xxx&orderNo=xxx` |
| GET | `/api/v1/orders/more` | Query: `?ds=xxx&keyword=&page=1&perPage=20` |
| POST | `/api/v1/orders/combine` | Query: `?ds=xxx`, Body: 合并数据 |
| DELETE | `/api/v1/orders/` | Query: `?ds=xxx`, Body: `{ orderRef }` |
| PUT | `/api/v1/orders/` | Query: `?ds=xxx`, Body: `{ rowId, ...updateData }` |

### Progress (`/api/v1/progress`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/progress/` | Query: `?ds=xxx&orderNo=xxx` |
| GET | `/api/v1/progress/labels` | Query: `?ds=xxx&orderNo=xxx` (逗号分隔) |
| GET | `/api/v1/progress/qrcode` | Query: `?ds=xxx&orderNo=xxx` (逗号分隔) |
| GET | `/api/v1/progress/counts` | Query: `?ds=xxx` |
| GET | `/api/v1/progress/procedures` | Query: `?ds=xxx` |
| POST | `/api/v1/progress/update` | Query: `?ds=xxx`, Body: `{ procedure, orderIds }` |
| POST | `/api/v1/progress/payment` | Query: `?ds=xxx`, Body: `{ param3, param4 }` |
| POST | `/api/v1/progress/procedures` | Query: `?ds=xxx`, Body: 工序数据 |
| DELETE | `/api/v1/progress/` | Query: `?ds=xxx`, Body: `{ procedureName, orderRefs, slot, rowRef }` |

### Finance (`/api/v1/finance`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/finance/check-system` | 检查财务系统 |
| GET | `/api/v1/finance/summary` | 订单财务汇总 |
| GET | `/api/v1/finance/payment-stats` | Query: `?customerId=xxx` |
| GET | `/api/v1/finance/customer-statement` | Query: `?customerId=xxx&days=xxx` |
| GET | `/api/v1/finance/order-detail` | Query: `?orderNo=xxx` (必填) |
| GET | `/api/v1/finance/customer-balance` | Query: `?customerId=xxx&days=xxx` |
| POST | `/api/v1/finance/check-payment` | Body: `{ orders: [...] }` |
| POST | `/api/v1/finance/add-payment` | Body: 付款数据 |
| POST | `/api/v1/finance/add-order-payment` | Body: 订单付款数据 |
| POST | `/api/v1/finance/add-customer-adjustment` | Body: 客户调整数据 |
| POST | `/api/v1/finance/add-order-adjustment` | Body: 订单调整数据 |
| POST | `/api/v1/finance/preview-allocation` | Body: 分配预览数据 |
| POST | `/api/v1/finance/preview-prepayment-allocation` | Body: 预付款分配预览 |
| POST | `/api/v1/finance/execute-prepayment-allocation` | Body: 执行预付款分配 |
| POST | `/api/v1/finance/clear-selected-orders` | Body: 订单选择数据 |

> 说明: 当前没有 `/api/v1/finance/update-order-customer` REST 路由；订单客户更新通过 legacy `finance_updateordercustomer` 暴露。

### Formulas (`/api/v1/formulas`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/formulas/` | Query: `?type=xxx` |
| GET | `/api/v1/formulas/names` | 获取公式名称列表 |
| GET | `/api/v1/formulas/diao-price` | 吊滑价格 |
| GET | `/api/v1/formulas/ping-price` | 平开价格 |
| GET | `/api/v1/formulas/diao` | Query: `?name=xxx` (逗号分隔) |
| GET | `/api/v1/formulas/diao-single` | Query: `?orderDs=xxx` (必填) |
| GET | `/api/v1/formulas/query` | Query: `?name=xxx` (+ 其他参数) |
| GET | `/api/v1/formulas/diao-init` | 初始化吊滑数据 |
| GET | `/api/v1/formulas/ping-init` | 初始化平开数据 |
| GET | `/api/v1/formulas/glass-width` | Query: `?name=xxx` |
| GET | `/api/v1/formulas/extra-price` | Query: `?name=xxx` |
| POST | `/api/v1/formulas/` | Body: 公式数据 |
| DELETE | `/api/v1/formulas/` | Query: `?id=` 或 `?name=` 或 `?size=` 或 `?formulaId=` |

### Settings (`/api/v1/settings`)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| GET | `/api/v1/settings/add-prices` | 无 | Query: `?ds=xxx` |
| POST | `/api/v1/settings/add-prices` | Bearer | Body: 加价项目数据 |
| PUT | `/api/v1/settings/add-prices` | Bearer | Body: `{ before, after }` |
| DELETE | `/api/v1/settings/add-prices` | Bearer | Query: `?id=xxx` |
| POST | `/api/v1/settings/declaration` | Bearer | Body: 声明数据 |
| GET | `/api/v1/settings/glass-holes` | 无 | Query: `?ds=xxx` |
| POST | `/api/v1/settings/glass-holes` | Bearer | Body: 玻璃孔数据 |
| DELETE | `/api/v1/settings/glass-holes` | Bearer | Query: `?id=xxx` |
| GET | `/api/v1/settings/drawing-behaviors` | 无 | Query: `?ds=xxx` |
| POST | `/api/v1/settings/drawing-behaviors` | Bearer | Body: 绘图行为数据 |
| POST | `/api/v1/settings/square` | Bearer | Body: 平方/计价数据 |
| POST | `/api/v1/settings/direction-mode` | Bearer | Body: `{ mode }` |
| POST | `/api/v1/settings/reverse-direction` | Bearer | 无需参数 |
| POST | `/api/v1/settings/custom-direction-names` | Bearer | Body: 自定义方向名称 |
| POST | `/api/v1/settings/clear-account` | Bearer | 清空账户 |
| POST | `/api/v1/settings/registrant-user` | Bearer | Body: 用户数据 |
| GET | `/api/v1/settings/parametric-patterns` | 无 | Query: `?ds=xxx` |
| POST | `/api/v1/settings/parametric-patterns` | Bearer | Body: 门花图案数据 |
| DELETE | `/api/v1/settings/parametric-patterns` | Bearer | Query: `?id=xxx` |
| GET | `/api/v1/settings/version` | 无 | 版本信息 |

### Files (`/api/v1/files`)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/v1/files/upload` | Bearer | Multipart: `image` 字段 (文件, 最大 50MB), body 含元数据 |
| POST | `/api/v1/files/batch` | 无 | Body: `{ ids: string[], ds: string }` (最大 200) |
| GET | `/api/v1/files/:id` | 无 | Query: `?ds=xxx&format=base64`. 返回 binary 或 base64 JSON |
| DELETE | `/api/v1/files/` | 可选 | Query: `?id=xxx&ds=xxx&relatedId=xxx&orderDs=xxx` |
| GET | `/api/v1/files/templates` | 无 | Query: `?ds=xxx` |
| GET | `/api/v1/files/update-info` | 无 | Query: `?ds=xxx` |

### Scanner (`/api/v1/scanner`) — 全部需要 Bearer

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/v1/scanner/` | Body: `{ registrant, username, password }` |
| DELETE | `/api/v1/scanner/` | Query: `?id=xxx` |
| POST | `/api/v1/scanner/printers` | Body: 打印机数据 |

### ShortLink (`/api/v1/shortlink`)

| Method | Path | Auth | 说明 |
|--------|------|------|------|
| POST | `/api/v1/shortlink/` | Bearer | Body: `{ url }` |
| GET | `/api/v1/shortlink/:id` | 无 | Path param `:id` |

---

## 统计

| 类别 | 数量 |
|------|------|
| Health/Special | 3 |
| Legacy dispatch | 以 `ACTION_MAP` / `HANDLER_MAP` 为准 (包含大量大小写和历史别名) |
| REST API (`/api/v1/*`) | 当前路由表约 60+；尾部 `/` 与无尾部 `/` 视为同一路由 |
| **总计** | 以 `server/src/app.ts` 挂载路由和 `legacy-dispatch.ts` 为准 |

## 关键文件

| 文件 | 说明 |
|------|------|
| `server/src/app.ts` | Express 应用配置、路由挂载 |
| `server/src/modules/legacy-dispatch.ts` | Legacy `/1` dispatcher、ACTION_MAP、LEGACY_CONTRACTS、HANDLER_MAP |
| `server/src/modules/repository.interface.ts` | Repository 接口定义 |
| `server/src/middleware/response.ts` | `ok()`、`fail()`、`notFound()` 响应工具 |
| `server/src/middleware/auth.ts` | `requireAuth`、`optionalAuth` 中间件 |
| `server/src/modules/*/**.routes.ts` | 所有 REST API 路由文件 |
