import { prisma } from '../../database';
import { safeLoads } from '../../utils/helpers';

// ──────────────────────────── Utility ────────────────────────────

function dsFilter(ds: string) {
  return { databaseName: ds };
}

function parseFormulaData(raw: string | null): unknown {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function parseJsonField(raw: string | null, defaultVal: unknown = null): unknown {
  if (raw === null || raw === undefined) return defaultVal;
  try { return JSON.parse(raw); } catch { return raw; }
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

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
    : [];
}

function doorRowsFromSpecs(specs: Record<string, unknown>): Record<string, unknown>[] {
  return [
    ...asRecordArray(specs.ping_hui ?? specs['平开']),
    ...asRecordArray(specs.diao_hui ?? specs['吊滑']),
  ];
}

function buildReceiptNoSet(specs: Record<string, unknown>): string {
  const customerInfo = parseJsonRecord(specs.customerInfo);
  const lineNos = doorRowsFromSpecs(specs)
    .map(row => row['单号'])
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim());
  const unique = [...new Set(lineNos)];
  if (unique.length > 0) return unique.join('_');
  const existing = customerInfo['单号集'];
  return existing !== null && existing !== undefined ? String(existing).trim() : '';
}

function rowId(row: Record<string, unknown>): string {
  return String(row.id ?? row['id'] ?? '').trim();
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

/** Derive line/track types from diao component names (matching Flask derive_diao_line_track_types) */
function deriveLineTrackTypes(data: Record<string, unknown>): { lineType: string[]; trackType: string[] } {
  const diao = (data['diao'] && typeof data['diao'] === 'object' ? data['diao'] as Record<string, unknown> : data) as Record<string, unknown>;
  if (!diao || typeof diao !== 'object') return { lineType: [], trackType: [] };

  const lineType: string[] = [];
  const trackType: string[] = [];

  for (const item of Object.values(diao)) {
    if (!item || typeof item !== 'object') continue;
    const i = item as Record<string, unknown>;
    const title = String(i['title'] || '').replace(/[：: ]/g, '').trim();
    const track = String(i['track'] || '').trim();
    if (!title || !track) continue;
    if (title.includes('套线')) { if (!lineType.includes(track)) lineType.push(track); }
    else if (title.includes('轨')) { if (!trackType.includes(track)) trackType.push(track); }
  }

  return { lineType, trackType };
}

// ────────────────────── Diao Formulas ──────────────────────

export async function getDiaoFormulas(ds: string, names?: string[]) {
  const where: Record<string, unknown> = {
    ...dsFilter(ds),
    formulaType: 'diao',
  };

  if (names && names.length > 0) {
    where['formulaId'] = { in: names };
  }

  const formulas = await prisma.materialFormula.findMany({
    where: where as any,
    orderBy: { materialSize: 'asc' },
  });

  return formulas.map(f => ({
    id: f.id,
    materialSize: f.materialSize,
    formulaId: f.formulaId,
    formulaType: f.formulaType,
    lineType: f.lineType,
    trackType: f.trackType,
    square: f.square,
    formula_data: parseFormulaData(f.formulaData),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

export async function getDiaoFormulasByPayload(
  ds: string,
  body: Record<string, unknown>,
  orderDs?: string
) {
  const where: Record<string, unknown> = {
    ...dsFilter(ds),
    formulaType: 'diao',
  };

  if (orderDs) {
    where['formulaId'] = orderDs;
  }

  if (body.materialSize) {
    where['materialSize'] = body.materialSize;
  }

  const formulas = await prisma.materialFormula.findMany({
    where: where as any,
  });

  return formulas.map(f => ({
    ...f,
    formula_data: parseFormulaData(f.formulaData),
  }));
}

export async function getDiaoFormulasSingle(
  ds: string,
  body: Record<string, unknown>,
  orderDs?: string
) {
  if (!Array.isArray(body?.formula) || !Array.isArray(body?.id)) {
    return {
      __statusCode: 400,
      code: 400,
      message: '请求格式错误，应包含 formula 和 id 两个数组',
    };
  }

  const rawFormula = body.formula;
  const rawDetail = body.id;
  const formulaIds = Array.isArray(rawFormula) ? rawFormula.filter(Boolean) : [String(rawFormula)].filter(Boolean);
  const detailIds = Array.isArray(rawDetail) ? rawDetail.filter(Boolean) : [String(rawDetail)].filter(Boolean);

  let formulas: any[] = [];
  if (formulaIds.length > 0) {
    formulas = await prisma.materialFormula.findMany({
      where: { databaseName: ds, formulaId: { in: formulaIds } },
    });
  }

  const foundIds = new Set(formulas.map(f => f.formulaId).filter(Boolean));
  const missingIds = formulaIds.filter(id => !foundIds.has(id));
  if (missingIds.length > 0) {
    return {
      __statusCode: 400,
      code: 400,
      message: `指定的公式不存在: ${missingIds[0]}`,
    };
  }

  const formulasMap: Record<string, unknown> = {};
  for (const f of formulas) {
    if (!f.formulaId) continue;
    const fd = typeof f.formulaData === 'string' ? safeLoads(f.formulaData, {}) : (f.formulaData || {});
    const fdObj = (typeof fd === 'object' && fd !== null) ? fd as Record<string, unknown> : {};
    const ft = f.formulaType || '';
    let resolved: unknown = fdObj;
    if (ft === 'diao') resolved = (fdObj['diao'] ?? (fdObj['ping'] ?? fdObj));
    else if (['ping', 'double', 'diamond', 'parentSubsidiary'].includes(ft))
      resolved = (fdObj[ft] ?? (fdObj['ping'] ?? (fdObj['diao'] ?? fdObj)));
    else resolved = (fdObj['ping'] ?? (fdObj['diao'] ?? fdObj));

    formulasMap[f.formulaId] = {
      diao: resolved,
      formulaName: f.materialSize || '',
      formulaType: ft,
      square: safeLoads(f.square, 0),
      lineType: safeLoads(f.lineType, []),
      trackType: safeLoads(f.trackType, []),
    };
  }

  return {
    formulas: formulasMap,
    orderNumbers: await buildOrderMap(detailIds, orderDs || ds),
  };
}

async function buildOrderMap(detailIds: string[], ds: string): Promise<Record<string, unknown>> {
  const map: Record<string, unknown> = {};
  const ids = [...new Set(detailIds.map(id => String(id || '').trim()).filter(Boolean))];
  if (ids.length === 0) return map;

  const orders = await prisma.order.findMany({
    where: {
      databaseName: ds,
      OR: ids.map(id => ({ doorSpecs: { contains: id } })),
    },
    select: { id: true, orderDate: true, doorSpecs: true },
  });

  const wanted = new Set(ids);
  const orderWork: {
    order: { id: number; orderDate: Date | null; doorSpecs: string | null };
    specs: Record<string, unknown>;
    matchedRows: Record<string, unknown>[];
    dateSuffix: string;
  }[] = [];

  for (const order of orders) {
    const specs = parseJsonRecord(order.doorSpecs);
    const matchedRows = doorRowsFromSpecs(specs).filter(row => wanted.has(rowId(row)));
    if (matchedRows.length === 0) continue;

    const dateSuffix = lineDateSuffix(
      parseJsonRecord(specs.customerInfo)['日期'] ?? order.orderDate ?? matchedRows[0]?.['日期'],
    );
    orderWork.push({ order, specs, matchedRows, dateSuffix });
  }

  if (orderWork.length === 0) return map;

  const neededDates = [...new Set(orderWork.map(item => item.dateSuffix))];
  const maxByDate = Object.fromEntries(neededDates.map(date => [date, 0])) as Record<string, number>;
  const allOrders = await prisma.order.findMany({
    where: { databaseName: ds },
    select: { doorSpecs: true },
  });
  for (const order of allOrders) {
    const specs = parseJsonRecord(order.doorSpecs);
    for (const row of doorRowsFromSpecs(specs)) {
      for (const date of neededDates) {
        const number = lineNoNumber(row['单号'], date);
        if (number !== null && number > maxByDate[date]) maxByDate[date] = number;
      }
    }
  }

  for (const { order, specs, dateSuffix } of orderWork) {
    let nextNumber = maxByDate[dateSuffix] || 0;
    let changed = false;

    for (const row of doorRowsFromSpecs(specs)) {
      const id = rowId(row);
      if (!wanted.has(id)) continue;
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
        if (!wanted.has(id) || String(row['单号'] ?? '').trim()) return row;
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

// ────────────────────── Initialize Data ──────────────────────

export async function initializDiao(ds: string) {
  const formulas = await prisma.materialFormula.findMany({
    where: { ...dsFilter(ds), formulaType: 'diao' },
  });

  const lineType: Record<string, unknown> = {};
  const material: Record<string, unknown> = {};
  const square: Record<string, unknown> = {};
  const trackType: Record<string, unknown> = {};

  for (const f of formulas) {
    if (f.materialSize && f.formulaId) {
      const ms = f.materialSize;
      material[ms] = f.formulaId;
      lineType[ms] = safeLoads(f.lineType, []);
      trackType[ms] = safeLoads(f.trackType, []);
      square[f.formulaId] = parseJsonField(f.square, null);
    }
  }

  return { lineType, material, square, trackType };
}

export async function initializPing(ds: string) {
  // Query existing data from DB, no automatic seeding
  const pingTypes = ['ping', 'double', 'diamond', 'parentSubsidiary'];
  const allFormulas = await prisma.materialFormula.findMany({
    where: { ...dsFilter(ds), formulaType: { in: pingTypes } },
  });

  const formulaType: Record<string, unknown> = {};
  const material: Record<string, unknown> = {};
  const square: Record<string, unknown> = {};

  for (const f of allFormulas) {
    if (f.materialSize && f.formulaId) {
      material[f.materialSize] = f.formulaId;
      formulaType[f.formulaId] = f.formulaType;
      square[f.formulaId] = parseJsonField(f.square, null);
    }
  }

  const hingeNames: string[] = [];
  const addHingeName = (value: unknown) => {
    const name = String(value ?? '').trim();
    if (name && !hingeNames.includes(name)) hingeNames.push(name);
  };
  const setting = await prisma.setting.findFirst({
    where: { ...dsFilter(ds), key: 'hinge_names' },
  });
  if (setting?.value) {
    const parsed = safeLoads(setting.value);
    if (Array.isArray(parsed)) parsed.forEach(addHingeName);
  }
  for (const f of allFormulas) {
    const fd = typeof f.formulaData === 'string' ? safeLoads(f.formulaData, {}) : (f.formulaData || {});
    if (typeof fd === 'object' && fd !== null) {
      const h = (fd as Record<string, unknown>)['hinge'];
      if (Array.isArray(h)) h.forEach(addHingeName);
      else if (typeof h === 'string') addHingeName(h);
      else if (h && typeof h === 'object') Object.keys(h).forEach(addHingeName);
    }
  }

  return { formulaType, hingeNames, material, square };
}

// ────────────────────── Get Formulas by Type ──────────────────────

export async function getFormulas(ds: string, formulaType?: string) {
  const where: Record<string, unknown> = dsFilter(ds);
  if (formulaType) {
    where['formulaType'] = formulaType;
  }

  const formulas = await prisma.materialFormula.findMany({
    where: where as any,
    orderBy: { formulaType: 'asc' },
  });

  return formulas.map(f => ({
    id: f.id,
    materialSize: f.materialSize,
    formulaId: f.formulaId,
    formulaType: f.formulaType,
    lineType: f.lineType,
    trackType: f.trackType,
    square: f.square,
    formula_data: parseFormulaData(f.formulaData),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));
}

// ────────────────────── Formula Names ──────────────────────

export async function getFormulaName(ds: string) {
  const formulas = await prisma.materialFormula.findMany({
    where: dsFilter(ds),
    select: {
      formulaId: true,
      materialSize: true,
      formulaType: true,
    },
    orderBy: { formulaType: 'asc' },
  });

  const result: Record<string, { formulaName: string }> = {};
  for (const f of formulas) {
    result[f.formulaId] = { formulaName: f.materialSize || '' };
  }
  return result;
}

// ────────────────────── Price Data ──────────────────────

export async function getDiaoPrice(ds: string) {
  const prices = await prisma.addPrice.findMany({
    where: {
      databaseName: ds,
      OR: [
        { direction: { contains: '吊' } },
        { direction: 'diao' },
        { lockway: { contains: '吊' } },
      ],
    },
    orderBy: { name: 'asc' },
  });

  return prices.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price?.toNumber() ?? 0,
    unit: p.unit,
    remark: p.remark,
    lockway: p.lockway,
    direction: p.direction,
  }));
}

export async function getPingPrice(ds: string) {
  const prices = await prisma.addPrice.findMany({
    where: {
      databaseName: ds,
      OR: [
        { direction: { contains: '平' } },
        { direction: 'ping' },
        { lockway: { contains: '平' } },
      ],
    },
    orderBy: { name: 'asc' },
  });

  return prices.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price?.toNumber() ?? 0,
    unit: p.unit,
    remark: p.remark,
    lockway: p.lockway,
    direction: p.direction,
  }));
}

// ────────────────────── Save Formula ──────────────────────

export async function saveFormula(ds: string, body: Record<string, unknown>) {
  // Production format: body = { formulaId: { formulaName, formulaType, square, ... } }
  let formulaId: string | null = null;
  let inner: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(body)) {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      formulaId = key;
      inner = val as Record<string, unknown>;
      break;
    }
  }

  // Fallback: flat format
  if (!formulaId) {
    formulaId = (body['formulaId'] as string) || (body['formula_id'] as string) || null;
    inner = body;
  }

  if (!formulaId) {
    throw new Error('公式ID(formulaId)不能为空');
  }

  const materialSize = (inner['formulaName'] as string) || (inner['name'] as string) || (inner['materialSize'] as string) || (inner['material_size'] as string) || body['materialSize'] as string || body['material_size'] as string || '';
  const formulaType = (inner['formulaType'] as string) || (inner['formula_type'] as string) || 'diao';
  // Derive lineType/trackType from component names (matching Flask logic)
  // The frontend doesn't explicitly send these — they're derived from diao sub-object
  const derived = formulaType === 'diao' ? deriveLineTrackTypes(inner) : { lineType: [], trackType: [] };
  const rawLine = inner['lineType'] ?? inner['line_type'] ?? (derived.lineType.length > 0 ? derived.lineType : null);
  const lineType = rawLine !== null && rawLine !== undefined
    ? (Array.isArray(rawLine) ? JSON.stringify(rawLine) : String(rawLine))
    : null;
  const rawTrack = inner['trackType'] ?? inner['track_type'] ?? (derived.trackType.length > 0 ? derived.trackType : null);
  const trackType = rawTrack !== null && rawTrack !== undefined
    ? (Array.isArray(rawTrack) ? JSON.stringify(rawTrack) : String(rawTrack))
    : null;
  const rawSquare = inner['square'];
  const square = rawSquare !== null && rawSquare !== undefined ? String(rawSquare) : null;
  const formulaData = inner;

  if (!materialSize) {
    throw new Error('公式名称(formulaName)不能为空');
  }

  const data: Record<string, unknown> = {
    materialSize,
    formulaType,
    lineType,
    trackType,
    square,
  };

  if (formulaData) {
    data['formulaData'] = typeof formulaData === 'string' ? formulaData : JSON.stringify(formulaData);
  }

  const formula = await prisma.materialFormula.upsert({
    where: {
      databaseName_formulaId: {
        databaseName: ds,
        formulaId,
      },
    },
    create: {
      databaseName: ds,
      materialSize,
      formulaId,
      formulaType,
      lineType: lineType ?? undefined,
      trackType: trackType ?? undefined,
      square: square ?? undefined,
    formulaData: data['formulaData'] as string | undefined,
    },
    update: data as any,
  });

  return {
    success: true,
    formula: {
      id: formula.id,
      materialSize: formula.materialSize,
      formulaId: formula.formulaId,
      formulaType: formula.formulaType,
      lineType: formula.lineType,
      trackType: formula.trackType,
      square: formula.square,
    formula_data: parseFormulaData(formula.formulaData),
    },
  };
}

// ────────────────────── Delete Formula ──────────────────────

export async function deleteFormula(
  ds: string,
  identifier: { id?: string; name?: string; size?: string; formulaId?: string }
) {
  const { id, name, size, formulaId } = identifier;

  if (id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new Error('无效的 id');
    await prisma.materialFormula.delete({
      where: { id: numId },
    });
    return { success: true, deletedById: numId };
  }

  if (formulaId) {
    const result = await prisma.materialFormula.deleteMany({
      where: {
        databaseName: ds,
        formulaId,
      },
    });
    return { success: true, deletedCount: result.count };
  }

  if (name) {
    const result = await prisma.materialFormula.deleteMany({
      where: {
        databaseName: ds,
        formulaId: name,
      },
    });
    return { success: true, deletedCount: result.count };
  }

  if (size) {
    const result = await prisma.materialFormula.deleteMany({
      where: {
        databaseName: ds,
        materialSize: size,
      },
    });
    return { success: true, deletedCount: result.count };
  }

  throw new Error('请提供删除条件: id, name, size 或 formulaId');
}

// ────────────────────── Query Formula ──────────────────────

export async function queryFormula(ds: string, body: Record<string, unknown>, name?: string) {
  const where: Record<string, unknown> = dsFilter(ds);

  if (name) {
    where['formulaId'] = name;
  }

  // Handle "type" parameter from body for glass-width / extra-price queries
  const queryType = body['type'] as string | undefined;
  if (queryType === 'glass-width') {
    const glassHoles = await prisma.glassHole.findMany({
      where: { databaseName: ds },
      orderBy: { name: 'asc' },
    });
    return glassHoles.map(g => ({
      name: g.name,
      config: g.config ? parseFormulaData(g.config) : null,
    }));
  }

  if (queryType === 'extra-price') {
    const extraPrices = await prisma.addPrice.findMany({
      where: {
        databaseName: ds,
        ...(name ? { name } : {}),
      },
      orderBy: { name: 'asc' },
    });
    return extraPrices.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price?.toNumber() ?? 0,
      unit: p.unit,
      remark: p.remark,
      lockway: p.lockway,
      direction: p.direction,
    }));
  }

  // Default: query MaterialFormula — return in Flask production format
  const formulas = await prisma.materialFormula.findMany({
    where: where as any,
    orderBy: { materialSize: 'asc' },
  });

  // Build response matching Flask _build_query_formula_response_data
  const data: Record<string, unknown> = {};
  for (const f of formulas) {
    if (!f.formulaId) continue;
    const fd = typeof f.formulaData === 'string' ? safeLoads(f.formulaData, {}) : (f.formulaData || {});
    const fdObj = (typeof fd === 'object' && fd !== null) ? fd as Record<string, unknown> : {};
    const ft = f.formulaType || '';

    // Resolve component data matching Flask _to_formula_dict
    let resolved: unknown = fdObj;
    if (ft === 'diao') {
      resolved = (fdObj['diao'] ?? (fdObj['ping'] ?? fdObj));
    } else if (['ping', 'double', 'diamond', 'parentSubsidiary'].includes(ft)) {
      resolved = (fdObj[ft] ?? (fdObj['ping'] ?? (fdObj['diao'] ?? fdObj)));
    } else {
      resolved = (fdObj['ping'] ?? (fdObj['diao'] ?? fdObj));
    }

    const item: Record<string, unknown> = {
      diao: resolved,
      formulaName: f.materialSize || '',
      formulaType: ft,
      square: safeLoads(f.square, 0),
      lineType: safeLoads(f.lineType, []),
      trackType: safeLoads(f.trackType, []),
    };

    // Copy extra keys from formula_data (matching Flask logic)
    for (const extraKey of ['resetSize', 'TaoDong', 'swingWall', 'hinge', 'widthIncrement', 'hardware', 'minSquare', '_keyOrder']) {
      if (extraKey in fdObj) item[extraKey] = fdObj[extraKey];
    }

    data[f.formulaId] = item;
  }
  data['images'] = null;

  return data;
}
