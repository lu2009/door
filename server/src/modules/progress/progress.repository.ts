import { prisma } from '../../database';
import type { IProgressRepository } from '../repository.interface';

export const progressRepository: IProgressRepository = {
  async findByDs(ds: string, orderNo?: string) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (orderNo) {
      where.orderNo = orderNo;
    }
    return prisma.progress.findMany({
      where: where as any,
      include: {
        order: {
          include: { client: true },
        },
      },
      orderBy: [{ orderNo: 'asc' }, { procedureName: 'asc' }],
    });
  },

  async findByOrderIds(ds: string, orderIds: number[]) {
    if (orderIds.length === 0) return [];
    return prisma.progress.findMany({
      where: {
        databaseName: ds,
        orderId: { in: orderIds },
      },
      orderBy: { procedureName: 'asc' },
    });
  },

  async upsert(ds: string, orderId: number, procedureName: string, data: Record<string, unknown>) {
    return prisma.progress.upsert({
      where: {
        databaseName_orderId_procedureName: {
          databaseName: ds,
          orderId,
          procedureName,
        },
      },
      create: {
        databaseName: ds,
        orderId,
        procedureName,
        ...data,
      } as any,
      update: data as any,
    });
  },

  async deleteByOrderAndProcedure(ds: string, orderId: number, procedureName: string) {
    const result = await prisma.progress.deleteMany({
      where: {
        databaseName: ds,
        orderId,
        procedureName,
      },
    });
    return result.count > 0;
  },

  async deleteByOrderIds(ds: string, orderIds: number[]) {
    if (orderIds.length === 0) return 0;
    const result = await prisma.progress.deleteMany({
      where: {
        databaseName: ds,
        orderId: { in: orderIds },
      },
    });
    return result.count;
  },
};
