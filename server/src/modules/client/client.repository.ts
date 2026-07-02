import { prisma } from '../../database';
import type { IClientRepository } from '../repository.interface';

export const clientRepository: IClientRepository = {
  async findByDs(ds: string) {
    return prisma.client.findMany({
      where: { databaseName: ds },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findWithKeyword(ds: string, keyword: string) {
    return prisma.client.findMany({
      where: {
        databaseName: ds,
        OR: [
          { name: { contains: keyword } },
          { brand: { contains: keyword } },
          { phone: { contains: keyword } },
          { contactPerson: { contains: keyword } },
          { clientCode: { contains: keyword } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async findById(ds: string, id: number) {
    return prisma.client.findFirst({
      where: { databaseName: ds, id },
    });
  },

  async findByCode(ds: string, code: string) {
    return prisma.client.findUnique({
      where: { databaseName_clientCode: { databaseName: ds, clientCode: code } },
    });
  },

  async findByNamePhone(ds: string, name: string, phone: string) {
    return prisma.client.findFirst({
      where: { databaseName: ds, name, phone: phone || undefined },
    });
  },

  async create(ds: string, data: Record<string, unknown>) {
    return prisma.client.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async update(id: number, data: Record<string, unknown>) {
    return prisma.client.update({
      where: { id },
      data: data as any,
    });
  },

  async delete(id: number) {
    // Delete related records explicitly before deleting the client
    const existingOrders = await prisma.order.findMany({
      where: { clientId: id },
      select: { id: true },
    });
    const orderIds = existingOrders.map((o: { id: number }) => o.id);

    if (orderIds.length > 0) {
      await prisma.progress.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.financeOrder.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    await prisma.customerBalance.deleteMany({ where: { clientId: id } });
    await prisma.customerAdjustment.deleteMany({ where: { clientCode: String(id) } });
    await prisma.client.delete({ where: { id } });
    return true;
  },
};
