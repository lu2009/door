import { prisma } from '../../database';
import { createToken } from '../../utils/jwt';
import { verifyPassword, hashPassword } from '../../utils/crypto';
import { safeLoads } from '../../utils/helpers';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface LoginUser {
  id: number;
  username: string;
  databaseName: string;
  displayName: string;
  companyName: string;
  isDefaultPw: number;
  syncEnabled: number;
  proceduresData?: string | null;
  columnSettings?: string | null;
}

interface LoginResponseEntry {
  statu: number;
  token: string;
  token_expires_at: string;
  userinfo: {
    name: string;
    ds: string;
    registrant: string;
    defaulted: number;
    sync: number;
    token: string;
    procedures_data?: unknown;
    column_settings?: unknown;
  };
  registrant?: Record<string, unknown>;
}

interface CustomerLoginResponse {
  statu: number;
  token: string;
  token_expires_at: string;
  userinfo: {
    name: string;
    ds: string;
    registrant: string;
    defaulted: number;
    sync: number;
    token: string;
  };
}

function resolveQrDatabaseName(code: number): string | null {
  if (!Number.isInteger(code) || code < 1000) return null;
  return code === 1000 ? 'smartdoor' : `smartdoor${code - 1000}`;
}

function parseCustomerQrCredential(credential: string): { ds: string; clientCheck: number } | null {
  const match = String(credential || '').match(/^(\d+)af(\d+)$/);
  if (!match) return null;
  const ds = resolveQrDatabaseName(Number(match[1]));
  const clientCheck = Number(match[2]);
  if (!ds || !Number.isFinite(clientCheck)) return null;
  return { ds, clientCheck };
}

const DEFAULT_TEMPLATE_NAMES: Record<string, string> = {
  FinalReceipt: 'FinalReceipt',
  ReceiptList: 'ReceiptList',
  glass: 'glass',
  glassHole: 'glassHole',
  lable: 'lable',
  product: 'product',
  product1: 'product1',
  product2: 'product2',
  product3: 'product3',
  product4: 'product4',
  product5: 'product5',
  product6: 'product6',
  product7: 'product7',
  product8: 'product8',
  product9: 'product9',
  product10: 'product10',
  receipt: 'receipt',
};

const DEFAULT_TEMPLATE_COPY: Record<string, number> = Object.fromEntries(
  Object.keys(DEFAULT_TEMPLATE_NAMES).map(key => [key, 1]),
);

const DEFAULT_TEMPLATE_PAGESIZE: Record<string, string> = Object.fromEntries(
  Object.keys(DEFAULT_TEMPLATE_NAMES).map(key => [key, '']),
);

const DEFAULT_PING_COLUMN: Record<string, number> = {
  '五金': 1,
  '前包加长': 1,
  '单双丁': 1,
  '吊脚': 0,
  '后包加长': 1,
  '套线种类': 1,
  '封板高': 1,
  '平方数': 0,
  '开向模式': 1,
  '打折': 0,
  '洞尺': 1,
  '轨道种类': 0,
  '锁向': 1,
};

const DEFAULT_DIAO_COLUMN: Record<string, number> = {
  '五金': 0,
  '单双丁': 1,
  '封板高': 1,
  '打折': 1,
  '数量': 0,
  '洞尺': 1,
  '计价方式': 0,
};

