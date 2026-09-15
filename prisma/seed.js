const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const adminTotpSecret = process.env.BOOTSTRAP_ADMIN_TOTP_SECRET;

  if (!adminEmail || !adminPassword || adminPassword.length < 14 || !adminTotpSecret) {
    throw new Error(
      'Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD (>=14 chars), and BOOTSTRAP_ADMIN_TOTP_SECRET before seeding.'
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      passwordHash,
      twoFactorSecret: adminTotpSecret,
      twoFactorEnabled: true,
      sessionVersion: { increment: 1 },
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      twoFactorSecret: adminTotpSecret,
      twoFactorEnabled: true,
    },
  });

  const systemPassword = crypto.randomBytes(48).toString('hex');
  await prisma.user.upsert({
    where: { email: 'system@internal.invalid' },
    update: {},
    create: {
      email: 'system@internal.invalid',
      name: 'System Automation',
      passwordHash: await bcrypt.hash(systemPassword, 12),
      role: 'SYSTEM',
      twoFactorEnabled: false,
    },
  });

  console.log('Secure bootstrap users seeded. No credentials were printed.');
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : 'Seed failed');
    await prisma.$disconnect();
    process.exit(1);
  });
