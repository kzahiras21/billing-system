const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const secret = speakeasy.generateSecret({ name: 'ISP Billing System' });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@isp.local' },
    update: {},
    create: {
      email: 'admin@isp.local',
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    },
  });

  console.log({ admin });
  console.log(`2FA Secret (base32) for admin: ${secret.base32}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
