import { prisma } from '../../database';
import { paginate } from '../../utils/helpers';
import {
  parseJsonRecord,
  asRecordArray,
  doorRowsFromSpecs,
  buildReceiptNoSet,
} from '../../utils/record-helpers';

/**
 * Parse the ds parameter to extract databaseName.
 * ds may be a plain database name or in "ds_clientId" format.
 */
function parseDs(ds: string): { databaseName: string; clientId?: string } {
  const underscoreIdx = ds.indexOf('_');
  if (underscoreIdx === -1) {
    return { databaseName: ds };
  }
  return {
    databaseName: ds.substring(0, underscoreIdx),
    clientId: ds.substring(underscoreIdx + 1),
  };
}

function rowRefs(row: Record<string, unknown>): string[] {
  return [
    row.id,
    row['id'],
    row['单号'],
    row['回执单号'],
  ].map(value => String(value || '').trim()).filter(Boolean);
}

function rowMatches(row: Record<string, unknown>, ref: string): boolean {
  return rowRefs(row).includes(ref);
}

function detailRowRefs(row: Record<string, unknown>): string[] {
  return [
    row.id,
    row['id'],
  ].map(value => String(value || '').trim()).filter(Boolean);
}

function detailRowMatches(row: Record<string, unknown>, ref: string): boolean {
  return detailRowRefs(row).includes(ref);
}

function updateSpecsRows(
  specs: Record<string, unknown>,
  ref: string,
  updater: (row: Record<string, unknown>) => Record<string, unknown>,
): { specs: Record<string, unknown>; updated: number } {
  let updated = 0;
  const next = { ...specs };
  for (const key of ['ping_hui', '平开', 'diao_hui', '吊滑']) {
    const rows = asRecordArray(next[key]);
    if (rows.length === 0) continue;
    next[key] = rows.map(row => {
      if (!rowMatches(row, ref)) return row;
      updated += 1;
      return updater(row);
    });
  }
  if (Array.isArray(next.progressData)) {
    next.progressData = asRecordArray(next.progressData).map(row => {
      if (!rowMatches(row, ref)) return row;
      return updater(row);
    });
  }
  return { specs: next, updated };
}

function deleteSpecsRows(
  specs: Record<string, unknown>,
  ref: string,
): { specs: Record<string, unknown>; deleted: number } {
  let deleted = 0;
  const next = { ...specs };
  for (const key of ['ping_hui', '平开', 'diao_hui', '吊滑']) {
    const rows = asRecordArray(next[key]);
    if (rows.length === 0) continue;
    next[key] = rows.filter(row => {
      if (!detailRowMatches(row, ref)) return true;
      deleted += 1;
      return false;
    });
  }
  if (Array.isArray(next.progressData)) {
    next.progressData = asRecordArray(next.progressData).filter(row => !detailRowMatches(row, ref));
  }
  return { specs: next, deleted };
}

function sumRows(rows: Record<string, unknown>[], key: string): number {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function buildCurrentReceiptNoSet(specs: Record<string, unknown>): string {
  const lineNos = doorRowsFromSpecs(specs)
    .map(row => row['单号'])
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim());
  return [...new Set(lineNos)].join('_');
}

function stringValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function numberValue(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function dateValue(value: unknown): Date | null {
  const text = stringValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function retargetRows(rows: Record<string, unknown>[], targetOrderNo: string): Record<string, unknown>[] {
  return rows.map(row => {
    const next = { ...row, '回执单号': targetOrderNo };
    for (const key of ['OrderID', 'orderID', 'orderId', 'orderNo', 'order_no']) {
      if (key in next) next[key] = targetOrderNo;
    }
    return next;
  });
}

function combinedProgressRow(
  row: Record<string, unknown>,
  customerInfo: Record<string, unknown>,
  customerName: string,
): Record<string, string | null> {
  return {
    customerName,
    procedureName: stringValue(row['工序'] ?? row['生产进度'] ?? ''),
    procedureStatus: row['生产进度'] === undefined || row['生产进度'] === null ? null : stringValue(row['生产进度']),
    operatorName: stringValue(row['打单人'] ?? customerInfo['打单人']),
    notes: stringValue(row['备注'] ?? customerInfo['订单备注']),
  };
}

function withOrderDerivedFields<T extends { orderNo: string; doorSpecs?: string | null }>(order: T): T & { 回执单号: string; 单号集: string } {
  const specs = parseJsonRecord(order.doorSpecs);
  const customerInfo = parseJsonRecord(specs.customerInfo);
  return {
    ...order,
    回执单号: order.orderNo,
    单号集: buildReceiptNoSet(specs),
    打单操作: customerInfo['打单操作'] ?? null,
  };
}

function enrichDetailRows(rows: unknown, customerInfo: Record<string, unknown>): unknown[] {
  return asRecordArray(rows).map(row => ({
    ...row,
    '打单操作': row['打单操作'] ?? customerInfo['打单操作'] ?? '',
    '打单人': row['打单人'] ?? customerInfo['打单人'] ?? '',
  }));
}

/**
 * List orders. If body contains a refs array, return details for those orders.
 */
export async function getOrders(ds: string, body: unknown) {
  const { databaseName } = parseDs(ds);

  // Extract order refs from array body or dict.refs
  let refs: string[] = [];
  if (Array.isArray(body)) {
    refs = body.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
  } else if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b['refs'])) {
      refs = (b['refs'] as string[]).filter(r => typeof r === 'string' && r.trim().length > 0);
    }
  }

  if (refs.length === 0) {
    throw Object.assign(new Error('Invalid data format, expected a list'), { statusCode: 400 });
  }

  // Lookup orders
  const orders = await prisma.order.findMany({
    where: { databaseName, orderNo: { in: refs } },
  });

  const result: Record<string, { diao_hui: unknown[]; ping_hui: unknown[] }> = {};
  for (const order of orders) {
    const specs = parseJsonRecord(order.doorSpecs);
    result[order.orderNo] = {
      ping_hui: (specs['ping_hui'] || specs['平开'] || []) as unknown[],
      diao_hui: (specs['diao_hui'] || specs['吊滑'] || []) as unknown[],
    };
  }
  return { code: 200, data: result, message: '数据获取成功' };
}

/**
 * Get table data with optional filters.
 */
