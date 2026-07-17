import { prisma } from '../../database';

// ─── Utilities ───

function toNum(val: unknown): number {
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(n) ? 0 : n;
}

function dsFilter(ds: string) {
  return { databaseName: ds };
}

function nowDate(): Date {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function dateText(val: unknown): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(String(val));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

function textValue(val: unknown): string {
  return val === null || val === undefined ? '' : String(val).trim();
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function updateCustomerFields(value: unknown, customerName: string, customerCode: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return {
    ...(value as Record<string, unknown>),
    '客户': customerName,
    '客户编号': customerCode,
  };
}

function statusText(unpaid: number): string {
  if (unpaid <= 0) return '已结清';
  return '部分付款';
}

function orderTotal(fo: Record<string, unknown>): number {
  const order = fo.order && typeof fo.order === 'object' ? fo.order as Record<string, unknown> : {};
  return toNum(order.totalAmount) || toNum(fo.allocatedAmount) + toNum(fo.unpaidAmount) + toNum(fo.orderAdjustTotal);
}

function customerCodeFromBody(body: Record<string, unknown>): string {
  return textValue(body['客户编号'] ?? body['customerCode'] ?? body['clientCode']);
}

async function findClient(ds: string, customerCode?: string) {
  if (!customerCode) return null;
  const trimmed = String(customerCode).trim();
  const numericId = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
  return prisma.client.findFirst({
    where: {
      databaseName: ds,
      OR: [
        { clientCode: trimmed },
        ...(Number.isFinite(numericId) ? [{ id: numericId }] : []),
      ],
    },
    orderBy: { id: 'asc' },
  });
}

async function resolveCustomerIdentity(ds: string, customerCode: string) {
  const client = await findClient(ds, customerCode);
  return {
    client,
    balanceCode: client?.clientCode || customerCode,
    customerName: client?.name || '',
  };
}

async function ensureCustomerBalance(ds: string, customerCode: string, customerName?: string | null) {
  const client = await findClient(ds, customerCode);
  return prisma.customerBalance.upsert({
    where: { databaseName_clientCode: { databaseName: ds, clientCode: customerCode } },
    create: {
      databaseName: ds,
      clientCode: customerCode,
      clientId: client?.id ?? null,
      customerName: customerName || client?.name || '',
      prepaidBalance: 0,
      totalTopup: 0,
      totalSpent: 0,
    },
    update: {
      clientId: client?.id ?? undefined,
      customerName: customerName || client?.name || undefined,
    },
  });
}

async function syncOrderAmounts(orderId: number | null | undefined, allocatedAmount: number, unpaidAmount: number) {
  if (!orderId) return;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paidAmount: allocatedAmount,
      unpaidAmount,
    },
  });
}

async function updateFinanceOrderAmounts(fo: any, deltaAllocated: number, deltaUnpaid: number) {
  const nextAllocated = toNum(fo.allocatedAmount) + deltaAllocated;
  const nextUnpaid = Math.max(0, toNum(fo.unpaidAmount) + deltaUnpaid);
  const updated = await prisma.financeOrder.update({
    where: { id: fo.id },
    data: {
      allocatedAmount: nextAllocated,
      unpaidAmount: nextUnpaid,
      statusText: statusText(nextUnpaid),
    },
  });
  await syncOrderAmounts(fo.orderId, nextAllocated, nextUnpaid);
  return updated;
}

function allocationRows(body: Record<string, unknown>): Record<string, unknown>[] {
  const rows = body['分配列表'] ?? body['allocations'] ?? body['allocationList'] ?? [];
  return Array.isArray(rows) ? rows.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row)) : [];
}

async function financeOrdersForCustomer(
  ds: string,
  customerCode: string,
  client: Awaited<ReturnType<typeof findClient>>,
  extraWhere: Record<string, unknown> = {},
) {
  const baseWhere = { databaseName: ds, ...extraWhere };
  const primary = await prisma.financeOrder.findMany({
    where: {
      ...baseWhere,
      ...(client ? { order: { clientId: client.id } } : { customerName: customerCode }),
    },
    include: { order: true },
    orderBy: [{ order: { orderDate: 'asc' } }, { createdAt: 'asc' }],
  });
  if (primary.length > 0 || !client?.name) return primary;

  return prisma.financeOrder.findMany({
    where: {
      ...baseWhere,
      customerName: client.name,
    },
    include: { order: true },
    orderBy: [{ order: { orderDate: 'asc' } }, { createdAt: 'asc' }],
  });
}

