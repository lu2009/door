import { prisma } from '../../database';
import { safeLoads, parseDate } from '../../utils/helpers';

const LEGACY_HTML_500 = '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>\n<h1>Internal Server Error</h1>\n<p>The server encountered an internal error and was unable to complete your request. Either the server is overloaded or there is an error in the application.</p>';

// ──────────────────────────── Utility ────────────────────────────

function parseDs(ds: string): { databaseName: string } & Record<string, unknown> {
  const idx = ds.indexOf('_');
  if (idx === -1) return { databaseName: ds };
  return { databaseName: ds.substring(0, idx), clientId: ds.substring(idx + 1) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function parseSpecs(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  const parsed = safeLoads(value);
  return isRecord(parsed) ? parsed : {};
}

function firstNonBlank(...values: unknown[]): unknown {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return undefined;
}

function dateText(value: unknown, gmt = false): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return gmt ? date.toUTCString() : date.toISOString().slice(0, 10);
}

function normalizeRefs(refs: unknown[]): string[] {
  const normalized = refs.flatMap(ref => {
    if (!isRecord(ref)) return [String(ref || '').trim()];
    return [
      ref.id,
      ref['id'],
      ref['单号'],
      ref['回执单号'],
      ref.orderNo,
      ref.order_no,
    ].map(value => String(value || '').trim());
  }).filter(Boolean);
  return [...new Set(normalized)];
}

function rowRefs(row: Record<string, unknown>): string[] {
  return [
    row.id,
    row['id'],
    row['单号'],
    row['回执单号'],
    row.orderNo,
    row.order_no,
  ].map(value => String(value || '').trim()).filter(Boolean);
}

function rowRef(row: Record<string, unknown>): string {
  return rowRefs(row)[0] || '';
}

function doorRowsFromSpecs(specs: Record<string, unknown>): Record<string, unknown>[] {
  return [
    ...asRecordArray(specs.ping_hui ?? specs['平开']),
    ...asRecordArray(specs.diao_hui ?? specs['吊滑']),
  ];
}

function buildReceiptNoSet(specs: Record<string, unknown>): string {
  const customerInfo = isRecord(specs.customerInfo) ? specs.customerInfo : {};
  const lineNos = doorRowsFromSpecs(specs)
    .map(row => row['单号'])
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim());
  const unique = [...new Set(lineNos)];
  if (unique.length > 0) return unique.join('_');
  const existing = customerInfo['单号集'];
  return existing !== null && existing !== undefined ? String(existing).trim() : '';
}

function splitPrintStatus(value: unknown): string[] {
  return String(value ?? '')
    .split('_')
    .map(item => item.trim())
    .filter(Boolean);
}

function mergePrintStatus(existing: unknown, incoming: unknown): string {
  const next = String(incoming ?? '').trim();
  const parts = splitPrintStatus(existing);
  if (!next) return parts.join('_');
  if (!parts.includes(next)) parts.push(next);
  return parts.join('_');
}

function removePrintStatus(existing: unknown, target: unknown): string {
  const text = String(target ?? '').trim();
  if (!text) return splitPrintStatus(existing).join('_');
  return splitPrintStatus(existing).filter(item => item !== text).join('_');
}

function parseScanMarker(value: unknown): { employee: string; date: string } | null {
  const text = String(value ?? '').trim();
  const match = text.match(/_(.+)_(\d{4}-\d{2}-\d{2})$/);
  if (!match) return null;
  return { employee: match[1], date: match[2] };
}

function buildProgressText(row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const value = row[`工序${i}`];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      parts.push(String(value).trim());
    }
  }
  return parts.join('➞');
}

function withProgressText(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    '生产进度': buildProgressText(row),
  };
}