export async function getTableData(
  ds: string,
  keyword?: string,
  address?: string,
  startDate?: string,
  endDate?: string,
) {
  const { databaseName } = parseDs(ds);

  const where: Record<string, unknown> = { databaseName };

  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { customerName: { contains: keyword } },
      { brand: { contains: keyword } },
    ];
  }

  if (address) {
    // Search by client address via relation
    where.client = { address: { contains: address } };
  }

  if (startDate || endDate) {
    const orderDateFilter: Record<string, Date> = {};
    if (startDate) orderDateFilter.gte = new Date(startDate);
    if (endDate) orderDateFilter.lte = new Date(endDate);
    where.orderDate = orderDateFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: true,
      progressRecords: {
        orderBy: { procedureName: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { code: 200, data: { tableData: orders.map(withOrderDerivedFields) }, message: '数据获取成功' };
}

/**
 * Get table data filtered by terminal/client.
 */
export async function getTableDataForTerminal(ds: string, clientId: string) {
  const { databaseName } = parseDs(ds);

  const where: Record<string, unknown> = {
    databaseName,
    clientId: parseInt(clientId, 10) || undefined,
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      client: true,
      progressRecords: {
        orderBy: { procedureName: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders.map(withOrderDerivedFields);
}

/**
 * Get full order detail, including door specs parsed from JSON.
 * Specs include ping_hui and diao_hui Chinese field names in doorSpecs.
 */
export async function getDetail(ds: string, orderNo: string) {
  const { databaseName } = parseDs(ds);

  const order = await prisma.order.findUnique({
    where: {
      databaseName_orderNo: { databaseName, orderNo },
    },
    include: {
      client: true,
      progressRecords: {
        orderBy: { procedureName: 'asc' },
      },
      payments: true,
      financeOrders: true,
    },
  });

  if (!order) return { code: 200, data: { diao_hui: [], ping_hui: [] }, message: '数据获取成功' };

  // Parse doorSpecs JSON into structured data with Chinese field names
  let doorSpecs: Record<string, unknown> = {};
  if (order.doorSpecs) {
    try {
      doorSpecs = JSON.parse(order.doorSpecs);
    } catch {
      doorSpecs = { raw: order.doorSpecs };
    }
  }

  // Extract ping_hui and diao_hui spec details (production format)
  const customerInfo = parseJsonRecord((doorSpecs as Record<string, unknown>).customerInfo);
  const pingHui = enrichDetailRows((doorSpecs as Record<string, unknown>)['ping_hui'] || (doorSpecs as Record<string, unknown>)['平开'] || [], customerInfo);
  const diaoHui = enrichDetailRows((doorSpecs as Record<string, unknown>)['diao_hui'] || (doorSpecs as Record<string, unknown>)['吊滑'] || [], customerInfo);

  return { code: 200, data: { ping_hui: pingHui, diao_hui: diaoHui }, message: '数据获取成功' };
}

/**
 * Get paginated orders.
 */
export async function getMoreOrders(
  ds: string,
  keyword?: string,
  page = 1,
  perPage = 20,
  startDate?: string,
  endDate?: string,
) {
  const { databaseName } = parseDs(ds);
  const { skip, take } = paginate(page, perPage);

  const where: Record<string, unknown> = { databaseName };
  if (keyword) {
    where.OR = [
      { orderNo: { contains: keyword } },
      { customerName: { contains: keyword } },
      { brand: { contains: keyword } },
    ];
  }

  if (startDate || endDate) {
    const orderDateFilter: Record<string, Date> = {};
    if (startDate) orderDateFilter.gte = new Date(startDate);
    if (endDate) orderDateFilter.lte = new Date(endDate);
    where.orderDate = orderDateFilter;
  }

  const [data, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    data: data.map(withOrderDerivedFields),
    total,
    page,
    pages: Math.ceil(total / take),
    perPage: take,
  };
}

/**
 * Combine orders using the production legacy payload:
 * { merged: { 回执单号, 客户, ... }, record: [sourceReceiptNo, ...] }.
 */
export async function combine(ds: string, body: Record<string, unknown>) {
  const { databaseName } = parseDs(ds);
  const merged = parseJsonRecord(body.merged);
  const targetOrderNo = stringValue(merged['回执单号']);
  const customerName = stringValue(merged['客户']);
  const sourceOrderNos = Array.isArray(body.record)
    ? [...new Set(body.record.map(stringValue).filter(ref => ref && ref !== targetOrderNo))]
    : [];

  if (!targetOrderNo) return { code: 400, message: '缺少回执单号' };
  if (!customerName) return { code: 400, message: '缺少客户' };

  return prisma.$transaction(async (tx) => {
    const [targetOrder, sourceOrders] = await Promise.all([
      tx.order.findUnique({
        where: { databaseName_orderNo: { databaseName, orderNo: targetOrderNo } },
      }),
      sourceOrderNos.length > 0
        ? tx.order.findMany({ where: { databaseName, orderNo: { in: sourceOrderNos } } })
        : Promise.resolve([]),
    ]);

    const targetSpecs = parseJsonRecord(targetOrder?.doorSpecs);
    const targetCustomerInfo = parseJsonRecord(targetSpecs.customerInfo);
    const pingHui = retargetRows(asRecordArray(targetSpecs.ping_hui ?? targetSpecs['平开']), targetOrderNo);
    const diaoHui = retargetRows(asRecordArray(targetSpecs.diao_hui ?? targetSpecs['吊滑']), targetOrderNo);

    for (const order of sourceOrders) {
      const specs = parseJsonRecord(order.doorSpecs);
      pingHui.push(...retargetRows(asRecordArray(specs.ping_hui ?? specs['平开']), targetOrderNo));
      diaoHui.push(...retargetRows(asRecordArray(specs.diao_hui ?? specs['吊滑']), targetOrderNo));
    }

    const allRows = [...pingHui, ...diaoHui];
    const receiptNoSet = buildReceiptNoSet({ ping_hui: pingHui, diao_hui: diaoHui, customerInfo: merged });
    const customerInfo: Record<string, unknown> = {
      ...targetCustomerInfo,
      ...merged,
      '回执单号': targetOrderNo,
      ...(receiptNoSet ? { '单号集': receiptNoSet } : {}),
    };

    let client = await tx.client.findFirst({
      where: { databaseName, name: customerName },
      orderBy: { id: 'asc' },
    });
    if (!client) {
      const requestedCode = stringValue(merged['客户编号']);
      const codeOwner = requestedCode
        ? await tx.client.findUnique({ where: { databaseName_clientCode: { databaseName, clientCode: requestedCode } } })
        : null;
      client = await tx.client.create({
        data: {
          databaseName,
          clientCode: codeOwner ? `C${Date.now()}` : (requestedCode || `C${Date.now()}`),
          name: customerName,
          address: stringValue(merged['安装地址']),
        },
      });
    }

    const totalAmount = numberValue(merged['总价']);
    const paidAmount = numberValue(merged['定金']);
    const unpaidAmount = totalAmount - paidAmount;
    const orderDate = dateValue(merged['日期']);
    const deliveryDate = dateValue(merged['截止日期']);
    const doorSpecs = JSON.stringify({
      ...targetSpecs,
      ping_hui: pingHui,
      diao_hui: diaoHui,
      customerInfo,
      progressData: allRows.map((row, index) => ({
        ...row,
        '回执单号': targetOrderNo,
        '客户': customerName,
        '客户编号': customerInfo['客户编号'] ?? merged['客户编号'] ?? '',
        '日期': row['日期'] ?? customerInfo['日期'],
        '安装地址': row['安装地址'] ?? customerInfo['安装地址'],
        '业务员': row['业务员'] ?? customerInfo['业务员'],
        '备注': row['备注'] ?? customerInfo['订单备注'],
        '工序': row['工序'] ?? row['生产进度'] ?? `row_${index + 1}`,
      })),
    });

    const order = await tx.order.upsert({
      where: { databaseName_orderNo: { databaseName, orderNo: targetOrderNo } },
      create: {
        databaseName,
        clientId: client.id,
        orderNo: targetOrderNo,
        customerName,
        orderDate: orderDate || new Date(),
        deliveryDate,
        status: 'confirmed',
        totalAmount,
        paidAmount,
        unpaidAmount,
        doorCount: numberValue(merged['门数'], allRows.length || 1),
        doorSpecs,
        operatorName: stringValue(merged['打单人']),
        salesperson: stringValue(merged['业务员']),
        notes: stringValue(merged['订单备注']),
      },
      update: {
        clientId: client.id,
        customerName,
        orderDate: orderDate || undefined,
        deliveryDate,
        totalAmount,
        paidAmount,
        unpaidAmount,
        doorCount: numberValue(merged['门数'], allRows.length || 1),
        doorSpecs,
        operatorName: stringValue(merged['打单人']),
        salesperson: stringValue(merged['业务员']),
        notes: stringValue(merged['订单备注']),
      },
    });

    await tx.progress.deleteMany({
      where: {
        databaseName,
        OR: [
          { orderId: order.id },
          ...(sourceOrderNos.length > 0 ? [{ orderNo: { in: sourceOrderNos } }] : []),
        ],
      },
    });
    const progressRows = [
      ...pingHui.map((row, index) => ({ row, type: 'ping_hui', index })),
      ...diaoHui.map((row, index) => ({ row, type: 'diao_hui', index })),
    ];
    for (const { row } of progressRows) {
      // Collect procedure names from 工序1–工序15 fields on the door row
      const procNames: string[] = [];
      for (let i = 1; i <= 15; i++) {
        const v = row[`工序${i}`];
        if (v != null && String(v).trim()) procNames.push(String(v).trim());
      }
      const legacy = stringValue(row['工序'] ?? row['生产进度'] ?? '');
      if (legacy.trim()) procNames.push(legacy.trim());

      for (const procName of [...new Set(procNames)]) {
        await tx.progress.create({
          data: {
            databaseName,
            orderId: order.id,
            orderNo: targetOrderNo,
            customerName,
            procedureName: procName,
            procedureStatus: row['生产进度'] === undefined || row['生产进度'] === null ? null : stringValue(row['生产进度']),
            operatorName: stringValue(row['打单人'] ?? customerInfo['打单人']),
            notes: stringValue(row['备注'] ?? customerInfo['订单备注']),
          },
        });
      }
    }

    await tx.financeOrder.deleteMany({
      where: { databaseName, orderNo: { in: sourceOrderNos } },
    });
    const financeOrder = await tx.financeOrder.upsert({
      where: { databaseName_orderNo: { databaseName, orderNo: targetOrderNo } },
      create: {
        databaseName,
        orderId: order.id,
        orderNo: targetOrderNo,
        customerName,
        allocatedAmount: paidAmount,
        unpaidAmount,
        orderAdjustTotal: 0,
        monthTag: new Date().toISOString().slice(0, 7),
        statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
      },
      update: {
        orderId: order.id,
        customerName,
        allocatedAmount: paidAmount,
        unpaidAmount,
        statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
      },
    });

    if (sourceOrderNos.length > 0) {
      await tx.payment.updateMany({
        where: {
          databaseName,
          order: { orderNo: { in: sourceOrderNos } },
        },
        data: { orderId: order.id, financeOrderId: financeOrder.id },
      });
      await tx.order.deleteMany({
        where: { databaseName, orderNo: { in: sourceOrderNos } },
      });
    }

    return { code: 200, message: '合并成功' };
  });
}

/**
 * Delete an order by its order reference (orderNo).
 */
export async function deleteRow(ds: string, orderRef: string) {
  const { databaseName } = parseDs(ds);

  // Delete related finance orders and payments first
  await prisma.payment.deleteMany({
    where: {
      databaseName,
      order: { orderNo: orderRef },
    },
  });

  await prisma.financeOrder.deleteMany({
    where: { databaseName, orderNo: orderRef },
  });

  // Delete progress records
  await prisma.progress.deleteMany({
    where: { databaseName, orderNo: orderRef },
  });

  // Delete the order itself
  const result = await prisma.order.deleteMany({
    where: { databaseName, orderNo: orderRef },
  });

  return { deleted: result.count };
}

export async function deleteRows(ds: string, orderRefs: string[]) {
  const { databaseName } = parseDs(ds);
  const refs = orderRefs.map(ref => String(ref || '').trim()).filter(Boolean);
  if (refs.length === 0) return { code: 400, message: '缺少删除单号' };

  await prisma.payment.deleteMany({
    where: {
      databaseName,
      order: { orderNo: { in: refs } },
    },
  });

  await prisma.financeOrder.deleteMany({
    where: { databaseName, orderNo: { in: refs } },
  });

  await prisma.progress.deleteMany({
    where: { databaseName, orderNo: { in: refs } },
  });

  const result = await prisma.order.deleteMany({
    where: { databaseName, orderNo: { in: refs } },
  });

  return { code: 200, deleted_count: result.count, message: '删除成功' };
}

/**
 * Delete a single detail row inside doorSpecs by frontend row id.
 */
export async function deleteDetailRow(ds: string, rowId: string | number) {
  const { databaseName } = parseDs(ds);

  const ref = String(rowId || '').trim();
  if (!ref) throw Object.assign(new Error('缺少必要参数'), { statusCode: 400 });

  const orders = await prisma.order.findMany({
    where: {
      databaseName,
      OR: [{ doorSpecs: { contains: ref } }],
    },
  });

  for (const order of orders) {
    const specs = parseJsonRecord(order.doorSpecs);
    const { specs: updatedSpecs, deleted } = deleteSpecsRows(specs, ref);
    if (deleted === 0) continue;

    const customerInfo = parseJsonRecord(updatedSpecs.customerInfo);
    const rows = doorRowsFromSpecs(updatedSpecs);
    const nextCustomerInfo = {
      ...customerInfo,
      '单号集': buildCurrentReceiptNoSet(updatedSpecs),
    };
    const nextSpecs = {
      ...updatedSpecs,
      customerInfo: nextCustomerInfo,
    };
    const totalAmount = sumRows(rows, '金额');
    const doorCount = sumRows(rows, '数量');
    const paidAmount = Number(order.paidAmount || 0);
    const unpaidAmount = Math.max(0, totalAmount - paidAmount);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        doorSpecs: JSON.stringify(nextSpecs),
        totalAmount,
        unpaidAmount,
        doorCount,
      },
    });

    await prisma.financeOrder.updateMany({
      where: { databaseName, orderNo: order.orderNo },
      data: {
        unpaidAmount,
        statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
      },
    });

    return { code: 200, deleted_count: deleted, message: '删除成功' };
  }

  throw Object.assign(new Error('未找到要删除的明细行'), { statusCode: 404 });
}

/**
 * Update a door-detail row inside doorSpecs by row id / line number.
 */
export async function updateRow(ds: string, rowId: string | number, body: Record<string, unknown>) {
  const { databaseName } = parseDs(ds);

  const ref = String(rowId || '').trim();
  if (!ref) throw Object.assign(new Error('缺少必要参数'), { statusCode: 400 });

  const rowPatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (['rowId', 'param1', 'param2', 'param3', 'param4'].includes(key)) continue;
    rowPatch[key] = value;
  }

  if (Object.keys(rowPatch).length === 0) {
    throw Object.assign(new Error('No data provided'), { statusCode: 400 });
  }

  const orderNo = String(body['回执单号'] ?? body.orderNo ?? '').trim();
  const orders = await prisma.order.findMany({
    where: {
      databaseName,
      ...(orderNo
        ? { orderNo }
        : { OR: [{ doorSpecs: { contains: ref } }] }),
    },
  });

  // Track whether we found an order by receipt number (for copy-add fallback)
  let receiptMatchedOrder: typeof orders[number] | null = null;

  for (const order of orders) {
    if (orderNo && order.orderNo === orderNo) receiptMatchedOrder = order;
    const specs = parseJsonRecord(order.doorSpecs);
    const { specs: updatedSpecs, updated } = updateSpecsRows(specs, ref, row => ({ ...row, ...rowPatch }));
    if (updated === 0) continue;

    return await persistUpdatedOrder(order, updatedSpecs, rowPatch, databaseName);
  }

  // Copy-add fallback: row id not found → append new row to ping_hui
  if (receiptMatchedOrder) {
    const specs = parseJsonRecord(receiptMatchedOrder.doorSpecs);
    const newRow = { ...rowPatch, id: ref };
    const pingHui = asRecordArray(specs.ping_hui);
    pingHui.push(newRow);
    const nextSpecs = { ...specs, ping_hui: pingHui };
    return await persistUpdatedOrder(receiptMatchedOrder, nextSpecs, rowPatch, databaseName);
  }

  throw Object.assign(new Error('未找到要更新的明细行'), { statusCode: 404 });
}

async function persistUpdatedOrder(
  order: { id: number; orderNo: string; paidAmount?: unknown; notes?: string | null },
  updatedSpecs: Record<string, unknown>,
  rowPatch: Record<string, unknown>,
  databaseName: string,
) {
  const customerInfo = parseJsonRecord(updatedSpecs.customerInfo);
  const rows = doorRowsFromSpecs(updatedSpecs);
  const hasOrderNotesPatch = Object.prototype.hasOwnProperty.call(rowPatch, '订单备注');
  const nextOrderNotes = stringValue(
    hasOrderNotesPatch
      ? rowPatch['订单备注']
      : customerInfo['订单备注'] ?? order.notes,
  );
  const nextCustomerInfo = {
    ...customerInfo,
    ...(customerInfo['客户'] !== undefined ? { '客户': customerInfo['客户'] } : {}),
    '订单备注': nextOrderNotes,
    '单号集': buildReceiptNoSet(updatedSpecs),
  };
  const nextSpecs = {
    ...updatedSpecs,
    customerInfo: nextCustomerInfo,
  };
  const totalAmount = sumRows(rows, '金额');
  const doorCount = sumRows(rows, '数量');
  const paidAmount = Number(order.paidAmount || 0);
  const unpaidAmount = Math.max(0, totalAmount - paidAmount);

  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      ...(customerInfo['客户'] ? { customerName: stringValue(customerInfo['客户']) } : {}),
      ...(hasOrderNotesPatch || nextOrderNotes ? { notes: nextOrderNotes } : {}),
      doorSpecs: JSON.stringify(nextSpecs),
      ...(totalAmount > 0 ? { totalAmount, unpaidAmount } : {}),
      ...(doorCount > 0 ? { doorCount } : {}),
    },
  });
  if (totalAmount > 0) {
    await prisma.financeOrder.updateMany({
      where: { databaseName, orderNo: order.orderNo },
      data: {
        unpaidAmount,
        statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
      },
    });
  }
  return updatedOrder;
}