async function unpaidOrdersForCustomer(ds: string, customerCode: string) {
  const client = await findClient(ds, customerCode);
  return financeOrdersForCustomer(ds, customerCode, client, { unpaidAmount: { gt: 0 } });
}

function buildAllocationPreview(orders: any[], amount: number, discountRate = 0) {
  const isRefund = amount < 0;
  let remaining = amount;
  let totalDiscount = 0;
  const rows: Record<string, unknown>[] = [];
  if (isRefund) {
    // Refund (红冲): reverse-allocate against already-allocated orders
    let toRefund = Math.abs(amount);
    for (const fo of orders) {
      if (toRefund <= 0) break;
      const allocated = toNum(fo.allocatedAmount);
      if (allocated <= 0) continue;
      const refund = Math.min(toRefund, allocated);
      rows.push({
        '回执单号': fo.orderNo || '',
        '日期': dateText(fo.order?.orderDate),
        '总价': orderTotal(fo),
        '已分配金额': allocated,
        '分配金额': -refund,
        '优惠金额': 0,
        '分配后余额': allocated - refund,
      });
      toRefund -= refund;
    }
    remaining = -toRefund;
  } else {
    // Normal allocation
    for (const fo of orders) {
      if (remaining <= 0) break;
      const unpaid = toNum(fo.unpaidAmount);
      if (unpaid <= 0) continue;
      const alloc = Math.min(remaining, unpaid);
      const discount = discountRate > 0 ? Math.min(unpaid - alloc, Math.round(alloc * discountRate * 100) / 100) : 0;
      rows.push({
        '回执单号': fo.orderNo || '',
        '日期': dateText(fo.order?.orderDate),
        '总价': orderTotal(fo),
        '未收金额': unpaid,
        '分配金额': alloc,
        '优惠金额': discount,
        '分配后余额': Math.max(0, unpaid - alloc - discount),
      });
      remaining -= alloc;
      totalDiscount += discount;
    }
  }
  return {
    '分配列表': rows,
    allocations: rows,
    '剩余金额': remaining,
    unallocated: remaining,
    '合计分配金额': amount - remaining,
    '合计优惠金额': totalDiscount,
    '资金池剩余': remaining,
  };
}

async function applyOrderAdjustmentToFinance(ds: string, orderNo: string, amount: number) {
  const fo = await prisma.financeOrder.findFirst({ where: { databaseName: ds, orderNo } });
  if (!fo) return null;
  const nextAdjust = toNum(fo.orderAdjustTotal) + amount;
  const nextUnpaid = Math.max(0, toNum(fo.unpaidAmount) - amount);
  const updated = await prisma.financeOrder.update({
    where: { id: fo.id },
    data: {
      orderAdjustTotal: nextAdjust,
      unpaidAmount: nextUnpaid,
      statusText: statusText(nextUnpaid),
    },
  });
  await syncOrderAmounts(fo.orderId, toNum(updated.allocatedAmount), nextUnpaid);
  return updated;
}

async function addToCustomerBalance(ds: string, customerCode: string, amount: number, customerName?: string | null) {
  if (!customerCode || amount === 0) return;
  const balance = await ensureCustomerBalance(ds, customerCode, customerName);
  const topupDelta = amount > 0 ? amount : 0;
  await prisma.customerBalance.update({
    where: { id: balance.id },
    data: {
      prepaidBalance: toNum(balance.prepaidBalance) + amount,
      totalTopup: toNum(balance.totalTopup) + topupDelta,
    },
  });
}

function fundFlowPaymentRow(flow: {
  id: number;
  amount: unknown;
  paymentDate: Date | null;
  paymentMethod: string | null;
  notes: string | null;
  flowType: string | null;
}) {
  return {
    id: `fund-${flow.id}`,
    amount: flow.amount,
    paymentDate: flow.paymentDate,
    paymentMethod: flow.paymentMethod,
    notes: flow.notes || flow.flowType || '',
    financeOrderId: null,
    orderId: null,
    financeOrder: null,
  };
}

// ─── Order Finance Summary ───

export async function getOrderSummary(ds: string) {
  const financeOrders = await prisma.financeOrder.findMany({
    where: dsFilter(ds),
    include: { order: true },
  });
  const result: Record<string, { 已分配金额: number; 未收金额: number; 订单调整金额: number }> = {};
  for (const fo of financeOrders) {
    if (!fo.orderNo) continue;
    result[fo.orderNo] = {
      已分配金额: toNum(fo.allocatedAmount),
      未收金额: toNum(fo.unpaidAmount),
      订单调整金额: toNum(fo.orderAdjustTotal),
    };
  }
  return { code: 200, data: result, message: 'ok' };
}

