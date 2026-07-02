import { prisma } from '../../database';
import { safeLoads } from '../../utils/helpers';

function glassHoleName(body: Record<string, unknown>): string {
  return String(body.name || body.materialName || body['材料名称'] || body['名称'] || '').trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function syncGlassHoleToFormula(ds: string, body: Record<string, unknown>, name: string) {
  const formulaId = String(body.formulaID || '').trim();
  const materialName = String(body.materialName || name || '').trim();
  if (!formulaId || !materialName) return;

  const formula = await prisma.materialFormula.findUnique({
    where: { databaseName_formulaId: { databaseName: ds, formulaId } },
  });
  if (!formula) return;

  const formulaData = asRecord(safeLoads(formula.formulaData, {}));
  for (const sectionKey of ['diao', 'ping']) {
    const section = asRecord(formulaData[sectionKey]);
    if (!formulaData[sectionKey] && Object.keys(section).length === 0) continue;
    section[materialName] = { ...body };
    formulaData[sectionKey] = section;
    await prisma.materialFormula.update({
      where: { databaseName_formulaId: { databaseName: ds, formulaId } },
      data: { formulaData: JSON.stringify(formulaData) },
    });
    break;
  }
}

async function removeGlassHoleFromFormula(ds: string, formulaId: string, materialName: string) {
  if (!formulaId || !materialName) return;

  const formula = await prisma.materialFormula.findUnique({
    where: { databaseName_formulaId: { databaseName: ds, formulaId } },
  });
  if (!formula) return;

  const formulaData = asRecord(safeLoads(formula.formulaData, {}));
  let changed = false;
  for (const sectionKey of ['diao', 'ping']) {
    const section = asRecord(formulaData[sectionKey]);
    if (!formulaData[sectionKey] && Object.keys(section).length === 0) continue;
    if (Object.prototype.hasOwnProperty.call(section, materialName)) {
      delete section[materialName];
      changed = true;
    }
    if (Array.isArray(section._keyOrder) && section._keyOrder.includes(materialName)) {
      section._keyOrder = section._keyOrder.filter(key => key !== materialName);
      changed = true;
    }
    if (changed) {
      formulaData[sectionKey] = section;
      break;
    }
  }

  if (changed) {
    await prisma.materialFormula.update({
      where: { databaseName_formulaId: { databaseName: ds, formulaId } },
      data: { formulaData: JSON.stringify(formulaData) },
    });
  }
}

export async function getAddPrice(ds: string) {
  return prisma.addPrice.findMany({
    where: { databaseName: ds },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addAddPrice(ds: string, body: Record<string, unknown>) {
  return prisma.addPrice.create({
    data: {
      databaseName: ds,
      name: (body.name as string) || '',
      price: body.price != null ? Number(body.price) : 0,
      unit: (body.unit as string) || '',
      remark: (body.remark as string) || '',
      lockway: (body.lockway as string) || '',
      direction: (body.direction as string) || '',
    },
  });
}

export async function editAddPrice(ds: string, body: Record<string, unknown>) {
  const id = Number(body.id);
  return prisma.addPrice.update({
    where: { id },
    data: {
      name: body.name != null ? (body.name as string) : undefined,
      price: body.price != null ? Number(body.price) : undefined,
      unit: body.unit != null ? (body.unit as string) : undefined,
      remark: body.remark != null ? (body.remark as string) : undefined,
      lockway: body.lockway != null ? (body.lockway as string) : undefined,
      direction: body.direction != null ? (body.direction as string) : undefined,
    },
  });
}

export async function deleteAddPrice(ds: string, identifier: string | Record<string, unknown>) {
  if (identifier && typeof identifier === 'object') {
    const name = String(identifier.name || identifier['名称'] || identifier['加价项目'] || '').trim();
    const price = identifier.price ?? identifier['单价'];
    const unit = String(identifier.unit || identifier['单位'] || '').trim();
    if (!name || price === undefined || !unit) {
      return { code: 400, message: '缺少必要参数（name/price/unit）' };
    }
    const result = await prisma.addPrice.deleteMany({
      where: { databaseName: ds, name, price: Number(price), unit },
    });
    return { name, price: Number(price), unit, deletedCount: result.count };
  }

  const id = String(identifier || '').trim();
  try {
    return await prisma.addPrice.delete({ where: { id: Number(id) } });
  } catch {
    return { found: false, message: '未找到匹配的加价项目' };
  }
}

export async function changeDecleration(ds: string, body: Record<string, unknown>) {
  const value = (body.text || body.content || body.declaration || '') as string;
  return prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'declaration' } },
    update: { value },
    create: { databaseName: ds, key: 'declaration', value },
  });
}

