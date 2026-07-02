import { prisma } from '../../database';
import type { IFormulaRepository } from '../repository.interface';

export const formulaRepository: IFormulaRepository = {
  async findByDsAndType(ds: string, type: string) {
    return prisma.materialFormula.findMany({
      where: {
        databaseName: ds,
        formulaType: type,
      },
      orderBy: { materialSize: 'asc' },
    });
  },

  async findById(ds: string, formulaId: string) {
    return prisma.materialFormula.findFirst({
      where: {
        databaseName: ds,
        formulaId,
      },
    });
  },

  async create(ds: string, data: Record<string, unknown>) {
    return prisma.materialFormula.create({
      data: {
        databaseName: ds,
        ...data,
      } as any,
    });
  },

  async delete(ds: string, formulaId: string) {
    const result = await prisma.materialFormula.deleteMany({
      where: {
        databaseName: ds,
        formulaId,
      },
    });
    return result.count > 0;
  },
};