// ─── Check Payment Status ───

export async function checkOrderPayment(ds: string, orderNos: string[]) {
  if (!orderNos.length) return [];
  const financeOrders = await prisma.financeOrder.findMany({
    where: { databaseName: ds, orderNo: { in: orderNos } },
    include: { payments: { select: { id: true, amount: true, paymentDate: true, paymentMethod: true, notes: true } } },
  });
  return financeOrders.map(fo => ({
    orderNo: fo.orderNo, customerName: fo.customerName,
    allocatedAmount: toNum(fo.allocatedAmount), unpaidAmount: toNum(fo.unpaidAmount),
    statusText: fo.statusText,
    payments: fo.payments.map(p => ({ id: p.id, amount: toNum(p.amount), paymentDate: p.paymentDate, method: p.paymentMethod, notes: p.notes })),
  }));
}

// ─── Check System ───

export async function checkSystem(ds: string) {
  const count = await prisma.financeOrder.count({ where: dsFilter(ds) });
  return { code: 200, data: { hasNewFinance: count > 0 }, message: 'ok' };
}

// ─── Add Payment ───

export async function addPayment(ds: string, body: Record<string, unknown>) {
  const amount = toNum(body['收款金额']);
  const paymentDate = body['收款日期'] ? new Date(body['收款日期'] as string) : nowDate();
  const paymentMethod = (body['收款方式'] as string) ?? '转账';
  const notes = (body['备注'] as string) ?? '';
  const customerCode = customerCodeFromBody(body);
  const rows = allocationRows(body);
  const receiptNo = textValue(body['回执单号'] ?? body.orderNo);
  const customerIdentity = customerCode ? await resolveCustomerIdentity(ds, customerCode) : null;

  const result = await prisma.$transaction(async (tx) => {
    let allocatedTotal = 0;
    let paymentId: number | null = null;

    if (receiptNo && rows.length === 0) {
      const fo = await tx.financeOrder.findFirst({ where: { databaseName: ds, orderNo: receiptNo } });
      if (!fo) throw new Error(`订单 ${receiptNo} 不存在`);
      const payment = await tx.payment.create({
        data: { databaseName: ds, orderId: fo.orderId, financeOrderId: fo.id, amount, paymentDate, paymentMethod, notes },
      });
      paymentId = payment.id;
      const discount = Math.max(0, amount) * toNum(body['优惠比例']);
      const deltaUnpaid = amount >= 0 ? -(amount + discount) : Math.abs(amount);
      const nextAllocated = toNum(fo.allocatedAmount) + amount;
      const nextUnpaid = Math.max(0, toNum(fo.unpaidAmount) + deltaUnpaid);
      await tx.financeOrder.update({
        where: { id: fo.id },
        data: { allocatedAmount: nextAllocated, unpaidAmount: nextUnpaid, statusText: statusText(nextUnpaid) },
      });
      if (fo.orderId) {
        await tx.order.update({ where: { id: fo.orderId }, data: { paidAmount: nextAllocated, unpaidAmount: nextUnpaid } });
      }
      allocatedTotal = amount;
      return { paymentId, allocatedTotal, prepaidDelta: 0 };
    }

    for (const row of rows) {
      const rowOrderNo = textValue(row['回执单号'] ?? row.orderNo);
      const alloc = toNum(row['分配金额'] ?? row.allocAmount ?? row.amount);
      if (!rowOrderNo || alloc === 0) continue;
      const fo = await tx.financeOrder.findFirst({ where: { databaseName: ds, orderNo: rowOrderNo } });
      if (!fo) continue;
      const payment = await tx.payment.create({
        data: { databaseName: ds, orderId: fo.orderId, financeOrderId: fo.id, amount: alloc, paymentDate, paymentMethod, notes },
      });
      paymentId = payment.id;
      const discount = Math.max(0, toNum(row['优惠金额']));
      const nextAllocated = toNum(fo.allocatedAmount) + alloc;
      const nextUnpaid = Math.max(0, toNum(fo.unpaidAmount) - alloc - discount);
      await tx.financeOrder.update({
        where: { id: fo.id },
        data: { allocatedAmount: nextAllocated, unpaidAmount: nextUnpaid, statusText: statusText(nextUnpaid) },
      });
      if (fo.orderId) {
        await tx.order.update({ where: { id: fo.orderId }, data: { paidAmount: nextAllocated, unpaidAmount: nextUnpaid } });
      }
      allocatedTotal += alloc;
    }

    const prepaidDelta = amount - allocatedTotal;
    if (Math.abs(prepaidDelta) > 0.005) {
      const balanceCode = customerIdentity?.balanceCode || '';
      if (!balanceCode) throw new Error('客户编号不能为空');
      const payment = await tx.payment.create({
        data: { databaseName: ds, amount: prepaidDelta, paymentDate, paymentMethod, notes },
      });
      paymentId = payment.id;
      const existing = await tx.customerBalance.findFirst({ where: { databaseName: ds, clientCode: balanceCode } });
      if (existing) {
        await tx.customerBalance.update({
          where: { id: existing.id },
          data: {
            prepaidBalance: toNum(existing.prepaidBalance) + prepaidDelta,
            totalTopup: toNum(existing.totalTopup) + (prepaidDelta > 0 ? prepaidDelta : 0),
          },
        });
      } else {
        await tx.customerBalance.create({
          data: {
            databaseName: ds,
            clientCode: balanceCode,
            clientId: customerIdentity?.client?.id ?? null,
            customerName: customerIdentity?.customerName ?? '',
            prepaidBalance: prepaidDelta,
            totalTopup: prepaidDelta > 0 ? prepaidDelta : 0,
            totalSpent: 0,
          },
        });
      }
      await tx.customerFundFlow.create({
        data: {
          databaseName: ds,
          clientCode: balanceCode,
          clientId: customerIdentity?.client?.id ?? null,
          customerName: customerIdentity?.customerName ?? '',
          paymentId: payment.id,
          amount: prepaidDelta,
          flowType: prepaidDelta >= 0 ? '预付款' : '预付款冲销',
          paymentDate,
          paymentMethod,
          notes,
        },
      });
    }

    return { paymentId, allocatedTotal, prepaidDelta };
  });

  return { code: 200, data: { success: true, ...result }, message: 'ok' };
}

