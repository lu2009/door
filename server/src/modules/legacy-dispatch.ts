import { Request, Response } from 'express';

const ACTION_MAP: Record<string, string> = {
  // Direct lowercase mappings (some clients send lowercase param1)
  'login': 'login',
  'change_password': 'change_password',
  'getclientsinfo': 'getclientsinfo',
  'getlatestclientsinfo': 'getlatestclientsinfo',
  'checkclient': 'checkclient',
  'updateclientinfo': 'updateclientinfo',
  'updateclientsinfo': 'updateclientsinfo',
  'updatecustomerinfo': 'updatecustomerinfo',
  'deleteclientinfo': 'deleteclientinfo',
  'makereceipt': 'makereceipt',
  'gettabledata': 'gettabledata',
  'gettabledataforterminal': 'gettabledataforterminal',
  'getmoretabledate': 'getmoretabledate',
  'getmoreorders': 'getmoreorders',
  'deletehui': 'deletehui',
  'deleterow': 'deleterow',
  'updaterowdata': 'updaterowdata',
  'getprogress': 'getprogress',
  'getproductionprogressdata': 'getproductionprogressdata',
  'getprogressforterminal': 'getprogressforterminal',
  'getprogressdata': 'getprogressdata',
  'getprogresslist': 'getprogresslist',
  'getproductionprogress': 'getproductionprogress',
  'getmoreprogress': 'getmoreprogress',
  'getlabeldata': 'getlabeldata',
  'getscanqrcode': 'getscanqrcode',
  'getprocesscounts': 'getprocesscounts',
  'paymentcollection': 'paymentcollection',
  'updatepaymentcollection': 'updatepaymentcollection',
  'updatepayment': 'updatepayment',
  'updataprogress': 'updataprogress',
  'deleteprogress': 'deleteprogress',
  'deleteprogressforfullorder': 'deleteprogressforfullorder',
  'clearprogress': 'clearprogress',
  'setprocedures': 'setprocedures',
  'getuserconfig': 'getuserconfig',
  'checkversionapp': 'checkversionapp',
  'getupdatainfo': 'getupdatainfo',
  'gettemplates': 'gettemplates',
  'saveimage': 'saveimage',
  'deleteimage': 'deleteimage',
  'initializdiao': 'initializdiao',
  'initializping': 'initializping',
  'getformulaname': 'getformulaname',
  'getdiaoformulas': 'getdiaoformulas',
  'getdiaoformulassingle': 'getdiaoformulassingle',
  'getdiaoprice': 'getdiaoprice',
  'getpingprice': 'getpingprice',
  'getformulas': 'getformulas',
  'queryformula': 'queryformula',
  'saveformula': 'saveformula',
  'deleteformula': 'deleteformula',
  'getaddprice': 'getaddprice',
  'addaddprice': 'addaddprice',
  'deleteaddprice': 'deleteaddprice',
  'editprice': 'editprice',
  'glasshole': 'glasshole',
  'deleteglasshole': 'deleteglasshole',
  'changsquare': 'changsquare',
  'changedecleration': 'changedecleration',
  'changedirectionmode': 'changedirectionmode',
  'reversedirection': 'reversedirection',
  'savecustomdirectionnames': 'savecustomdirectionnames',
  'finance_checksystem': 'finance_checksystem',
  'finance_getorderfinancesummary': 'finance_getorderfinancesummary',
  'finance_checkorderpayment': 'finance_checkorderpayment',
  'finance_getpaymentstats': 'finance_getpaymentstats',
  'finance_getcustomerstatement': 'finance_getcustomerstatement',
  'finance_getorderdetail': 'finance_getorderdetail',
  'finance_getcustomerbalance': 'finance_getcustomerbalance',
  'finance_previewallocation': 'finance_previewallocation',
  'finance_executeprepaymentallocation': 'finance_executeprepaymentallocation',
  'finance_previewprepaymentallocation': 'finance_previewprepaymentallocation',
  'finance_addpayment': 'finance_addpayment',
  'finance_addorderpayment': 'finance_addorderpayment',
  'finance_addorderadjustment': 'finance_addorderadjustment',
  'finance_addcustomeradjustment': 'finance_addcustomeradjustment',
  'finance_updateordercustomer': 'finance_updateordercustomer',
  'addscanner': 'addscanner',
  'deletescanner': 'deletescanner',
  'setprinters': 'setprinters',
  'parametric_patterns': 'parametric_patterns',
  'parametric-patterns': 'parametric-patterns',
  'parametricpatterns': 'parametricpatterns',
  'parametricpattern': 'parametricpattern',
  'getparametricpatterns': 'getparametricpatterns',
  'getparametricpattern': 'getparametricpattern',
  'patterns': 'patterns',
  'getpatterns': 'getpatterns',
  'getpattern': 'getpattern',
  'doorflowers': 'doorflowers',
  'doorflower': 'doorflower',
  'getdoorflowers': 'getdoorflowers',
  'getdoorflower': 'getdoorflower',
  'upsertparametricpattern': 'upsertparametricpattern',
  'deleteparametricpattern': 'deleteparametricpattern',
  'combine': 'combine',
  'getorders': 'getorders',
  'getOrders': 'getorders',
  'clearaccount': 'clearaccount',
  'clearselectedorders': 'clearselectedorders',
  'registrantuser': 'registrantuser',
  'getimage': 'getimage',
  'getprocedures': 'getprocedures',
  'checkclientdevicelicense': 'checkclientdevicelicense',
  'checkElectronDeviceLicense': 'checkelectrondevicelicense',
  'changesquare': 'changesquare',
  'drawingbehaviors': 'drawingbehaviors',
  'shortlink_create': 'shortlink_create',
  'shortlink_get': 'shortlink_get',
  'updatapaymentcollection': 'updatapaymentcollection',

  'getClientsInfo': 'getclientsinfo',
  'getLatestClientsInfo': 'getlatestclientsinfo',
  'checkClient': 'checkclient',
  'updateClientInfo': 'updateclientinfo',
  'updateClientsInfo': 'updateclientsinfo',
  'UpdateClientsInfo': 'updateclientsinfo',
  'updateCustomerInfo': 'updatecustomerinfo',
  'deleteClientInfo': 'deleteclientinfo',
  'makeReceipt': 'makereceipt',
  'getTableData': 'gettabledata',
  'getTableDataForTerminal': 'gettabledataforterminal',
  'getMoreTableDate': 'getmoretabledate',
  'getMoreOrders': 'getmoreorders',
  'detail': 'detail',
  'deleteHui': 'deletehui',
  'deleteRow': 'deleterow',
  'updateRowData': 'updaterowdata',
  'getProgress': 'getprogress',
  'getProductionProgressData': 'getproductionprogressdata',
  'getProgressForTerminal': 'getprogressforterminal',
  'getProgressData': 'getprogressdata',
  'getProgressList': 'getprogresslist',
  'getProductionProgress': 'getproductionprogress',
  'getMoreProgress': 'getmoreprogress',
  'getLabelData': 'getlabeldata',
  'getScanQRcode': 'getscanqrcode',
  'getProcessCounts': 'getprocesscounts',
  'PaymentCollection': 'paymentcollection',
  'updatePaymentCollection': 'updatepaymentcollection',
  'updatePayment': 'updatepayment',
  'updateProgress': 'updataprogress',
  'updataProgress': 'updataprogress',
  'deleteProgress': 'deleteprogress',
  'deleteProgressForFullOrder': 'deleteprogressforfullorder',
  'clearProgress': 'clearprogress',
  'setProcedures': 'setprocedures',
  'SetProcedures': 'setprocedures',
  'GetProcedures': 'getprocedures',
  'getUserConfig': 'getuserconfig',
  'CheckVersionAPP': 'checkversionapp',
  'getUpdataInfo': 'getupdatainfo',
  'getTemplates': 'gettemplates',
  'saveImage': 'saveimage',
  'deleteImage': 'deleteimage',
  'initializDiao': 'initializdiao',
  'initializPing': 'initializping',
  'getFormulaName': 'getformulaname',
  'getDiaoFormulas': 'getdiaoformulas',
  'getDiaoFormulasSingle': 'getdiaoformulassingle',
  'getDiaoPrice': 'getdiaoprice',
  'getPingPrice': 'getpingprice',
  'getFormulas': 'getformulas',
  'queryFormula': 'queryformula',
  'saveFormula': 'saveformula',
  'deleteFormula': 'deleteformula',
  'getAddPrice': 'getaddprice',
  'addAddPrice': 'addaddprice',
  'deleteAddPrice': 'deleteaddprice',
  'editPrice': 'editprice',
  'glassHole': 'glasshole',
  'deleteGlassHole': 'deleteglasshole',
  'drawingBehaviors': 'drawingbehaviors',
  'DrawingBehaviors': 'drawingbehaviors',
  'changeSquare': 'changesquare',
  'changSquare': 'changesquare',
  'changeDecleration': 'changedecleration',
  'changeDirectionMode': 'changedirectionmode',
  'reverseDirection': 'reversedirection',
  'saveCustomDirectionNames': 'savecustomdirectionnames',
  'clearAccount': 'clearaccount',
  'registrantUser': 'registrantuser',
  'checkClientDeviceLicense': 'checkclientdevicelicense',
  'checkElectronDeviceLicense': 'checkelectrondevicelicense',
  'finance_checkSystem': 'finance_checksystem',
  'finance_getOrderFinanceSummary': 'finance_getorderfinancesummary',
  'finance_checkOrderPayment': 'finance_checkorderpayment',
  'finance_getPaymentStats': 'finance_getpaymentstats',
  'finance_getCustomerStatement': 'finance_getcustomerstatement',
  'finance_getOrderDetail': 'finance_getorderdetail',
  'finance_getCustomerBalance': 'finance_getcustomerbalance',
  'finance_previewAllocation': 'finance_previewallocation',
  'finance_executePrepaymentAllocation': 'finance_executeprepaymentallocation',
  'finance_previewPrepaymentAllocation': 'finance_previewprepaymentallocation',
  'finance_addPayment': 'finance_addpayment',
  'finance_addOrderPayment': 'finance_addorderpayment',
  'finance_addOrderAdjustment': 'finance_addorderadjustment',
  'finance_addCustomerAdjustment': 'finance_addcustomeradjustment',
  'finance_updateOrderCustomer': 'finance_updateordercustomer',
  'clearSelectedOrders': 'clearselectedorders',
  'getParametricPattern': 'getparametricpattern',
  'getParametricPatterns': 'getparametricpatterns',
  'parametricPattern': 'parametricpattern',
  'parametricPatterns': 'parametricpatterns',
  'upsertParametricPattern': 'upsertparametricpattern',
  'deleteParametricPattern': 'deleteparametricpattern',
  'getPattern': 'getpattern',
  'getPatterns': 'getpatterns',
  'getDoorFlower': 'getdoorflower',
  'getDoorFlowers': 'getdoorflowers',
  'doorFlower': 'doorflower',
  'doorFlowers': 'doorflowers',
  'addScanner': 'addscanner',
  'AddScanner': 'addscanner',
  'DeleteScanner': 'deletescanner',
  'setPrinters': 'setprinters',
  'SetPrinters': 'setprinters',
  'updataPaymentCollection': 'updatepaymentcollection',
};

