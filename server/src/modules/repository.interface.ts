/**
 * Repository Interface Pattern
 *
 * Each module has a Repository interface that defines data access methods.
 * The PrismaRepository implements it; a MockRepository can be used for tests.
 * Services depend on the interface, not the implementation — enabling module
 * replacement and independent testing.
 */

// ========== Generic Repository ==========

export interface IRepository<T, K = number> {
  findById(id: K): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: K, data: Partial<T>): Promise<T>;
  delete(id: K): Promise<boolean>;
}

// ========== Auth Repository ==========

export interface IAuthRepository {
  findByUsername(username: string): Promise<Record<string, unknown> | null>;
  findByDatabaseName(ds: string): Promise<Record<string, unknown> | null>;
  updateLoginDate(userId: number): Promise<void>;
  updatePassword(userId: number, hash: string): Promise<void>;
  getSettings(ds: string): Promise<Record<string, unknown>[]>;
  getProcedures(ds: string): Promise<Record<string, unknown>[]>;
  getTemplates(ds: string): Promise<Record<string, unknown>[]>;
  getUpdateInfo(ds: string): Promise<Record<string, unknown> | null>;
}

// ========== Client Repository ==========

export interface IClientRepository {
  findByDs(ds: string): Promise<Record<string, unknown>[]>;
  findWithKeyword(ds: string, keyword: string): Promise<Record<string, unknown>[]>;
  findById(ds: string, id: number): Promise<Record<string, unknown> | null>;
  findByCode(ds: string, code: string): Promise<Record<string, unknown> | null>;
  findByNamePhone(ds: string, name: string, phone: string): Promise<Record<string, unknown> | null>;
  create(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: number, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(id: number): Promise<boolean>;
}

// ========== Order Repository ==========

export interface IOrderRepository {
  findByDs(ds: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  findByOrderNo(ds: string, orderNo: string): Promise<Record<string, unknown> | null>;
  findWithPagination(ds: string, keyword: string, skip: number, take: number): Promise<[Record<string, unknown>[], number]>;
  create(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: number, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(id: number): Promise<boolean>;
}

// ========== Finance Repository ==========

export interface IFinanceRepository {
  getFinanceOrders(ds: string): Promise<Record<string, unknown>[]>;
  getPayments(ds: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  getCustomerBalances(ds: string): Promise<Record<string, unknown>[]>;
  getCustomerAdjustments(ds: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  getOrderAdjustments(ds: string, filter?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  createPayment(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  createCustomerAdjustment(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  createOrderAdjustment(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  upsertBalance(ds: string, clientCode: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
}

// ========== Progress Repository ==========

export interface IProgressRepository {
  findByDs(ds: string, orderNo?: string): Promise<Record<string, unknown>[]>;
  findByOrderIds(ds: string, orderIds: number[]): Promise<Record<string, unknown>[]>;
  upsert(ds: string, orderId: number, procedureName: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteByOrderAndProcedure(ds: string, orderId: number, procedureName: string): Promise<boolean>;
  deleteByOrderIds(ds: string, orderIds: number[]): Promise<number>;
}

// ========== Formula Repository ==========

export interface IFormulaRepository {
  findByDsAndType(ds: string, type: string): Promise<Record<string, unknown>[]>;
  findById(ds: string, formulaId: string): Promise<Record<string, unknown> | null>;
  create(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(ds: string, formulaId: string): Promise<boolean>;
}

// ========== Settings Repository ==========

export interface ISettingsRepository {
  getSetting(ds: string, key: string): Promise<Record<string, unknown> | null>;
  setSetting(ds: string, key: string, value: string): Promise<void>;
  getAddPrices(ds: string): Promise<Record<string, unknown>[]>;
  getGlassHoles(ds: string): Promise<Record<string, unknown>[]>;
  getParametricPatterns(ds: string): Promise<Record<string, unknown>[]>;
}

// ========== Scanner Repository ==========

export interface IScannerRepository {
  findByDs(ds: string): Promise<Record<string, unknown>[]>;
  create(ds: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  delete(id: number): Promise<boolean>;
}

// ========== ShortLink Repository ==========

export interface IShortLinkRepository {
  findById(id: string): Promise<Record<string, unknown> | null>;
  create(data: Record<string, unknown>): Promise<Record<string, unknown>>;
}