// ─── Add Order Payment ───

export async function addOrderPayment(ds: string, body: Record<string, unknown>) {
  const orderNo = textValue(body['回执单号'] ?? body['orderNo'] ?? body.orderNo);
  const amount = toNum(body['收款金额'] ?? body['amount']);
  const paymentDate = body['收款日期'] ? new Date(body['收款日期'] as string) : nowDate();
  const paymentMethod = (body['收款方式'] as string) ?? '转账';
  const notes = body['备注'] as string | undefined;

  if (!orderNo) throw new Error('orderNo 不能为空');
  const fo = await prisma.financeOrder.findFirst({ where: { databaseName: ds, orderNo } });
  if (!fo) throw new Error(`订单 ${orderNo} 不存在`);

  const payment = await prisma.payment.create({
    data: { databaseName: ds, orderId: fo.orderId, financeOrderId: fo.id, amount, paymentDate, paymentMethod, notes },
  });
  const updated = await updateFinanceOrderAmounts(fo, amount, amount >= 0 ? -amount : Math.abs(amount));

  return { code: 200, data: { success: true, paymentId: payment.id, order: updated }, message: 'ok' };
}

// ─── Add Customer Adjustment ───

export async function addCustomerAdjustment(ds: string, body: Record<string, unknown>) {
  const customerCode = customerCodeFromBody(body);
  const client = await findClient(ds, customerCode);
  const canonicalCustomerCode = client?.clientCode || customerCode;
  const data = {
    databaseName: ds,
    clientCode: canonicalCustomerCode,
    customerName: textValue(body['客户名称'] || body['customerName'] || client?.name),
    adjustAmount: toNum(body['调整金额'] ?? body['adjustAmount']),
    adjustType: (body['调整类型'] as string) ?? '人工调整',
    notes: body['备注'] as string | undefined,
  };
  const adjustment = await prisma.customerAdjustment.create({ data });
  return { code: 200, data: { success: true, adjustmentId: adjustment.id }, message: 'ok' };
}

// ─── Update Order Customer ───

