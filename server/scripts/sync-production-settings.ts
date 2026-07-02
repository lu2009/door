import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

if (!process.env.DATABASE_URL?.startsWith('postgresql://') && !process.env.DATABASE_URL?.startsWith('postgres://')) {
  // Let Prisma report the final missing/invalid DATABASE_URL error.
} else if (process.env.DATABASE_URL.includes('@db:')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@db:', '@localhost:');
}

const PROD_BASE_URL = process.env.PROD_BASE_URL || 'https://www.samrtdoor.com.cn';
const PROD_USERNAME = process.env.PROD_USERNAME;
const PROD_PASSWORD = process.env.PROD_PASSWORD;
const LOCAL_DS = process.env.LOCAL_DS || 'smartdoor';

const SETTING_KEYS = [
  'copy',
  'custom_direction_names',
  'declaration',
  'diao_column',
  'diao_tabs',
  'pagesize',
  'ping_column',
  'ping_tabs',
  'template',
];

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Example: ${name}=... npm run sync:prod-settings`);
  }
  return value;
}

async function fetchProductionRegistrant() {
  const username = requireEnv('PROD_USERNAME', PROD_USERNAME);
  const password = requireEnv('PROD_PASSWORD', PROD_PASSWORD);
  const url = new URL('/1', PROD_BASE_URL);
  url.searchParams.set('param1', 'login');
  url.searchParams.set('param2', username);
  url.searchParams.set('param3', password);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Production login failed: HTTP ${res.status}`);
  }

  const data = await res.json() as unknown;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') {
    throw new Error('Production login returned an unexpected response shape');
  }

  const registrant = (data[0] as Record<string, unknown>).registrant;
  if (!registrant || typeof registrant !== 'object' || Array.isArray(registrant)) {
    throw new Error('Production login response does not include registrant settings');
  }
  return registrant as Record<string, unknown>;
}

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const registrant = await fetchProductionRegistrant();
  const synced: string[] = [];
  const missing: string[] = [];

  try {
    for (const key of SETTING_KEYS) {
      if (!(key in registrant)) {
        missing.push(key);
        continue;
      }
      await prisma.setting.upsert({
        where: { databaseName_key: { databaseName: LOCAL_DS, key } },
        update: { value: JSON.stringify(registrant[key], null, 2) },
        create: { databaseName: LOCAL_DS, key, value: JSON.stringify(registrant[key], null, 2) },
      });
      synced.push(key);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Synced production registrant settings to ${LOCAL_DS}: ${synced.join(', ')}`);
  if (missing.length) console.warn(`Production response missing keys: ${missing.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
