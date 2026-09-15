// Development-only database connectivity check. Never print user records or password hashes.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  console.log(`Database connected. User rows: ${userCount}`);
}

main()
  .catch((error) => {
    console.error('Database connectivity check failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