function hasEntries(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

/**
 * Fetch registrant configuration from the database.
 * Assembles data from Setting records, column defaults, direction mode,
 * declaration text, and templates.
 */
async function loadSettingMap(ds: string): Promise<Record<string, string>> {
  if (!ds) return {};
  const settings = await prisma.setting.findMany({
    where: { databaseName: ds },
  });

  const settingMap: Record<string, string> = {};
  for (const s of settings) {
    settingMap[s.key] = s.value ?? '';
  }
  return settingMap;
}

async function buildRegistrantConfig(ds: string): Promise<Record<string, unknown>> {
  const settingMap = await loadSettingMap(ds);

  // Build response matching exact production format
  const result: Record<string, unknown> = {};

  // JSON-serialized settings keys (need parsing)
  const jsonKeys = new Set([
    'copy', 'custom_direction_names',
    'diao_column', 'diao_tabs', 'pagesize',
    'ping_column', 'ping_tabs', 'template',
    'direction_mode', 'column_defaults',
  ]);

  // Pass ALL settings to frontend (simple values + JSON-parsed)
  for (const [key, raw] of Object.entries(settingMap)) {
    if (jsonKeys.has(key)) {
      try { result[key] = safeLoads(raw); } catch { result[key] = raw; }
    } else {
      // Simple values (锁向, 开向模式, etc.) — try number, fallback to string
      const num = Number(raw);
      result[key] = isNaN(num) ? raw : num;
    }
  }

  // Ensure required keys exist with production defaults if missing
  if (!hasEntries(result['copy'])) result['copy'] = DEFAULT_TEMPLATE_COPY;
  if (!result['custom_direction_names']) result['custom_direction_names'] = {};
  if (!result['declaration']) result['declaration'] = '';
  if (!hasEntries(result['diao_column'])) result['diao_column'] = { ...DEFAULT_DIAO_COLUMN };
  if (!result['diao_tabs']) result['diao_tabs'] = { add: 1, add_2: 0, sheets: 1 };
  if (!hasEntries(result['pagesize'])) result['pagesize'] = DEFAULT_TEMPLATE_PAGESIZE;
  if (!hasEntries(result['ping_column'])) result['ping_column'] = { ...DEFAULT_PING_COLUMN };
  const directionMode = result['direction_mode'] && typeof result['direction_mode'] === 'object' && !Array.isArray(result['direction_mode'])
    ? Number((result['direction_mode'] as Record<string, unknown>).mode)
    : undefined;
  const directionReversed = result['direction_reversed'] != null ? Number(result['direction_reversed']) : undefined;
  const columnDefaults = result['column_defaults'] && typeof result['column_defaults'] === 'object' && !Array.isArray(result['column_defaults'])
    ? result['column_defaults'] as Record<string, unknown>
    : {};
  if (result['ping_column'] && typeof result['ping_column'] === 'object' && !Array.isArray(result['ping_column'])) {
    const pingColumn = result['ping_column'] as Record<string, unknown>;
    if (Number.isFinite(directionMode)) pingColumn['开向模式'] = directionMode;
    else if (columnDefaults['开向模式'] != null) pingColumn['开向模式'] = columnDefaults['开向模式'];
    if (Number.isFinite(directionReversed)) pingColumn['锁向'] = directionReversed;
    else if (columnDefaults['锁向'] != null) pingColumn['锁向'] = columnDefaults['锁向'];
  }
  if (!result['ping_tabs']) result['ping_tabs'] = { add: 0, add_2: 0, sheets: 1 };
  if (!hasEntries(result['template'])) result['template'] = DEFAULT_TEMPLATE_NAMES;

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Authenticate a user.
 * Validates credentials with bcryptjs, handles trial attempt counting,
 * and returns the full login response matching the production format.
 */
export async function login(username: string, password: string): Promise<LoginResponseEntry[]> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw Object.assign(new Error('用户名或密码错误'), { statusCode: 401 });
  }
  if (user.status === 0) {
    throw Object.assign(new Error('账户已被禁用'), { statusCode: 403 });
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    // Trial users consume an attempt on every failure
    if (user.isTrial && user.attemptsLeft > 0) {
      const remaining = user.attemptsLeft - 1;
      await prisma.user.update({
        where: { id: user.id },
        data: { attemptsLeft: remaining },
      });
      if (remaining <= 0) {
        throw Object.assign(new Error('试用次数已用完，请联系管理员'), { statusCode: 403 });
      }
    }
    throw Object.assign(new Error('用户名或密码错误'), { statusCode: 401 });
  }

  // Update login date
  await prisma.user.update({
    where: { id: user.id },
    data: { loginDate: new Date() },
  });

  return buildLoginResponse(user);
}

/**
 * Change a user's password.
 * Verifies the old password before applying the new one.
 */
