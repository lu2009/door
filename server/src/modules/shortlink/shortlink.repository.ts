import { prisma } from '../../database';
import type { IShortLinkRepository } from '../repository.interface';

export const shortLinkRepository: IShortLinkRepository = {
  async findById(id: string) {
    return prisma.shortLink.findUnique({
      where: { id },
    });
  },

  async create(data: Record<string, unknown>) {
    return prisma.shortLink.create({
      data: data as any,
    });
  },
};