// Map each action key to its module handler
const HANDLER_MAP: Record<string, (params: HandlerParams) => Promise<unknown>> = {};

type LegacyResponseShape = 'auto' | 'raw-array' | 'raw-object' | 'wrapped';

interface LegacyContract {
  methods?: string[];
  mapFields?: boolean;
  responseShape?: LegacyResponseShape;
  requiredParams?: string[];
  missingStatus?: number;
  missingMessage?: string;
  successMessage?: string;
  staticResponse?: unknown;
  staticStatus?: number;
  html500?: boolean;
  badRequest?: boolean;
}

interface LegacyStatusPayload {
  __statusCode?: number;
  [key: string]: unknown;
}

const LEGACY_CONTRACTS: Record<string, LegacyContract> = {
  login: { methods: ['GET'], mapFields: false, responseShape: 'raw-array' },
  checkclient: { methods: ['GET'], mapFields: false, responseShape: 'raw-object' },
  change_password: { methods: ['GET'], staticResponse: { error: 'No data found for the given param2' } },
  getuserconfig: { badRequest: true },
  getprocedures: { responseShape: 'wrapped', successMessage: '获取成功' },
  queryformula: { methods: ['GET'] },
  deleteformula: { methods: ['GET'] },
  deleteclientinfo: { methods: ['GET'] },
  getaddprice: { mapFields: false, responseShape: 'wrapped', successMessage: '数据获取成功' },
  addaddprice: { mapFields: false, responseShape: 'wrapped', successMessage: '加价项目添加成功' },
  deleteaddprice: { mapFields: false, responseShape: 'wrapped', successMessage: '加价项目删除成功' },
  drawingbehaviors: { staticResponse: { code: 200, message: 'ok' } },
  checkclientdevicelicense: { methods: ['GET'], responseShape: 'raw-object' },
  checkelectrondevicelicense: { methods: ["POST"], responseShape: "raw-object" },
  saveformula: { methods: ['POST'], mapFields: false, responseShape: 'raw-object' },
  getdiaoformulas: { methods: ['POST'] },
  getdiaoformulassingle: { methods: ['POST'] },
  makereceipt: { methods: ['POST'], responseShape: 'wrapped' },
  getimage: { mapFields: false, responseShape: 'raw-object' },
  gettemplates: { responseShape: 'raw-object' },
  addscanner: { methods: ['GET'], responseShape: 'raw-object' },
  getlatestclientsinfo: { requiredParams: ['param3'], missingStatus: 400, missingMessage: '缺少 param3' },
  gettabledataforterminal: { html500: true },
  getorders: { methods: ['POST'] },
  getformulas: { badRequest: true },
  getformulaname: { responseShape: 'wrapped' },
  getpingprice: {},
  getdiaoprice: {},
  getprogressdata: { requiredParams: ['param3'], missingStatus: 400, missingMessage: 'bad request' },
  getprogresslist: { requiredParams: ['param3'], missingStatus: 400, missingMessage: 'bad request' },
  getproductionprogress: { requiredParams: ['param3'], missingStatus: 400, missingMessage: 'bad request' },
  getproductionprogressdata: { requiredParams: ['param3'], missingStatus: 400, missingMessage: 'bad request' },
  getprogressforterminal: { staticStatus: 400, staticResponse: { code: 400, data: null, message: '获取明细数据异常: list index out of range' } },
  getlabeldata: { methods: ['POST'], responseShape: 'raw-object' },
  getscanqrcode: { methods: ['GET'], requiredParams: ['param3'], missingStatus: 500 },
  getprocesscounts: { requiredParams: ['param3', 'param4'], missingStatus: 500 },
  getparametricpatterns: { badRequest: true },
  getparametricpattern: { badRequest: true },
  'parametric-patterns': { responseShape: 'wrapped', successMessage: 'ok' },
  parametric_patterns: { badRequest: true },
  parametricpatterns: { badRequest: true },
  parametricpattern: { badRequest: true },
  patterns: { badRequest: true },
  getpatterns: { badRequest: true },
  getpattern: { badRequest: true },
  doorflowers: { badRequest: true },
  doorflower: { badRequest: true },
  getdoorflowers: { badRequest: true },
  getdoorflower: { badRequest: true },
  checkversionapp: { requiredParams: ['param3'], missingStatus: 500 },
  shortlink_get: { requiredParams: ['param3'], missingStatus: 500 },
};

