import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { injectInterceptorIntoFrontend } from './inject-local-interceptor';

type CliOptions = {
  outputDir: string;
  baseUrl: string;
};

const STATIC_DIR_NAMES = [
  'js',
  'css',
  'png',
  'img',
  'images',
  'fonts',
  'vendor',
];

const ALLOWED_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.map',
  '.json',
  '.gz',
]);

const TEXT_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.map',
]);

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputDir: path.resolve(process.cwd(), '..', 'frontend'),
    baseUrl: 'https://www.samrtdoor.com.cn/',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--output-dir' && next) {
      options.outputDir = path.resolve(process.cwd(), next);
      i += 1;
      continue;
    }
    if (arg === '--base-url' && next) {
      options.baseUrl = next;
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`未知参数: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`同步生产前端资源

用法:
  npm run sync:prod-frontend -- [--base-url <url>] [--output-dir <dir>]

说明:
  1. 从生产首页抓取 index.html
  2. 递归下载页面和 chunk 引用到的同域静态资源
  3. 额外尝试补齐 js/css/gif.worker.js 的 .gz 伴生文件
  4. 仅同步本域前端资源，不拉第三方 CDN
`);
}

function ensureCommand(command: string) {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
  } catch {
    throw new Error(`缺少依赖命令: ${command}`);
  }
}

function fetchBuffer(url: string): Buffer {
  return execFileSync(
    'curl',
    ['-fsSL', '--max-redirs', '5', '-A', 'Mozilla/5.0', url],
    { maxBuffer: 32 * 1024 * 1024 },
  );
}

function fetchText(url: string): string {
  return fetchBuffer(url).toString('utf8');
}

function downloadToFile(url: string, destination: string) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  execFileSync(
    'curl',
    ['-fsSL', '--max-redirs', '5', '-A', 'Mozilla/5.0', '-o', destination, url],
    { stdio: 'ignore' },
  );
}

function tryFetchText(url: string): string | null {
  try {
    return fetchText(url);
  } catch (error) {
    console.warn(`[warn] 跳过文本资源: ${url}`);
    console.warn(String(error));
    return null;
  }
}

function tryDownloadToFile(url: string, destination: string): boolean {
  try {
    downloadToFile(url, destination);
    return true;
  } catch (error) {
    console.warn(`[warn] 跳过二进制资源: ${url}`);
    console.warn(String(error));
    return false;
  }
}

function clearDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }

  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function normalizeBaseUrl(baseUrl: string): URL {
  const url = new URL(baseUrl);
  if (!url.pathname.endsWith('/')) {
    url.pathname = `${url.pathname}/`;
  }
  return url;
}

function shouldDownload(url: URL, baseUrl: URL): boolean {
  if (url.origin !== baseUrl.origin) return false;
  if (url.pathname === '/' || url.pathname === '') return true;
  const extension = path.extname(url.pathname).toLowerCase();
  return ALLOWED_EXTENSIONS.has(extension);
}

function shouldAttemptGzip(relativePath: string): boolean {
  return relativePath.endsWith('.js')
    || relativePath.endsWith('.css')
    || relativePath.endsWith('gif.worker.js');
}

function buildGzipUrl(url: URL): URL {
  const gzUrl = new URL(url.toString());
  gzUrl.pathname = `${gzUrl.pathname}.gz`;
  return gzUrl;
}

function buildRelativeAssetUrl(value: string): string {
  const cleaned = value.trim().replace(/^['"`]|['"`]$/g, '');
  if (!cleaned) return cleaned;
  if (cleaned.startsWith('/')) return cleaned;
  if (cleaned.startsWith('./') || cleaned.startsWith('../')) return cleaned;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(cleaned)) return cleaned;
  if (STATIC_DIR_NAMES.some((dirName) => cleaned.startsWith(`${dirName}/`))) {
    return `/${cleaned}`;
  }
  return `./${cleaned}`;
}

function toLocalRelativePath(url: URL): string {
  if (url.pathname === '/' || url.pathname === '') {
    return 'index.html';
  }

  const decodedPath = decodeURIComponent(url.pathname);
  const trimmed = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
  return trimmed || 'index.html';
}

