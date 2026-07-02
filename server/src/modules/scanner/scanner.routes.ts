import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as scannerService from './scanner.service';

const router = Router();

// POST / — add scanner
router.post('/', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await scannerService.addScanner(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE / — delete scanner (?id=xxx)
router.delete('/', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const id = req.query.id as string;
    const data = await scannerService.deleteScanner(ds, id);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /printers — set printers
router.post('/printers', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await scannerService.setPrinters(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

export { router as scannerRouter };