export async function getGlassHoles(ds: string) {
  return prisma.glassHole.findMany({
    where: { databaseName: ds },
    orderBy: { createdAt: 'asc' },
  });
}

export async function saveGlassHole(ds: string, body: Record<string, unknown>) {
  // Match Flask logic: extract name from body fields, store entire body as config JSON
  const name = glassHoleName(body);
  const configStr = JSON.stringify(body, Object.keys(body).length > 0 ? undefined : null);

  const existing = await prisma.glassHole.findFirst({
    where: { databaseName: ds, name },
  });

  let saved;
  if (existing) {
    saved = await prisma.glassHole.update({
      where: { id: existing.id },
      data: { name, config: configStr },
    });
  } else {
    saved = await prisma.glassHole.create({
      data: { databaseName: ds, name, config: configStr },
    });
  }
  await syncGlassHoleToFormula(ds, body, name);
  return saved;
}

export async function deleteGlassHole(ds: string, id: string) {
  const identifier = String(id || '').trim();
  if (!identifier) return { code: 404, message: '找不到 formulaID：' };

  const holes = await prisma.glassHole.findMany({ where: { databaseName: ds } });
  const hole = holes.find(candidate => {
    const config = asRecord(safeLoads(candidate.config, {}));
    return String(config.formulaID || '').trim() === identifier;
  });
  if (hole) {
    const config = asRecord(safeLoads(hole.config, {}));
    const materialName = String(config.materialName || hole.name || '挖孔图').trim();
    await removeGlassHoleFromFormula(ds, identifier, materialName);
    await prisma.glassHole.delete({ where: { id: hole.id } });
    return { code: 200, message: '删除成功' };
  }

  try {
    const numericId = Number(identifier);
    if (Number.isFinite(numericId) && identifier !== '') {
      const existing = await prisma.glassHole.findUnique({ where: { id: numericId } });
      if (existing?.databaseName === ds) {
        const config = asRecord(safeLoads(existing.config, {}));
        const formulaId = String(config.formulaID || '').trim();
        const materialName = String(config.materialName || existing.name || '挖孔图').trim();
        await removeGlassHoleFromFormula(ds, formulaId, materialName);
        await prisma.glassHole.delete({ where: { id: numericId } });
      }
      return { code: 200, message: '删除成功' };
    }
  } catch {
    // Fall through to formulaID/name deletion for production legacy compatibility.
  }
  await removeGlassHoleFromFormula(ds, identifier, identifier);
  const result = await prisma.glassHole.deleteMany({ where: { databaseName: ds, name: identifier } });
  if (result.count > 0) return { code: 200, message: '删除成功' };
  return { code: 404, message: `找不到 formulaID：${identifier}` };
}

export async function drawingBehaviorsGet(ds: string) {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'drawing_behaviors' } },
  });
  return setting ? JSON.parse(setting.value || '{}') : {};
}

export async function drawingBehaviorsSet(ds: string, body: Record<string, unknown>) {
  const value = JSON.stringify(body);
  return prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'drawing_behaviors' } },
    update: { value },
    create: { databaseName: ds, key: 'drawing_behaviors', value },
  });
}

export async function changeSquare(ds: string, body: Record<string, unknown>) {
  const value = (body.method || body.value || '') as string;
  return prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'pricing_method' } },
    update: { value },
    create: { databaseName: ds, key: 'pricing_method', value },
  });
}

export async function changeDirectionMode(ds: string, mode: string) {
  const value = String(Number(mode) || 0);
  const directionMode = await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'direction_mode' } },
    update: { value: JSON.stringify({ mode: Number(value) }) },
    create: { databaseName: ds, key: 'direction_mode', value: JSON.stringify({ mode: Number(value) }) },
  });
  const columnDefaults = await getColumnDefaults(ds);
  columnDefaults['开向模式'] = Number(value);
  await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'column_defaults' } },
    update: { value: JSON.stringify(columnDefaults) },
    create: { databaseName: ds, key: 'column_defaults', value: JSON.stringify(columnDefaults) },
  });
  return { key: 'direction_mode', value: directionMode.value };
}

export async function reverseDirection(ds: string) {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'direction_reversed' } },
  });
  const current = setting?.value === '1' || setting?.value === 'true';
  const newValue = current ? '0' : '1';
  const directionReversed = await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'direction_reversed' } },
    update: { value: newValue },
    create: { databaseName: ds, key: 'direction_reversed', value: newValue },
  });
  const columnDefaults = await getColumnDefaults(ds);
  columnDefaults['锁向'] = Number(newValue);
  await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'column_defaults' } },
    update: { value: JSON.stringify(columnDefaults) },
    create: { databaseName: ds, key: 'column_defaults', value: JSON.stringify(columnDefaults) },
  });
  return { key: 'direction_reversed', value: directionReversed.value };
}

