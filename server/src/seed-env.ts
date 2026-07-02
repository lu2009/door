import dotenv from 'dotenv';
import { existsSync } from 'fs';

export function loadSeedEnv(): void {
  dotenv.config({ path: '.env.local' });
  dotenv.config();

  if (!existsSync('/.dockerenv') && process.env.DATABASE_URL?.includes('@db:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@db:', '@localhost:');
  }
}
