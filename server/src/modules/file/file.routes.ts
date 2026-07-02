import { Router } from 'express';
import multer from 'multer';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { ok, fail } from '../../middleware/response';
import * as fileService from './file.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// POST /upload — upload image (multipart: image file + fields)
router.post('/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const ds = req.user!.databaseName;
    const file = req.file;
    if (!file) {
      fail(res, 'No image file provided');
      return;
    }
    const data = await fileService.saveImage(ds, req.body, file);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /batch — batch get images (body: { ids: string[], ds: string })
// Returns { images: { [id]: { base64: string, contentType: string } | null } }
router.post('/batch', async (req, res) => {
  try {
    const { ids, ds } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      fail(res, 'ids array is required');
      return;
    }
    if (ids.length > 200) {
      fail(res, 'maximum 200 ids per batch request');
      return;
    }
    const effectiveDs = ds || '';
    const images = await fileService.getBatchImages(ids, effectiveDs);
    ok(res, { images });
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /:id — get image by id (?ds=xxx&format=base64)
// format=base64 returns JSON { base64, contentType } instead of raw binary
router.get('/:id', async (req, res) => {
  try {
    const imageId = req.params.id;
    const ds = (req.query.ds as string) || '';
    const asBase64 = req.query.format === 'base64';

    const result = await fileService.getImage(imageId, ds);
    if (!result || !result.buffer) {
      fail(res, 'Image not found', 404);
      return;
    }

    if (asBase64) {
      ok(res, {
        id: imageId,
        base64: result.buffer.toString('base64'),
        contentType: result.contentType || 'image/png',
      });
    } else {
      res.set('Content-Type', result.contentType || 'image/png');
      res.send(result.buffer);
    }
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE / — delete image (?id=xxx&ds=xxx)
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const imageId = req.query.id as string;
    const ds = (req.query.ds as string) || req.user?.databaseName || '';
    const relatedId = req.query.relatedId as string || '';
    const orderDs = req.query.orderDs as string || '';

    if (!imageId) {
      fail(res, 'Image id is required');
      return;
    }

    const data = await fileService.deleteImage(imageId, ds, relatedId, orderDs);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /templates — get templates (?ds=xxx)
router.get('/templates', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await fileService.getTemplates(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// GET /update-info — get update info (?ds=xxx)
router.get('/update-info', async (req, res) => {
  try {
    const ds = (req.query.ds as string) || '';
    const data = await fileService.getUpdateInfo(ds);
    ok(res, data);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

export { router as fileRouter };