export async function updateOrderCustomer(ds: string, body: Record<string, unknown>) {
  const orderNo = textValue(body['回执单号'] ?? body.orderNo);
  const customerCode = customerCodeFromBody(body);
  const customerName = textValue(body['客户'] ?? body['客户名称'] ?? body.customerName);
  const editor = textValue(body['编辑'] ?? body.editor);

  if (!orderNo) throw new Error('回执单号不能为空');
  if (!customerCode) throw new Error('客户编号不能为空');
  if (!customerName) throw new Error('客户不能为空');

  const client = await findClient(ds, customerCode);
  if (!client) throw new Error(`客户 ${customerCode} 不存在`);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { databaseName_orderNo: { databaseName: ds, orderNo } },
      select: { id: true, doorSpecs: true },
    });
    if (!order) throw new Error(`订单 ${orderNo} 不存在`);

    const specs = parseJsonRecord(order.doorSpecs);
    const customerInfo = parseJsonRecord(specs.customerInfo);
    const pingHui = Array.isArray(specs.ping_hui)
      ? specs.ping_hui.map(row => updateCustomerFields(row, customerName, client.clientCode))
      : specs.ping_hui;
    const diaoHui = Array.isArray(specs.diao_hui)
      ? specs.diao_hui.map(row => updateCustomerFields(row, customerName, client.clientCode))
      : specs.diao_hui;
    const progressData = Array.isArray(specs.progressData)
      ? specs.progressData.map(row => updateCustomerFields(row, customerName, client.clientCode))
      : specs.progressData;

    const doorSpecs = JSON.stringify({
      ...specs,
      customerInfo: {
        ...customerInfo,
        '客户': customerName,
        '客户编号': client.clientCode,
      },
      ...(Array.isArray(specs.ping_hui) ? { ping_hui: pingHui } : {}),
      ...(Array.isArray(specs.diao_hui) ? { diao_hui: diaoHui } : {}),
      ...(Array.isArray(specs.progressData) ? { progressData } : {}),
    });

    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        clientId: client.id,
        customerName,
        doorSpecs,
      },
    });

    const financeOrder = await tx.financeOrder.update({
      where: { databaseName_orderNo: { databaseName: ds, orderNo } },
      data: { orderId: order.id, customerName },
    });

    await tx.progress.updateMany({
      where: { databaseName: ds, orderId: order.id },
      data: { customerName },
    });

    return { order: updatedOrder, financeOrder };
  });

  return {
    code: 200,
    data: {
      success: true,
      回执单号: orderNo,
      客户: customerName,
      客户编号: client.clientCode,
      编辑: editor,
      orderId: result.order.id,
      financeOrderId: result.financeOrder.id,
    },
    message: 'ok',
  };
}

// ─── Add Order Adjustment ───

export async function addOrderAdjustment(ds: string, body: Record<string, unknown>) {
  const orderNo = textValue(body['回执单号'] || body['orderNo']);
  if (!orderNo) throw new Error('回执单号不能为空');
  const amount = toNum(body['调整金额'] ?? body['adjustAmount']);
  const data = {
    databaseName: ds,
    orderNo,
    orderNumber: body['orderNumber'] as string | undefined,
    adjustAmount: amount,
    adjustType: (body['调整类型'] as string) ?? '订单调整',
    notes: body['备注'] as string | undefined,
  };
  const adjustment = await prisma.orderAdjustment.create({ data });
  const order = await applyOrderAdjustmentToFinance(ds, orderNo, amount);
  return { code: 200, data: { success: true, adjustmentId: adjustment.id, order }, message: 'ok' };
}

// ─── Payment Stats ───

export async function getPaymentStats(ds: string, customerId?: string) {
  const client = customerId ? await findClient(ds, customerId) : null;
  const canonicalCustomerCode = client?.clientCode || customerId || '';
  const payments = await prisma.payment.findMany({
    where: {
      databaseName: ds,
      ...(customerId
        ? {
            OR: [
              { financeOrder: { order: { clientId: client?.id ?? -1 } } },
              { financeOrder: { customerName: client?.name || customerId } },
            ],
          }
        : {}),
    },
    orderBy: { paymentDate: 'desc' },
    take: 200,
    include: { financeOrder: { select: { customerName: true } } },
  });
  const fundFlows = customerId
    ? await prisma.customerFundFlow.findMany({
        where: { databaseName: ds, clientCode: canonicalCustomerCode },
        orderBy: { paymentDate: 'desc' },
        take: 200,
      })
    : [];
  const paymentRows = [...payments, ...fundFlows.map(fundFlowPaymentRow)];
  
  // Build monthly stats
  const monthMap: Record<string, { 收款: number; 月份: string; 红冲: number }> = {};
  const yearMap: Record<string, { 年份: string; 收款: number; 红冲: number }> = {};
  for (const p of paymentRows) {
    if (!p.paymentDate) continue;
    const ym = `${p.paymentDate.getFullYear()}-${String(p.paymentDate.getMonth() + 1).padStart(2, '0')}`;
    const y = String(p.paymentDate.getFullYear());
    const amt = toNum(p.amount);
    if (!monthMap[ym]) monthMap[ym] = { 收款: 0, 月份: ym, 红冲: 0 };
    if (!yearMap[y]) yearMap[y] = { 年份: y, 收款: 0, 红冲: 0 };
    if (amt >= 0) {
      monthMap[ym].收款 += amt;
      yearMap[y].收款 += amt;
    } else {
      monthMap[ym].红冲 += Math.abs(amt);
      yearMap[y].红冲 += Math.abs(amt);
    }
  }

  const paymentsList = paymentRows.map(p => ({
    方式: p.paymentMethod || '',
    日期: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : '',
    金额: toNum(p.amount),
  }));

  return {
    code: 200,
    data: {
      monthly: Object.values(monthMap).sort((a, b) => a.月份.localeCompare(b.月份)),
      payments: paymentsList,
      yearly: Object.values(yearMap).sort((a, b) => a.年份.localeCompare(b.年份)),
    },
    message: 'ok',
  };
}

