import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

type HttpMethod = 'GET' | 'POST';
type CaseGroup = 'core' | 'formula' | 'receipt' | 'progress' | 'finance' | 'settings' | 'file' | 'scanner' | 'shortlink';

interface ContractCase {
  action: string;
  group: CaseGroup;
  method: HttpMethod;
  safe: boolean;
  dynamic?: 'first-order-ref';
  multipart?: boolean;
  writeGroup?: string;
  prodParam2?: string;
  localParam2?: string;
  param3?: string;
  param4?: string;
  query?: Record<string, string>;
  body?: unknown;
  note?: string;
}

interface FetchResult {
  status: number;
  contentType: string;
  bodyKind: 'json' | 'text' | 'binary' | 'empty';
  body: unknown;
  skipReason?: string;
}

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://www.samrtdoor.com.cn';
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:5001';
const PROD_USERNAME = process.env.PROD_USERNAME;
const PROD_PASSWORD = process.env.PROD_PASSWORD;
const LOCAL_USERNAME = process.env.LOCAL_USERNAME || PROD_USERNAME;
const LOCAL_PASSWORD = process.env.LOCAL_PASSWORD || PROD_PASSWORD;
const PROD_DS = process.env.PROD_DS || 'smartdoor';
const LOCAL_DS = process.env.LOCAL_DS || 'smartdoor';
const PROD_COMPANY = process.env.PROD_COMPANY || '恒泰智门';
const LOCAL_COMPANY = process.env.LOCAL_COMPANY || PROD_COMPANY;
const INCLUDE_WRITES = process.env.CONTRACT_INCLUDE_WRITES === '1';
const WRITE_GROUP = process.env.CONTRACT_WRITE_GROUP || '';
const WRITE_TOKEN = process.env.CONTRACT_WRITE_TOKEN;
const WRITE_TOKEN_VALUE = 'I_UNDERSTAND_PROD_WRITES';
const COMPARE_VALUES = process.env.CONTRACT_COMPARE_VALUES === '1';
const TEST_PREFIX = process.env.CONTRACT_TEST_PREFIX || `htzm_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
const TEST_FORMULA_ID = `${TEST_PREFIX}_formula`;
const TEST_FORMULA_NAME = `${TEST_PREFIX}_公式`;
const TEST_ADD_PRICE_NAME = `${TEST_PREFIX}_addprice`;
const PROBE_ADD_PRICE_NAME = 'htzm_probe_addprice';
const TEST_GLASS_HOLE_NAME = `${TEST_PREFIX}_glasshole`;
const TEST_IMAGE_ID = `${TEST_PREFIX}_image`;
const TEST_RECEIPT_ORDER_NO = `${TEST_PREFIX}_receipt`;
const TEST_RECEIPT_ROW_ID = Number(`${new Date().toISOString().slice(0, 10).replace(/-/g, '')}01`);

const SAFE_CASES: ContractCase[] = [
  { action: 'login', group: 'core', method: 'GET', safe: true, note: 'Credentials use username/password instead of ds' },
  { action: 'change_password', group: 'core', method: 'GET', safe: true, param3: '__bad_old_password__', param4: '__bad_new_password__' },
  { action: 'getTemplates', group: 'core', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getClientsInfo', group: 'core', method: 'GET', safe: true },
  { action: 'getLatestClientsInfo', group: 'core', method: 'GET', safe: true, param3: '1' },
  { action: 'checkClient', group: 'core', method: 'GET', safe: true, param3: '恒泰智门', param4: '1133' },
  { action: 'getUserConfig', group: 'core', method: 'GET', safe: true },
  { action: 'GetProcedures', group: 'core', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getTableData', group: 'core', method: 'GET', safe: true },
  { action: 'getTableDataForTerminal', group: 'core', method: 'GET', safe: true, query: { clientId: '0' } },
  { action: 'detail', group: 'core', method: 'GET', safe: true, param3: '__missing_order__' },
  { action: 'getMoreOrders', group: 'core', method: 'GET', safe: true, param3: '1' },
  { action: 'getMoreTableDate', group: 'core', method: 'GET', safe: true },
  { action: 'getOrders', group: 'core', method: 'POST', safe: true, body: [] },
  { action: 'getorders', group: 'core', method: 'POST', safe: true, dynamic: 'first-order-ref', note: 'Success shape using first order from getTableData' },
  { action: 'initializDiao', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'initializPing', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getFormulaName', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getFormulas', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, param3: 'diao' },
  { action: 'queryFormula', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, param3: '__contract_probe__' },
  { action: 'getPingPrice', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getDiaoPrice', group: 'formula', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getProgress', group: 'progress', method: 'GET', safe: true },
  { action: 'getProgressData', group: 'progress', method: 'GET', safe: true },
  { action: 'getProgressList', group: 'progress', method: 'GET', safe: true },
  { action: 'getProductionProgress', group: 'progress', method: 'GET', safe: true },
  { action: 'getProductionProgressData', group: 'progress', method: 'GET', safe: true },
  { action: 'getProgressForTerminal', group: 'progress', method: 'GET', safe: true },
  { action: 'getMoreProgress', group: 'progress', method: 'GET', safe: true },
  { action: 'getLabelData', group: 'progress', method: 'POST', safe: true, body: ['__missing_order__'] },
  { action: 'getScanQRcode', group: 'progress', method: 'GET', safe: true, param3: '__missing_order__' },
  { action: 'getProcessCounts', group: 'progress', method: 'GET', safe: true },
  { action: 'finance_checkSystem', group: 'finance', method: 'GET', safe: true },
  { action: 'finance_getOrderFinanceSummary', group: 'finance', method: 'GET', safe: true },
  { action: 'finance_getPaymentStats', group: 'finance', method: 'GET', safe: true, param3: '__missing_client__' },
  { action: 'finance_getCustomerStatement', group: 'finance', method: 'GET', safe: true, param3: '__missing_client__' },
  { action: 'finance_getOrderDetail', group: 'finance', method: 'GET', safe: true, param3: '__missing_order__' },
  { action: 'finance_getCustomerBalance', group: 'finance', method: 'GET', safe: true, param3: '__missing_client__' },
  { action: 'getAddPrice', group: 'settings', method: 'GET', safe: true },
  { action: 'DrawingBehaviors', group: 'settings', method: 'GET', safe: true },
  { action: 'getParametricPatterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getParametricPattern', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'parametric-patterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'parametricPatterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'parametricPattern', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getPattern', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getPatterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getDoorFlowers', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getDoorFlower', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'doorFlowers', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'doorFlower', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'CheckVersionAPP', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'getUpdataInfo', group: 'file', method: 'GET', safe: true },
  { action: 'getimage', group: 'file', method: 'GET', safe: true, param3: '__missing_image__' },
  { action: 'shortlink_get', group: 'shortlink', method: 'GET', safe: true, param3: '__missing_link__' },
];

const WRITE_CASES: ContractCase[] = [
  { action: 'makeReceipt', group: 'receipt', method: 'POST', safe: false, writeGroup: 'receipt', body: receiptWriteBody(), note: 'Creates a production-shaped receipt fixture' },
  { action: 'updateCustomerInfo', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'updateClientInfo', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'UpdateClientsInfo', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'updateClientsInfo', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'deleteClientInfo', group: 'core', method: 'GET', safe: true, param3: '__missing_client__' },
  { action: 'combine', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'deleteHui', group: 'core', method: 'GET', safe: true, param3: '__missing_order__' },
  { action: 'deleteRow', group: 'core', method: 'GET', safe: true, param3: '__missing_order__' },
  { action: 'updateRowData', group: 'core', method: 'POST', safe: true, body: {} },
  { action: 'getDiaoFormulas', group: 'formula', method: 'POST', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, param3: PROD_DS, body: { formula: ['__missing_formula__'], id: ['htzm_row_1'] } },
  { action: 'getDiaoFormulasSingle', group: 'formula', method: 'POST', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, param3: PROD_DS, body: {} },
  { action: 'saveFormula', group: 'formula', method: 'POST', safe: false, writeGroup: 'formula', prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, body: formulaWriteBody() },
  { action: 'deleteFormula', group: 'formula', method: 'GET', safe: true, writeGroup: 'formula-cleanup', prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY, param3: '__missing_formula__' },
  { action: 'updateProgress', group: 'progress', method: 'POST', safe: true, body: [] },
  { action: 'updataProgress', group: 'progress', method: 'POST', safe: true, body: [] },
  { action: 'PaymentCollection', group: 'progress', method: 'GET', safe: true },
  { action: 'updatePaymentCollection', group: 'progress', method: 'GET', safe: true },
  { action: 'updataPaymentCollection', group: 'progress', method: 'GET', safe: true },
  { action: 'updatePayment', group: 'progress', method: 'GET', safe: true },
  { action: 'deleteProgress', group: 'progress', method: 'GET', safe: true },
  { action: 'deleteProgressForFullOrder', group: 'progress', method: 'GET', safe: true },
  { action: 'clearProgress', group: 'progress', method: 'GET', safe: true },
  { action: 'SetProcedures', group: 'progress', method: 'POST', safe: true, body: {} },
  { action: 'finance_checkOrderPayment', group: 'finance', method: 'POST', safe: true, body: [] },
  { action: 'finance_previewAllocation', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_previewPrepaymentAllocation', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_executePrepaymentAllocation', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_addPayment', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_addOrderPayment', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_addOrderAdjustment', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'finance_addCustomerAdjustment', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'clearSelectedOrders', group: 'finance', method: 'POST', safe: true, body: {} },
  { action: 'addAddPrice', group: 'settings', method: 'POST', safe: false, writeGroup: 'settings', body: addPriceBody(TEST_ADD_PRICE_NAME), note: 'Creates settings data' },
  { action: 'editPrice', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'deleteAddPrice', group: 'settings', method: 'POST', safe: true, writeGroup: 'settings-cleanup', body: {} },
  { action: 'glassHole', group: 'settings', method: 'POST', safe: false, writeGroup: 'glasshole', body: glassHoleBody(TEST_GLASS_HOLE_NAME), note: 'Creates glass-hole config data' },
  { action: 'deleteGlassHole', group: 'settings', method: 'GET', safe: true, param3: '__missing_glass_hole__' },
  { action: 'changeDecleration', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'changeSquare', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'changSquare', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'changeDirectionMode', group: 'settings', method: 'POST', safe: true },
  { action: 'reverseDirection', group: 'settings', method: 'POST', safe: true },
  { action: 'saveCustomDirectionNames', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'clearAccount', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'registrantUser', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'upsertParametricPattern', group: 'settings', method: 'POST', safe: true, body: {} },
  { action: 'deleteParametricPattern', group: 'settings', method: 'GET', safe: true, param3: '__missing_pattern__' },
  { action: 'parametric_patterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'patterns', group: 'settings', method: 'GET', safe: true, prodParam2: PROD_COMPANY, localParam2: LOCAL_COMPANY },
  { action: 'saveImage', group: 'file', method: 'POST', safe: true, body: {} },
  { action: 'deleteImage', group: 'file', method: 'GET', safe: true, param3: '__missing_image__' },
  { action: 'saveImage', group: 'file', method: 'POST', safe: false, writeGroup: 'image', multipart: true, query: { id: TEST_IMAGE_ID, series: '1' }, body: imageWriteBody(), note: 'Uploads a tiny PNG image fixture' },
  { action: 'addScanner', group: 'scanner', method: 'POST', safe: true, body: {} },
  { action: 'DeleteScanner', group: 'scanner', method: 'GET', safe: true },
  { action: 'SetPrinters', group: 'scanner', method: 'POST', safe: true, body: {} },
  { action: 'shortlink_create', group: 'shortlink', method: 'POST', safe: true, body: {} },
];

const DYNAMIC_KEY_RE = /(^|_)(id|token)$|token|date|time|created|updated|编号|单号|日期|时间|url|qrcode|amount|金额/i;

function formulaWriteBody(): Record<string, unknown> {
  return {
    [TEST_FORMULA_ID]: {
      formulaName: TEST_FORMULA_NAME,
      formulaType: 'diao',
      square: 1,
      diao: {
        套线测试: { title: '套线', track: 'test_line' },
        轨道测试: { title: '轨', track: 'test_track' },
      },
    },
  };
}

function addPriceBody(name: string): Record<string, unknown> {
  return { name, price: 1, unit: '个', remark: '1', lockway: '', direction: '' };
}

function glassHoleBody(name: string): Record<string, unknown> {
  return {
    '挖孔图': {
      formulaID: name,
      state: true,
      quantity: 1,
      materialName: '挖孔图',
      track: '',
      formula: '',
      result: -180000,
      v: -100000,
      calculate: '',
      color: 'lightgreen',
      type: 'diao',
      remark: '1',
    },
  };
}

function imageWriteBody(): Record<string, unknown> {
  return { id: TEST_IMAGE_ID, series: '1' };
}

function tinyPngBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
}

function receiptWriteBody(): Record<string, unknown> {
  const customerName = '开门红门业';
  const date = '2026-06-27';
  const installAddress = '测试地址';
  return {
    customerInfo: {
      '客户': customerName,
      '客户编号': 0,
      '电话': '13800000000',
      '品牌': '测试',
      '日期': date,
      '生产天数': 1,
      '回执单号': TEST_RECEIPT_ORDER_NO,
      '截止日期': '2026-06-28',
      '总价': 1,
      '定金': 0,
      '订单备注': '1',
      '业务员': '测试',
      '打单人': '测试',
      '地址': installAddress,
      '门数': 1,
      '安装地址': installAddress,
    },
    ping_hui: [{
      id: TEST_RECEIPT_ROW_ID,
      '回执单号': TEST_RECEIPT_ORDER_NO,
      '单号': TEST_RECEIPT_ORDER_NO,
      '客户': customerName,
      '客户编号': 0,
      '日期': date,
      '型材': '测试型材',
      '数量': 1,
      '颜色': '测试颜色',
      '底玻': '无',
      '面玻': '无',
      '玻璃厚': 0,
      '开向': '左内开',
      '计价方式': '套',
      '门洞高': 2100,
      '门洞宽': 900,
      '墙厚': 100,
      '单价': 1,
      '金额': 1,
      '打折': 1,
      '业务员': '测试',
      '安装地址': installAddress,
      '备注': '1',
    }],
    diao_hui: [],
  };
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function readActionMapKeys(): Set<string> {
  const file = path.resolve(__dirname, '../src/modules/legacy-dispatch.ts');
  const source = fs.readFileSync(file, 'utf8');
  const actionMapStart = source.indexOf('const ACTION_MAP');
  const contractStart = source.indexOf('const LEGACY_CONTRACTS');
  const actionMapSource = actionMapStart >= 0 && contractStart > actionMapStart
    ? source.slice(actionMapStart, contractStart)
    : source;
  const keys = new Set<string>();
  for (const match of actionMapSource.matchAll(/['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g)) {
    keys.add(match[2]);
  }
  return keys;
}

function endpoint(baseUrl: string, testCase: ContractCase, local: boolean): URL {
  const url = new URL('/1', baseUrl);
  const username = local ? LOCAL_USERNAME : PROD_USERNAME;
  const password = local ? LOCAL_PASSWORD : PROD_PASSWORD;
  url.searchParams.set('param1', testCase.action);
  if (testCase.action === 'login') {
    url.searchParams.set('param2', requireEnv(local ? 'LOCAL_USERNAME' : 'PROD_USERNAME', username));
    url.searchParams.set('param3', requireEnv(local ? 'LOCAL_PASSWORD' : 'PROD_PASSWORD', password));
  } else {
    url.searchParams.set('param2', (local ? testCase.localParam2 : testCase.prodParam2) || (local ? LOCAL_DS : PROD_DS));
    if (testCase.param3 !== undefined) url.searchParams.set('param3', testCase.param3);
    if (testCase.param4 !== undefined) url.searchParams.set('param4', testCase.param4);
  }
  for (const [key, value] of Object.entries(testCase.query || {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function fetchCase(baseUrl: string, testCase: ContractCase, local: boolean): Promise<FetchResult> {
  if (testCase.dynamic === 'first-order-ref') {
    return fetchFirstOrderRefCase(baseUrl, testCase, local);
  }
  const init: RequestInit = { method: testCase.method };
  if (testCase.method !== 'GET') {
    if (testCase.multipart) {
      const form = new FormData();
      const body = isPlainRecord(testCase.body) ? testCase.body : {};
      for (const [key, value] of Object.entries(body)) form.set(key, String(value));
      form.set('file', new Blob([tinyPngBuffer()], { type: 'image/png' }), `${TEST_IMAGE_ID}.png`);
      init.body = form;
    } else {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(testCase.body ?? {});
    }
  }
  const res = await fetchWithRetry(endpoint(baseUrl, testCase, local), init);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return { status: res.status, contentType, bodyKind: 'json', body: await res.json() };
  }
  const text = await res.text();
  return { status: res.status, contentType, bodyKind: text ? 'text' : 'empty', body: text };
}

async function fetchFirstOrderRefCase(baseUrl: string, testCase: ContractCase, local: boolean): Promise<FetchResult> {
  const tableCase: ContractCase = { action: 'getTableData', group: testCase.group, method: 'GET', safe: true };
  const table = await fetchCase(baseUrl, tableCase, local);
  const orderNo = firstOrderNo(table.body);
  if (!orderNo) {
    return {
      status: 0,
      contentType: '',
      bodyKind: 'empty',
      body: null,
      skipReason: `No order ref available from ${local ? 'local' : 'production'} getTableData`,
    };
  }
  return fetchCase(baseUrl, { ...testCase, dynamic: undefined, body: [orderNo] }, local);
}

function firstOrderNo(value: unknown): string | null {
  const data = isPlainRecord(value) ? value.data : undefined;
  const tableData = isPlainRecord(data) ? data.tableData : undefined;
  const rows = Array.isArray(tableData)
    ? tableData
    : Array.isArray(value)
      ? value
      : [];
  for (const row of rows) {
    if (!isPlainRecord(row)) continue;
    const orderNo = row.orderNo ?? row['回执单号'] ?? row['单号'];
    if (orderNo !== null && orderNo !== undefined && String(orderNo).trim()) {
      return String(orderNo);
    }
  }
  return null;
}

async function fetchWithRetry(url: URL, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        return await fetch(url, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise(resolve => setTimeout(resolve, 500 * i));
    }
  }
  throw lastError;
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [normalize(value[0])] : [];
  if (value === '') return null;
  if (!value || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    if (DYNAMIC_KEY_RE.test(key)) {
      output[key] = '<dynamic>';
    } else {
      output[key] = normalize(obj[key]);
    }
  }
  return output;
}

function typeShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [typeShape(value[0])] : [];
  if (!value || typeof value !== 'object') return typeof value;
  const obj = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) output[key] = typeShape(obj[key]);
  return output;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function envelopeShape(value: unknown): unknown {
  if (Array.isArray(value)) return 'array';
  if (!isPlainRecord(value)) return typeof value;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const child = value[key];
    if (Array.isArray(child)) {
      output[key] = 'array';
    } else if (isPlainRecord(child)) {
      output[key] = Object.keys(child).length === 0 ? 'object' : 'object';
    } else {
      output[key] = typeof child;
    }
  }
  return output;
}

function sampleObjectFields(value: unknown, parentKey?: string): unknown {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (!isPlainRecord(value)) return typeof value;
  const keys = Object.keys(value).sort();
  if (isDynamicRecordMap(value, parentKey)) {
    return '<dynamic-map>';
  }
  const output: Record<string, unknown> = {};
  for (const key of keys) {
    const child = value[key];
    if (Array.isArray(child)) {
      output[key] = sampleObjectFields(child, key);
    } else if (isPlainRecord(child)) {
      output[key] = sampleObjectFields(child, key);
    } else {
      output[key] = 'value';
    }
  }
  return output;
}

function isDynamicRecordMap(value: Record<string, unknown>, parentKey?: string): boolean {
  if (parentKey && ['lineType', 'material', 'square', 'trackType', 'formulaType'].includes(parentKey)) return true;
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  if (keys.some(key => /^\d{8,}$/.test(key) || /^DD\d+/i.test(key))) return true;
  if (keys.some(key => /^(HTZM|htzm_|smrtdoor_|smartdoor_)/i.test(key))) return true;
  if (keys.some(key => /[^\w-]/.test(key))) return true;
  if (keys.length > 10) return true;
  if (keys.some(key => /^formula_/i.test(key))) return true;

  return false;
}

function loginStatus(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0];
    if (!isPlainRecord(first)) return 'array-without-user';
    if (first.statu === 1 && isPlainRecord(first.registrant)) return 'success';
    return `array:${String(first.message || first.statu || 'unknown')}`;
  }
  if (isPlainRecord(value)) {
    return `${String(value.code || 'object')}:${String(value.message || 'unknown')}`;
  }
  return typeof value;
}

function compare(testCase: ContractCase, prod: FetchResult, local: FetchResult): string[] {
  const diffs: string[] = [];
  if (prod.status !== local.status) diffs.push(`status prod=${prod.status} local=${local.status}`);
  if (prod.bodyKind !== local.bodyKind) diffs.push(`body kind prod=${prod.bodyKind} local=${local.bodyKind}`);
  if (testCase.action === 'login' && prod.bodyKind === 'json' && local.bodyKind === 'json') {
    const prodLogin = loginStatus(prod.body);
    const localLogin = loginStatus(local.body);
    if (prodLogin !== 'success' || localLogin !== 'success') {
      diffs.push(`login prod=${prodLogin} local=${localLogin}`);
    }
  }
  if (prod.bodyKind === 'json' && local.bodyKind === 'json') {
    const prodEnvelope = JSON.stringify(envelopeShape(prod.body));
    const localEnvelope = JSON.stringify(envelopeShape(local.body));
    if (prodEnvelope !== localEnvelope) diffs.push(`envelope prod=${prodEnvelope.slice(0, 1200)} local=${localEnvelope.slice(0, 1200)}`);

    const prodSample = JSON.stringify(sampleObjectFields(prod.body));
    const localSample = JSON.stringify(sampleObjectFields(local.body));
    if (prodSample !== localSample) diffs.push(`fields prod=${prodSample.slice(0, 1200)} local=${localSample.slice(0, 1200)}`);

    if (COMPARE_VALUES) {
      const prodNorm = JSON.stringify(normalize(prod.body));
      const localNorm = JSON.stringify(normalize(local.body));
      if (prodNorm !== localNorm) diffs.push(`value prod=${prodNorm.slice(0, 1200)} local=${localNorm.slice(0, 1200)}`);
    }
  }
  if (prod.bodyKind === 'text' && local.bodyKind === 'text' && String(prod.body).slice(0, 120) !== String(local.body).slice(0, 120)) {
    diffs.push('text prefix differs');
  }
  return diffs;
}

async function main() {
  requireEnv('PROD_USERNAME', PROD_USERNAME);
  requireEnv('PROD_PASSWORD', PROD_PASSWORD);
  requireEnv('LOCAL_USERNAME', LOCAL_USERNAME);
  requireEnv('LOCAL_PASSWORD', LOCAL_PASSWORD);
  if (INCLUDE_WRITES && WRITE_TOKEN !== WRITE_TOKEN_VALUE) {
    throw new Error(`Refusing to run write contract cases against production without CONTRACT_WRITE_TOKEN=${WRITE_TOKEN_VALUE}`);
  }

  const actionKeys = readActionMapKeys();
  const covered = new Set([...SAFE_CASES, ...WRITE_CASES].map(c => c.action.toLowerCase()));
  const cases = [...SAFE_CASES, ...WRITE_CASES];
  let pass = 0;
  let fail = 0;
  let skip = 0;

  console.log(`Production: ${PROD_BASE_URL}`);
  console.log(`Local: ${LOCAL_BASE_URL}`);
  console.log(`Actions in legacy map: ${actionKeys.size}; contract cases: ${cases.length}`);
  if (INCLUDE_WRITES) console.log(`Write test prefix: ${TEST_PREFIX}`);

  try {
    for (const testCase of cases) {
      if (!shouldRunCase(testCase)) {
        skip += 1;
        console.log(`SKIP ${testCase.group}/${testCase.action} (${testCase.note || 'write endpoint'})`);
        continue;
      }
      try {
        const [prod, local] = await Promise.all([
          fetchCase(PROD_BASE_URL, testCase, false),
          fetchCase(LOCAL_BASE_URL, testCase, true),
        ]);
        if (prod.skipReason && local.skipReason) {
          skip += 1;
          console.log(`SKIP ${testCase.group}/${testCase.action} (${prod.skipReason}; ${local.skipReason})`);
          continue;
        }
        if (testCase.dynamic && (prod.skipReason || local.skipReason)) {
          skip += 1;
          console.log(`SKIP ${testCase.group}/${testCase.action} (${prod.skipReason || local.skipReason})`);
          continue;
        }
        if (prod.skipReason || local.skipReason) {
          fail += 1;
          console.log(`FAIL ${testCase.group}/${testCase.action}`);
          console.log(`  - ${prod.skipReason || local.skipReason}`);
          continue;
        }
        const diffs = compare(testCase, prod, local);
        if (diffs.length) {
          fail += 1;
          console.log(`FAIL ${testCase.group}/${testCase.action}`);
          for (const diff of diffs) console.log(`  - ${diff}`);
        } else {
          pass += 1;
          console.log(`PASS ${testCase.group}/${testCase.action}`);
        }
      } catch (err) {
        fail += 1;
        console.log(`FAIL ${testCase.group}/${testCase.action}`);
        console.log(`  - ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } finally {
    if (INCLUDE_WRITES) await cleanupWriteFixtures();
  }

  const uncovered = [...actionKeys].filter(key => !covered.has(key.toLowerCase()));
  if (uncovered.length) {
    console.log(`UNCOVERED actions (${uncovered.length}): ${uncovered.sort().join(', ')}`);
  }
  console.log(`Summary: pass=${pass} fail=${fail} skip=${skip} uncovered=${uncovered.length}`);
  if (fail) process.exitCode = 1;
}