function enrichDoorRow(
  row: Record<string, unknown>,
  order: { orderNo?: string | null; customerName?: string | null; orderDate?: Date | null; client?: Record<string, unknown> | null },
  specs: Record<string, unknown>,
  options: { gmtDate?: boolean } = {},
): Record<string, unknown> {
  const customerInfo = isRecord(specs.customerInfo) ? specs.customerInfo : {};
  const client = isRecord(order.client) ? order.client : {};
  const output: Record<string, unknown> = {
    formulaid: null,
    id: rowRef(row),
    imageUrl: null,
    ...row,
    '业务员': firstNonBlank(row['业务员'], customerInfo['业务员'], ''),
    '五金': firstNonBlank(row['五金'], ''),
    '单号': firstNonBlank(row['单号'], ''),
    '回执单号': firstNonBlank(row['回执单号'], customerInfo['回执单号'], order.orderNo, ''),
    '备注': firstNonBlank(row['备注'], customerInfo['订单备注'], ''),
    '安装地址': firstNonBlank(row['安装地址'], customerInfo['安装地址'], customerInfo['地址'], client.address, ''),
    '客户': firstNonBlank(row['客户'], customerInfo['客户'], order.customerName, ''),
    '客户编号': firstNonBlank(row['客户编号'], customerInfo['客户编号'], client.clientCode, 0),
    '封板高': firstNonBlank(row['封板高'], 0),
    '打单人': firstNonBlank(row['打单人'], customerInfo['打单人'], null),
    '打单操作': firstNonBlank(row['打单操作'], customerInfo['打单操作'], ''),
    '日期': firstNonBlank(dateText(row['日期'], options.gmtDate), dateText(customerInfo['日期'], options.gmtDate), dateText(order.orderDate, options.gmtDate)),
    '洞尺': firstNonBlank(row['洞尺'], ''),
    '生产进度': firstNonBlank(row['生产进度'], ''),
    '扫码日期': firstNonBlank(row['扫码日期'], null),
    '加价项目原始数据': firstNonBlank(row['加价项目原始数据'], 'null'),
  };

  for (let i = 1; i <= 15; i++) {
    const key = `工序${i}`;
    if (!(key in output)) output[key] = null;
  }

  output['生产进度'] = firstNonBlank(buildProgressText(output), output['生产进度'], '');
  return output;
}

function labelRow(row: Record<string, unknown>, order: { orderNo?: string | null; customerName?: string | null; orderDate?: Date | null; client?: Record<string, unknown> | null }, specs: Record<string, unknown>) {
  const full = enrichDoorRow(row, order, specs, { gmtDate: true });
  return {
    '亮窗总高': full['亮窗总高'] ?? null,
    '单号': full['单号'],
    '吊脚': full['吊脚'] ?? null,
    '型材': full['型材'] ?? '',
    '墙厚': full['墙厚'] ?? null,
    '备注': full['备注'] ?? '',
    '安装地址': full['安装地址'] ?? '',
    '客户': full['客户'] ?? '',
    '底玻': full['底玻'] ?? '',
    '打单操作': full['打单操作'] ?? '',
    '开向': full['开向'] ?? '',
    '扇数': full['扇数'] ?? null,
    '数量': full['数量'] ?? null,
    '日期': full['日期'],
    '门洞宽': full['门洞宽'] ?? null,
    '门洞高': full['门洞高'] ?? null,
    '面玻': full['面玻'] ?? '',
    '颜色': full['颜色'] ?? '',
  };
}

function updateSpecsRows(
  specs: Record<string, unknown>,
  refs: Set<string>,
  updater: (row: Record<string, unknown>) => Record<string, unknown>,
): { specs: Record<string, unknown>; updated: number } {
  let updated = 0;
  const next = { ...specs };
  for (const key of ['ping_hui', '平开', 'diao_hui', '吊滑']) {
    const rows = asRecordArray(next[key]);
    if (rows.length === 0) continue;
    next[key] = rows.map(row => {
      if (!rowRefs(row).some(ref => refs.has(ref))) return row;
      updated += 1;
      return updater(row);
    });
  }
  if (Array.isArray(next.progressData)) {
    next.progressData = asRecordArray(next.progressData).map(row => {
      if (!rowRefs(row).some(ref => refs.has(ref))) return row;
      return updater(row);
    });
  }
  return { specs: next, updated };
}

function isProcedureSlot(value: string): boolean {
  return /^工序\d+$/.test(value.trim());
}

function countMatchingDoorRows(specs: Record<string, unknown>, refs: Set<string>): number {
  return doorRowsFromSpecs(specs).filter(row => rowRefs(row).some(ref => refs.has(ref))).length;
}

