const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

function encryptionKey() {
  const encoded = process.env.FIELD_ENCRYPTION_KEY;
  if (!encoded) throw new Error('FIELD_ENCRYPTION_KEY is required');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 random bytes encoded as base64');
  return key;
}

function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

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
      twoFactorSecret: encryptSecret(adminTotpSecret),
      twoFactorEnabled: true,
      sessionVersion: { increment: 1 },
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: 'Super Admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      twoFactorSecret: encryptSecret(adminTotpSecret),
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
