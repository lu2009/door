import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as authService from './auth.service';

export const authRouter = Router();

// ---------------------------------------------------------------------------
// POST /login
// Body: { username, password }
// Returns JWT token matching the original Flask production format.
// ---------------------------------------------------------------------------
authRouter.post('/login', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      fail(res, '用户名和密码不能为空');
      return;
    }

    const result = await authService.login(username, password);
    res.json(result);
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode) {
      fail(res, e.message, e.statusCode, e.statusCode);
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /change-password  — authenticated
// Body: { oldPassword, newPassword }
// ---------------------------------------------------------------------------
authRouter.post('/change-password', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      fail(res, '原密码和新密码不能为空');
      return;
    }
    if (newPassword.length < 6) {
      fail(res, '新密码长度不能少于6位');
      return;
    }

    await authService.changePassword(req.user!.username, oldPassword, newPassword);
    ok(res, null, '密码修改成功');
  } catch (err: unknown) {
    const e = err as Error & { statusCode?: number };
    if (e.statusCode) {
      fail(res, e.message, e.statusCode, e.statusCode);
      return;
    }
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /config — authenticated
// Returns user config matching the original getuserconfig endpoint.
// ---------------------------------------------------------------------------
authRouter.get('/config', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = (req.query.ds as string) || req.user!.databaseName;
    const config = await authService.getUserConfig(ds);
    if (!config) {
      fail(res, '未找到用户配置', 404, 404);
      return;
    }
    ok(res, config);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /procedures — authenticated
// Query: ?ds=xxx
// Returns procedure data as {工序1: '…', 工序15: '…'}.
// ---------------------------------------------------------------------------
authRouter.get('/procedures', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ds = (req.query.ds as string) || req.user!.databaseName;
    const procedures = await authService.getProcedures(ds);
    ok(res, procedures);
  } catch (err) {
    next(err);
  }
});
