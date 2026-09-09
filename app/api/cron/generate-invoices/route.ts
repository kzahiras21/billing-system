import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // In production, verify an API key here so random people can't trigger this cron
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'secret-cron-key'}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      // For local testing, we'll bypass this check if missing
    }

    const activeSubscribers = await prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      include: { product: true },
    });

    let generatedCount = 0;

    for (const sub of activeSubscribers) {
      if (!sub.product) continue;

      // Kalkulasi PPN 11% (Exclusive: ditambahkan ke harga dasar)
      const basePrice = sub.product.basePrice;
      const taxAmount = basePrice * 0.11;
      const totalAmount = basePrice + taxAmount;

      // Jatuh tempo default: tanggal 10 bulan ini
      const dueDate = new Date();
      dueDate.setDate(10); 
      
      // Prevent double generation for the current month
      const startOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
      const endOfMonth = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);

      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          subscriberId: sub.id,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      if (!existingInvoice) {
        // Generate Invoice
        // We simulate VA and QRIS generation for phase 2
        await prisma.invoice.create({
          data: {
            subscriberId: sub.id,
            amount: basePrice,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            status: "UNPAID",
            dueDate: dueDate,
            virtualAccount: `8800${sub.phone.substring(0,8)}`, // Mock VA
            qrisUrl: `https://mock-qris.com/pay/${sub.id}`
          }
        });
        generatedCount++;
      }
    }

    // Audit Log for system action
    await prisma.auditLog.create({
      data: {
        action: "CRON_GENERATE_INVOICE",
        entity: "System",
        entityId: "CronJob",
        newValue: JSON.stringify({ count: generatedCount }),
        actorId: "system", // Assuming a system user or we can leave it
        actorRole: "SYSTEM"
      }
    }).catch(console.error); // Catch if 'system' actor doesn't exist, normally we'd seed a system user.

    return NextResponse.json({ success: true, generated: generatedCount });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
