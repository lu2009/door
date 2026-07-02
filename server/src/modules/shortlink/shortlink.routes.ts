import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as shortLinkService from './shortlink.service';

const router = Router();

// POST / — create short link
router.post('/', requireAuth, async (req, res) => {
  try {
    const payload = req.body.url || JSON.stringify(req.body);
    const data = await shortLinkService.create(payload as string);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /:id — get short link by id
router.get('/:id', async (req, res) => {
  try {
    const linkId = req.params.id;
    const data = await shortLinkService.get(linkId);
    if (!data) {
      fail(res, 'Link not found', 404);
      return;
    }
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

export { router as shortLinkRouter };
