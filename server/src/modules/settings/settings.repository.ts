import { prisma } from '../../database';
import type { ISettingsRepository } from '../repository.interface';

export const settingsRepository: ISettingsRepository = {
  async getSetting(ds: string, key: string) {
    return prisma.setting.findUnique({
      where: { databaseName_key: { databaseName: ds, key } },
    });
  },

  async setSetting(ds: string, key: string, value: string) {
    await prisma.setting.upsert({
      where: { databaseName_key: { databaseName: ds, key } },
      update: { value },
      create: { databaseName: ds, key, value },
    });
  },

  async getAddPrices(ds: string) {
    return prisma.addPrice.findMany({
      where: { databaseName: ds },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getGlassHoles(ds: string) {
    return prisma.glassHole.findMany({
      where: { databaseName: ds },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getParametricPatterns(ds: string) {
    const setting = await prisma.setting.findUnique({
      where: { databaseName_key: { databaseName: ds, key: 'parametric_patterns' } },
    });
    if (!setting?.value) return [];
    try {
      return JSON.parse(setting.value);
    } catch {
      return [];
    }
  },
};