async function getColumnDefaults(ds: string): Promise<Record<string, unknown>> {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'column_defaults' } },
  });
  if (!setting?.value) return {};
  try {
    const parsed = JSON.parse(setting.value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveCustomDirectionNames(ds: string, names: Record<string, unknown>) {
  const value = typeof names === 'string' ? names : JSON.stringify(names);
  await prisma.user.updateMany({
    where: { databaseName: ds },
    data: { customDirectionNames: value },
  });
  return { success: true };
}

export async function clearAccount(ds: string) {
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { databaseName: ds } }),
    prisma.financeOrder.deleteMany({ where: { databaseName: ds } }),
    prisma.orderAdjustment.deleteMany({ where: { databaseName: ds } }),
    prisma.customerAdjustment.deleteMany({ where: { databaseName: ds } }),
    prisma.customerBalance.deleteMany({ where: { databaseName: ds } }),
    prisma.progress.deleteMany({ where: { databaseName: ds } }),
    prisma.order.deleteMany({ where: { databaseName: ds } }),
    prisma.client.deleteMany({ where: { databaseName: ds } }),
    prisma.addPrice.deleteMany({ where: { databaseName: ds } }),
    prisma.glassHole.deleteMany({ where: { databaseName: ds } }),
    prisma.image.deleteMany({ where: { databaseName: ds } }),
    prisma.scanner.deleteMany({ where: { databaseName: ds } }),
    prisma.template.deleteMany({ where: { databaseName: ds } }),
    prisma.updateInfo.deleteMany({ where: { databaseName: ds } }),
    prisma.setting.deleteMany({ where: { databaseName: ds } }),
    prisma.materialFormula.deleteMany({ where: { databaseName: ds } }),
    prisma.procedure.deleteMany({ where: { databaseName: ds } }),
    prisma.user.updateMany({
      where: { databaseName: ds },
      data: {
        proceduresData: null,
        columnSettings: null,
        customDirectionNames: null,
      },
    }),
  ]);
  return { success: true };
}

export async function createUser(ds: string, body: Record<string, unknown>) {
  const bcrypt = await import('bcryptjs');
  const password = (body.password as string) || '123456';
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      username: (body.username as string) || '',
      passwordHash,
      displayName: (body.displayName as string) || '',
      companyName: (body.companyName as string) || '',
      databaseName: ds,
      isDefaultPw: body.isDefaultPw != null ? Number(body.isDefaultPw) : 1,
      mutilUser: body.mutilUser != null ? Number(body.mutilUser) : 0,
    },
  });
}

export async function getParametricPatterns(ds: string) {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
  });
  if (!setting?.value) return [];
  try {
    return JSON.parse(setting.value);
  } catch {
    return [];
  }
}

export async function upsertParametricPattern(ds: string, body: Record<string, unknown>) {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
  });
  let patterns: Record<string, unknown>[] = [];
  if (setting?.value) {
    try { patterns = JSON.parse(setting.value); } catch { patterns = []; }
  }
  const index = body.id
    ? patterns.findIndex((p) => (p as Record<string, unknown>).id === body.id)
    : -1;
  const pattern = { ...body } as Record<string, unknown>;
  if (index >= 0) {
    patterns[index] = pattern;
  } else {
    (pattern as Record<string, unknown>).id = pattern.id || crypto.randomUUID();
    patterns.push(pattern);
  }
  const value = JSON.stringify(patterns);
  await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
    update: { value },
    create: { databaseName: ds, key: 'parametric_patterns', value },
  });
  return pattern;
}

export async function deleteParametricPattern(ds: string, id: string) {
  const setting = await prisma.setting.findUnique({
    where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
  });
  let patterns: Record<string, unknown>[] = [];
  if (setting?.value) {
    try { patterns = JSON.parse(setting.value); } catch { patterns = []; }
  }
  patterns = patterns.filter((p) => (p as Record<string, unknown>).id !== id);
  const value = JSON.stringify(patterns);
  await prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
    update: { value },
    create: { databaseName: ds, key: 'parametric_patterns', value },
  });
  return { success: true };
}

export async function getVersionInfo() {
  return {
    apkUpdateMessage: '1.0.3 修复了一些已知问题',
    apkUrl: 'https://www.samrtdoor.com.cn/apk/smartdoor-1.0.3.apk',
    apkVersion: '1.0.3',
    code: 0,
    forceApkUpdate: false,
    forceWebUpdate: false,
    webUpdateMessage: '样式更新',
    webUpdateUrl: 'https://www.samrtdoor.com.cn/hotupdate/dist-2.3.7.zip',
    webVersion: '2.3.7',
  };
}
