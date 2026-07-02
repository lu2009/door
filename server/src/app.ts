import path from 'path';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { config } from './config';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});
import { errorHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { clientRouter } from './modules/client/client.routes';
import { orderRouter } from './modules/order/order.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { financeRouter } from './modules/finance/finance.routes';
import { formulaRouter } from './modules/formula/formula.routes';
import { settingsRouter } from './modules/settings/settings.routes';
import { fileRouter } from './modules/file/file.routes';
import { scannerRouter } from './modules/scanner/scanner.routes';
import { shortLinkRouter } from './modules/shortlink/shortlink.routes';

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigins === '*' ? '*' : config.corsOrigins.split(','), credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
app.get('/readyz', async (_req, res) => {
  const { checkDatabase } = await import('./database');
  const dbOk = await checkDatabase();
  if (!dbOk) {
    res.status(503).json({ status: 'not ready', db: 'unreachable' });
    return;
  }
  res.json({ status: 'ready', db: 'ok' });
});

// Legacy compatibility endpoint — single dispatch (supports JSON + multipart)
app.all('/1', (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.any()(req, res, async () => {
      try {
        const { legacyDispatch } = await import('./modules/legacy-dispatch');
        await legacyDispatch(req, res);
      } catch (err) { next(err); }
    });
  } else {
    (async () => {
      try {
        const { legacyDispatch } = await import('./modules/legacy-dispatch');
        await legacyDispatch(req, res);
      } catch (err) { next(err); }
    })();
  }
});
app.all('/login', async (req, res, next) => {
  try {
    const { legacyDispatch } = await import('./modules/legacy-dispatch');
    await legacyDispatch(req, res);
  } catch (err) {
    next(err);
  }
});

// Short link redirect
app.get('/s/:linkId', async (req, res, next) => {
  try {
    const { prisma } = await import('./database');
    const link = await prisma.shortLink.findUnique({ where: { id: req.params.linkId } });
    if (!link?.url) {
      res.status(404).send('Link not found');
      return;
    }
    res.redirect(302, link.url);
  } catch (err) {
    next(err);
  }
});

// Mount module routers — under /api/v1
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/clients', clientRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/finance', financeRouter);
app.use('/api/v1/formulas', formulaRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/files', fileRouter);
app.use('/api/v1/scanner', scannerRouter);
app.use('/api/v1/shortlink', shortLinkRouter);

// Serve static frontend (API test console at root)
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Error handler
app.use(errorHandler);

export { app };
