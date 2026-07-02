import { prisma } from '../../database';
import type { IScannerRepository } from '../repository.interface';

export const scannerRepository: IScannerRepository = {
  async findByDs(ds: string) {
    return prisma.scanner.findMany({
      where: { databaseName: ds },
    });
  },

  async create(ds: string, data: Record<string, unknown>) {
    return prisma.scanner.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async delete(id: number) {
    await prisma.scanner.delete({ where: { id } });
    return true;
  },
};