function findCachedProgressRow(
  cachedRows: Record<string, unknown>[],
  row: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const refs = new Set(rowRefs(row));
  return cachedRows.find(cached => rowRefs(cached).some(ref => refs.has(ref)));
}

function mergeProgressFields(
  row: Record<string, unknown>,
  cached?: Record<string, unknown>,
): Record<string, unknown> {
  if (!cached) return row;
  const progressFields: Record<string, unknown> = {};
  for (let i = 1; i <= 15; i++) {
    const key = `工序${i}`;
    if (cached[key] !== undefined) progressFields[key] = cached[key];
  }
  for (const key of ['工序', '生产进度', 'procedureName', 'procedureStatus', '扫码员工', '扫码日期']) {
    if (cached[key] !== undefined) progressFields[key] = cached[key];
  }
  return { ...row, ...progressFields };
}

function progressRowFromDoorRow(
  row: Record<string, unknown>,
  order: { orderNo?: string | null; customerName?: string | null; orderDate?: Date | null; client?: Record<string, unknown> | null },
  specs: Record<string, unknown>,
): Record<string, unknown> {
  const customerInfo = isRecord(specs.customerInfo) ? specs.customerInfo : {};
  const enriched = enrichDoorRow(row, order, specs);
  return {
    ...enriched,
    procedureName: firstNonBlank(row['procedureName'], row['工序'], ''),
    procedureStatus: row['procedureStatus'] ?? row['生产进度'] ?? null,
    '业务员': firstNonBlank(row['业务员'], enriched['业务员'], customerInfo['业务员'], ''),
    '打单人': firstNonBlank(row['打单人'], enriched['打单人'], customerInfo['打单人'], null),
    '打单操作': firstNonBlank(row['打单操作'], enriched['打单操作'], customerInfo['打单操作'], ''),
    '生产进度': firstNonBlank(buildProgressText(row), row['生产进度'], enriched['生产进度'], ''),
    '单号': firstNonBlank(row['单号'], enriched['单号'], ''),
    orderNo: order.orderNo,
    order,
  };
}

function buildProgressRowsForOrder(
  order: { orderNo?: string | null; customerName?: string | null; orderDate?: Date | null; doorSpecs?: string | null; client?: Record<string, unknown> | null },
): Record<string, unknown>[] {
  const specs = parseSpecs(order.doorSpecs);
  const rows = doorRowsFromSpecs(specs);
  const cached = asRecordArray(specs.progressData);

  if (rows.length === 0) {
    return cached.map(row => progressRowFromDoorRow(row, order, specs));
  }

  return rows.map(row => progressRowFromDoorRow(
    mergeProgressFields(row, findCachedProgressRow(cached, row)),
    order,
    specs,
  ));
}

// ────────────────────── Get Progress ──────────────────────

export async function getProgress(ds: string, orderNo?: string) {
  const { databaseName } = parseDs(ds);
  const where: Record<string, unknown> = { databaseName };
  if (orderNo) where.orderNo = orderNo;

  const orders = await prisma.order.findMany({
    where,
    include: { client: true },
    orderBy: { orderNo: 'asc' },
  });

  const progressData: Record<string, unknown>[] = [];
  for (const order of orders) {
    progressData.push(...buildProgressRowsForOrder(order as any));
  }

  return { code: 200, data: { progressData }, message: '数据获取成功' };
}

// ────────────────────── Get More Progress ──────────────────────

export async function getMoreProgress(
  ds: string,
  customer?: string,
  address?: string,
  startDate?: string,
  endDate?: string,
) {
  const { databaseName } = parseDs(ds);
  const where: Record<string, unknown> = { databaseName };

  if (customer) {
    where.customerName = { contains: customer };
  }

  if (address) {
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
    include: { client: true },
    orderBy: { orderNo: 'asc' },
  });

  const progressData: Record<string, unknown>[] = [];
  for (const order of orders) {
    progressData.push(...buildProgressRowsForOrder(order as any));
  }

  return { code: 200, data: { progressData }, message: '数据获取成功' };
}

// ────────────────────── Payment Collection ──────────────────────