// ─── Customer Statement ───

export async function getCustomerStatement(ds: string, customerId?: string, _days?: string) {
  const client = customerId ? await findClient(ds, customerId) : null;
  const canonicalCustomerCode = client?.clientCode || customerId || '';
  const financeOrderWhere: Record<string, unknown> = { databaseName: ds };
  const paymentWhere: Record<string, unknown> = { databaseName: ds };
  const adjustmentWhere: Record<string, unknown> = { databaseName: ds };
  const orderAdjustmentWhere: Record<string, unknown> = { databaseName: ds };
  if (customerId) {
    financeOrderWhere['OR'] = [
      ...(client ? [{ order: { clientId: client.id } }] : []),
      { customerName: client?.name || customerId },
    ];
    paymentWhere['OR'] = [
      ...(client ? [{ financeOrder: { order: { clientId: client.id } } }] : []),
      { financeOrder: { customerName: client?.name || customerId } },
    ];
    adjustmentWhere['clientCode'] = canonicalCustomerCode;
    orderAdjustmentWhere['orderNo'] = {
      in: (await prisma.financeOrder.findMany({
        where: financeOrderWhere as any,
        select: { orderNo: true },
      })).map(row => row.orderNo).filter(Boolean) as string[],
    };
  }
  const financeOrders = await prisma.financeOrder.findMany({
    where: financeOrderWhere as any,
    include: { order: true },
    orderBy: { createdAt: 'desc' },
  });
  const payments = await prisma.payment.findMany({ where: paymentWhere as any, orderBy: { paymentDate: 'desc' } });
  const fundFlows = customerId
    ? await prisma.customerFundFlow.findMany({
        where: { databaseName: ds, clientCode: canonicalCustomerCode },
        orderBy: { paymentDate: 'desc' },
      })
    : [];
  const adjustments = await prisma.customerAdjustment.findMany({ where: adjustmentWhere as any, orderBy: { createdAt: 'desc' } });
  const orderAdjustments = await prisma.orderAdjustment.findMany({ where: orderAdjustmentWhere as any, orderBy: { createdAt: 'desc' } });
  return { orders: financeOrders, payments: [...payments, ...fundFlows.map(fundFlowPaymentRow)], adjustments: [...adjustments, ...orderAdjustments] };
}

// ─── Order Detail ───

export async function getOrderDetail(ds: string, receiptNo: string) {
  const fo = await prisma.financeOrder.findFirst({ where: { databaseName: ds, orderNo: receiptNo } });
  if (!fo) return { code: 200, data: null, message: 'ok' };
  const payments = await prisma.payment.findMany({ where: { databaseName: ds, financeOrderId: fo.id } });
  const adjustments = await prisma.orderAdjustment.findMany({ where: { databaseName: ds, orderNo: receiptNo } });

  const allocatedDetails = payments.map(p => ({
    id: p.id,
    payment_id: p.id,
    分配金额: toNum(p.amount),
    备注: p.notes || '',
    收款方式: p.paymentMethod || '',
    收款日期: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : '',
  }));

  const adjustRecords = adjustments.map(a => ({
    id: a.id,
    调整金额: toNum(a.adjustAmount),
    调整类型: a.adjustType || '',
    备注: a.notes || '',
    调整日期: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
    日期: a.createdAt ? a.createdAt.toISOString().split('T')[0] : '',
  }));

  return {
    code: 200,
    data: {
      分配明细: allocatedDetails,
      回执单号: receiptNo,
      客户: fo.customerName || '',
      已分配金额: toNum(fo.allocatedAmount),
      总价: toNum(fo.allocatedAmount) + toNum(fo.unpaidAmount) + toNum(fo.orderAdjustTotal),
      未收金额: toNum(fo.unpaidAmount),
      订单调整金额: toNum(fo.orderAdjustTotal),
      调整记录: adjustRecords,
    },
    message: 'ok',
  };
}

