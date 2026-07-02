import type { PrismaClient } from '@prisma/client';
import { hashPassword } from './utils/crypto';

const DEFAULT_USERNAME = '昊艺门窗';
const DEFAULT_PASSWORD = 'Zxc4321.';
const DEFAULT_DATABASE = 'smartdoor';
const LEGACY_DEFAULT_USERNAMES = ['开门红'];

export async function seedDefaultUser(prisma: PrismaClient): Promise<void> {
  const passwordHash = hashPassword(DEFAULT_PASSWORD);
  const data = {
    username: DEFAULT_USERNAME,
    passwordHash,
    displayName: DEFAULT_USERNAME,
    companyName: DEFAULT_USERNAME,
    databaseName: DEFAULT_DATABASE,
    isDefaultPw: 1,
    syncEnabled: 0,
    status: 1,
  };

  const existingDefault = await prisma.user.findUnique({
    where: { username: DEFAULT_USERNAME },
  });
  if (existingDefault) {
    return;
  }

  const legacyDefault = await prisma.user.findFirst({
    where: { username: { in: LEGACY_DEFAULT_USERNAMES } },
    orderBy: { id: 'asc' },
  });
  if (legacyDefault) {
    await prisma.user.update({
      where: { id: legacyDefault.id },
      data,
    });
    return;
  }

  await prisma.user.create({ data });
}

const DEFAULT_LOGIN_REGISTRANT_SETTINGS: Record<string, unknown> = {
  declaration:
    '1、下单尺寸为包框尺寸洞口尺寸减去安装空位，如提供洞口尺寸、包边尺寸、见光尺寸、有直墙、不要边框、加长包边等，请明确说明，换算成下单尺寸以便生产。\n' +
    '2、确认后，预付50%订金《加急需付全款》，出货前付清余款发货。\n' +
    '3、正常订单确认后6小时内《急单2小时内》允许修改订单，超过时间需另付工料费，如终止订单，定金不予退还。\n' +
    '4、安装时所需玻璃胶发泡胶由客户自备',
  direction_mode: { mode: 2 },
  direction_reversed: 0,
  column_defaults: { '开向模式': 2, '锁向': 0 },
  copy: {
    FinalReceipt: 1,
    ReceiptList: 1,
    glass: 1,
    glassHole: 1,
    lable: 1,
    product: 1,
    product1: 1,
    product2: 1,
    product3: 1,
    product4: 1,
    product5: 1,
    product6: 1,
    product7: 1,
    product8: 1,
    product9: 1,
    product10: 1,
    receipt: 1,
  },
  custom_direction_names: {},
  diao_column: {
    '五金': 0,
    '单双丁': 1,
    '封板高': 1,
    '打折': 1,
    '数量': 0,
    '洞尺': 1,
    '计价方式': 0,
  },
  diao_tabs: { add: 1, add_2: 0, sheets: 1 },
  pagesize: {
    FinalReceipt: '',
    ReceiptList: '',
    glass: '',
    glassHole: '',
    lable: '',
    product: '',
    product1: '',
    product2: '',
    product3: '',
    product4: '',
    product5: '',
    product6: '',
    product7: '',
    product8: '',
    product9: '',
    product10: '',
    receipt: '',
  },
  ping_column: {
    '五金': 1,
    '前包加长': 1,
    '单双丁': 1,
    '吊脚': 0,
    '后包加长': 1,
    '套线种类': 1,
    '封板高': 1,
    '平方数': 0,
    '开向模式': 2,
    '打折': 0,
    '洞尺': 1,
    '轨道种类': 0,
    '锁向': 0,
  },
  ping_tabs: { add: 0, add_2: 0, sheets: 1 },
  template: {
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
  },
};

export async function seedDefaultLoginSettings(prisma: PrismaClient): Promise<void> {
  await prisma.setting.createMany({
    data: Object.entries(DEFAULT_LOGIN_REGISTRANT_SETTINGS).map(([key, value]) => ({
      databaseName: DEFAULT_USERNAME,
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    })),
    skipDuplicates: true,
  });
}
