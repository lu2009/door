import { prisma } from '../../database';
import { hashPassword } from '../../utils/crypto';

export async function addScanner(ds: string, body: Record<string, unknown>) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '').trim();
  const registrant = String(body.registrant || '').trim();
  if (!ds || !username || !password) return { code: 400, message: 'bad request' };

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        displayName: username,
        companyName: registrant || ds,
        databaseName: ds,
        isDefaultPw: 2,
        mutilUser: 1,
      },
      select: { id: true },
    });
    return { code: 200, data: { id: user.id }, message: '扫码设备添加成功' };
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return { code: 400, message: '扫码账号已存在' };
    }
    throw err;
  }
}

export async function deleteScanner(ds: string, username: string) {
  const result = await prisma.user.deleteMany({
    where: {
      databaseName: ds,
      username,
      mutilUser: 1,
    },
  });
  if (result.count === 0) return { code: 400, message: '扫码账号不存在' };
  return { code: 200, message: '删除成功' };
}

export async function setPrinters(ds: string, body: Record<string, unknown>) {
  const value = JSON.stringify(body);
  return prisma.setting.upsert({
    where: { databaseName_key: { databaseName: ds, key: 'printers' } },
    update: { value },
    create: { databaseName: ds, key: 'printers', value },
  });
}