// ─── Customer Balance ───

export async function getCustomerBalance(ds: string, customerId?: string, _days?: string) {
  const client = customerId ? await findClient(ds, customerId) : null;
  if (customerId && !client) return { code: 200, data: null, message: 'ok' };
  const canonicalCustomerCode = client?.clientCode || customerId || '';
  const balance = customerId
    ? await ensureCustomerBalance(ds, canonicalCustomerCode, client?.name)
    : await prisma.customerBalance.findFirst({ where: { databaseName: ds } });
  const financeOrders = customerId
    ? await financeOrdersForCustomer(ds, customerId, client)
    : await prisma.financeOrder.findMany({ where: { databaseName: ds }, include: { order: true } });
  const customerAdjustments = await prisma.customerAdjustment.findMany({
    where: { databaseName: ds, ...(customerId ? { clientCode: canonicalCustomerCode } : {}) },
  });
  const orderNos = financeOrders.map(row => row.orderNo).filter(Boolean) as string[];
  const orderAdjustments = orderNos.length
    ? await prisma.orderAdjustment.findMany({ where: { databaseName: ds, orderNo: { in: orderNos } } })
    : [];
  const orderTotalAmount = financeOrders.reduce((sum, row) => sum + toNum(row.allocatedAmount) + toNum(row.unpaidAmount) + toNum(row.orderAdjustTotal), 0);
  const allocated = financeOrders.reduce((sum, row) => sum + toNum(row.allocatedAmount), 0);
  const unpaidTotal = financeOrders.reduce((sum, row) => sum + toNum(row.unpaidAmount), 0);
  const orderAdjustTotal = orderAdjustments.reduce((sum, row) => sum + toNum(row.adjustAmount), 0);
  const customerAdjustTotal = customerAdjustments.reduce((sum, row) => sum + toNum(row.adjustAmount), 0);
  const b = balance || {
    totalTopup: 0,
    prepaidBalance: 0,
    totalSpent: 0,
    customerName: client?.name || '',
    clientCode: customerId || '',
  };
  return {
    code: 200,
    data: {
      实收金额: toNum(b.totalTopup),
      客户余额: Math.max(0, unpaidTotal - customerAdjustTotal),
      客户名称: b.customerName || '',
      客户编号: b.clientCode,
      客户调整合计: customerAdjustTotal,
      已分配金额: allocated,
      未分配余额: toNum(b.prepaidBalance),
      订单总额: orderTotalAmount,
      订单调整合计: orderAdjustTotal,
    },
    message: 'ok',
  };
}

// ─── Preview Allocation ───

export async function previewAllocation(ds: string, body: Record<string, unknown>) {
  const customerCode = customerCodeFromBody(body);
  const amount = toNum(body['收款金额'] ?? body['分配金额'] ?? body.amount);
  const unpaidOrders = await unpaidOrdersForCustomer(ds, customerCode);
  const data = buildAllocationPreview(unpaidOrders, amount, toNum(body['优惠比例']));
  return { code: 200, data: { customerCode, totalAmount: amount, allocated: data['合计分配金额'], ...data }, message: 'ok' };
}

// ─── Preview Prepayment Allocation ───

export async function previewPrepaymentAllocation(ds: string, body: Record<string, unknown>) {
  const customerCode = customerCodeFromBody(body);
  const customerIdentity = customerCode ? await resolveCustomerIdentity(ds, customerCode) : null;
  const balanceCode = customerIdentity?.balanceCode || customerCode;
  const requestedAmount = toNum(body['分配金额'] ?? body['收款金额'] ?? body.amount);
  const balance = balanceCode
    ? await prisma.customerBalance.findFirst({ where: { databaseName: ds, clientCode: balanceCode } })
    : null;
  const available = Math.max(0, toNum(balance?.prepaidBalance));
  const amount = Math.min(Math.max(0, requestedAmount), available);
  const unpaidOrders = await unpaidOrdersForCustomer(ds, customerCode);
  const data = buildAllocationPreview(unpaidOrders, amount, toNum(body['优惠比例']));
  return { code: 200, data: { customerCode, totalAmount: amount, requestedAmount, availableBalance: available, allocated: data['合计分配金额'], ...data }, message: 'ok' };
}