export async function updatePaymentCollection(ds: string, param3: string, param4: string) {
  const { databaseName } = parseDs(ds);

  // ─── UPDATE path (param4 = receipt_no) ───
  if (param4) {
    const newAmount = parseFloat(param3) || 0;
    if (newAmount < 0) throw new Error('收款金额不能为负数');

    const order = await prisma.order.findFirst({
      where: { databaseName, orderNo: param4 },
    });
    if (!order) throw new Error('回执单不存在');

    const oldPaid = Number(order.paidAmount || 0);
    const delta = newAmount - oldPaid;

    // Update order paid/unpaid amounts
    const adjustments = 0; // order_adjust_total not tracked at order level
    const newUnpaid = Math.max(0, Number(order.totalAmount || 0) - newAmount - adjustments);
    await prisma.order.update({
      where: { id: order.id },
      data: { paidAmount: newAmount, unpaidAmount: newUnpaid },
    });

    // Upsert finance order
    const finOrder = await prisma.financeOrder.findFirst({
      where: { databaseName, orderNo: param4 },
    });
    if (finOrder) {
      const newAllocated = Math.max(Number(finOrder.allocatedAmount || 0), newAmount);
      const finAdjustments = Number(finOrder.orderAdjustTotal || 0);
      const finUnpaid = Math.max(0, Number(order.totalAmount || 0) - newAmount - finAdjustments);
      await prisma.financeOrder.update({
        where: { id: finOrder.id },
        data: {
          allocatedAmount: newAllocated,
          unpaidAmount: finUnpaid,
          orderId: order.id,
          customerName: order.customerName,
        },
      });
    } else {
      await prisma.financeOrder.create({
        data: {
          databaseName,
          orderId: order.id,
          orderNo: order.orderNo,
          customerName: order.customerName,
          allocatedAmount: Math.max(0, newAmount),
          unpaidAmount: Math.max(0, Number(order.totalAmount || 0) - newAmount),
        },
      });
    }

    // Create payment record if delta != 0
    if (delta !== 0) {
      await prisma.payment.create({
        data: {
          databaseName,
          orderId: order.id,
          amount: Math.abs(delta),
          paymentDate: new Date(),
          paymentMethod: '手动收款调整',
          notes: '终端收款更新',
        },
      });
    }

    return { code: 200, data: [serializeOrder(order)], message: '收款更新成功' };
  }

  // ─── QUERY path (param3 = receipt_no) ───
  if (param3) {
    const order = await prisma.order.findFirst({
      where: { databaseName, orderNo: param3 },
      include: { client: true },
    });
    if (!order) return { code: 200, data: { tableData: [] }, message: '数据获取成功' };

    return {
      code: 200,
      data: { tableData: [buildPaymentRow(order)] },
      message: '数据获取成功',
    };
  }

  throw new Error('缺少参数');
}

// ── Helper: serialize order to array format (for update response) ──
function serializeOrder(order: Record<string, unknown>): Record<string, unknown> {
  return {
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    paidAmount: Number(order.paidAmount || 0),
    unpaidAmount: Number(order.unpaidAmount || 0),
    totalAmount: Number(order.totalAmount || 0),
  };
}

// ── Helper: build payment table row with Chinese fields ──
function buildPaymentRow(order: any): Record<string, unknown> {
  const client = order.client || {};
  const specs = parseSpecs(order.doorSpecs);
  const customerInfo = isRecord(specs.customerInfo) ? specs.customerInfo : {};
  return {
    '回执单号': order.orderNo || '',
    '客户': order.customerName || '',
    '客户编号': client.clientCode || '',
    '总价': Number(order.totalAmount || 0),
    '定金': Number(order.paidAmount || 0),
    '日期': order.orderDate ? order.orderDate.toISOString().split('T')[0] : '',
    '截止日期': order.deliveryDate ? order.deliveryDate.toISOString().split('T')[0] : '',
    '安装地址': client.address || '',
    '业务员': order.salesperson || '',
    '打单人': order.operatorName || '',
    '打单操作': customerInfo['打单操作'] || '',
    '订单备注': order.notes || '',
    '单号集': buildReceiptNoSet(specs),
  };
}

// ────────────────────── Other Functions ──────────────────────

