import { prisma } from '../../database';
import type { IFinanceRepository } from '../repository.interface';

export const financeRepository: IFinanceRepository = {
  async getFinanceOrders(ds: string) {
    return prisma.financeOrder.findMany({
      where: { databaseName: ds },
      include: { order: true },
    });
  },

  async getPayments(ds: string, filter?: Record<string, unknown>) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (filter) {
      Object.assign(where, filter);
    }
    return prisma.payment.findMany({
      where: where as any,
      orderBy: { paymentDate: 'desc' },
    });
  },

  async getCustomerBalances(ds: string) {
    return prisma.customerBalance.findMany({
      where: { databaseName: ds },
      include: { client: true },
    });
  },

  async getCustomerAdjustments(ds: string, filter?: Record<string, unknown>) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (filter) {
      Object.assign(where, filter);
    }
    return prisma.customerAdjustment.findMany({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getOrderAdjustments(ds: string, filter?: Record<string, unknown>) {
    const where: Record<string, unknown> = { databaseName: ds };
    if (filter) {
      Object.assign(where, filter);
    }
    return prisma.orderAdjustment.findMany({
      where: where as any,
    });
  },

  async createPayment(ds: string, data: Record<string, unknown>) {
    return prisma.payment.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async createCustomerAdjustment(ds: string, data: Record<string, unknown>) {
    return prisma.customerAdjustment.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async createOrderAdjustment(ds: string, data: Record<string, unknown>) {
    return prisma.orderAdjustment.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async upsertBalance(ds: string, clientCode: string, data: Record<string, unknown>) {
    const existing = await prisma.customerBalance.findFirst({
      where: { databaseName: ds, clientCode },
    });

    if (existing) {
      return prisma.customerBalance.update({
        where: { id: existing.id },
        data: data as any,
      });
    }

    return prisma.customerBalance.create({
      data: {
        databaseName: ds,
        clientCode,
        ...data,
      } as any,
    });
  },
};
