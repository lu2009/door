import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../database';
import { ok, fail } from '../../middleware/response';
import * as progressService from './progress.service';

const router = Router();

// All routes require auth
router.use(requireAuth);

// GET / — list progress (?ds=xxx&orderNo=xxx)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const orderNo = req.query.orderNo as string | undefined;
    const result = await progressService.getProgress(ds, orderNo);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /labels — label data (?ds=xxx&orderNo=xxx)
router.get('/labels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const orderNo = req.query.orderNo as string | undefined;
    // Collect order refs from query; can be comma-separated
    const refs = orderNo ? orderNo.split(',').filter(Boolean) : [];
    const result = await progressService.getLabelData(ds, refs);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /qrcode — QR code scan data (?ds=xxx&orderNo=xxx)
router.get('/qrcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const orderNo = req.query.orderNo as string | undefined;
    const refs = orderNo ? orderNo.split(',').filter(Boolean) : [];
    const result = await progressService.getScanQrCode(ds, refs);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// GET /counts — process counts (?ds=xxx)
router.get('/counts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const result = await progressService.getProcessCounts(ds);
    ok(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /update — update progress (body: {procedure, orderIds})
router.post('/update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const { procedure, orderIds } = req.body || {};
    if (!procedure || !orderIds) {
      fail(res, '缺少 procedure 或 orderIds 参数');
      return;
    }
    const result = await progressService.updateProgress(ds, procedure, orderIds);
    ok(res, result, '进度更新成功');
  } catch (err) {
    next(err);
  }
});

// POST /payment — update payment collection
router.post('/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const { param3, param4 } = req.body || {};
    const result = await progressService.updatePaymentCollection(ds, param3, param4);
    ok(res, result, '收款更新成功');
  } catch (err) {
    next(err);
  }
});

// DELETE / — delete progress
router.delete('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const { procedureName, orderRefs, slot, rowRef } = req.body || {};

    // If slot and rowRef are provided, delete a specific progress cell
    if (slot && rowRef) {
      const result = await progressService.deleteProgressCell(ds, slot, rowRef, procedureName);
      ok(res, result, '删除成功');
      return;
    }

    const result = await progressService.deleteProgress(ds, procedureName, orderRefs);
    ok(res, result, '删除成功');
  } catch (err) {
    next(err);
  }
});

// POST /procedures — set procedures
router.post('/procedures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const result = await progressService.setProcedures(ds, req.body);
    ok(res, result, '工序设置成功');
  } catch (err) {
    next(err);
  }
});

// GET /procedures — get procedures
router.get('/procedures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ds = req.query.ds as string;
    if (!ds) {
      fail(res, '缺少 ds 参数');
      return;
    }
    const procedures = await prisma.procedure.findMany({
      where: { databaseName: ds },
      orderBy: { orderIndex: 'asc' },
    });
    ok(res, procedures);
  } catch (err) {
    next(err);
  }
});

export { router as progressRouter };