export async function changePassword(
  username: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
  }

  if (!verifyPassword(oldPassword, user.passwordHash)) {
    throw Object.assign(new Error('原密码错误'), { statusCode: 400 });
  }

  const newHash = hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, isDefaultPw: 0 },
  });
}

/**
 * Return basic user configuration for the given database.
 */
export async function getUserConfig(ds: string) {
  const user = await prisma.user.findFirst({
    where: { databaseName: ds },
    select: {
      displayName: true,
      databaseName: true,
      companyName: true,
      isDefaultPw: true,
      syncEnabled: true,
    },
  });

  if (!user) return null;

  return {
    name: user.displayName,
    ds: user.databaseName,
    registrant: user.companyName,
    defaulted: user.isDefaultPw,
    sync: user.syncEnabled,
  };
}

/**
 * Return procedure data as {工序1: '…', 工序2: '…', …}.
 * Reads from the user's stored proceduresData first, then falls back
 * to the Procedure table ordered by orderIndex.
 */
export async function getProcedures(ds: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findFirst({
    where: { databaseName: ds },
    select: { proceduresData: true },
  });

  const procedures = await prisma.procedure.findMany({
    where: { databaseName: ds },
    orderBy: { orderIndex: 'asc' },
  });

  // Return flat map with 15 slots (matching Flask: {工序1: '', ..., 工序15: ''})
  const result: Record<string, string> = {};
  for (let i = 1; i <= 15; i++) result[`工序${i}`] = '';
  for (const p of procedures) {
    if (p.orderIndex) result[`工序${p.orderIndex}`] = p.name;
  }
  return result;
}

/**
 * Assemble the full login response block including registrant configuration.
 */
export async function buildLoginResponse(user: LoginUser): Promise<LoginResponseEntry[]> {
  const token = createToken(
    user.username,
    user.databaseName,
    user.displayName,
    user.companyName,
  );

  const registrantConfig = await buildRegistrantConfig(user.companyName);

  // Build procedures_data from Procedure table (15 slots, matching Flask)
  const procedures = await prisma.procedure.findMany({
    where: { databaseName: user.databaseName },
    orderBy: { orderIndex: 'asc' },
  });
  const proceduresData: Record<string, string> = {};
  for (let i = 1; i <= 15; i++) proceduresData[`工序${i}`] = '';
  for (const p of procedures) {
    if (p.orderIndex) proceduresData[`工序${p.orderIndex}`] = p.name;
  }

  return [
    {
      statu: 1,
      token,
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
      userinfo: {
        name: user.displayName,
        ds: user.databaseName,
        registrant: user.companyName,
        defaulted: user.isDefaultPw,
        sync: user.syncEnabled,
        token,
        procedures_data: proceduresData,
        column_settings: safeLoads(user.columnSettings || ''),
      },
      registrant: registrantConfig,
    },
  ];
}

/**
 * Build a simplified login response for temporary customer access.
 */
export async function buildCustomerLoginResponse(
  user: { username: string; databaseName: string; displayName: string },
  client: { id: number; name: string; phone?: string | null },
): Promise<CustomerLoginResponse> {
  const token = createToken(
    `customer_${client.id}`,
    user.databaseName,
    client.name,
    'customer',
  );

  return {
    statu: 1,
    token,
    token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
    userinfo: {
      name: client.name,
      ds: user.databaseName,
      registrant: user.displayName,
      defaulted: 1,
      sync: 0,
      token,
    },
  };
}

export async function loginCustomerQr(customerName: string, credential: string): Promise<CustomerLoginResponse | null> {
  const parsed = parseCustomerQrCredential(credential);
  if (!parsed) return null;

  const clients = await prisma.client.findMany({
    where: {
      databaseName: parsed.ds,
      name: customerName,
    },
    orderBy: { id: 'asc' },
  });

  const client = clients.find(item => {
    const clientCode = Number(item.clientCode);
    return Number.isFinite(clientCode) && 7 * clientCode + 1987 === parsed.clientCheck;
  });
  if (!client) return null;

  const user = await prisma.user.findFirst({
    where: { databaseName: parsed.ds },
    orderBy: { id: 'asc' },
  });
  if (!user) return null;

  return buildCustomerLoginResponse(user, client);
}
