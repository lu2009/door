/**
 * Chinese ↔ English field-name maps and request-projection helpers.
 *
 * These are adapter-layer concerns: translating legacy request bodies into
 * canonical field names.  Currently only client.service.ts imports from here;
 * the goal is to move the extractClientData / extractOrderData calls up into
 * route handlers so that this import can be deleted entirely.
 *
 * When every caller has been migrated to send canonical names, this entire
 * file can be deleted.
 */
import { safeLoads } from './helpers';
import { firstPresent, firstNonBlank, asRecordArray } from './record-helpers';

// ── Field-name maps ──

export const CLIENT_FIELD_MAP: Record<string, string> = {
  '名称': 'name', '客户': 'name', '客户名称': 'name',
  'customer': 'name', '客户名': 'name', 'client': 'name',
  '品牌': 'brand', '地址': 'address', '电话': 'phone',
  '联系电话': 'phone', '联系人': 'contactPerson',
  '物流': 'logisticsProvider', '物流商': 'logisticsProvider',
  '物流电话': 'logisticsPhone', '送货电话': 'deliveryPhone',
  '户籍': 'householdRegistration', '客户户籍': 'householdRegistration',
  '客户编号': 'clientCode', '编号': 'clientCode',
  'contact_person': 'contactPerson', 'logistics_provider': 'logisticsProvider',
  'logistics_phone': 'logisticsPhone', 'delivery_phone': 'deliveryPhone',
  'household_registration': 'householdRegistration',
  'client_code': 'clientCode', 'customer_name': 'name', 'customerName': 'name',
};

export const ORDER_FIELD_MAP: Record<string, string> = {
  '回执单号': 'orderNo', 'order_no': 'orderNo', 'orderNo': 'orderNo',
  '客户名称': 'customerName', 'customer_name': 'customerName',
  '客户品牌': 'brand', '品牌': 'brand',
  '日期': 'orderDate', '订单日期': 'orderDate', 'order_date': 'orderDate',
  '截止日期': 'deliveryDate', '交货日期': 'deliveryDate', 'delivery_date': 'deliveryDate',
  '门类型': 'doorType', 'door_type': 'doorType',
  '门扇数': 'doorCount', 'door_count': 'doorCount',
  '门扇信息': 'doorSpecs', 'door_specs': 'doorSpecs',
  '操作员': 'operatorName', 'operator_name': 'operatorName',
  '业务员': 'salesperson',
  '公式数据': 'formulaData', 'formula_data': 'formulaData',
  '备注': 'notes', '订单备注': 'notes',
  '总金额': 'totalAmount', '总价': 'totalAmount', 'total_amount': 'totalAmount',
  '已付金额': 'paidAmount', '定金': 'paidAmount', 'paid_amount': 'paidAmount',
  '未付金额': 'unpaidAmount', 'unpaid_amount': 'unpaidAmount',
  '门数': 'doorCount',
};

export const INSTALL_ADDRESS_KEYS = ['安装地址', 'address', '地址'];

// ── Mapping helpers ──

export function mapFields(
  data: Record<string, unknown>,
  fieldMap: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (fieldMap[key] === undefined && !key.includes('_')) result[key] = val;
  }
  for (const [key, val] of Object.entries(data)) {
    const mapped = fieldMap[key];
    if (mapped) result[mapped] = val;
  }
  return result;
}

export function extractClientData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const mapped = mapFields(data, CLIENT_FIELD_MAP);
  if (!mapped.name) {
    const found = firstPresent(
      data['name'], data['名称'], data['客户'], data['客户名称'], data['customerName'],
    );
    if (found) mapped.name = found;
  }
  const validFields = [
    'name', 'brand', 'address', 'phone', 'contactPerson',
    'logisticsProvider', 'logisticsPhone', 'deliveryPhone',
    'householdRegistration', 'clientCode', 'id',
  ];
  for (const key of Object.keys(mapped)) {
    if (!validFields.includes(key)) delete mapped[key];
  }
  if (mapped.clientCode !== undefined && mapped.clientCode !== null) {
    mapped.clientCode = String(mapped.clientCode);
  }
  if (mapped.id !== undefined && mapped.id !== null && mapped.id !== '') {
    mapped.id = typeof mapped.id === 'number' ? mapped.id : Number(mapped.id);
  }
  return mapped;
}

export function extractOrderData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return mapFields(data, ORDER_FIELD_MAP);
}

// ── Receipt / progress projection ──

export function parseReceiptSpecs(body: Record<string, unknown>) {
  const specsRaw = body.doorSpecs ?? body.door_specs ?? body.门扇信息 ?? body;
  const specs = typeof specsRaw === 'string' ? safeLoads(specsRaw) : specsRaw;
  const source =
    specs && typeof specs === 'object'
      ? (specs as Record<string, unknown>)
      : {};
  const customerInfoRaw =
    source.customerInfo ?? source.customer_info ?? source.客户信息 ?? {};
  const customerInfo =
    customerInfoRaw &&
    typeof customerInfoRaw === 'object' &&
    !Array.isArray(customerInfoRaw)
      ? (customerInfoRaw as Record<string, unknown>)
      : {};
  const pingHui = asRecordArray(source.ping_hui ?? source.平开);
  const diaoHui = asRecordArray(source.diao_hui ?? source.吊滑);
  return {
    customerInfo,
    specs: source,
    rows: [...pingHui, ...diaoHui],
    pingHui,
    diaoHui,
  };
}

export function toProgressRow(
  row: Record<string, unknown>,
  customerInfo: Record<string, unknown>,
  orderNo: string,
  customerName: string | undefined,
) {
  return {
    ...row,
    '回执单号': firstNonBlank(row['回执单号'], customerInfo['回执单号'], orderNo),
    '单号': firstNonBlank(row['单号'], ''),
    '客户': firstNonBlank(row['客户'], customerInfo['客户'], customerName, ''),
    '客户编号': firstNonBlank(row['客户编号'], customerInfo['客户编号'], 0),
    '日期': firstNonBlank(row['日期'], customerInfo['日期']),
    '安装地址': firstNonBlank(row['安装地址'], customerInfo['安装地址'], customerInfo['地址']),
    '业务员': firstNonBlank(row['业务员'], customerInfo['业务员']),
    '备注': firstNonBlank(row['备注'], customerInfo['订单备注']),
    '套线金额': firstNonBlank(row['套线金额'], 0),
    '加价项目原始数据': firstNonBlank(row['加价项目原始数据'], 'null'),
    '封板高': firstNonBlank(row['封板高'], 0),
  };
}
