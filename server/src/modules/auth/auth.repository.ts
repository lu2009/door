import { prisma } from '../../database';
import type { IAuthRepository } from '../repository.interface';

export const authRepository: IAuthRepository = {
  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findByDatabaseName(ds: string) {
    return prisma.user.findFirst({
      where: { databaseName: ds },
      orderBy: { id: 'asc' },
    });
  },

  async updateLoginDate(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: { loginDate: new Date() },
    });
  },

  async updatePassword(userId: number, hash: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, isDefaultPw: 0 },
    });
  },

  async getSettings(ds: string) {
    return prisma.setting.findMany({ where: { databaseName: ds } });
  },

  async getProcedures(ds: string) {
    return prisma.procedure.findMany({
      where: { databaseName: ds },
      orderBy: { orderIndex: 'asc' },
    });
  },

  async getTemplates(ds: string) {
    return prisma.template.findMany({ where: { databaseName: ds } });
  },

  async getUpdateInfo(ds: string) {
    return prisma.updateInfo.findFirst({
      where: { databaseName: ds },
      orderBy: { createdAt: 'desc' },
    });
  },
};