// ─── Execute Prepayment Allocation ───

export async function executePrepaymentAllocation(ds: string, body: Record<string, unknown>) {
  const customerCode = customerCodeFromBody(body);
  const customerIdentity = customerCode ? await resolveCustomerIdentity(ds, customerCode) : null;
  const balanceCode = customerIdentity?.balanceCode || customerCode;
  const requestedAmount = toNum(body['分配金额']);
  const discountRate = toNum(body['优惠比例']);
  const balance = balanceCode
    ? await prisma.customerBalance.findFirst({ where: { databaseName: ds, clientCode: balanceCode } })
    : null;
  const available = Math.max(0, toNum(balance?.prepaidBalance));
  const amount = Math.min(Math.max(0, requestedAmount), available);
  const unpaidOrders = await unpaidOrdersForCustomer(ds, customerCode);
  const preview = buildAllocationPreview(unpaidOrders, amount, discountRate);
  let totalAllocated = 0;
  for (const row of preview['分配列表'] as Record<string, unknown>[]) {
    const orderNo = textValue(row['回执单号']);
    const alloc = toNum(row['分配金额']);
    const discount = toNum(row['优惠金额']);
    if (!orderNo || alloc <= 0) continue;
    const fo = unpaidOrders.find(order => order.orderNo === orderNo);
    if (!fo) continue;
    const nextAllocated = toNum(fo.allocatedAmount) + alloc;
    const nextUnpaid = Math.max(0, toNum(fo.unpaidAmount) - alloc - discount);
    await prisma.financeOrder.update({
      where: { id: fo.id },
      data: { allocatedAmount: nextAllocated, unpaidAmount: nextUnpaid, statusText: statusText(nextUnpaid) },
    });
    if (fo.orderId) {
      await prisma.order.update({ where: { id: fo.orderId }, data: { paidAmount: nextAllocated, unpaidAmount: nextUnpaid } });
    }
    totalAllocated += alloc;
    if (discount > 0 && fo.orderNo) {
      await prisma.orderAdjustment.create({
        data: { databaseName: ds, orderNo: fo.orderNo, adjustAmount: discount, adjustType: '预付款优惠', notes: body['备注'] as string | undefined },
      });
    }
  }
  if (balance) {
    const newPrepaid = Math.max(0, toNum(balance.prepaidBalance) - totalAllocated);
    const newSpent = toNum(balance.totalSpent) + totalAllocated;
    await prisma.customerBalance.update({ where: { id: balance.id }, data: { prepaidBalance: newPrepaid, totalSpent: newSpent } });
    if (totalAllocated > 0) {
      await prisma.customerFundFlow.create({
        data: {
          databaseName: ds,
          clientCode: balanceCode,
          clientId: customerIdentity?.client?.id ?? null,
          customerName: customerIdentity?.customerName ?? balance.customerName ?? '',
          amount: -totalAllocated,
          flowType: '预付款分配',
          paymentDate: nowDate(),
          paymentMethod: null,
          notes: body['备注'] as string | undefined,
        },
      });
    }
  }
  return { code: 200, data: { success: true, requestedAmount, availableBalance: available, totalAllocated, ...preview }, message: '分配成功' };
}

// ─── Clear Selected Orders ───

export async function clearSelectedOrders(ds: string, body: Record<string, unknown>) {
  const rows = body['rows'] || body['data'] || body['selected'] || [];
  const orderNos: string[] = Array.isArray(rows) ? rows.map((r: any) => r.orderNo || r.回执单号 || r).filter(Boolean) : [];
  let cleared = 0;
  for (const orderNo of orderNos) {
    const fo = await prisma.financeOrder.findFirst({ where: { databaseName: ds, orderNo } });
    if (!fo) continue;
    const unpaid = toNum(fo.unpaidAmount);
    if (unpaid <= 0) continue;
    await prisma.payment.create({
      data: { databaseName: ds, orderId: fo.orderId, financeOrderId: fo.id, amount: unpaid, paymentDate: nowDate(), paymentMethod: '清账', notes: '批量清账' },
    });
    await prisma.financeOrder.update({
      where: { id: fo.id },
      data: { allocatedAmount: toNum(fo.allocatedAmount) + unpaid, unpaidAmount: 0, statusText: '已结清' },
    });
    await syncOrderAmounts(fo.orderId, toNum(fo.allocatedAmount) + unpaid, 0);
    cleared++;
  }
  return { code: 200, data: { success: true, clearedOrders: cleared }, message: 'ok' };
}
