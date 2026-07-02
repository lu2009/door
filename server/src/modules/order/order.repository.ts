import { prisma } from '../../database';
import type { IOrderRepository } from '../repository.interface';

export const orderRepository: IOrderRepository = {
  async findByDs(ds: string, filter?: Record<string, unknown>) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (filter) {
      Object.assign(where, filter);
    }
    return prisma.order.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByOrderNo(ds: string, orderNo: string) {
    return prisma.order.findUnique({
      where: { databaseName_orderNo: { databaseName: ds, orderNo } },
      include: {
        client: true,
        progressRecords: {
          orderBy: { procedureName: 'asc' },
        },
        payments: true,
        financeOrders: true,
      },
    });
  },

  async findWithPagination(ds: string, keyword: string, skip: number, take: number) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (keyword) {
      where.OR = [
        { orderNo: { contains: keyword } },
        { customerName: { contains: keyword } },
        { brand: { contains: keyword } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where: where as any }),
    ]);

    return [data, total];
  },

  async create(ds: string, data: Record<string, unknown>) {
    return prisma.order.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async update(id: number, data: Record<string, unknown>) {
    return prisma.order.update({
      where: { id },
      data: data as any,
    });
  },

  async delete(id: number) {
    // Delete related records before deleting the order
    await prisma.payment.deleteMany({
      where: { order: { id } },
    });
    await prisma.financeOrder.deleteMany({
      where: { orderId: id },
    });
    await prisma.progress.deleteMany({
      where: { orderId: id },
    });
    await prisma.order.delete({ where: { id } });
    return true;
  },
};
