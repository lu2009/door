import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as settingsService from './settings.service';

const router = Router();

// GET /add-prices — list add-on prices
router.get('/add-prices', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await settingsService.getAddPrice(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /add-prices — add add-on price
router.post('/add-prices', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.addAddPrice(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// PUT /add-prices — edit add-on price
router.put('/add-prices', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.editAddPrice(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE /add-prices — delete add-on price
router.delete('/add-prices', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const id = req.query.id as string;
    const data = await settingsService.deleteAddPrice(ds, id);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /declaration — update declaration text
router.post('/declaration', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.changeDecleration(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /glass-holes — list glass holes
router.get('/glass-holes', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await settingsService.getGlassHoles(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /glass-holes — save glass hole
router.post('/glass-holes', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.saveGlassHole(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE /glass-holes — delete glass hole
router.delete('/glass-holes', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const id = req.query.id as string;
    const data = await settingsService.deleteGlassHole(ds, id);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /drawing-behaviors — get drawing behaviors
router.get('/drawing-behaviors', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await settingsService.drawingBehaviorsGet(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /drawing-behaviors — set drawing behaviors
router.post('/drawing-behaviors', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.drawingBehaviorsSet(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /square — change pricing method
router.post('/square', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.changeSquare(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /direction-mode — change direction mode
router.post('/direction-mode', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const mode = req.body.mode as string;
    const data = await settingsService.changeDirectionMode(ds, mode);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /reverse-direction — reverse lock direction
router.post('/reverse-direction', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.reverseDirection(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /custom-direction-names — save custom direction names
router.post('/custom-direction-names', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.saveCustomDirectionNames(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /clear-account — clear account data
router.post('/clear-account', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.clearAccount(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /registrant-user — create registrant user
router.post('/registrant-user', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.createUser(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /parametric-patterns — list parametric patterns
router.get('/parametric-patterns', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await settingsService.getParametricPatterns(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /parametric-patterns — upsert parametric pattern
router.post('/parametric-patterns', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const data = await settingsService.upsertParametricPattern(ds, req.body);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE /parametric-patterns — delete parametric pattern
router.delete('/parametric-patterns', requireAuth, async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const id = req.query.id as string;
    const data = await settingsService.deleteParametricPattern(ds, id);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /version — check version
router.get('/version', async (_req, res) => {
  try {
    const data = await settingsService.getVersionInfo();
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

export { router as settingsRouter };
