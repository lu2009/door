import { loadSeedEnv } from './seed-env';

loadSeedEnv();

import { PrismaClient } from '@prisma/client';
import { seedDefaultLoginSettings, seedDefaultUser } from './seed-default-user';

const prisma = new PrismaClient();

async function main() {
  await seedDefaultUser(prisma);
  console.log('Default user seeded.');
  await seedDefaultLoginSettings(prisma);
  console.log('Default login settings seeded.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