async function cleanupWriteFixtures(): Promise<void> {
  if (WRITE_GROUP === 'formula') {
    const cleanupCase: ContractCase = {
      action: 'deleteFormula',
      group: 'formula',
      method: 'GET',
      safe: false,
      prodParam2: PROD_COMPANY,
      localParam2: LOCAL_COMPANY,
      param3: TEST_FORMULA_ID,
    };
    await Promise.all([
      fetchCase(PROD_BASE_URL, cleanupCase, false).catch(err => console.warn(`Production formula cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, cleanupCase, true).catch(err => console.warn(`Local formula cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(PROD_BASE_URL, { ...cleanupCase, param3: 'htzm_probe_formula' }, false).catch(err => console.warn(`Production probe cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, { ...cleanupCase, param3: 'htzm_probe_formula' }, true).catch(err => console.warn(`Local probe cleanup failed: ${err instanceof Error ? err.message : err}`)),
    ]);
    console.log(`Cleanup hook completed for formula ${TEST_FORMULA_ID}.`);
    return;
  }

  if (WRITE_GROUP === 'settings') {
    const cleanupCase: ContractCase = {
      action: 'deleteAddPrice',
      group: 'settings',
      method: 'POST',
      safe: false,
      body: addPriceBody(TEST_ADD_PRICE_NAME),
    };
    await Promise.all([
      fetchCase(PROD_BASE_URL, cleanupCase, false).catch(err => console.warn(`Production add-price cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, cleanupCase, true).catch(err => console.warn(`Local add-price cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(PROD_BASE_URL, { ...cleanupCase, body: addPriceBody(PROBE_ADD_PRICE_NAME) }, false).catch(err => console.warn(`Production probe add-price cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, { ...cleanupCase, body: addPriceBody(PROBE_ADD_PRICE_NAME) }, true).catch(err => console.warn(`Local probe add-price cleanup failed: ${err instanceof Error ? err.message : err}`)),
    ]);
    console.log(`Cleanup hook completed for add-price ${TEST_ADD_PRICE_NAME}.`);
    return;
  }

  if (WRITE_GROUP === 'glasshole') {
    const cleanupCase: ContractCase = {
      action: 'deleteGlassHole',
      group: 'settings',
      method: 'GET',
      safe: false,
      param3: TEST_GLASS_HOLE_NAME,
    };
    await Promise.all([
      fetchCase(PROD_BASE_URL, cleanupCase, false).catch(err => console.warn(`Production glass-hole cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, cleanupCase, true).catch(err => console.warn(`Local glass-hole cleanup failed: ${err instanceof Error ? err.message : err}`)),
    ]);
    console.log(`Cleanup hook completed for glass-hole ${TEST_GLASS_HOLE_NAME}.`);
    return;
  }

  if (WRITE_GROUP === 'image') {
    const cleanupCase: ContractCase = {
      action: 'deleteImage',
      group: 'file',
      method: 'GET',
      safe: false,
      param3: TEST_IMAGE_ID,
    };
    await Promise.all([
      fetchCase(PROD_BASE_URL, cleanupCase, false).catch(err => console.warn(`Production image cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, cleanupCase, true).catch(err => console.warn(`Local image cleanup failed: ${err instanceof Error ? err.message : err}`)),
    ]);
    console.log(`Cleanup hook completed for image ${TEST_IMAGE_ID}.`);
    return;
  }

  if (WRITE_GROUP === 'receipt') {
    const cleanupCase: ContractCase = {
      action: 'deleteHui',
      group: 'core',
      method: 'POST',
      safe: false,
      body: [TEST_RECEIPT_ORDER_NO],
    };
    await Promise.all([
      fetchCase(PROD_BASE_URL, cleanupCase, false).catch(err => console.warn(`Production receipt cleanup failed: ${err instanceof Error ? err.message : err}`)),
      fetchCase(LOCAL_BASE_URL, cleanupCase, true).catch(err => console.warn(`Local receipt cleanup failed: ${err instanceof Error ? err.message : err}`)),
    ]);
    console.log(`Cleanup hook completed for receipt ${TEST_RECEIPT_ORDER_NO}.`);
    return;
  }

  {
    console.log(`Cleanup hook completed for write prefix ${TEST_PREFIX}; no destructive cleanup is enabled for group ${WRITE_GROUP || 'none'}.`);
    return;
  }
}

function shouldRunCase(testCase: ContractCase): boolean {
  if (testCase.safe) return true;
  if (!INCLUDE_WRITES) return false;
  if (!WRITE_GROUP) return false;
  if (testCase.writeGroup === `${WRITE_GROUP}-cleanup`) return false;
  return testCase.writeGroup === WRITE_GROUP;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
