import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as financeService from './finance.service';

const router = Router();

router.use(requireAuth);

// GET /check-system — check if finance system is active
router.get('/check-system', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await financeService.checkSystem(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /summary — order finance summary
router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await financeService.getOrderSummary(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /check-payment — check payment status for a list of orders
router.post('/check-payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      fail(res, '参数错误: orders 必须是一个数组');
      return;
    }
    const data = await financeService.checkOrderPayment(ds, orders);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /add-payment — add payment (prepayment + order allocation)
router.post('/add-payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.addPayment(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /add-order-payment — add payment to a specific order
router.post('/add-order-payment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.addOrderPayment(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /add-customer-adjustment — customer-level adjustment
router.post('/add-customer-adjustment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.addCustomerAdjustment(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /add-order-adjustment — order-level adjustment
router.post('/add-order-adjustment', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.addOrderAdjustment(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /payment-stats — payment statistics
router.get('/payment-stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const customerId = req.query.customerId as string | undefined;
    const data = await financeService.getPaymentStats(ds, customerId);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /customer-statement — full customer statement
router.get('/customer-statement', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const customerId = req.query.customerId as string | undefined;
    const days = req.query.days as string | undefined;
    const data = await financeService.getCustomerStatement(ds, customerId, days);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /order-detail — order finance detail
router.get('/order-detail', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const orderNo = req.query.orderNo as string | undefined;
    if (!orderNo) {
      fail(res, '参数错误: orderNo 不能为空');
      return;
    }
    const data = await financeService.getOrderDetail(ds, orderNo);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /customer-balance — customer balance
router.get('/customer-balance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const customerId = req.query.customerId as string | undefined;
    const days = req.query.days as string | undefined;
    const data = await financeService.getCustomerBalance(ds, customerId, days);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /preview-allocation — preview allocation without committing
router.post('/preview-allocation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.previewAllocation(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /preview-prepayment-allocation — preview prepayment allocation
router.post('/preview-prepayment-allocation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.previewAllocation(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /execute-prepayment-allocation — execute prepayment allocation
router.post('/execute-prepayment-allocation', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.executePrepaymentAllocation(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST /clear-selected-orders — bulk zero out orders
router.post('/clear-selected-orders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await financeService.clearSelectedOrders(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as financeRouter };
