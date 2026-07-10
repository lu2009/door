import { prisma } from '../../database';
import { safeLoads, generateOrderNo, parseDate } from '../../utils/helpers';
import {
  firstNonBlank,
  firstPresent,
  asRecordArray,
  parseJsonRecord,
} from '../../utils/record-helpers';
import {
  INSTALL_ADDRESS_KEYS,
  extractClientData,
  extractOrderData,
  parseReceiptSpecs,
  toProgressRow,
} from '../../utils/legacy-field-maps';

async function updateOrderOnly(ds: string, orderData: Record<string, unknown>) {
  const orderNo = orderData.orderNo ? String(orderData.orderNo).trim() : '';
  if (!orderNo) return null;

  const order = await prisma.order.findUnique({
    where: { databaseName_orderNo: { databaseName: ds, orderNo } },
    select: { doorSpecs: true },
  });
  if (!order) return null;

  const data: Record<string, unknown> = {};
  const orderDate = parseDate(orderData.orderDate);
  const deliveryDate = parseDate(orderData.deliveryDate);
  if (orderDate) data.orderDate = new Date(orderDate);
  if (deliveryDate) data.deliveryDate = new Date(deliveryDate);
  if (orderData.notes !== undefined) data.notes = String(orderData.notes || '');

  const installAddress = firstNonBlank(...INSTALL_ADDRESS_KEYS.map(key => orderData[key]));
  if (installAddress !== undefined || orderData.notes !== undefined) {
    const specs = order?.doorSpecs ? safeLoads(order.doorSpecs) : {};
    const specsRecord = specs && typeof specs === 'object' && !Array.isArray(specs) ? specs as Record<string, unknown> : {};
    const customerInfoRaw = specsRecord.customerInfo;
    const customerInfo = customerInfoRaw && typeof customerInfoRaw === 'object' && !Array.isArray(customerInfoRaw)
      ? customerInfoRaw as Record<string, unknown>
      : {};
    data.doorSpecs = JSON.stringify({
      ...specsRecord,
      ...(installAddress !== undefined ? { address: String(installAddress || ''), '安装地址': String(installAddress || '') } : {}),
      customerInfo: {
        ...customerInfo,
        ...(orderData.notes !== undefined ? { '订单备注': String(orderData.notes || '') } : {}),
        ...(installAddress !== undefined ? { address: String(installAddress || ''), '安装地址': String(installAddress || '') } : {}),
      },
    });
  }

  if (Object.keys(data).length === 0) return null;

  return prisma.order.update({
    where: { databaseName_orderNo: { databaseName: ds, orderNo } },
    data,
  });
}

/**
 * Generate a unique client code.
 */
