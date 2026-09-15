import { prisma } from "@/lib/db";
import { calculateProratedAmount, calculateTax, dueDateFor, TAX_RATE_BPS } from "@/lib/billing";

export async function generateMonthlyInvoices(now = new Date()) {
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

    try {
      await prisma.invoice.create({
        data: {
          subscriberId: sub.id,
          billingYear,
          billingMonth,
          amount: subtotal,
          taxRateBps: TAX_RATE_BPS,
          taxAmount,
          totalAmount: subtotal + taxAmount,
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
      if (typeof error === "object" && error && "code" in error && error.code === "P2002") continue;
      throw error;
    }
  }

  return { generatedCount, billingYear, billingMonth };
}
