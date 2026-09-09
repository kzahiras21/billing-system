// test-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Mencoba koneksi ke database...");

    // Query sederhana mengambil data admin
    const users = await prisma.user.findMany();

    if (users.length > 0) {
        console.log("✅ BERHASIL! Database terhubung.");
        console.log("Data User ditemukan:", users);
    } else {
        console.log("⚠️ Database terhubung, tapi tabel User masih kosong.");
    }
}

main()
    .catch((e) => {
        console.error("❌ GAGAL terhubung ke database:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
