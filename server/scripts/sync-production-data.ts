import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

if (process.env.DATABASE_URL?.includes('@db:')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@db:', '@localhost:');
}

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://www.samrtdoor.com.cn';
const PROD_USERNAME = process.env.PROD_USERNAME;
const PROD_PASSWORD = process.env.PROD_PASSWORD;
const PROD_DS = process.env.PROD_DS || 'smartdoor';
const PROD_COMPANY = process.env.PROD_COMPANY || '恒泰智门';
const LOCAL_DS = process.env.LOCAL_DS || 'smartdoor';
const LOCAL_COMPANY = process.env.LOCAL_COMPANY || PROD_COMPANY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}. Example: ${name}=... npm run sync:prod-data`);
  return value;
}

function endpoint(action: string, param2 = PROD_DS, param3?: string): URL {
  const url = new URL('/1', PROD_BASE_URL);
  url.searchParams.set('param1', action);
  url.searchParams.set('param2', param2);
  if (param3 !== undefined) url.searchParams.set('param3', param3);
  return url;
}

async function fetchJson(action: string, options: { param2?: string; param3?: string; method?: string; body?: unknown } = {}) {
  const init: RequestInit = { method: options.method || 'GET' };
  if (init.method !== 'GET') {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body ?? {});
  }
  const res = await fetch(endpoint(action, options.param2, options.param3), init);
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`${action} returned non-JSON HTTP ${res.status}`);
  }
  return res.json() as Promise<unknown>;
}

function unwrapData(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'data' in value) {
    return (value as Record<string, unknown>).data;
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function procedureMap(value: unknown): Record<string, unknown> {
  const payload = asRecord(value);
  return asRecord(payload.procedures || payload);
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)) : [];
}

function jsonString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function jsonEncoded(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function stringValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function numericValue(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function dateValue(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  requireEnv('PROD_USERNAME', PROD_USERNAME);
  requireEnv('PROD_PASSWORD', PROD_PASSWORD);
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const loginUrl = endpoint('login', PROD_USERNAME, PROD_PASSWORD);
  const loginRes = await fetch(loginUrl);
  if (!loginRes.ok) throw new Error(`Production login failed: HTTP ${loginRes.status}`);
  await loginRes.json();

  const clients = asArray(unwrapData(await fetchJson('getClientsInfo')));
  const procedures = procedureMap(unwrapData(await fetchJson('GetProcedures', { param2: PROD_COMPANY })));
  const formulaNames = asRecord(unwrapData(await fetchJson('getFormulaName', { param2: PROD_COMPANY })));
  const diaoInit = asRecord(unwrapData(await fetchJson('initializDiao', { param2: PROD_COMPANY })));
  const pingInit = asRecord(unwrapData(await fetchJson('initializPing', { param2: PROD_COMPANY })));
  const parametricPayload = asRecord(unwrapData(await fetchJson('parametric-patterns', { param2: PROD_COMPANY })));
  const parametricTemplates = asArray(parametricPayload.templates);
  const tablePayload = asRecord(unwrapData(await fetchJson('getTableData')));
  const tableRows = asArray(tablePayload.tableData);
  const progressPayload = asRecord(unwrapData(await fetchJson('getProgress')));
  const progressRows = asArray(progressPayload.progressData);
  const financeSummary = asRecord(unwrapData(await fetchJson('finance_getOrderFinanceSummary')));

  try {
    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.financeOrder.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.orderAdjustment.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.customerAdjustment.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.customerBalance.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.progress.deleteMany({ where: { databaseName: LOCAL_DS } }),
      prisma.order.deleteMany({ where: { databaseName: LOCAL_DS } }),
    ]);

    await prisma.client.deleteMany({ where: { databaseName: LOCAL_DS } });
    for (const client of [...clients].reverse()) {
      const clientCode = stringValue(client['编号'] || client.clientCode || client.id);
      if (!clientCode) continue;
      await prisma.client.upsert({
        where: { databaseName_clientCode: { databaseName: LOCAL_DS, clientCode } },
        create: {
          databaseName: LOCAL_DS,
          clientCode,
          name: stringValue(client['客户'] || client.name),
          brand: stringValue(client['品牌'] || client.brand),
          address: stringValue(client['地址'] || client.address),
          phone: client['电话'] === undefined ? null : stringValue(client['电话']),
          contactPerson: stringValue(client['联系人'] || client.contactPerson),
          logisticsProvider: stringValue(client['物流商'] || client.logisticsProvider),
          logisticsPhone: client['物流电话'] === undefined ? null : stringValue(client['物流电话']),
          deliveryPhone: client['送货电话'] === undefined ? null : stringValue(client['送货电话']),
          householdRegistration: client['客户户籍'] === undefined ? null : stringValue(client['客户户籍']),
        },
        update: {
          name: stringValue(client['客户'] || client.name),
          brand: stringValue(client['品牌'] || client.brand),
          address: stringValue(client['地址'] || client.address),
          phone: client['电话'] === undefined ? null : stringValue(client['电话']),
          contactPerson: stringValue(client['联系人'] || client.contactPerson),
          logisticsProvider: stringValue(client['物流商'] || client.logisticsProvider),
          logisticsPhone: client['物流电话'] === undefined ? null : stringValue(client['物流电话']),
          deliveryPhone: client['送货电话'] === undefined ? null : stringValue(client['送货电话']),
          householdRegistration: client['客户户籍'] === undefined ? null : stringValue(client['客户户籍']),
        },
      });
    }

    const clientByCode = new Map((await prisma.client.findMany({ where: { databaseName: LOCAL_DS } })).map(client => [client.clientCode, client.id]));
    const progressByOrder = new Map<string, Record<string, unknown>[]>();
    for (const row of progressRows) {
      const orderNo = stringValue(row['回执单号'] || row['单号'] || row.orderNo);
      if (!orderNo) continue;
      const rows = progressByOrder.get(orderNo) || [];
      rows.push(row);
      progressByOrder.set(orderNo, rows);
    }
    for (const row of tableRows) {
      const orderNo = stringValue(row['回执单号'] || row['单号'] || row.orderNo);
      if (!orderNo) continue;
      const clientCode = stringValue(row['客户编号'] || row.clientCode);
      const clientId = clientByCode.get(clientCode) || null;
      const cachedProgress = progressByOrder.get(orderNo) || [];
      await prisma.order.upsert({
        where: { databaseName_orderNo: { databaseName: LOCAL_DS, orderNo } },
        create: {
          databaseName: LOCAL_DS,
          orderNo,
          clientId,
          customerName: stringValue(row['客户'] || row.customerName),
          brand: stringValue(row['品牌'] || row.brand),
          orderDate: dateValue(row['日期']),
          deliveryDate: dateValue(row['截止日期']),
          status: 'pending',
          totalAmount: numericValue(row['总价']),
          paidAmount: numericValue(row['定金']),
          unpaidAmount: Math.max(0, numericValue(row['总价']) - numericValue(row['定金'])),
          doorCount: numericValue(row['门数']) || 1,
          operatorName: stringValue(row['打单人']),
          salesperson: stringValue(row['业务员']),
          notes: stringValue(row['订单备注']),
          doorSpecs: JSON.stringify({ ping_hui: [], diao_hui: [], customerInfo: row, progressData: cachedProgress }),
        },
        update: {
          clientId,
          customerName: stringValue(row['客户'] || row.customerName),
          brand: stringValue(row['品牌'] || row.brand),
          orderDate: dateValue(row['日期']),
          deliveryDate: dateValue(row['截止日期']),
          totalAmount: numericValue(row['总价']),
          paidAmount: numericValue(row['定金']),
          unpaidAmount: Math.max(0, numericValue(row['总价']) - numericValue(row['定金'])),
          doorCount: numericValue(row['门数']) || 1,
          operatorName: stringValue(row['打单人']),
          salesperson: stringValue(row['业务员']),
          notes: stringValue(row['订单备注']),
          doorSpecs: JSON.stringify({ ping_hui: [], diao_hui: [], customerInfo: row, progressData: cachedProgress }),
        },
      });

      const order = await prisma.order.findUnique({ where: { databaseName_orderNo: { databaseName: LOCAL_DS, orderNo } } });
      if (order) {
        await prisma.progress.deleteMany({ where: { databaseName: LOCAL_DS, orderId: order.id } });
        for (let idx = 0; idx < cachedProgress.length; idx++) {
          const progress = cachedProgress[idx];
          await prisma.progress.create({
            data: {
              databaseName: LOCAL_DS,
              orderId: order.id,
              orderNo,
              customerName: stringValue(progress['客户'] || row['客户'] || row.customerName),
              procedureName: stringValue(progress['工序'] || progress['生产进度'] || `progress_${idx + 1}`),
              procedureStatus: progress['生产进度'] === undefined || progress['生产进度'] === null ? null : stringValue(progress['生产进度']),
              operatorName: stringValue(progress['打单人'] || row['打单人']),
              notes: stringValue(progress['备注'] || row['订单备注']),
            },
          });
        }
      }
    }

    await prisma.procedure.deleteMany({ where: { databaseName: LOCAL_DS } });
    for (const [slot, name] of Object.entries(procedures)) {
      const orderIndex = Number(slot.replace('工序', '')) || 0;
      const procName = stringValue(name).trim();
      if (!orderIndex || !procName) continue;
      await prisma.procedure.create({
        data: { databaseName: LOCAL_DS, name: procName, orderIndex, description: procName },
      });
    }

    await prisma.materialFormula.deleteMany({ where: { databaseName: { in: [LOCAL_DS, LOCAL_COMPANY] } } });
    const diaoMaterial = asRecord(diaoInit.material);
    const diaoLineType = asRecord(diaoInit.lineType);
    const diaoTrackType = asRecord(diaoInit.trackType);
    const diaoSquare = asRecord(diaoInit.square);
    const pingMaterial = asRecord(pingInit.material);
    const pingFormulaType = asRecord(pingInit.formulaType);
    const pingSquare = asRecord(pingInit.square);

    const formulas = new Map<string, { materialSize: string; formulaType: string; lineType?: unknown; trackType?: unknown; square?: unknown; name?: string }>();
    for (const [materialSize, formulaIdValue] of Object.entries(diaoMaterial)) {
      const formulaId = stringValue(formulaIdValue);
      if (!(formulaId in formulaNames)) continue;
      if (!formulaId) continue;
      formulas.set(formulaId, {
        materialSize,
        formulaType: 'diao',
        lineType: diaoLineType[materialSize],
        trackType: diaoTrackType[materialSize],
        square: diaoSquare[formulaId],
      });
    }
    for (const [materialSize, formulaIdValue] of Object.entries(pingMaterial)) {
      const formulaId = stringValue(formulaIdValue);
      if (!(formulaId in formulaNames)) continue;
      if (!formulaId) continue;
      formulas.set(formulaId, {
        materialSize,
        formulaType: stringValue(pingFormulaType[formulaId] || 'ping'),
        square: pingSquare[formulaId],
      });
    }
    for (const [formulaId, value] of Object.entries(formulaNames)) {
      const entry = formulas.get(formulaId);
      const name = stringValue(asRecord(value).formulaName);
      if (entry) {
        entry.name = name;
        if (name) entry.materialSize = name;
      } else {
        formulas.set(formulaId, { materialSize: name, formulaType: 'nameOnly', name });
      }
    }
    for (const [formulaId, formula] of formulas) {
      await prisma.materialFormula.create({
        data: {
          databaseName: LOCAL_COMPANY,
          formulaId,
          materialSize: formula.materialSize,
          formulaType: formula.formulaType,
          lineType: jsonEncoded(formula.lineType),
          trackType: jsonEncoded(formula.trackType),
          square: jsonEncoded(formula.square),
          formulaData: jsonString({ formulaName: formula.name || formula.materialSize, formulaType: formula.formulaType }),
        },
      });
    }

    await prisma.setting.upsert({
      where: { databaseName_key: { databaseName: LOCAL_COMPANY, key: 'parametric_patterns' } },
      update: { value: JSON.stringify(parametricTemplates) },
      create: { databaseName: LOCAL_COMPANY, key: 'parametric_patterns', value: JSON.stringify(parametricTemplates) },
    });
    await prisma.setting.upsert({
      where: { databaseName_key: { databaseName: LOCAL_COMPANY, key: 'hinge_names' } },
      update: { value: JSON.stringify(Array.isArray(pingInit.hingeNames) ? pingInit.hingeNames : []) },
      create: { databaseName: LOCAL_COMPANY, key: 'hinge_names', value: JSON.stringify(Array.isArray(pingInit.hingeNames) ? pingInit.hingeNames : []) },
    });

    await prisma.financeOrder.deleteMany({ where: { databaseName: LOCAL_DS } });
    for (const [orderNo, rawSummary] of Object.entries(financeSummary)) {
      const summary = asRecord(rawSummary);
      const order = await prisma.order.findUnique({ where: { databaseName_orderNo: { databaseName: LOCAL_DS, orderNo } } });
      await prisma.financeOrder.create({
        data: {
          databaseName: LOCAL_DS,
          orderId: order?.id ?? null,
          orderNo,
          customerName: order?.customerName ?? '',
          allocatedAmount: numericValue(summary['已分配金额']),
          unpaidAmount: numericValue(summary['未收金额']),
          orderAdjustTotal: numericValue(summary['订单调整金额']),
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Synced production business data to ${LOCAL_DS}: clients=${clients.length}, orders=${tableRows.length}, progressRows=${progressRows.length}, financeSummaries=${Object.keys(financeSummary).length}, procedures=${Object.keys(procedures).length}, formulas=${Object.keys(formulaNames).length}, parametricPatterns=${parametricTemplates.length}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
