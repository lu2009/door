/**
 * Development server: serves frontend static files + proxies API to backend.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const fs = require('fs');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const API_PORT = process.env.API_PORT || 5002;
const PORT = process.env.PORT || 5001;

const app = express();
app.use(cors());
app.use(express.json({
  limit: '50mb',
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('application/json');
  },
}));

const INTERCEPTOR_SCRIPT = '<script src="/js/local-request-interceptor.js"></script>';
const INDEX_HTML = path.join(FRONTEND_DIR, 'index.html');

function sendFrontendIndex(res) {
  fs.readFile(INDEX_HTML, 'utf8', (error, html) => {
    if (error) {
      res.status(500).send(error.message);
      return;
    }
    const body = html.includes(INTERCEPTOR_SCRIPT)
      ? html
      : html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n    ${INTERCEPTOR_SCRIPT}`);
    res.type('html').send(body);
  });
}

// Serve frontend static files
app.use(express.static(FRONTEND_DIR));

// Health check
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

// API Proxy
function proxy(targetPath, req, res) {
  const qs = require('url').parse(req.url).search || '';
  const action = (() => {
    try { return new URL(req.url, 'http://localhost').searchParams.get('param1') || ''; } catch { return ''; }
  })();
  const shouldLogLegacy = targetPath === '/1' && [
    'updateCustomerInfo',
    'updataProgress',
    'updateProgress',
    'getTableData',
  ].includes(action);
  const startedAt = Date.now();
  const options = {
    hostname: 'localhost',
    port: API_PORT,
    path: targetPath + qs,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: 'localhost:' + API_PORT }),
  };
  delete options.headers['connection'];
  delete options.headers['transfer-encoding'];

  const preq = http.request(options, (pres) => {
    if (pres.statusCode >= 400) {
      console.log(`[${pres.statusCode}] ${req.method} ${targetPath}`);
    }
    // Disable caching for API responses
    const headers = { ...pres.headers };
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
    if (shouldLogLegacy) {
      const chunks = [];
      pres.on('data', (chunk) => chunks.push(chunk));
      pres.on('end', () => {
        const body = Buffer.concat(chunks);
        console.log(`[legacy] ${req.method} ${action} -> ${pres.statusCode} ${Date.now() - startedAt}ms ${body.toString('utf8').slice(0, 240).replace(/\s+/g, ' ')}`);
        res.writeHead(pres.statusCode, headers);
        res.end(body);
      });
      return;
    }
    res.writeHead(pres.statusCode, headers);
    pres.pipe(res);
  });
  preq.on('error', (e) => res.status(502).json({ error: 'Backend unavailable', detail: e.message }));
  // Forward body. JSON is parsed above; multipart/form-data must stream through unchanged.
  if (req.body !== undefined && req.is('application/json')) {
    const bodyData = JSON.stringify(req.body);
    if (shouldLogLegacy) {
      console.log(`[legacy] ${req.method} ${action} ${qs} body=${bodyData.slice(0, 600).replace(/\s+/g, ' ')}`);
    }
    preq.setHeader('Content-Type', 'application/json');
    preq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    preq.end(bodyData);
  } else if (req.readableEnded || req.complete) {
    preq.end();
  } else {
    let body = [];
    req.on('data', (c) => body.push(c));
    req.on('end', () => preq.end(Buffer.concat(body)));
  }
}

// Middleware: check if request needs proxying
app.use((req, res, next) => {
  const p = req.path;
  const isApi = p === '/1' || p.startsWith('/1/') ||
                p === '/login' ||
                p.startsWith('/api/') || p.startsWith('/s/');

  if (isApi) {
    // For /login without param1, serve SPA page
    if ((p === '/login' || p.startsWith('/login?')) && !req.query.param1) {
      return sendFrontendIndex(res);
    }
    return proxy(p, req, res);
  }

  // For all other GET requests, serve SPA
  if (req.method === 'GET') {
    return sendFrontendIndex(res);
  }

  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Door: http://localhost:${PORT} (API → :${API_PORT})`);
});
