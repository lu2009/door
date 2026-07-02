import { prisma } from '../../database';
import { minio } from '../../minio';
import { v4 as uuidv4 } from 'uuid';
import { safeLoads } from '../../utils/helpers';
import QRCode from 'qrcode';
import { DEFAULT_TEMPLATES } from './default-templates';

export async function saveImage(
  ds: string,
  body: Record<string, unknown>,
  file: Express.Multer.File,
  orderDs?: string
) {
  const imageId = (body.id as string) || uuidv4();
  const series = (body.series as string) || '';
  const objectName = `${ds}/${imageId}${getExtension(file.originalname)}`;

  // Upload to MinIO
  await minio.upload(objectName, file.buffer, file.mimetype);

  // Upsert DB record
  await prisma.image.upsert({
    where: { id_databaseName: { id: imageId, databaseName: ds } },
    update: { imageUrl: objectName, series },
    create: { id: imageId, databaseName: ds, imageUrl: objectName, series },
  });

  // Sync image_id to order door_specs (match Flask sync_detail_image_id)
  const effectiveOrderDs = orderDs || ds;
  if (effectiveOrderDs && series) {
    await syncDetailImageId(effectiveOrderDs, series, imageId);
  }

  return { id: imageId, url: objectName };
}

/**
 * Batch fetch images — single DB + MinIO round-trip for all IDs.
 * Returns a map keyed by image id so the frontend can preload before PDF export.
 */
export async function getBatchImages(
  ids: string[],
  ds: string,
): Promise<Record<string, { base64: string; contentType: string } | null>> {
  // Deduplicate
  const uniqueIds = [...new Set(ids)];

  // Single DB query for all images (compound PK: id + databaseName)
  const records = await prisma.image.findMany({
    where: {
      id: { in: uniqueIds },
      databaseName: ds,
    },
  });

  // Build a map for O(1) lookup
  const recordMap = new Map(records.map(r => [r.id, r]));

  // Download all MinIO objects in parallel (up to reasonable concurrency)
  const results = await Promise.all(
    uniqueIds.map(async (id) => {
      const record = recordMap.get(id);
      if (!record) {
        // qrcode is a special virtual image generated on-the-fly
        if (id === 'qrcode') {
          const { buffer, contentType } = await buildDefaultQrCode(ds);
          return { id, value: { base64: buffer.toString('base64'), contentType } };
        }
        return { id, value: null };
      }

      let buffer: Buffer | null = null;
      let contentType = 'image/png';

      // MinIO first
      if (record.imageUrl) {
        const buf = await minio.download(record.imageUrl);
        if (buf) {
          buffer = buf;
          contentType = detectMimeType(record.imageUrl);
        }
      }

      // Fallback: blob from DB
      if (!buffer && record.imageBlob) {
        buffer = Buffer.from(record.imageBlob);
      }

      if (!buffer) return { id, value: null };

      return {
        id,
        value: { base64: buffer.toString('base64'), contentType },
      };
    }),
  );

  return Object.fromEntries(results.map(r => [r.id, r.value]));
}

export async function getImage(imageId: string, ds: string) {
  // Use findUnique for compound key, findFirst for simple key
  const record = ds
    ? await prisma.image.findUnique({ where: { id_databaseName: { id: imageId, databaseName: ds } } })
    : await prisma.image.findFirst({ where: { id: imageId } });

  if (!record) {
    if (imageId === 'qrcode') {
      return buildDefaultQrCode(ds);
    }
    return null;
  }

  // If stored in MinIO (imageUrl is set), download from MinIO
  if (record.imageUrl) {
    const buffer = await minio.download(record.imageUrl);
    if (buffer) {
      return { buffer, contentType: detectMimeType(record.imageUrl) };
    }
  }

  // Fallback: return blob from DB
  if (record.imageBlob) {
    return { buffer: Buffer.from(record.imageBlob), contentType: 'image/png' };
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
  // Delete from MinIO if stored there
  const record = ds
    ? await prisma.image.findUnique({ where: { id_databaseName: { id: imageId, databaseName: ds } } })
    : await prisma.image.findFirst({ where: { id: imageId } });

  if (record?.imageUrl) {
    await minio.delete(record.imageUrl);
  }

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