export async function getLabelData(ds: string, refs: string[]) {
  const { databaseName } = parseDs(ds);
  const wanted = normalizeRefs(refs);
  if (wanted.length === 0) return { code: 200, data: [], message: '查询成功' };

  const orders = await prisma.order.findMany({
    where: { databaseName, orderNo: { in: wanted } },
    include: { client: true },
  });

  const rows = orders.flatMap(order => {
    const specs = parseSpecs(order.doorSpecs);
    return doorRowsFromSpecs(specs).map(row => labelRow(row, order as any, specs));
  });

  if (rows.length === 0) {
    return { content: { code: 404, message: '未找到相关订单' }, status_code: 404 };
  }
  return { code: 200, data: rows, message: '查询成功' };
}

export async function getScanQrCode(ds: string, refs: string[]) {
  const { databaseName } = parseDs(ds);
  const wanted = refs.map(ref => String(ref || '').trim()).filter(Boolean);
  if (wanted.length === 0) return { code: 200, data: [], message: '查询成功' };
  const wantedSet = new Set(wanted);

  const orders = await prisma.order.findMany({
    where: { databaseName },
    include: { client: true },
  });
  const rows = orders.flatMap(order => {
    const specs = parseSpecs(order.doorSpecs);
    return doorRowsFromSpecs(specs)
      .filter(row => wantedSet.has(String(row['单号'] || '').trim()))
      .map(row => enrichDoorRow(row, order as any, specs, { gmtDate: true }));
  });

  if (rows.length === 0) return { code: 404, data: [], message: '未找到相关订单' };
  return { code: 200, data: rows, message: '查询成功' };
}

function resolveDateLabel(label: string): string {
  const today = new Date();
  const fy = today.getFullYear();
  const fm = String(today.getMonth() + 1).padStart(2, '0');
  const fd = String(today.getDate()).padStart(2, '0');
  const ds = `${fy}-${fm}-${fd}`;

  switch (label) {
    case '当天':
      return `${ds},${ds}`;
    case '本周': {
      const dw = today.getDay() || 7; // Sunday = 7
      const mon = new Date(today);
      mon.setDate(today.getDate() - dw + 1);
      const wy = mon.getFullYear();
      const wm = String(mon.getMonth() + 1).padStart(2, '0');
      const wd = String(mon.getDate()).padStart(2, '0');
      return `${wy}-${wm}-${wd},${ds}`;
    }
    case '本月':
      return `${fy}-${fm}-01,${ds}`;
    default:
      return label; // pass through — already a date string or "更多"
  }
}

export async function getProcessCounts(ds: string, operatorName?: string, dateRange?: string) {
  const { databaseName } = parseDs(ds);
  if (!operatorName || !dateRange) {
    return { __statusCode: 500, __html: true, message: 'missing params' };
  }

  // Convert frontend date labels ("当天", "本周", "本月") to actual date strings
  const resolved = resolveDateLabel(dateRange);
  const [startText, endText] = resolved.split(',').map(part => part.trim());
  const startDate = parseDate(startText);
  const endDate = parseDate(endText || startText);
  if (!startDate || !endDate) {
    return { __statusCode: 400, code: 400, data: null, message: `获取扫码统计数据异常: time data '${dateRange}' does not match format '%Y-%m-%d'` };
  }

  const orders = await prisma.order.findMany({
    where: { databaseName },
    include: { client: true },
  });
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const progressData: Record<string, unknown>[] = [];
  for (const order of orders) {
    const specs = parseSpecs(order.doorSpecs);
    for (const row of doorRowsFromSpecs(specs)) {
      const scanDate = parseDate(row['扫码日期']);
      if (!scanDate) continue;
      const scanEmployee = String(row['扫码员工'] || row['员工'] || '').trim();
      const scan = new Date(scanDate);
      if (scan < start || scan > end) continue;
      if (operatorName !== '1' && scanEmployee !== operatorName) continue;
      progressData.push(enrichDoorRow(row, order as any, specs, { gmtDate: true }));
    }
  }

  return { code: 200, data: { progressData }, message: '数据获取成功' };
}

