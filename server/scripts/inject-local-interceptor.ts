import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type CliOptions = {
  outputDir: string;
};

const LOCAL_INTERCEPTOR_RELATIVE_PATH = path.join('js', 'local-request-interceptor.js');
const LOCAL_INTERCEPTOR_SCRIPT_SRC = '/js/local-request-interceptor.js';
const LOCAL_INTERCEPTOR_SOURCE_PATH = path.resolve(__dirname, 'local-request-interceptor.js');

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputDir: path.resolve(process.cwd(), '..', 'frontend'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--output-dir' && next) {
      options.outputDir = path.resolve(process.cwd(), next);
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
  console.log(`注入本地拦截器

用法:
  npm run inject:local-interceptor -- [--output-dir <dir>]

说明:
  1. 复制 server/scripts/local-request-interceptor.js 到目标 frontend/js/
  2. 向目标 index.html 注入 /js/local-request-interceptor.js
  3. 不同步任何前端资源
`);
}

function saveFile(rootDir: string, relativePath: string, content: Buffer | string) {
  const fullPath = path.join(rootDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

function ensureLocalInterceptorSource(): string {
  if (!fs.existsSync(LOCAL_INTERCEPTOR_SOURCE_PATH)) {
    throw new Error(`未找到本地拦截器源文件: ${LOCAL_INTERCEPTOR_SOURCE_PATH}`);
  }
  return fs.readFileSync(LOCAL_INTERCEPTOR_SOURCE_PATH, 'utf8');
}

function injectLocalInterceptor(indexHtml: string): string {
  if (indexHtml.includes(LOCAL_INTERCEPTOR_SCRIPT_SRC)) return indexHtml;

  const interceptorTag = `    <script src="${LOCAL_INTERCEPTOR_SCRIPT_SRC}"></script>`;
  const moduleScriptPattern = /(\s*)<script\b[^>]*type=["']module["'][^>]*>/i;
  if (moduleScriptPattern.test(indexHtml)) {
    return indexHtml.replace(moduleScriptPattern, `$1${interceptorTag}\n$&`);
  }

  if (indexHtml.includes('</head>')) {
    return indexHtml.replace('</head>', `${interceptorTag}\n  </head>`);
  }

  if (indexHtml.includes('</body>')) {
    return indexHtml.replace('</body>', `${interceptorTag}\n  </body>`);
  }

  return `${indexHtml}\n${interceptorTag}\n`;
}

export function injectInterceptorIntoFrontend(outputDir: string) {
  const indexPath = path.join(outputDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`未找到前端入口文件: ${indexPath}`);
  }

  const interceptorContent = ensureLocalInterceptorSource();
  saveFile(outputDir, LOCAL_INTERCEPTOR_RELATIVE_PATH, interceptorContent);

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  fs.writeFileSync(indexPath, injectLocalInterceptor(indexHtml));

  console.log(`已复制本地拦截器到: ${path.join(outputDir, LOCAL_INTERCEPTOR_RELATIVE_PATH)}`);
  console.log(`已注入拦截器脚本到: ${indexPath}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  injectInterceptorIntoFrontend(options.outputDir);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
