import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as orderService from './order.service';

const router = Router();

// All routes require auth
router.use(requireAuth);

// GET / — list orders (?ds=xxx&keyword=&page=&perPage=)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const keyword = req.query.keyword as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.perPage as string, 10) || 20;
    const result = await orderService.getOrders(ds, { keyword, page, perPage });
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /table — table data (?ds=xxx&keyword=&address=&startDate=&endDate=)
router.get('/table', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const keyword = req.query.keyword as string | undefined;
    const address = req.query.address as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const result = await orderService.getTableData(ds, keyword, address, startDate, endDate);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /table/terminal — terminal table data (?ds=xxx where ds format = "ds_clientId")
router.get('/table/terminal', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    // ds format: "ds_clientId" — first part is databaseName, rest is clientId
    const underscoreIdx = ds.indexOf('_');
    if (underscoreIdx === -1) {
      fail(res, 'ds 参数格式错误，应为 ds_clientId');
      return;
    }
    const databaseName = ds.substring(0, underscoreIdx);
    const clientId = ds.substring(underscoreIdx + 1);
    const result = await orderService.getTableDataForTerminal(ds, clientId);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /detail — order detail (?ds=xxx&orderNo=xxx)
router.get('/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    const orderNo = req.query.orderNo as string;
    if (!ds || !orderNo) {
      fail(res, '缺少 ds 或 orderNo 参数');
      return;
    }
    const result = await orderService.getDetail(ds, orderNo);
    if (!result) {
      fail(res, '订单不存在', 404, 404);
      return;
    }
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /combine — combine orders
router.post('/combine', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const result = await orderService.combine(ds, req.body);
    ok(res, result, '合并成功');
  } catch (err) {
    next(err);
  }
});

// DELETE / — delete row(s)
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const { orderRef } = req.body || {};
    if (!orderRef) {
      fail(res, '缺少 orderRef 参数');
      return;
    }
    const result = await orderService.deleteRow(ds, orderRef);
    ok(res, result, '删除成功');
  } catch (err) {
    next(err);
  }
});

// PUT / — update row data
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const { rowId, ...updateData } = req.body || {};
    if (!rowId) {
      fail(res, '缺少 rowId 参数');
      return;
    }
    const result = await orderService.updateRow(ds, rowId, updateData);
    ok(res, result, '更新成功');
  } catch (err) {
    next(err);
  }
});

// GET /more — paginated orders (?ds=xxx&keyword=&page=&perPage=)
router.get('/more', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const keyword = req.query.keyword as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const perPage = parseInt(req.query.perPage as string, 10) || 20;
    const result = await orderService.getMoreOrders(ds, keyword, page, perPage);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

export { router as orderRouter };