const LEGACY_HTML_500 = '<!doctype html>\n<html lang=en>\n<title>500 Internal Server Error</title>\n<h1>Internal Server Error</h1>\n<p>The server encountered an internal error and was unable to complete your request. Either the server is overloaded or there is an error in the application.</p>';

interface HandlerParams {
  rawAction: string;
  rawParam2: string;
  ds: string;
  param3: string;
  param4: string;
  param5: string;
  body: unknown;
  query: Record<string, string>;
  req: Request;
}

// Lazy registration — imports are deferred
async function getHandler(actionKey: string): Promise<((params: HandlerParams) => Promise<unknown>) | null> {
  if (Object.keys(HANDLER_MAP).length === 0) {
    await registerHandlers();
  }
  return HANDLER_MAP[actionKey] || null;
}

function applyLegacyContract(actionKey: string, result: unknown): unknown {
  const contract = LEGACY_CONTRACTS[actionKey] || {};
  let output = contract.mapFields === false ? result : mapResponseFields(result);

  const shape = contract.responseShape || 'auto';
  if (output && typeof output === 'object' && !Array.isArray(output) && '__statusCode' in (output as Record<string, unknown>)) return output;
  if (shape === 'raw-array' || shape === 'raw-object') return output;

  if (shape === 'wrapped') {
    if (output !== null && output !== undefined && typeof output === 'object' && !Array.isArray(output)) {
      const r = output as Record<string, unknown>;
      if ('code' in r || 'data' in r || 'total' in r) return output;
    }
    return { code: 200, data: output, ...(contract.successMessage ? { message: contract.successMessage } : {}) };
  }

  if (Array.isArray(output)) return { code: 200, data: output };
  if (output !== null && output !== undefined && typeof output === 'object') {
    const r = output as Record<string, unknown>;
    if (!('code' in r) && !('data' in r) && !('total' in r)) {
      output = { code: 200, data: output, ...(contract.successMessage ? { message: contract.successMessage } : {}) };
    }
  }
  return output;
}

function extractLegacyStatus(result: unknown): { statusCode?: number; body: unknown } {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { body: result };
  }
  const obj = result as LegacyStatusPayload;
  if (!obj.__statusCode) return { body: result };
  const { __statusCode, ...body } = obj;
  return { statusCode: __statusCode, body };
}

