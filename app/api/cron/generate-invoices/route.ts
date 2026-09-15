import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateProratedAmount, calculateTax, dueDateFor, TAX_RATE_BPS } from "@/lib/billing";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 24) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const billingYear = now.getFullYear();
    const billingMonth = now.getMonth() + 1;

    const activeSubscribers = await prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      include: { product: true },
    });

    let generatedCount = 0;

    for (const sub of activeSubscribers) {
      const monthlyPrice = sub.agreedMonthlyPrice ?? sub.product.basePrice;
      const isActivationMonth = !!sub.activationDate
        && sub.activationDate.getFullYear() === billingYear
        && sub.activationDate.getMonth() + 1 === billingMonth;

      const serviceAmount = isActivationMonth && sub.activationDate
        ? calculateProratedAmount(monthlyPrice, sub.activationDate)
        : monthlyPrice;

      const previousInvoiceCount = await prisma.invoice.count({ where: { subscriberId: sub.id } });
      const registrationFee = previousInvoiceCount === 0 ? sub.registrationFee : 0;
      const subtotal = serviceAmount + registrationFee;
      const taxAmount = calculateTax(subtotal, TAX_RATE_BPS);
      const totalAmount = subtotal + taxAmount;

      try {
        await prisma.invoice.create({
          data: {
            subscriberId: sub.id,
            billingYear,
            billingMonth,
            amount: subtotal,
            taxRateBps: TAX_RATE_BPS,
            taxAmount,
            totalAmount,
            status: "UNPAID",
            dueDate: dueDateFor(billingYear, billingMonth - 1),
            items: {
              create: [
                {
                  description: `${sub.product.name}${isActivationMonth ? " (prorata)" : ""}`,
                  quantity: 1,
                  unitAmount: serviceAmount,
                  lineAmount: serviceAmount,
                },
                ...(registrationFee > 0 ? [{
                  description: "Biaya registrasi",
                  quantity: 1,
                  unitAmount: registrationFee,
                  lineAmount: registrationFee,
                }] : []),
              ],
            },
          },
        });
        generatedCount++;
      } catch (error: unknown) {
        // Unique (subscriber, year, month) prevents duplicate billing even when cron is retried.
        if (typeof error === "object" && error && "code" in error && error.code === "P2002") continue;
        throw error;
      }
    }

    const systemUser = await prisma.user.findFirst({ where: { role: "SYSTEM" } });
    if (systemUser) {
      await prisma.auditLog.create({
        data: {
          action: "CRON_GENERATE_INVOICE",
          entity: "System",
          entityId: "CronJob",
          newValue: JSON.stringify({ billingYear, billingMonth, generatedCount }),
          actorId: systemUser.id,
          actorRole: "SYSTEM",
        },
      });
    }

    return NextResponse.json({ success: true, generated: generatedCount, billingYear, billingMonth });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
