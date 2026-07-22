import { prisma } from '../../database';
import { v4 as uuidv4 } from 'uuid';
import { safeLoads } from '../../utils/helpers';
import QRCode from 'qrcode';
import { DEFAULT_TEMPLATES } from './default-templates';
import { redis } from '../../redis';
import sharp from 'sharp';

const IMAGE_CACHE_TTL = 3600; // 1 hour
const IMAGE_CACHE_PREFIX = 'img:';
const MAX_IMAGE_DIMENSION = 1200; // max width/height in px

export async function saveImage(
  ds: string,
  body: Record<string, unknown>,
  file: Express.Multer.File,
  orderDs?: string
) {
  const imageId = (body.id as string) || uuidv4();
  const series = (body.series as string) || '';
  const blobKey = `${ds}/${imageId}${getExtension(file.originalname)}`;

  // Resize image to cap max dimension
  const resized = await sharp(file.buffer)
    .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .toBuffer();
  const imageBytes = new Uint8Array(resized);

  // Upsert DB record
  await prisma.image.upsert({
    where: { id_databaseName: { id: imageId, databaseName: ds } },
    update: { imageBlob: imageBytes, imageUrl: blobKey, series },
    create: { id: imageId, databaseName: ds, imageBlob: imageBytes, imageUrl: blobKey, series },
  });

  // Sync image_id to order door_specs (match Flask sync_detail_image_id)
  const effectiveOrderDs = orderDs || ds;
  if (effectiveOrderDs && series) {
    await syncDetailImageId(effectiveOrderDs, series, imageId);
  }

  // Invalidate Redis cache
  redis.del(`${IMAGE_CACHE_PREFIX}${ds}:${imageId}`).catch(() => {});

  return { id: imageId, url: blobKey };
}

/**
 * Batch fetch images from PostgreSQL for all IDs.
 * Returns a map keyed by image id so the frontend can preload before PDF export.
 */
export async function getBatchImages(
  ids: string[],
  ds: string,
): Promise<Record<string, { base64: string; contentType: string } | null>> {
  // Deduplicate
  const uniqueIds = [...new Set(ids)];
  const result: Record<string, { base64: string; contentType: string } | null> = {};
  const missed: string[] = [];

  // ── Redis cache check ──
  const cacheKeys = uniqueIds.map(id => `${IMAGE_CACHE_PREFIX}${ds}:${id}`);
  const cached = uniqueIds.length > 0 ? await redis.mget(...cacheKeys) : [];
  for (let idx = 0; idx < uniqueIds.length; idx++) {
    const id = uniqueIds[idx];
    const entry = cached[idx];
    if (entry) {
      try {
        result[id] = JSON.parse(entry);
      } catch {
        missed.push(id);
      }
    } else {
      missed.push(id);
    }
  }

  if (missed.length === 0) return result;

  // ── DB query for cache misses ──
  const records = await prisma.image.findMany({
    where: { id: { in: missed }, databaseName: ds },
  });
  const recordMap = new Map(records.map(r => [r.id, r]));

  const cacheWrites: Promise<unknown>[] = [];
  for (const id of missed) {
    const record = recordMap.get(id);
    if (!record) {
      if (id === 'qrcode') {
        const { buffer, contentType } = await buildDefaultQrCode(ds);
        const value = { base64: buffer.toString('base64'), contentType };
        result[id] = value;
        cacheWrites.push(redis.setex(`${IMAGE_CACHE_PREFIX}${ds}:${id}`, IMAGE_CACHE_TTL, JSON.stringify(value)));
      } else {
        result[id] = null;
      }
      continue;
    }

    const buffer = record.imageBlob ? Buffer.from(record.imageBlob) : null;
    const contentType = detectMimeType(record.imageUrl || '');
    if (!buffer) { result[id] = null; continue; }

    const value = { base64: buffer.toString('base64'), contentType };
    result[id] = value;
    cacheWrites.push(redis.setex(`${IMAGE_CACHE_PREFIX}${ds}:${id}`, IMAGE_CACHE_TTL, JSON.stringify(value)));
  }

  // Fire-and-forget cache writes (don't block the response)
  Promise.all(cacheWrites).catch(() => {});

  return result;
}