function missingRequiredParam(contract: LegacyContract, params: HandlerParams): string | null {
  for (const name of contract.requiredParams || []) {
    const value = name === 'param2' ? params.ds : (params as unknown as Record<string, string>)[name];
    if (!value) return name;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasBodyKeys(value: unknown): boolean {
  return isRecord(value) && Object.keys(value).length > 0;
}

function html500Payload(): Record<string, unknown> {
  return { __statusCode: 500, __html: true, message: LEGACY_HTML_500 };
}

function legacyError(statusCode: number, message: string): Record<string, unknown> {
  return { __statusCode: statusCode, code: statusCode, data: null, message };
}

function badRequestPayload(): Record<string, unknown> {
  return { __statusCode: 400, code: 400, message: 'bad request' };
}

function isRawAction(params: HandlerParams, ...names: string[]): boolean {
  return names.includes(params.rawAction);
}

function isProcedureSlot(value: string): boolean {
  return /^工序\d+$/.test(value.trim());
}

function firstPresent(...values: unknown[]): unknown {
  return values.find(value => value !== null && value !== undefined && String(value).trim() !== '');
}

function numberValue(value: unknown): number {
  const num = typeof value === 'string' ? Number(value) : Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function dateText(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
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
    ? value.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
}

function doorRowsFromSpecs(specs: Record<string, unknown>): Record<string, unknown>[] {
  return [
    ...asRecordArray(specs.ping_hui ?? specs['平开']),
    ...asRecordArray(specs.diao_hui ?? specs['吊滑']),
  ];
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

function buildReceiptNoSet(specs: Record<string, unknown>, customerInfo: Record<string, unknown>): string | null {
  const lineNos = doorRowsFromSpecs(specs)
    .map(row => row['单号'])
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim());
  const unique = [...new Set(lineNos)];
  if (unique.length > 0) return unique.join('_');
  const existing = customerInfo['单号集'];
  return existing !== null && existing !== undefined && String(existing).trim() !== ''
    ? String(existing).trim()
    : null;
}

function projectTableData(result: unknown): unknown {
  if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.tableData)) return result;
  const rows = result.data.tableData.map((row) => {
    if (!isRecord(row)) return row;
    const specs = parseJsonRecord(row.doorSpecs);
    const customerInfo = parseJsonRecord(specs.customerInfo);
    const client = isRecord(row.client) ? row.client : {};
    return {
      '业务员': row.salesperson ?? customerInfo['业务员'] ?? '',
      '单号集': buildReceiptNoSet(specs, customerInfo),
      '回执单号': row.orderNo ?? customerInfo['回执单号'] ?? '',
      '安装地址': customerInfo['地址'] ?? customerInfo['安装地址'] ?? specs['安装地址'] ?? specs.address ?? '',
      '定金': numberValue(row.paidAmount ?? customerInfo['定金']),
      '客户': row.customerName ?? customerInfo['客户'] ?? '',
      '客户编号': customerInfo['客户编号'] ?? client.clientCode ?? row.clientId ?? 0,
      '总价': numberValue(row.totalAmount ?? customerInfo['总价']),
      '截止日期': dateText(row.deliveryDate ?? customerInfo['截止日期']),
      '打单人': row.operatorName ?? customerInfo['打单人'] ?? '',
      '打单操作': customerInfo['打单操作'] ?? null,
      '日期': dateText(row.orderDate ?? customerInfo['日期']),
      '订单备注': row.notes ?? customerInfo['订单备注'] ?? '',
      '门数': numberValue(row.doorCount ?? customerInfo['门数']) || 1,
    };
  });
  return {
    ...result,
    data: {
      ...result.data,
      tableData: rows,
    },
  };
}

function projectProgressData(result: unknown): unknown {
  if (!isRecord(result) || !isRecord(result.data) || !Array.isArray(result.data.progressData)) return result;
  // getProgress now reads from door_specs directly — pass enriched rows through
  const rows = (result.data.progressData as unknown[]).filter(isRecord).map(item => {
    const enriched = { ...item };
    delete enriched.order; // remove heavy nested object
    return {
      ...enriched,
      '打单人': firstPresent(enriched['打单人'], enriched['打单人'], ''),
      '打单操作': firstPresent(enriched['打单操作'], enriched['打单操作'], ''),
      '生产进度': firstPresent(buildProgressText(enriched), enriched['生产进度'], ''),
    };
  });
  if (rows.length === 0) return result;
  return {
    ...result,
    data: {
      ...result.data,
      progressData: rows,
    },
  };
}

function projectCustomerStatement(result: unknown): unknown {
  if (!isRecord(result)) return { code: 200, data: [], message: 'ok' };
  const orders = Array.isArray(result.orders) ? result.orders : [];
  const payments = Array.isArray(result.payments) ? result.payments : [];
  const adjustments = Array.isArray(result.adjustments) ? result.adjustments : [];
  // Build lookup maps for payment / adjustment rows
  const foMap = new Map<unknown, { orderNo: string; address: string }>();
  const orderNoMap = new Map<string, string>();
  const receiptToDocNo = new Map<string, string>();
  for (const fo of orders) {
    if (!isRecord(fo)) continue;
    const linkedOrder = isRecord(fo.order) ? fo.order : {};
    const specs = parseJsonRecord(linkedOrder.doorSpecs);
    const customerInfo = parseJsonRecord(specs.customerInfo);
    const addr = String(customerInfo['安装地址'] ?? customerInfo['地址'] ?? '');
    // Best-effort 单号: scan all door rows, then 单号集
    const allLineNos = new Set<string>();
    for (const key of ['ping_hui', 'diao_hui']) {
      const arr = Array.isArray(specs[key]) ? specs[key] : [];
      for (const row of arr) {
        if (!isRecord(row)) continue;
        const n = String((row as Record<string,unknown>)['单号'] || '').trim();
        if (n) allLineNos.add(n);
      }
    }
    const firstLineNo = [...allLineNos][0] || '';
    const fallbackNo = String((customerInfo['单号集'] as string) || '').trim();
    const docNo = firstLineNo || fallbackNo;
    foMap.set(fo.id, { orderNo: docNo, address: addr });
    if (docNo && !orderNoMap.has(docNo)) {
      orderNoMap.set(docNo, addr);
    }
    const receiptNo = String(fo.orderNo ?? '');
    if (receiptNo && docNo && !receiptToDocNo.has(receiptNo)) {
      receiptToDocNo.set(receiptNo, docNo);
    }
  }

  const orderRows = orders
    .filter(isRecord)
    .filter((order) => isRecord(order.order))
    .map((order) => {
      const linkedOrder = isRecord(order.order) ? order.order : {};
      const specs = parseJsonRecord(linkedOrder.doorSpecs);
      const customerInfo = parseJsonRecord(specs.customerInfo);
      const allLineNos = new Set<string>();
      for (const key of ['ping_hui', 'diao_hui']) {
        const arr = Array.isArray(specs[key]) ? specs[key] : [];
        for (const row of arr) {
          if (!isRecord(row)) continue;
          const n = String((row as Record<string,unknown>)['单号'] || '').trim();
          if (n) allLineNos.add(n);
        }
      }
      const firstLineNo = [...allLineNos][0] || '';
      const fallbackNo = String((customerInfo['单号集'] as string) || '').trim();
      return {
        '单据号': firstLineNo || fallbackNo,
        '备注': linkedOrder.notes ?? customerInfo['订单备注'] ?? '',
        '安装地址': customerInfo['安装地址'] ?? customerInfo['地址'] ?? '',
        '收款方式': null,
        '日期': dateText(linkedOrder.orderDate ?? customerInfo['日期']),
        '类型': '订单',
        '金额': numberValue(linkedOrder.totalAmount ?? customerInfo['总价'] ?? order.allocatedAmount),
      };
    });
  const paymentRows = payments.filter(isRecord).map((payment) => {
    const fo = foMap.get(payment.financeOrderId);
    return {
      '单据号': fo?.orderNo ?? '',
      '备注': payment.notes ?? '',
      '安装地址': fo?.address ?? '',
      '收款方式': payment.paymentMethod ?? null,
      '日期': dateText(payment.paymentDate),
      '类型': '收款',
      '金额': numberValue(payment.amount),
    };
  });
  const adjustmentRows = adjustments.filter(isRecord).map((adjustment) => {
    const fo = (adjustment as Record<string, unknown>).orderNo
      ? orderNoMap.get((adjustment as Record<string, unknown>).orderNo as string)
      : undefined;
    const adjOrderNo = (adjustment as Record<string, unknown>).orderNo as string | undefined;
    const adjDocNo = adjOrderNo ? (receiptToDocNo.get(adjOrderNo) || adjOrderNo) : '';
    return {
      '单据号': adjDocNo,
      '备注': adjustment.notes ?? '',
      '安装地址': fo ?? '',
      '收款方式': null,
      '日期': dateText(adjustment.createdAt),
      '类型': adjustment.adjustType ?? '调整',
      '金额': numberValue(adjustment.adjustAmount),
    };
  });
  return { code: 200, data: [...orderRows, ...paymentRows, ...adjustmentRows], message: 'ok' };
}

async function registerHandlers() {
  // Auth
  const authServ = await import('./auth/auth.service');
	HANDLER_MAP['login'] = async (p) => {
		const isCustomerQrLogin = /^\d+af\d+$/.test(String(p.param3 || ''));
		const result = isCustomerQrLogin
			? [await authServ.loginCustomerQr(p.ds, p.param3).then(entry => {
				if (!entry) throw Object.assign(new Error('用户名或密码错误'), { statusCode: 401 });
				return entry;
			})]
			: await authServ.login(p.ds, p.param3);
		return result.map(entry => ({
			registrant: 'registrant' in entry ? entry.registrant : undefined,
			statu: entry.statu,
			token: entry.token,
			token_expires_at: entry.token_expires_at,
			userinfo: {
				defaulted: entry.userinfo.defaulted,
				ds: entry.userinfo.ds,
        name: entry.userinfo.name,
        registrant: entry.userinfo.registrant,
        sync: entry.userinfo.sync,
      },
    }));
  };
  HANDLER_MAP['change_password'] = (p) => authServ.changePassword(p.ds, p.param3, p.param4);
  HANDLER_MAP['getuserconfig'] = (p) => authServ.getUserConfig(p.ds);
	HANDLER_MAP['getprocedures'] = async (p) => {
		const procedures = await authServ.getProcedures(p.ds);
		return procedures;
	};
	HANDLER_MAP['checkclientdevicelicense'] = async () => ({
		code: 200,
		allowed: true,
		message: 'ok',
HANDLER_MAP['checkelectrondevicelicense'] = async () => ({
		code: 200,
		allowed: true,
		message: 'ok',
	});
	});

	// Client
  const clientServ = await import('./client/client.service');
  HANDLER_MAP['getclientsinfo'] = (p) => clientServ.getClients(p.ds);
  HANDLER_MAP['getlatestclientsinfo'] = (p) => {
    if (p.param3 === '1') return Promise.resolve([]);
    return clientServ.getLatestClients(p.ds, p.param3 || undefined);
  };
  HANDLER_MAP['checkclient'] = (p) => {
    if (!p.param3 || !p.param4) return Promise.resolve({ __statusCode: 400, code: 400, message: '缺少必要参数' });
    return clientServ.checkClient(p.ds, p.param3, p.param4).then(data => ({ code: 200, data }));
  };
  HANDLER_MAP['makereceipt'] = async (p) => {
    const result = await clientServ.makeReceipt(p.ds, p.body as Record<string, unknown>);
    return { code: 200, data: result, message: '录入成功' };
  };
  HANDLER_MAP['updatecustomerinfo'] = (p) => {
    // Flask: when param3+param5 provided, build data from query params
    const data = (p.body && typeof p.body === 'object' && Object.keys(p.body as Record<string, unknown>).length > 0)
      ? (p.body as Record<string, unknown>)
      : {};
    if (p.param3 && p.query.param5) {
      data[p.param3] = p.param4;
      data['client_code'] = p.query.param5;
    }
    return clientServ.updateCustomer(p.ds, data);
  };
  HANDLER_MAP['updateclientsinfo'] = (p) => {
    if (!hasBodyKeys(p.body) && !p.param3) {
      if (isRawAction(p, 'updateClientInfo', 'updateClientsInfo')) return Promise.resolve(badRequestPayload());
      return Promise.resolve(html500Payload());
    }
    const data = (p.body && typeof p.body === 'object' && Object.keys(p.body as Record<string, unknown>).length > 0)
      ? (p.body as Record<string, unknown>)
      : {};
    if (p.param3 && p.query.param5) {
      data[p.param3] = p.param4;
      data['client_code'] = p.query.param5;
    }
    return clientServ.updateCustomer(p.ds, data);
  };
  HANDLER_MAP['updateclientinfo'] = HANDLER_MAP['updateclientsinfo'];
  HANDLER_MAP['deleteclientinfo'] = (p) => {
    if (!p.param3 || p.param3.startsWith('__missing_')) return Promise.resolve({
      __statusCode: 500,
      code: 500,
      message: `删除失败: (mysql.connector.errors.DataError) 1292 (22007): Truncated incorrect DOUBLE value: '${p.param3 || ''}'\n[SQL: DELETE FROM \`客户信息\` WHERE \`编号\` = %(id)s]\n[parameters: {'id': '${p.param3 || ''}'}]\n(Background on this error at: https://sqlalche.me/e/20/9h9h)`,
    });
    return clientServ.deleteClient(p.ds, p.param3 || '');
  };

  // Order
  const orderServ = await import('./order/order.service');
  HANDLER_MAP['getorders'] = async (p) => {
    const body = p.body;
    const refs = Array.isArray(body)
      ? body.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      : [];
    if (refs.length === 0) {
      if (isRawAction(p, 'getOrders')) return { __statusCode: 400, code: 400, message: 'bad request' };
      return { __statusCode: 500, __html: true, message: LEGACY_HTML_500 };
    }
    const result = await orderServ.getOrders(p.ds, body);
    const data = result && typeof result === 'object' && !Array.isArray(result)
      ? (result as Record<string, unknown>).data
      : undefined;
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length === 0) {
      return { __statusCode: 500, __html: true, message: LEGACY_HTML_500 };
    }
    return result;
  };
  HANDLER_MAP['gettabledata'] = async (p) => projectTableData(await orderServ.getTableData(p.ds, p.query.keyword || p.param3, p.query.address || p.param4, p.query.startDate, p.query.endDate));
  HANDLER_MAP['gettabledataforterminal'] = (p) => orderServ.getTableDataForTerminal(p.ds, p.query.clientId || '0');
  HANDLER_MAP['getmoreorders'] = (p) => orderServ.getMoreOrders(p.ds, p.param3 || '', parseInt(p.query.page || '1'), parseInt(p.query.perPage || '50'));
  HANDLER_MAP['detail'] = (p) => orderServ.getDetail(p.ds, p.param3 || '');
  HANDLER_MAP['combine'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 400, message: '缺少合并数据或回执单号' });
    return orderServ.combine(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['deletehui'] = (p) => {
    if (p.req.method === 'POST' && Array.isArray(p.body)) {
      return orderServ.deleteRows(p.ds, p.body as string[]);
    }
    if (!p.param3 || p.param3.startsWith('__missing_')) return Promise.resolve(html500Payload());
    return orderServ.deleteRow(p.ds, p.param3 || '');
  };
  HANDLER_MAP['deleterow'] = HANDLER_MAP['deletehui'];
  HANDLER_MAP['updaterowdata'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ __statusCode: 400, code: 400, message: 'No data provided' });
    return orderServ.updateRow(p.ds, ((p.body as Record<string, unknown>)?.id as string) || '', p.body as Record<string, unknown>);
  };
  HANDLER_MAP['getmoretabledate'] = async (p) => projectTableData(await orderServ.getTableData(p.ds, p.param3 || '', p.param4 || '', p.query.startDate, p.query.endDate));

  // Progress
  const progServ = await import('./progress/progress.service');
  HANDLER_MAP['getprogress'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getprogressdata'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getprogresslist'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getproductionprogress'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getproductionprogressdata'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getprogressforterminal'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, p.param3 || undefined));
  HANDLER_MAP['getmoreprogress'] = async (p) => projectProgressData(await progServ.getProgress(p.ds, undefined));
  HANDLER_MAP['getlabeldata'] = (p) => {
    const refs = Array.isArray(p.body)
      ? (p.body as unknown[]).map(item => String(item || '')).filter(Boolean)
      : (p.param3 ? [p.param3] : []);
    return progServ.getLabelData(p.ds, refs);
  };
  HANDLER_MAP['getscanqrcode'] = (p) => progServ.getScanQrCode(p.ds, p.param3 ? [p.param3] : []);
  HANDLER_MAP['getprocesscounts'] = (p) => progServ.getProcessCounts(p.ds, p.param3 || undefined, p.param4 || undefined);
  HANDLER_MAP['updataprogress'] = (p) => {
    if (!p.param3 || !Array.isArray(p.body) || (p.body as unknown[]).length === 0) {
      if (isRawAction(p, 'updateProgress')) return Promise.resolve(badRequestPayload());
      return Promise.resolve(html500Payload());
    }
    if (isRawAction(p, 'updataProgress') && !isProcedureSlot(p.param3)) {
      return progServ.updatePrintStatus(p.ds, p.param3, p.body as string[], p.param4 || '');
    }
    if (isRawAction(p, 'updataProgress') && p.param3 === '工序10' && p.param4) {
      return progServ
        .updateProgress(p.ds, p.param3, p.body as string[], p.param4 || '')
        .then(result => progServ.updatePrintStatus(p.ds, p.param4, p.body as string[]).then(() => result));
    }
    return progServ.updateProgress(p.ds, p.param3, p.body as string[], p.param4 || '');
  };
  HANDLER_MAP['paymentcollection'] = (p) => {
    if (!p.param3) return Promise.resolve(html500Payload());
    return progServ.updatePaymentCollection(p.ds, p.param3, p.param4);
  };
  HANDLER_MAP['updatepaymentcollection'] = (p) => {
    if (!p.param3) {
      if (isRawAction(p, 'updatePaymentCollection', 'updatePayment')) return Promise.resolve(badRequestPayload());
      return Promise.resolve(html500Payload());
    }
    return progServ.updatePaymentCollection(p.ds, p.param3, p.param4);
  };
  HANDLER_MAP['updatapaymentcollection'] = HANDLER_MAP['updatepaymentcollection'];
  HANDLER_MAP['updatepayment'] = HANDLER_MAP['updatepaymentcollection'];
  HANDLER_MAP['deleteprogress'] = (p) => {
    if (!p.param3 && (!Array.isArray(p.body) || (p.body as unknown[]).length === 0)) {
      if (isRawAction(p, 'clearProgress')) return Promise.resolve(badRequestPayload());
      return Promise.resolve(html500Payload());
    }
    if (p.param3 && p.param4) {
      return progServ.deleteProgressCell(p.ds, p.param3, p.param4, p.query.param5 || undefined);
    }
    if (p.param3 && !isProcedureSlot(p.param3) && Array.isArray(p.body) && (p.body as unknown[]).length > 0) {
      return progServ.deletePrintStatus(p.ds, p.param3, p.body as string[]);
    }
    return progServ.deleteProgress(p.ds, p.param3 || undefined, (p.body as string[]) || []);
  };
  HANDLER_MAP['deleteprogressforfullorder'] = HANDLER_MAP['deleteprogress'];
  HANDLER_MAP['clearprogress'] = HANDLER_MAP['deleteprogress'];
  HANDLER_MAP['setprocedures'] = (p) => {
    const body = (p.body && typeof p.body === 'object' ? p.body : {}) as Record<string, unknown>;
    const data = body['procedures'] ?? body;
    if (!hasBodyKeys(data)) return Promise.resolve({ code: 400, data: null, message: '缺少提交数据' });
    return progServ.setProcedures(p.ds, data);
  };

  // Finance
  const financeServ = await import('./finance/finance.service');
  HANDLER_MAP['finance_checksystem'] = (p) => financeServ.checkSystem(p.ds);
  HANDLER_MAP['finance_getorderfinancesummary'] = (p) => financeServ.getOrderSummary(p.ds);
  HANDLER_MAP['finance_checkorderpayment'] = (p) => {
    if (!Array.isArray(p.body) || (p.body as unknown[]).length === 0) {
      return Promise.resolve(legacyError(400, '请求体为空或格式错误'));
    }
    return financeServ.checkOrderPayment(p.ds, p.body as string[]);
  };
  HANDLER_MAP['finance_addpayment'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少 ds/客户编号/收款金额/收款日期'));
    return financeServ.addPayment(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_addorderpayment'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少必要参数'));
    return financeServ.addOrderPayment(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_addcustomeradjustment'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少必要参数'));
    return financeServ.addCustomerAdjustment(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_updateordercustomer'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少必要参数'));
    return financeServ.updateOrderCustomer(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_addorderadjustment'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少必要参数'));
    return financeServ.addOrderAdjustment(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_getpaymentstats'] = (p) => financeServ.getPaymentStats(p.ds, p.param3 || undefined);
  HANDLER_MAP['finance_getcustomerstatement'] = async (p) => {
    const customerId = p.param3?.startsWith('__missing_') ? undefined : (p.param3 || undefined);
    const result = await financeServ.getCustomerStatement(p.ds, customerId, p.param4 || undefined);
    if (result && typeof result === 'object' && !Array.isArray(result) && 'data' in (result as Record<string, unknown>)) return result;
    if (result && typeof result === 'object' && !Array.isArray(result)) return projectCustomerStatement(result);
    return { code: 200, data: [], message: 'ok' };
  };
  HANDLER_MAP['finance_getorderdetail'] = async (p) => {
    const result = await financeServ.getOrderDetail(p.ds, p.param3 || '');
    if ((result as Record<string, unknown>)?.data === null) {
      return { __statusCode: 404, code: 404, data: null, message: '订单不存在' };
    }
    return result;
  };
  HANDLER_MAP['finance_getcustomerbalance'] = async (p) => {
    const result = await financeServ.getCustomerBalance(p.ds, p.param3 || undefined, p.param4 || undefined);
    if ((result as Record<string, unknown>)?.code === 500) return { __statusCode: 500, ...(result as Record<string, unknown>) };
    if ((result as Record<string, unknown>)?.data === null) {
      return { __statusCode: 500, code: 500, data: null, message: '客户不存在' };
    }
    return result;
  };
  HANDLER_MAP['finance_previewallocation'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少 ds / 客户编号 / 收款金额'));
    return financeServ.previewAllocation(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_previewprepaymentallocation'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少 ds/客户编号/分配金额'));
    return financeServ.previewPrepaymentAllocation(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['finance_executeprepaymentallocation'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(legacyError(400, '缺少 ds/客户编号/分配金额'));
    return financeServ.executePrepaymentAllocation(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['clearselectedorders'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(badRequestPayload());
    return financeServ.clearSelectedOrders(p.ds, p.body as Record<string, unknown>);
  };

  // Settings
  const settingsServ = await import('./settings/settings.service');
  HANDLER_MAP['checkversionapp'] = async () => settingsServ.getVersionInfo();
  HANDLER_MAP['getaddprice'] = (p) => settingsServ.getAddPrice(p.ds);
  HANDLER_MAP['addaddprice'] = async (p) => projectAddPrice(await settingsServ.addAddPrice(p.ds, p.body as Record<string, unknown>));
  HANDLER_MAP['editprice'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ __statusCode: 400, code: 400, message: '缺少必要参数（before/after）' });
    return settingsServ.editAddPrice(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['deleteaddprice'] = async (p) => {
    if (!hasBodyKeys(p.body) && !p.param3) return { __statusCode: 400, code: 400, message: '缺少必要参数（name/price/unit）' };
    return projectAddPrice(await settingsServ.deleteAddPrice(
        p.ds,
        p.body && typeof p.body === 'object' && Object.keys(p.body as Record<string, unknown>).length > 0
          ? p.body as Record<string, unknown>
          : p.param3 || '',
      ));
  };
  HANDLER_MAP['changedecleration'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 400, data: null, message: '缺少声明内容（declaration ）' });
    return settingsServ.changeDecleration(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['glasshole'] = async (p) => {
    // POST = save (even with empty body, matching Flask)
    if (p.req.method === 'POST') {
      const body = (p.body && typeof p.body === 'object' ? p.body : {}) as Record<string, unknown>;
      let inner = body;
      for (const key of ['挖孔图', '玻璃孔', 'glassHole', 'glass_hole', 'data']) {
        if (body[key] && typeof body[key] === 'object') { inner = body[key] as Record<string, unknown>; break; }
      }
      await settingsServ.saveGlassHole(p.ds, inner);
      return { code: 200, message: '保存成功' };
    }
    return settingsServ.getGlassHoles(p.ds);
  };
  HANDLER_MAP['deleteglasshole'] = (p) => settingsServ.deleteGlassHole(p.ds, p.param3 || '');
  HANDLER_MAP['drawingbehaviors'] = (p) => settingsServ.drawingBehaviorsSet(p.ds, p.body as Record<string, unknown>);
  HANDLER_MAP['changesquare'] = (p) => {
    if (!hasBodyKeys(p.body)) {
      if (isRawAction(p, 'changSquare')) return Promise.resolve(badRequestPayload());
      return Promise.resolve(html500Payload());
    }
    return settingsServ.changeSquare(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['changedirectionmode'] = (p) => {
    if (!p.param3) return Promise.resolve(html500Payload());
    return settingsServ.changeDirectionMode(p.ds, p.param3 || '');
  };
  HANDLER_MAP['reversedirection'] = (p) => {
    return settingsServ.reverseDirection(p.ds);
  };
  HANDLER_MAP['savecustomdirectionnames'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 404, data: null, message: '配置文件不存在' });
    return settingsServ.saveCustomDirectionNames(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['clearaccount'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 400, message: '没有需要清账的数据' });
    return settingsServ.clearAccount(p.ds);
  };
  HANDLER_MAP['registrantuser'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve(badRequestPayload());
    return settingsServ.createUser(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['getparametricpatterns'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['getparametricpattern'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['parametric-patterns'] = async (p) => ({ templates: await settingsServ.getParametricPatterns(p.ds) });
  HANDLER_MAP['parametric_patterns'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['parametricpatterns'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['parametricpattern'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['patterns'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['getpatterns'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['getpattern'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['doorflowers'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['doorflower'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['getdoorflowers'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['getdoorflower'] = (p) => settingsServ.getParametricPatterns(p.ds);
  HANDLER_MAP['upsertparametricpattern'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 200, data: { id: 'smartdoor' }, message: 'ok(updated)' });
    return settingsServ.upsertParametricPattern(p.ds, p.body as Record<string, unknown>);
  };
  HANDLER_MAP['deleteparametricpattern'] = (p) => {
    if (!p.param3 || p.param3.startsWith('__missing_')) return Promise.resolve(html500Payload());
    return settingsServ.deleteParametricPattern(p.ds, p.param3 || '');
  };

  // File
  const fileServ = await import('./file/file.service');
  HANDLER_MAP['getimage'] = async (p) => {
    const imageId = p.rawParam2 || p.param3 || p.param4 || '';
    const imageDs = p.param3 || p.ds;
    const result = await fileServ.getImage(imageId, imageDs);
    return result || { __statusCode: 404, code: 404, message: '图片不存在' };
  };
  HANDLER_MAP['saveimage'] = async (p) => {
    const files = (p.req as any).files || [];
    const file = files[0];
    if (!file) return html500Payload();
    const ext = file.originalname?.toLowerCase() || '';
    if (!ext.endsWith('.png') && !ext.endsWith('.jpg') && !ext.endsWith('.jpeg')) {
      throw new Error('仅支持PNG/JPG/JPEG格式图片');
    }
    const imageId = (p.query.id || (p.body as any)?.id || '').toString();
    const series = (p.query.series || (p.body as any)?.series || '').toString();
    const body = {
      id: imageId,
      series,
      ...(typeof p.body === 'object' && p.body !== null ? p.body as Record<string, unknown> : {}),
    };
    const result = await fileServ.saveImage(p.ds, body, file, p.param3 || p.ds);
    return { code: 200, data: result, message: '图片保存成功' };
  };
  HANDLER_MAP['deleteimage'] = (p) => {
    if (!p.param3 || p.param3.startsWith('__missing_')) return Promise.resolve(html500Payload());
    return fileServ.deleteImage(
      p.param3 || '',                           // image_id (from param3)
      p.ds || '',                                // ds (image namespace, from param2)
      p.param4 || '',                            // related_id (from param4)
      p.query.param5 || ''                       // order_ds (from query param5)
    );
  };
  HANDLER_MAP['gettemplates'] = (p) => fileServ.getTemplates(p.ds);
  HANDLER_MAP['getupdatainfo'] = (p) => fileServ.getUpdateInfo(p.ds);

  // Formula
  const formulaServ = await import('./formula/formula.service');
  HANDLER_MAP['getdiaoformulas'] = (p) => {
    const body = (p.body && typeof p.body === 'object' ? p.body : {}) as Record<string, unknown>;
    if (body.formula || body['formula[]'] || body.id || body['id[]']) {
      return formulaServ.getDiaoFormulasSingle(p.ds, body, p.param3 || p.ds);
    }
    if (!p.param3) return Promise.resolve({});
    return formulaServ.getDiaoFormulas(p.ds, [p.param3]);
  };
  HANDLER_MAP['getdiaoformulassingle'] = (p) => formulaServ.getDiaoFormulasSingle(p.ds, p.body as Record<string, unknown>, p.param3 || p.ds);
  HANDLER_MAP['initializdiao'] = (p) => formulaServ.initializDiao(p.ds);
  HANDLER_MAP['initializping'] = (p) => formulaServ.initializPing(p.ds);
  HANDLER_MAP['getformulas'] = (p) => formulaServ.getFormulas(p.ds, p.param3 || '');
  HANDLER_MAP['getformulaname'] = (p) => formulaServ.getFormulaName(p.ds);
  HANDLER_MAP['getdiaoprice'] = (p) => formulaServ.getDiaoPrice(p.ds);
  HANDLER_MAP['getpingprice'] = (p) => formulaServ.getPingPrice(p.ds);
  HANDLER_MAP['saveformula'] = async (p) => {
    await formulaServ.saveFormula(p.ds, p.body as Record<string, unknown>);
    return { code: 200, message: '保存成功' };
  };
  HANDLER_MAP['deleteformula'] = (p) => {
    if (!p.param3 || p.param3.startsWith('__missing_')) return Promise.resolve({ code: 404, message: '指定的公式不存在' });
    return formulaServ.deleteFormula(p.ds, { formulaId: p.param3 || '' });
  };
  HANDLER_MAP['queryformula'] = async (p) => {
    const result = await formulaServ.queryFormula(p.ds, p.body as Record<string, unknown>, p.param3 || '');
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const keys = Object.keys(result as Record<string, unknown>).filter(key => key !== 'images');
      if (keys.length === 0) return { code: 404, message: '指定的公式不存在' };
    }
    return result;
  };

  // Scanner
  const scannerServ = await import('./scanner/scanner.service');
  HANDLER_MAP['addscanner'] = (p) => {
    if (!p.param3 || !p.param4 || !p.param5) return Promise.resolve(badRequestPayload());
    return scannerServ.addScanner(p.ds, {
      registrant: p.param3,
      username: p.param4,
      password: p.param5,
    });
  };
  HANDLER_MAP['deletescanner'] = (p) => {
    if (!p.param3) return Promise.resolve(html500Payload());
    return scannerServ.deleteScanner(p.ds, p.param3 || '');
  };
  HANDLER_MAP['setprinters'] = (p) => {
    if (!hasBodyKeys(p.body)) return Promise.resolve({ code: 400, data: null, message: '缺少提交数据' });
    return scannerServ.setPrinters(p.ds, p.body as Record<string, unknown>);
  };

  // Shortlink
  const shortlinkServ = await import('./shortlink/shortlink.service');
  HANDLER_MAP['shortlink_create'] = (p) => shortlinkServ.create(hasBodyKeys(p.body) ? JSON.stringify(p.body) : undefined);
  HANDLER_MAP['shortlink_get'] = async (p) => {
    const result = await shortlinkServ.get(p.param3 || p.ds || '');
    if (!result || ((result as Record<string, unknown>)?.code === 404)) {
      return { __statusCode: 500, __html: true, message: LEGACY_HTML_500 };
    }
    return result;
  };
}

export async function legacyDispatch(req: Request, res: Response): Promise<void> {
  try {
    const param1 = req.query.param1 as string || (req.body as Record<string, unknown>)?.param1 as string || '';
    if (!param1) {
      res.status(500).send('Missing param1');
      return;
    }

    const actionKey = ACTION_MAP[param1] || '';
    if (!actionKey) {
      res.status(404).json({ code: 404, message: `未知接口: ${param1}` });
      return;
    }

    const handler = await getHandler(actionKey);
    if (!handler) {
      res.status(404).json({ code: 404, message: `未知的param1: ${param1}` });
      return;
    }

    const contract = LEGACY_CONTRACTS[actionKey] || {};
    if (contract.methods && !contract.methods.includes(req.method)) {
      sendLegacyHtml500(res);
      return;
    }
    if (contract.html500) {
      sendLegacyHtml500(res);
      return;
    }
    if (contract.badRequest) {
      res.status(400).json({ code: 400, message: 'bad request' });
      return;
    }
    if (contract.staticResponse !== undefined) {
      if (contract.staticStatus) res.status(contract.staticStatus);
      res.json(contract.staticResponse);
      return;
    }

    const bodyRecord = (req.body && typeof req.body === 'object' && !Array.isArray(req.body))
      ? req.body as Record<string, unknown>
      : {};
    const rawDs = (req.query.param2 as string) || bodyRecord.param2 as string || bodyRecord.ds as string || '';

    const params: HandlerParams = {
      rawAction: param1,
      rawParam2: (req.query.param2 as string) || bodyRecord.param2 as string || '',
      ds: rawDs,
      param3: (req.query.param3 as string) || (req.body as Record<string, unknown>)?.param3 as string || '',
      param4: (req.query.param4 as string) || (req.body as Record<string, unknown>)?.param4 as string || '',
      param5: (req.query.param5 as string) || (req.body as Record<string, unknown>)?.param5 as string || '',
      body: req.body,
      query: req.query as Record<string, string>,
      req,
    };

    const missingParam = missingRequiredParam(contract, params);
    if (missingParam) {
      if ((contract.missingStatus || 400) >= 500) {
        sendLegacyHtml500(res);
      } else {
        res.status(contract.missingStatus || 400).json({ code: contract.missingStatus || 400, message: contract.missingMessage || `缺少 ${missingParam}` });
      }
      return;
    }

    const { statusCode, body } = extractLegacyStatus(applyLegacyContract(actionKey, await handler(params)));
    if (statusCode) res.status(statusCode);
    if (body && typeof body === 'object' && !Array.isArray(body) && (body as Record<string, unknown>).__html) {
      res.type('text/html; charset=utf-8').send((body as Record<string, unknown>).message);
      return;
    }
    if (body && typeof body === 'object' && !Array.isArray(body) && Buffer.isBuffer((body as Record<string, unknown>).buffer)) {
      const binary = body as { buffer: Buffer; contentType?: string };
      res.type(binary.contentType || 'application/octet-stream').send(binary.buffer);
      return;
    }
    res.json(body);
  } catch (err) {
    const msg = (err as Error).message || '服务器内部错误';
    console.error('Legacy dispatch error:', msg);
    res.status(200).json({ code: 400, message: msg });
  }
}

function sendLegacyHtml500(res: Response): void {
  res.status(500).type('text/html; charset=utf-8').send(LEGACY_HTML_500);
}

function projectAddPrice(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const item = value as Record<string, unknown>;
  if ('code' in item || ('message' in item && !('name' in item))) return value;
  // Handle delete result: deletedCount === 0 means nothing was deleted
  if ('deletedCount' in item && Number(item.deletedCount) === 0) {
    return { code: 404, message: '未找到匹配的加价项目' };
  }
  if (item.found === false) {
    return { code: 404, message: String(item.message || '未找到匹配的加价项目') };
  }
  return {
    direction: item.direction ?? '',
    lockway: item.lockway ?? '',
    name: item.name ?? item['名称'] ?? '',
    price: item.price ?? 0,
    remark: item.remark ?? '',
    unit: item.unit ?? '',
  };
}

/** Map English Prisma field names to Chinese field names for frontend compatibility */
function mapResponseFields(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(item => mapResponseFields(item));
  }
  if (!data || typeof data !== 'object') return data;

  const obj = data as Record<string, unknown>;

  // Recurse into nested 'data' arrays (e.g. {data: [...], total: N})
  if ('data' in obj && Array.isArray(obj['data'])) {
    const mapped = { ...obj };
    mapped['data'] = obj['data'].map(item => mapResponseFields(item));
    return mapped;
  }

  const hasEnglishFields = Object.keys(obj).some(k => ['name','phone','clientCode','customerName','orderNo','procedureName','databaseName','createdAt'].includes(k));
  if (!hasEnglishFields) return data;

  // Build new object with ONLY Chinese field names + non-mapped fields
  const engToCn: Record<string, string> = {
    name: '客户', phone: '电话', clientCode: '编号',
    brand: '品牌', address: '地址', contactPerson: '联系人',
    logisticsProvider: '物流商', logisticsPhone: '物流电话',
    deliveryPhone: '送货电话', householdRegistration: '客户户籍',
    customerName: '客户', orderNo: '回执单号',
    orderDate: '日期', deliveryDate: '截止日期', doorType: '门类型',
    doorCount: '门数', doorSpecs: '门扇信息', operatorName: '打单人',
    salesperson: '业务员', formulaData: '公式数据', notes: '备注',
    totalAmount: '总价', paidAmount: '已付', unpaidAmount: '未付',
    // production doesn't return created_at/updated_at/ds
    procedureName: '工序名称', procedureStatus: '工序状态',
    completedAt: '完成日期', amount: '收款金额', paymentDate: '收款日期',
    paymentMethod: '收款方式', allocatedAmount: '已分配金额',
    orderAdjustTotal: '订单调整金额', prepaidBalance: '预付款余额',
    totalTopup: '累计充值', totalSpent: '累计消费',
    monthTag: 'month', statusText: 'statusText',
    scannerType: 'scannerType', templateType: 'template_type',
  };

  // Map English → Chinese, skip English keys
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    // Skip known English fields that have Chinese equivalents
    if (key in engToCn && !result[engToCn[key]]) {
      result[engToCn[key]] = key === 'clientCode' && typeof val === 'string' && /^\d+$/.test(val) ? Number(val) : val;
    } else if (!(key in engToCn) && key !== 'id' && key !== 'clientId' && key !== 'orderId' && key !== 'financeOrderId' && !key.endsWith('At') && !key.startsWith('_')) {
      // Keep non-mapped fields that match production (formulaid, imageUrl, etc.)
      if (!['id','clientId','orderId','financeOrderId','createdAt','updatedAt','databaseName'].includes(key)) {
        result[key] = val;
      }
    }
  }

  // Map name to fallback aliases (only if 客户 not already present - avoid client dupes)
  if ('name' in obj && !('客户' in result)) {
    result['名称'] = obj['name'];
    result['materialName'] = obj['name'];
  }

  // Special handling for order fields
  if ('orderNo' in obj) {
    result['回执单号'] = obj.orderNo;
  }
  if ('customerName' in obj) {
    result['客户'] = obj.customerName;
  }

  return result;
}