export async function updateProgress(ds: string, procedureSlot: string, orderIds: string[], procedureValue = '') {
  const { databaseName } = parseDs(ds);
  const refs = new Set(normalizeRefs(orderIds));
  if (!procedureSlot || refs.size === 0) return { code: 400, data: { failed: [...refs] }, message: '缺少必要参数' };

  const orders = await prisma.order.findMany({ where: { databaseName } });
  const failed = new Set(refs);
  let totalUpdated = 0;

  for (const order of orders) {
    const currentSpecs = parseSpecs(order.doorSpecs);
    const updated = countMatchingDoorRows(currentSpecs, refs);
    if (updated === 0) continue;

    for (const row of doorRowsFromSpecs(currentSpecs)) {
      for (const ref of rowRefs(row)) {
        if (refs.has(ref)) failed.delete(ref);
      }
    }

    const { specs: nextSpecs } = updateSpecsRows(currentSpecs, refs, row => {
      const nextValue = procedureSlot === '工序10'
        ? mergePrintStatus(row[procedureSlot], procedureValue)
        : procedureValue;
      const scanInfo = parseScanMarker(nextValue);
      return withProgressText({
        ...row,
        [procedureSlot]: nextValue,
        ...(scanInfo ? { '扫码员工': scanInfo.employee, '扫码日期': scanInfo.date } : {}),
      });
    });

    await prisma.progress.upsert({
      where: { databaseName_orderId_procedureName: { databaseName, orderId: order.id, procedureName: procedureSlot } },
      create: {
        databaseName,
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName || '',
        procedureName: procedureSlot,
        procedureStatus: procedureValue,
        completedAt: new Date(),
      },
      update: {
        procedureStatus: procedureValue,
        completedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { doorSpecs: JSON.stringify(nextSpecs) },
    });

    totalUpdated += updated;
  }

  if (failed.size > 0 && totalUpdated === 0) {
    return { code: 400, data: { failed: [...failed] }, message: `以下单号更新失败: ${JSON.stringify([...failed])}` };
  }
  return { code: 200, message: `更新成功，共更新 ${totalUpdated} 条记录${failed.size > 0 ? `，${failed.size} 条未匹配已跳过` : ''}` };
}

export async function updatePrintStatus(ds: string, statusText: string, orderIds: string[], operatorName = '', skipDetailRows = false) {
  const { databaseName } = parseDs(ds);
  const refs = new Set(normalizeRefs(orderIds));
  if (!statusText || refs.size === 0) return { code: 400, data: { failed: [...refs] }, message: '缺少必要参数' };

  const orders = await prisma.order.findMany({ where: { databaseName } });
  const failed = new Set(refs);
  let totalUpdated = 0;

  for (const order of orders) {
    const orderRefs = [order.orderNo, String(order.id)].filter(Boolean);
    const currentSpecs = parseSpecs(order.doorSpecs);
    const doorRowMatches = countMatchingDoorRows(currentSpecs, refs);
    const orderMatches = orderRefs.some(ref => refs.has(ref));
    if (!orderMatches && doorRowMatches === 0) continue;

    for (const ref of orderRefs) {
      if (refs.has(ref)) failed.delete(ref);
    }
    for (const row of doorRowsFromSpecs(currentSpecs)) {
      for (const ref of rowRefs(row)) {
        if (refs.has(ref)) failed.delete(ref);
      }
    }

    const customerInfo = isRecord(currentSpecs.customerInfo) ? currentSpecs.customerInfo : {};

    // Write 工序10 on detail rows (skip when caller already handles it, e.g. updataProgress&param3=工序10)
    let nextSpecs = { ...currentSpecs };
    if (!skipDetailRows) {
      if (orderMatches) {
        // Order-level match: update 工序10 on ALL detail rows
        for (const key of ['ping_hui', '平开', 'diao_hui', '吊滑']) {
          const rows = asRecordArray(nextSpecs[key]);
          if (rows.length === 0) continue;
          nextSpecs[key] = rows.map(row => withProgressText({
            ...row,
            '工序10': mergePrintStatus(row['工序10'], statusText),
          }));
        }
        if (Array.isArray(nextSpecs.progressData)) {
          nextSpecs.progressData = asRecordArray(nextSpecs.progressData).map(row => withProgressText({
            ...row,
            '工序10': mergePrintStatus(row['工序10'], statusText),
          }));
        }
      } else {
        // Detail-row-level match: only update matched rows
        const { specs: updated } = updateSpecsRows(currentSpecs, refs, row => withProgressText({
          ...row,
          '工序10': mergePrintStatus(row['工序10'], statusText),
        }));
        nextSpecs = updated;
      }
    }

    // Write customerInfo['打单操作'] (order-level, for Home page)
    const nextPrintStatus = mergePrintStatus(customerInfo['打单操作'], statusText);
    nextSpecs = {
      ...nextSpecs,
      customerInfo: {
        ...customerInfo,
        '打单操作': nextPrintStatus,
        '单号集': buildReceiptNoSet(nextSpecs),
        ...(operatorName ? { '打单人': operatorName } : {}),
      },
    };

    await prisma.order.update({
      where: { id: order.id },
      data: {
        doorSpecs: JSON.stringify(nextSpecs),
        operatorName: operatorName || order.operatorName || '',
      },
    });

    totalUpdated += orderMatches ? 1 : doorRowMatches;
  }

  if (failed.size > 0 && totalUpdated === 0) {
    return { code: 400, data: { failed: [...failed] }, message: `以下单号更新失败: ${JSON.stringify([...failed])}` };
  }
  return { code: 200, message: `更新成功，共更新 ${totalUpdated} 条记录${failed.size > 0 ? `，${failed.size} 条未匹配已跳过` : ''}` };
}

export async function deletePrintStatus(ds: string, statusText: string, orderRefs: string[]) {
  const { databaseName } = parseDs(ds);
  const refs = new Set(normalizeRefs(orderRefs || []));
  if (!statusText || refs.size === 0) return { code: 400, data: { failed: [...refs] }, message: '缺少必要参数' };

  const orders = await prisma.order.findMany({ where: { databaseName } });
  const failed = new Set(refs);
  let totalUpdated = 0;

  for (const order of orders) {
    const orderRefsForMatch = [order.orderNo, String(order.id)].filter(Boolean);
    const currentSpecs = parseSpecs(order.doorSpecs);
    const doorRowMatches = countMatchingDoorRows(currentSpecs, refs);
    const orderMatches = orderRefsForMatch.some(ref => refs.has(ref));
    if (!orderMatches && doorRowMatches === 0) continue;

    for (const ref of orderRefsForMatch) {
      if (refs.has(ref)) failed.delete(ref);
    }
    for (const row of doorRowsFromSpecs(currentSpecs)) {
      for (const ref of rowRefs(row)) {
        if (refs.has(ref)) failed.delete(ref);
      }
    }

    const customerInfo = isRecord(currentSpecs.customerInfo) ? currentSpecs.customerInfo : {};
    const { specs: specsWithRows } = updateSpecsRows(currentSpecs, refs, row => withProgressText({
      ...row,
      '工序10': removePrintStatus(row['工序10'], statusText),
    }));
    const nextSpecs = {
      ...specsWithRows,
      customerInfo: {
        ...customerInfo,
        '打单操作': removePrintStatus(customerInfo['打单操作'], statusText),
        '单号集': buildReceiptNoSet(currentSpecs),
      },
    };

    await prisma.order.update({
      where: { id: order.id },
      data: { doorSpecs: JSON.stringify(nextSpecs) },
    });

    totalUpdated += orderMatches ? 1 : doorRowMatches;
  }

  if (failed.size > 0) {
    return { code: 400, data: { failed: [...failed] }, message: `以下单号更新失败: ${JSON.stringify([...failed])}` };
  }
  return { code: 200, message: `删除成功，共更新 ${totalUpdated} 条记录` };
}

export async function deleteProgress(ds: string, procedureName?: string, orderRefs?: string[]) {
  const { databaseName } = parseDs(ds);
  const refs = normalizeRefs(orderRefs || []);
  if (procedureName && isProcedureSlot(procedureName) && refs.length > 0) {
    const refSet = new Set(refs);
    const orders = await prisma.order.findMany({ where: { databaseName } });
    let deleted = 0;
    const matchedOrderIds: number[] = [];

    for (const order of orders) {
      const currentSpecs = parseSpecs(order.doorSpecs);
      const { specs, updated } = updateSpecsRows(currentSpecs, refSet, row => {
        const next = { ...row };
        delete next[procedureName];
        return withProgressText(next);
      });
      if (updated === 0) continue;
      deleted += updated;
      matchedOrderIds.push(order.id);
      await prisma.order.update({ where: { id: order.id }, data: { doorSpecs: JSON.stringify(specs) } });
    }

    if (matchedOrderIds.length > 0) {
      await prisma.progress.deleteMany({
        where: { databaseName, procedureName, orderId: { in: matchedOrderIds } },
      });
    }
    return { code: 200, deleted };
  }

  const where: Record<string, unknown> = { databaseName };
  if (procedureName) where.procedureName = procedureName;
  if (refs.length > 0) where.orderNo = { in: refs };
  const result = await prisma.progress.deleteMany({ where });
  return { deleted: result.count };
}

export async function deleteProgressCell(ds: string, slot: string, rowRefValue: string, procedureName?: string) {
  const { databaseName } = parseDs(ds);
  if (!slot || !rowRefValue) return { deleted: 0 };
  const orders = await prisma.order.findMany({ where: { databaseName } });
  let deleted = 0;

  for (const order of orders) {
    const currentSpecs = parseSpecs(order.doorSpecs);
    const { specs, updated } = updateSpecsRows(currentSpecs, new Set([rowRefValue]), row => {
      const next = { ...row };
      delete next[slot];
      return withProgressText(next);
    });
    if (updated === 0) continue;
    deleted += updated;
    await prisma.order.update({ where: { id: order.id }, data: { doorSpecs: JSON.stringify(specs) } });
  }

  return { deleted };
}
export async function setProcedures(ds: string, proceduresData: unknown) {
  // Match Flask: accepts list of {name,order_index,description} or dict of {工序1: name|{name,description}}
  const created: number[] = [];

  const processSlot = async (name: string, orderIndex: number, description: string) => {
    if (!name) {
      // Delete if empty name (matching Flask: empty name = delete)
      const existing = await prisma.procedure.findFirst({ where: { databaseName: ds, orderIndex } });
      if (existing) await prisma.procedure.delete({ where: { id: existing.id } });
      return;
    }
    // Lookup by order_index first (Flask logic), then by name
    let existing = await prisma.procedure.findFirst({ where: { databaseName: ds, orderIndex } });
    if (!existing) {
      existing = await prisma.procedure.findFirst({ where: { databaseName: ds, name } });
    }
    if (existing) {
      await prisma.procedure.update({
        where: { id: existing.id },
        data: { name, orderIndex, description },
      });
    } else {
      const proc = await prisma.procedure.create({
        data: { databaseName: ds, name, orderIndex, description },
      });
      created.push(proc.id);
    }
  };

  if (Array.isArray(proceduresData)) {
    for (let idx = 0; idx < proceduresData.length; idx++) {
      const proc = proceduresData[idx] as Record<string, unknown>;
      if (typeof proc === 'object' && proc !== null) {
        const procName = (proc['name'] as string) || `工序${idx + 1}`;
        await processSlot(procName, idx + 1, (proc['description'] as string) || '');
      }
    }
  } else if (proceduresData && typeof proceduresData === 'object') {
    for (const [slot, config] of Object.entries(proceduresData as Record<string, unknown>)) {
      const slotStr = slot.trim();
      if (!slotStr) continue;
      let procName: string;
      let orderIndex: number;
      let description: string;
      if (typeof config === 'object' && config !== null) {
        const c = config as Record<string, unknown>;
        procName = ((c['name'] as string) || (c['description'] as string) || (c['value'] as string) || '').trim();
        orderIndex = (c['order_index'] as number) || 0;
        description = (c['description'] as string) || procName;
      } else {
        procName = String(config || '').trim();
        orderIndex = slotStr.startsWith('工序') ? parseInt(slotStr.replace('工序', '')) || 0 : 0;
        description = procName;
      }
      if (!orderIndex) {
        orderIndex = slotStr.startsWith('工序') ? parseInt(slotStr.replace('工序', '')) || 0 : 0;
      }
      await processSlot(procName, orderIndex, description);
    }
  }

  return { code: 200, data: null, message: '工序设置保存成功' };
}
