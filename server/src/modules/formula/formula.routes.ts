import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as formulaService from './formula.service';

const router = Router();

router.use(requireAuth);

// GET /diao-init — initialize diao formula data
router.get('/diao-init', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await formulaService.initializDiao(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /ping-init — initialize ping formula data
router.get('/ping-init', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await formulaService.initializPing(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET / — list formulas by type
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const formulaType = req.query.type as string | undefined;
    const data = await formulaService.getFormulas(ds, formulaType);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /names — get formula name mappings
router.get('/names', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await formulaService.getFormulaName(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /diao-price — get diao price data
router.get('/diao-price', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await formulaService.getDiaoPrice(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /ping-price — get ping price data
router.get('/ping-price', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const data = await formulaService.getPingPrice(ds);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /diao — get diao formulas by name
router.get('/diao', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const name = req.query.name as string | undefined;
    const names = name ? name.split(',') : undefined;
    const data = await formulaService.getDiaoFormulas(ds, names);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /diao-single — get single diao formula by orderDs
router.get('/diao-single', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const orderDs = req.query.orderDs as string | undefined;
    if (!orderDs) {
      fail(res, '参数错误: orderDs 不能为空');
      return;
    }
    const data = await formulaService.getDiaoFormulasSingle(ds, req.body || {}, orderDs);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /query — query formula by name
router.get('/query', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const name = req.query.name as string | undefined;
    const body = req.query as Record<string, unknown>;
    const data = await formulaService.queryFormula(ds, body, name);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// POST / — save / update formula
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const body = req.body;
    if (!body) {
      fail(res, '参数错误: 请求体不能为空');
      return;
    }
    const data = await formulaService.saveFormula(ds, body);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// DELETE / — delete formula by id
router.delete('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const identifier = {
      id: req.query.id as string | undefined,
      name: req.query.name as string | undefined,
      size: req.query.size as string | undefined,
      formulaId: req.query.formulaId as string | undefined,
    };
    const data = await formulaService.deleteFormula(ds, identifier);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /glass-width — query 门玻璃宽
router.get('/glass-width', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const name = req.query.name as string | undefined;
    const data = await formulaService.queryFormula(ds, { type: 'glass-width' }, name);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

// GET /extra-price — query 加价项目-轨道超长
router.get('/extra-price', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = req.user!.databaseName;
    const name = req.query.name as string | undefined;
    const data = await formulaService.queryFormula(ds, { type: 'extra-price' }, name);
    ok(res, data);
  } catch (err) {
    next(err);
  }
});

export { router as formulaRouter };