export async function getImage(imageId: string, ds: string, maxWidth?: number) {
  const width = maxWidth || 0;
  const cacheKey = `${IMAGE_CACHE_PREFIX}${ds}:${imageId}${width ? `:w${width}` : ''}`;

  // ── Redis cache first ──
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { base64: string; contentType: string };
      return {
        buffer: Buffer.from(parsed.base64, 'base64'),
        contentType: parsed.contentType,
      };
    }
  } catch { /* cache miss, fall through to DB */ }

  // ── DB lookup ──
  const record = ds
    ? await prisma.image.findUnique({ where: { id_databaseName: { id: imageId, databaseName: ds } } })
    : await prisma.image.findFirst({ where: { id: imageId } });

  if (!record) {
    if (imageId === 'qrcode') {
      return buildDefaultQrCode(ds);
    }
    return null;
  }

  if (record.imageBlob) {
    let buffer = Buffer.from(record.imageBlob);
    const contentType = detectMimeType(record.imageUrl || '');

    // Resize if requested
    if (width > 0) {
      buffer = Buffer.from(await sharp(buffer)
        .resize(width, width, { fit: 'inside', withoutEnlargement: true })
        .toBuffer());
    }

    // Cache in Redis (fire-and-forget)
    const value = JSON.stringify({ base64: buffer.toString('base64'), contentType });
    redis.setex(cacheKey, IMAGE_CACHE_TTL, value).catch(() => {});

    return { buffer, contentType };
  }

  return null;
}

async function buildDefaultQrCode(ds: string) {
  const text = ds ? `smartdoor:${ds}` : 'smartdoor';
  const buffer = await QRCode.toBuffer(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 4,
    type: 'png',
  });
  return { buffer, contentType: 'image/png' };
}

export async function deleteImage(
  imageId: string,
  ds: string,
  relatedId?: string,
  orderDs?: string
) {
  // Delete DB record (requires ds for compound primary key)
  if (ds) {
    await prisma.image.deleteMany({
      where: { id: imageId, databaseName: ds },
    });
  }

  // Sync: clear image_id from order door_specs (matching Flask logic)
  const effectiveOrderDs = orderDs || ds;
  if (effectiveOrderDs && relatedId) {
    await syncDetailImageId(effectiveOrderDs, relatedId, null);
  }

  // Invalidate Redis cache
  redis.del(`${IMAGE_CACHE_PREFIX}${ds}:${imageId}`).catch(() => {});

  return { success: true };
}

/**
 * Sync image_id to/from order door_specs detail rows.
 * Matches Flask's sync_detail_image_id in repository.py.
 * Scans all orders in effectiveOrderDs that have door_specs,
 * finds rows where `id` matches detailId, and sets `图片ID`.
 */
async function syncDetailImageId(
  effectiveOrderDs: string,
  detailId: string,
  imageId: string | null
) {
  if (!effectiveOrderDs || !detailId) return;

  const orders = await prisma.order.findMany({
    where: {
      databaseName: effectiveOrderDs,
      doorSpecs: { not: null },
    },
  });

  for (const order of orders) {
    if (!order.doorSpecs) continue;

    let specs: Record<string, unknown>;
    try { specs = JSON.parse(order.doorSpecs); } catch { continue; }

    let changed = false;
    for (const group of ['ping_hui', 'diao_hui']) {
      const rows = specs[group];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (typeof row !== 'object' || row === null) continue;
        const rowObj = row as Record<string, unknown>;
        if (String(rowObj['id'] ?? '').trim() !== detailId) continue;
        rowObj['图片ID'] = imageId;
        if (imageId === null) {
          rowObj['imageUrl'] = null;
        }
        changed = true;
      }
    }

    if (!changed) continue;
    await prisma.order.update({
      where: { id: order.id },
      data: { doorSpecs: JSON.stringify(specs, Object.keys(specs).length > 0 ? undefined : null) },
    });
  }
}

export async function getTemplates(ds: string) {
  const templates = await prisma.template.findMany({
    where: { databaseName: ds },
    orderBy: { createdAt: 'asc' },
  });

  const productionKeys: Record<string, string> = {
    FinalReceipt: 'FinalReceiptTemplate',
    ReceiptList: 'ReceiptListTemplate',
    glass: 'glassTemplate',
    glassHole: 'glassHoleTemplate',
    lable: 'lableTemplate',
    product: 'productTemplate',
    product1: 'product1Template',
    product2: 'product2Template',
    product3: 'product3Template',
    product4: 'product4Template',
    product5: 'product5Template',
    product6: 'product6Template',
    product7: 'product7Template',
    product8: 'product8Template',
    product9: 'product9Template',
    product10: 'product10Template',
    receipt: 'receiptTemplate',
  };

  // Database templates are overrides; an empty table should keep the built-in defaults.
  const config: Record<string, unknown> = { ...DEFAULT_TEMPLATES };
  for (const t of templates) {
    if (t.name && t.templateType) {
      const key = productionKeys[t.name] || `${t.name}Template`;
      try {
        config[key] = safeLoads(t.content || '');
      } catch {
        config[key] = t.content;
      }
    }
  }
  return config;
}

export async function getUpdateInfo(ds: string): Promise<Record<string, unknown>> {
  const update = await prisma.updateInfo.findFirst({
    where: { databaseName: ds },
    orderBy: { createdAt: 'desc' },
  });
  if (update) {
    return { code: 200, message: update.message || '', version: update.version || '' };
  }
  return { code: 200, message: 'none' };
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx >= 0 ? filename.slice(idx) : '.png';
}

function detectMimeType(objectName: string): string {
  const ext = objectName.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}
