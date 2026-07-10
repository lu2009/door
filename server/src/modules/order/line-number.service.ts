import { prisma } from '../../database';
import { parseJsonRecord, asRecordArray, doorRowsFromSpecs, buildReceiptNoSet } from '../../utils/record-helpers';

function rowId(row: Record<string, unknown>): string {
  return String(row.id ?? row['id'] ?? '').trim();
}

function safeOrderId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric)) return null;
  if (numeric < 1 || numeric > 2147483647) return null;
  return numeric;
}

function lineDateSuffix(dateValue?: unknown): string {
  const raw = dateValue !== null && dateValue !== undefined && String(dateValue).trim() !== ''
    ? new Date(String(dateValue))
    : new Date();
  const date = Number.isNaN(raw.getTime()) ? new Date() : raw;
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

function lineNoNumber(value: unknown, dateSuffix?: string): number | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const match = text.match(/^(\d+)-(\d{2})(?:\/(\d{2})\/(\d{2}))?\b/);
  if (!match) return null;
  if (dateSuffix) {
    const [year, month, day] = dateSuffix.split('/');
    if (match[2] !== year) return null;
    if (match[3] && match[4] && (match[3] !== month || match[4] !== day)) return null;
  }
  return Number(match[1]) || null;
}

function updateDoorRows(
  specs: Record<string, unknown>,
  updater: (row: Record<string, unknown>) => Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...specs };
  for (const key of ['ping_hui', '平开', 'diao_hui', '吊滑']) {
    const rows = asRecordArray(next[key]);
    if (rows.length > 0) next[key] = rows.map(row => updater(row));
  }
  if (Array.isArray(next.progressData)) {
    next.progressData = asRecordArray(next.progressData).map(row => updater(row));
  }
  return next;
}

function withReceiptNoSet(specs: Record<string, unknown>): Record<string, unknown> {
  const customerInfo = parseJsonRecord(specs.customerInfo);
  return {
    ...specs,
    customerInfo: {
      ...customerInfo,
      '单号集': buildReceiptNoSet(specs),
    },
  };
}

// ────────────────────── Public API ──────────────────────

/**
 * Ensure every matched detail row has a 单号 (line number).
 *
 * Rules (unchanged from production):
 * - Format: N-YY/MM/DD
 * - Date source: orderDate from customerInfo, order.orderDate, or row['日期']
 * - N increments from the global maximum for the same date across all orders
 * - Never overwrite an existing 单号
 * - Only scan/modify orders matched by the given refs (plus read-only global max scan)
 *
 * @param ds   database name
 * @param refs order numbers, order IDs, or detail row IDs
 * @returns    map of rowId → generated lineNo
 */
export async function ensureLineNumbers(
  ds: string,
  refs: string[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const ids = [...new Set(refs.map(r => String(r || '').trim()).filter(Boolean))];
  if (ids.length === 0) return map;

  // ── Find matching orders ──
  const numericIds = ids
    .map(safeOrderId)
    .filter((id): id is number => id !== null);

  const orders = await prisma.order.findMany({
    where: {
      databaseName: ds,
      OR: [
        { orderNo: { in: ids } },
        ...(numericIds.length > 0 ? [{ id: { in: numericIds } }] : []),
        ...ids.map(id => ({ doorSpecs: { contains: id } })),
      ],
    },
    select: { id: true, orderNo: true, orderDate: true, doorSpecs: true },
  });

  if (orders.length === 0) return map;

  // ── Determine fill scope per order ──
  const orderNoSet = new Set(ids);
  const orderIdSet = new Set(numericIds);
  const wanted = new Set(ids);

  interface OrderWorkItem {
    order: { id: number; orderNo: string; orderDate: Date | null; doorSpecs: string | null };
    specs: Record<string, unknown>;
    dateSuffix: string;
    fillAll: boolean;
  }

  const orderWork: OrderWorkItem[] = [];

  for (const order of orders) {
    const specs = parseJsonRecord(order.doorSpecs);
    const isOrderLevel = orderNoSet.has(order.orderNo) || orderIdSet.has(order.id);

    const allRows = doorRowsFromSpecs(specs);
    const rowsToCheck = isOrderLevel
      ? allRows
      : allRows.filter(row => wanted.has(rowId(row)));

    if (rowsToCheck.length === 0) continue;

    const dateSuffix = lineDateSuffix(
      parseJsonRecord(specs.customerInfo)['日期'] ?? order.orderDate ?? rowsToCheck[0]?.['日期'],
    );
    orderWork.push({ order, specs, dateSuffix, fillAll: isOrderLevel });
  }

  if (orderWork.length === 0) return map;

  // ── Scan all orders for max N per date (read-only) ──
  const neededDates = [...new Set(orderWork.map(item => item.dateSuffix))];
  const maxByDate: Record<string, number> = Object.fromEntries(neededDates.map(date => [date, 0]));

  const allOrders = await prisma.order.findMany({
    where: { databaseName: ds },
    select: { doorSpecs: true },
  });
  for (const o of allOrders) {
    const specs = parseJsonRecord(o.doorSpecs);
    for (const row of doorRowsFromSpecs(specs)) {
      for (const date of neededDates) {
        const number = lineNoNumber(row['单号'], date);
        if (number !== null && number > maxByDate[date]) maxByDate[date] = number;
      }
    }
  }

  // ── Fill empty 单号 and save ──
  for (const { order, specs, dateSuffix, fillAll } of orderWork) {
    let nextNumber = maxByDate[dateSuffix] || 0;
    let changed = false;

    for (const row of doorRowsFromSpecs(specs)) {
      const id = rowId(row);
      if (!fillAll && !wanted.has(id)) continue;
      const existing = String(row['单号'] ?? '').trim();
      if (existing) {
        map[id] = existing;
        continue;
      }
      nextNumber += 1;
      const lineNo = `${nextNumber}-${dateSuffix}`;
      map[id] = lineNo;
      changed = true;
    }
    maxByDate[dateSuffix] = nextNumber;

    if (changed) {
      const nextSpecs = withReceiptNoSet(updateDoorRows(specs, row => {
        const id = rowId(row);
        if (!fillAll && !wanted.has(id)) return row;
        if (String(row['单号'] ?? '').trim()) return row;
        return { ...row, '单号': map[id] };
      }));
      await prisma.order.update({
        where: { id: order.id },
        data: { doorSpecs: JSON.stringify(nextSpecs) },
      });
    }
  }

  return map;
}
