import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { requireAuth } from '../../middleware/auth';
import { ok, fail, notFound } from '../../middleware/response';
import * as clientService from './client.service';

export const clientRouter = Router();

// All client routes require authentication
clientRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the effective database name from query, body, or authenticated user. */
function resolveDs(req: AuthRequest): string {
  return (req.query.ds as string) || (req.body?.ds as string) || req.user!.databaseName;
}

// ---------------------------------------------------------------------------
// GET / — list clients
// Query: ?ds=xxx&keyword=xxx
// ---------------------------------------------------------------------------
clientRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = resolveDs(req);
    const keyword = req.query.keyword as string | undefined;
    const clients = keyword
      ? await clientService.getLatestClients(ds, keyword)
      : await clientService.getClients(ds);
    ok(res, clients);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /latest — latest clients
// Query: ?ds=xxx&keyword=xxx
// ---------------------------------------------------------------------------
clientRouter.get('/latest', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = resolveDs(req);
    const keyword = req.query.keyword as string | undefined;
    const clients = await clientService.getLatestClients(ds, keyword);
    ok(res, clients);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /check — find or create client
// Body: { ds, name, phone }
// ---------------------------------------------------------------------------
clientRouter.post('/check', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.body.ds || req.user!.databaseName;
    const { name, phone } = req.body;
    if (!name) {
      fail(res, '客户名称不能为空');
      return;
    }
    const client = await clientService.checkClient(ds, name, phone || '');
    ok(res, client);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /receipt — create a full receipt / order
// Body: full order data with client info
// ---------------------------------------------------------------------------
clientRouter.post('/receipt', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.body.ds || req.user!.databaseName;
    const result = await clientService.makeReceipt(ds, req.body);
    ok(res, result, '回执单创建成功');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT / — update customer info (upsert)
// Body: customer fields, optionally with embedded order data
// ---------------------------------------------------------------------------
clientRouter.put('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = resolveDs(req);
    const result = await clientService.updateCustomer(ds, req.body);
    ok(res, result, '客户信息更新成功');
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id — delete client by id, clientCode, or name
// ---------------------------------------------------------------------------
clientRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const clientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await clientService.deleteClient(ds, clientId);
    ok(res, result, '客户已删除');
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode === 404) {
      notFound(res, '客户不存在');
      return;
    }
    next(err);
  }
});