function saveFile(rootDir: string, relativePath: string, content: Buffer | string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function extractUrlsFromContent(content: string, currentUrl: URL, baseUrl: URL): URL[] {
  const results = new Map<string, URL>();
  const addCandidate = (rawValue: string) => {
    const value = buildRelativeAssetUrl(rawValue.trim());
    if (!value || value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('mailto:')) {
      return;
    }

    try {
      const resolved = new URL(value, currentUrl);
      resolved.hash = '';
      if (!shouldDownload(resolved, baseUrl)) return;
      results.set(resolved.toString(), resolved);
    } catch {
      // Ignore malformed URLs from bundled assets.
    }
  };

  const attributePattern = /\b(?:src|href)\s*=\s*["']([^"'#]+)["']/g;
  for (const match of content.matchAll(attributePattern)) {
    addCandidate(match[1]);
  }

  const cssUrlPattern = /url\((['"]?)([^'")]+)\1\)/g;
  for (const match of content.matchAll(cssUrlPattern)) {
    addCandidate(match[2]);
  }

  const jsStringPathPattern = /["'`]((?:\/|\.\/|\.\.\/)[^"'`?#]+\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map|json|gz))(["'`])/g;
  for (const match of content.matchAll(jsStringPathPattern)) {
    addCandidate(match[1]);
  }

  const absoluteSameOriginPattern = /["'`](https?:\/\/[^"'`?#]+\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map|json|gz))["'`]/g;
  for (const match of content.matchAll(absoluteSameOriginPattern)) {
    addCandidate(match[1]);
  }

  const bareAssetPattern = new RegExp(
    `["'\`]((?:${STATIC_DIR_NAMES.join('|')})\\/[^"'\\\`?#]+\\.(?:js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|map|json|gz))["'\`]`,
    'g',
  );
  for (const match of content.matchAll(bareAssetPattern)) {
    addCandidate(match[1]);
  }

  return [...results.values()];
}

function enqueueIfNeeded(queue: URL[], visited: Set<string>, url: URL) {
  const key = url.toString();
  if (!visited.has(key)) {
    queue.push(url);
  }
}

function seedLikelyStaticFiles(baseUrl: URL): URL[] {
  return [
    new URL('/favicon.ico', baseUrl),
    new URL('/print-lock.css', baseUrl),
    new URL('/smartAI.png', baseUrl),
    new URL('/gif.worker.js', baseUrl),
    new URL('/gif.worker.js.gz', baseUrl),
  ];
}

function syncFrontend(options: CliOptions) {
  ensureCommand('curl');

  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const queue: URL[] = [new URL(baseUrl.toString()), ...seedLikelyStaticFiles(baseUrl)];
  const visited = new Set<string>();
  const skipped = new Set<string>();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartdoor-front-sync-'));

  clearDirectory(options.outputDir);

  try {
    while (queue.length > 0) {
      const currentUrl = queue.shift()!;
      const key = currentUrl.toString();
      if (visited.has(key)) continue;
      visited.add(key);

      const relativePath = toLocalRelativePath(currentUrl);
      const extension = path.extname(relativePath).toLowerCase();
      const isTextFile = relativePath === 'index.html' || TEXT_EXTENSIONS.has(extension);

      console.log(`下载: ${currentUrl.toString()}`);

      if (isTextFile) {
        const text = tryFetchText(currentUrl.toString());
        if (text == null) {
          skipped.add(currentUrl.toString());
          continue;
        }
        saveFile(options.outputDir, relativePath, text);

        const nestedUrls = extractUrlsFromContent(text, currentUrl, baseUrl);
        for (const nestedUrl of nestedUrls) {
          enqueueIfNeeded(queue, visited, nestedUrl);
        }

        if (shouldAttemptGzip(relativePath)) {
          enqueueIfNeeded(queue, visited, buildGzipUrl(currentUrl));
        }
        continue;
      }

      const tempFile = path.join(tempDir, relativePath);
      const downloaded = tryDownloadToFile(currentUrl.toString(), tempFile);
      if (!downloaded) {
        skipped.add(currentUrl.toString());
        continue;
      }
      const buffer = fs.readFileSync(tempFile);
      saveFile(options.outputDir, relativePath, buffer);

      if (shouldAttemptGzip(relativePath)) {
        enqueueIfNeeded(queue, visited, buildGzipUrl(currentUrl));
      }
    }

    const indexPath = path.join(options.outputDir, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error(`同步完成后未找到 index.html: ${indexPath}`);
    }

    injectInterceptorIntoFrontend(options.outputDir);

    console.log(`前端资源已同步到: ${options.outputDir}`);
    console.log(`共同步资源: ${visited.size} 个`);
    if (skipped.size > 0) {
      console.log(`跳过资源: ${skipped.size} 个`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  syncFrontend(options);
}

main();