async function generateClientCode(ds: string): Promise<string> {
  const clients = await prisma.client.findMany({
    where: { databaseName: ds },
    select: { id: true, clientCode: true },
  });
  const maxExisting = clients.reduce((max, client) => {
    const code = String(client.clientCode || '').trim();
    const numericCode = /^\d+$/.test(code) ? Number(code) : 0;
    return Math.max(max, client.id, numericCode);
  }, 0);

  for (let next = maxExisting + 1; next < maxExisting + 10000; next++) {
    const code = String(next);
    const exists = await prisma.client.findUnique({
      where: { databaseName_clientCode: { databaseName: ds, clientCode: code } },
    });
    if (!exists) return code;
  }

  throw new Error('客户编号生成失败');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return all clients for the given database name.
 */
export async function getClients(ds: string) {
  return prisma.client.findMany({
    where: { databaseName: ds },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Return clients filtered by keyword (name, brand, phone, contactPerson)
 * for the given database name, ordered by latest creation.
 */
export async function getLatestClients(ds: string, keyword?: string) {
  const where: Record<string, unknown> = { databaseName: ds };

  if (keyword && keyword.trim()) {
    const kw = keyword.trim();
    where.OR = [
      { name: { contains: kw } },
      { brand: { contains: kw } },
      { phone: { contains: kw } },
      { contactPerson: { contains: kw } },
      { clientCode: { contains: kw } },
    ];
  }

  return prisma.client.findMany({
    where: where as any,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

/**
 * Upsert a customer record.
 * Also handles embedded order data when present in the request.
 */
export async function updateCustomer(ds: string, data: Record<string, unknown>) {
  const clientSource = data;
  const orderData = extractOrderData(data);
  // Match production: require an order reference (回执单号) unless client is directly identified
  const explicitClientId = data.clientId ?? (!orderData.orderNo ? data.id : undefined);
  const hasClientId = !!explicitClientId;
  const hasClientCode = !!(clientSource.client_code || clientSource['编号'] || clientSource.clientCode || clientSource['客户编号']);
  if (!hasClientId && !hasClientCode) {
    const orderRefKeys = ['回执单号', 'order_no', 'orderNo', '单号'];
    const hasOrderRef = orderRefKeys.some(k => {
      const v = data[k];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });
    if (!hasOrderRef) {
      throw new Error('缺少回执单号');
    }
  }

  const clientData = extractClientData(clientSource);
  if (!clientData.name && !clientData.clientCode && !hasClientId && orderData.orderNo) {
    const updatedOrder = await updateOrderOnly(ds, orderData);
    if (updatedOrder) return updatedOrder;
  }

  // Identify the client: prefer id > clientCode > name
  const clientId = explicitClientId as number | undefined;

  let client;

  if (clientId) {
    // Update existing
    client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...clientData,
        databaseName: ds,
      },
    });
  } else {
    const code = (clientData.clientCode as string) || (data.clientCode as string) || '';
    const name = (clientData.name as string) || '';

    // Try to find by clientCode
    if (code) {
      client = await prisma.client.findUnique({
        where: { databaseName_clientCode: { databaseName: ds, clientCode: code } },
      });
    }

    if (client) {
      // Update existing
      client = await prisma.client.update({
        where: { id: client.id },
        data: clientData,
      });
    } else if (name) {
      // Create new (matching Flask)
      client = await prisma.client.create({
        data: {
          ...(clientData as any),
          databaseName: ds,
          clientCode: (clientData.clientCode as string) || (await generateClientCode(ds)),
        },
      });
    } else {
      throw new Error('缺少客户信息(客户/编号/name/client_code)');
    }
  }

  // Handle embedded order data
  if (orderData.orderNo || orderData.doorSpecs) {
    await upsertEmbeddedOrder(ds, client, data, orderData);
  }

  return client;
}

/**
 * Find a client by name + phone within a database, or create a new one.
 */
export async function checkClient(ds: string, name: string, phone: string) {
  if (!name) {
    throw Object.assign(new Error('客户名称不能为空'), { statusCode: 400 });
  }

  // Try to match by name + phone
  let client = await prisma.client.findFirst({
    where: { databaseName: ds, name, phone: phone || undefined },
  });

  if (!client) {
    // Try matching by name only
    const byName = await prisma.client.findMany({
      where: { databaseName: ds, name },
      take: 1,
    });
    client = byName[0] ?? null;
  }

  if (!client) {
    // Create new client
    client = await prisma.client.create({
      data: {
        databaseName: ds,
        clientCode: await generateClientCode(ds),
        name,
        phone: phone || null,
      },
    });
  }

  // Return only production fields (English names, minimal set)
  return { id: client.id, name: client.name, tel: client.phone || '', address: client.address || '', brand: client.brand || '' };
}

function buildReceiptNoSet(rows: Record<string, unknown>[], fallback?: unknown): string {
  const lineNos = rows
    .map(row => row['单号'])
    .filter((value): value is string | number => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim());
  const unique = [...new Set(lineNos)];
  if (unique.length > 0) return unique.join('_');
  return fallback !== null && fallback !== undefined ? String(fallback).trim() : '';
}

function sumNumber(rows: Record<string, unknown>[], key: string) {
  return rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

/**
 * Production-compatible receipt entry.
 *
 * The production `/1?param1=makeReceipt` endpoint accepts the door-detail payload
 * and returns success even when the top-level customer fields are absent. The
 * selected customer is usually embedded in the first ping_hui/diao_hui row, so
 * this path must not call checkClient() before saving.
 */
export async function makeReceipt(ds: string, body: Record<string, unknown>) {
  const { customerInfo, specs, rows, pingHui, diaoHui } = parseReceiptSpecs(body);
  const firstRow = rows[0] || {};
  const header = { ...customerInfo, ...body };
  const clientData = extractClientData({ ...firstRow, ...header });
  const { ['备注']: _lineNotes, ...firstRowOrderFields } = firstRow;
  const orderData = extractOrderData({ ...firstRowOrderFields, ...header });

  const orderNo = firstNonBlank(orderData.orderNo, customerInfo['回执单号'], firstRow['回执单号']) as string | undefined;
  const customerName = firstNonBlank(clientData.name, orderData.customerName, customerInfo['客户'], firstRow['客户']) as string | undefined;

  if (!orderNo) {
    return { se: '录入成功' };
  }

  const filledPingHui = pingHui;
  const filledDiaoHui = diaoHui;
  const filledRows = [...filledPingHui, ...filledDiaoHui];

  let clientId: number | null = null;
  if (customerName) {
    let client = await prisma.client.findFirst({
      where: { databaseName: ds, name: String(customerName) },
      orderBy: { id: 'asc' },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          databaseName: ds,
          clientCode: await generateClientCode(ds),
          name: String(customerName),
          phone: String(clientData.phone || firstRow['客户电话'] || ''),
          brand: String(clientData.brand || ''),
          address: String(firstNonBlank(clientData.address, customerInfo['安装地址'], customerInfo['地址'], body['安装地址']) || ''),
          contactPerson: String(clientData.contactPerson || ''),
        },
      });
    }

    clientId = client.id;
  }

  const totalAmount = Number(firstNonBlank(orderData.totalAmount, customerInfo['总价'], body['总价'], sumNumber(filledRows, '金额')) || 0);
  const paidAmount = Number(firstNonBlank(orderData.paidAmount, customerInfo['定金'], body['定金'], firstRow['定金']) || 0);
  const unpaidAmount = Number(firstNonBlank(orderData.unpaidAmount, totalAmount - paidAmount) || 0);
  const orderDate = parseDate(firstNonBlank(orderData.orderDate, customerInfo['日期'], firstRow['日期'], body['日期']));
  const deliveryDate = parseDate(firstNonBlank(orderData.deliveryDate, customerInfo['截止日期'], firstRow['截止日期'], body['截止日期']));
  const receiptNoSet = buildReceiptNoSet(filledRows, customerInfo['单号集']);
  const normalizedCustomerInfo = {
    ...customerInfo,
    '回执单号': orderNo,
    '单号集': receiptNoSet,
  };
  const normalizedSpecs = {
    ...specs,
    ping_hui: filledPingHui,
    diao_hui: filledDiaoHui,
    customerInfo: normalizedCustomerInfo,
  };

  const order = await prisma.order.upsert({
    where: { databaseName_orderNo: { databaseName: ds, orderNo } },
    create: {
      databaseName: ds,
      clientId,
      orderNo,
      customerName: customerName ? String(customerName) : '',
      brand: String(firstNonBlank(orderData.brand, clientData.brand, customerInfo['品牌'], firstRow['品牌']) || ''),
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      status: 'pending',
      totalAmount,
      paidAmount,
      unpaidAmount,
      doorCount: filledRows.reduce((sum, row) => sum + (Number(row['数量']) || 0), 0) || Number(orderData.doorCount || 1),
      doorSpecs: JSON.stringify({
        ...normalizedSpecs,
        progressData: filledRows.map(row => toProgressRow(row, normalizedCustomerInfo, orderNo, customerName)),
      }),
      operatorName: String(firstNonBlank(orderData.operatorName, customerInfo['打单人'], firstRow['打单人']) || ''),
      salesperson: String(firstNonBlank(orderData.salesperson, customerInfo['业务员'], firstRow['业务员']) || ''),
      notes: String(firstNonBlank(orderData.notes, customerInfo['订单备注'], firstRow['订单备注']) || ''),
    },
    update: {
      clientId,
      customerName: customerName ? String(customerName) : '',
      totalAmount,
      paidAmount,
      unpaidAmount,
      doorSpecs: JSON.stringify({
        ...normalizedSpecs,
        progressData: filledRows.map(row => toProgressRow(row, normalizedCustomerInfo, orderNo, customerName)),
      }),
    },
  });

  await prisma.financeOrder.upsert({
    where: { databaseName_orderNo: { databaseName: ds, orderNo } },
    create: {
      databaseName: ds,
      orderId: order.id,
      orderNo,
      customerName: customerName ? String(customerName) : '',
      allocatedAmount: paidAmount,
      unpaidAmount,
      orderAdjustTotal: 0,
      monthTag: new Date().toISOString().slice(0, 7),
      statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
    },
    update: {
      orderId: order.id,
      customerName: customerName ? String(customerName) : '',
      allocatedAmount: paidAmount,
      unpaidAmount,
      statusText: unpaidAmount <= 0 ? '已结清' : '未付清',
    },
  });

  const progressRows = [
    ...filledPingHui.map(row => ({ row, type: 'ping_hui' })),
    ...filledDiaoHui.map(row => ({ row, type: 'diao_hui' })),
  ];
  await prisma.progress.deleteMany({ where: { databaseName: ds, orderId: order.id } });
  for (const { row } of progressRows) {
    // Collect procedure names from 工序1–工序15 fields on the door row
    const procNames: string[] = [];
    for (let i = 1; i <= 15; i++) {
      const v = row[`工序${i}`];
      if (v != null && String(v).trim()) procNames.push(String(v).trim());
    }
    // Also check legacy 工序 / 生产进度 fields
    const legacy = firstNonBlank(row['工序'], row['生产进度']);
    if (legacy && String(legacy).trim()) procNames.push(String(legacy).trim());

    for (const procName of [...new Set(procNames)]) {
      await prisma.progress.create({
        data: {
          databaseName: ds,
          orderId: order.id,
          orderNo,
          customerName: customerName ? String(customerName) : '',
          procedureName: procName,
          procedureStatus: row['生产进度'] === undefined || row['生产进度'] === null ? null : String(row['生产进度']),
          operatorName: String(firstNonBlank(row['打单人'], customerInfo['打单人'], '')),
          notes: String(firstNonBlank(row['备注'], customerInfo['订单备注'], '')),
        },
      });
    }
  }
  return { se: '录入成功' };
}

/**
 * Delete a client by id, clientCode, or name.
 */
export async function deleteClient(ds: string, clientId: string | number) {
  const idNum = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
  const code = typeof clientId === 'string' ? clientId.trim() : String(clientId);

  // Production legacy callers pass the visible customer 编号, so prefer clientCode.
  let client = code
    ? await prisma.client.findUnique({
        where: { databaseName_clientCode: { databaseName: ds, clientCode: code } },
      })
    : null;

  if (!client && !isNaN(idNum)) {
    client = await prisma.client.findFirst({ where: { databaseName: ds, id: idNum } });
  }

  // Try matching by name
  if (!client && typeof clientId === 'string') {
    const matches = await prisma.client.findMany({
      where: { databaseName: ds, name: clientId },
      take: 1,
    });
    client = matches[0] ?? null;
  }

  if (!client) {
    throw Object.assign(new Error('客户不存在'), { statusCode: 404 });
  }

  // Delete related records explicitly
  const existingOrders = await prisma.order.findMany({
    where: { clientId: client.id },
    select: { id: true },
  });
  const orderIds = existingOrders.map((o: { id: number }) => o.id);

  if (orderIds.length > 0) {
    await prisma.progress.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.financeOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await prisma.customerBalance.deleteMany({ where: { clientId: client.id } });
  await prisma.customerAdjustment.deleteMany({ where: { clientCode: client.clientCode } });
  await prisma.client.delete({ where: { id: client.id } });

  return { deleted: true, clientId: client.id };
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/**
 * Handle embedded order data during a customer upsert.
 * Creates or updates an order whose data is nested in the same request body.
 */
async function upsertEmbeddedOrder(
  ds: string,
  client: { id: number; name: string; brand?: string | null },
  rawData: Record<string, unknown>,
  orderData: Record<string, unknown>,
) {
  const orderNo = (orderData.orderNo as string) || generateOrderNo();
  const parsed = parseReceiptSpecs(rawData);
  const doorSpecsRaw = rawData.doorSpecs ?? rawData.door_specs ?? rawData.门扇信息
    ?? ((parsed.customerInfo && Object.keys(parsed.customerInfo).length > 0) || parsed.rows.length > 0 ? parsed.specs : null);
  const doorSpecs = doorSpecsRaw
    ? (typeof doorSpecsRaw === 'string' ? safeLoads(doorSpecsRaw) : doorSpecsRaw)
    : null;

  const existingOrder = orderData.orderNo
    ? await prisma.order.findUnique({
        where: { databaseName_orderNo: { databaseName: ds, orderNo: orderData.orderNo as string } },
      })
    : null;
  const installAddress = firstNonBlank(...INSTALL_ADDRESS_KEYS.map(key => orderData[key] ?? rawData[key]));
  const specsBase = doorSpecs && typeof doorSpecs === 'object' && !Array.isArray(doorSpecs)
    ? doorSpecs as Record<string, unknown>
    : existingOrder?.doorSpecs
      ? safeLoads(existingOrder.doorSpecs)
      : {};
  const specsRecord = specsBase && typeof specsBase === 'object' && !Array.isArray(specsBase)
    ? specsBase as Record<string, unknown>
    : {};
  const customerInfoRaw = specsRecord?.customerInfo;
  const customerInfo = customerInfoRaw && typeof customerInfoRaw === 'object' && !Array.isArray(customerInfoRaw)
    ? customerInfoRaw as Record<string, unknown>
    : {};
  const shouldPersistOrderMeta = !!existingOrder && (orderData.notes !== undefined || installAddress !== undefined);
  const shouldPersistDoorSpecs = Object.keys(specsRecord).length > 0 || shouldPersistOrderMeta;
  const mergedDoorSpecs = shouldPersistDoorSpecs
    ? {
        ...specsRecord,
        ...(shouldPersistOrderMeta && installAddress !== undefined ? { address: String(installAddress || ''), '安装地址': String(installAddress || '') } : {}),
        ping_hui: Array.isArray(specsRecord.ping_hui) ? specsRecord.ping_hui : [],
        diao_hui: Array.isArray(specsRecord.diao_hui) ? specsRecord.diao_hui : [],
        customerInfo: {
          ...customerInfo,
          ...(shouldPersistOrderMeta ? {
            OrderID: orderNo,
            orderNo,
            order_no: orderNo,
            name: client.name,
            customer: client.name,
            client: client.name,
            brand: (orderData.brand as string) || client.brand || '',
            ...(orderData.notes !== undefined ? { '订单备注': String(orderData.notes || '') } : {}),
            ...(installAddress !== undefined ? { address: String(installAddress || ''), '安装地址': String(installAddress || '') } : {}),
            '门数': orderData.doorCount !== undefined ? parseInt(String(orderData.doorCount), 10) : (customerInfo['门数'] ?? 1),
          } : {}),
        },
      }
    : null;

  const data = {
    databaseName: ds,
    clientId: client.id,
    customerName: client.name,
    brand: (orderData.brand as string) || client.brand || '',
    orderDate: orderData.orderDate ? new Date(orderData.orderDate as string) : undefined,
    doorSpecs: mergedDoorSpecs ? JSON.stringify(mergedDoorSpecs) : undefined,
    totalAmount: orderData.totalAmount !== undefined ? parseFloat(String(orderData.totalAmount)) : undefined,
    paidAmount: orderData.paidAmount !== undefined ? parseFloat(String(orderData.paidAmount)) : undefined,
    notes: shouldPersistOrderMeta && orderData.notes !== undefined ? String(orderData.notes || '') : undefined,
    doorCount: orderData.doorCount !== undefined ? parseInt(String(orderData.doorCount), 10) : undefined,
  };

  // Remove undefined keys
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined),
  );

  if (existingOrder) {
    return prisma.order.update({
      where: { id: existingOrder.id },
      data: cleanData as any,
    });
  }

  return prisma.order.create({
    data: {
      ...(cleanData as Record<string, unknown>),
      orderNo,
      status: 'pending',
      doorCount: parseInt(String(orderData.doorCount ?? 1), 10),
    } as any,
  });
}
