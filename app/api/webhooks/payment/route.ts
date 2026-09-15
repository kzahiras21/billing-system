import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { unIsolateClient } from "@/lib/mikrotik";
import { sendPaymentThanksNotification } from "@/lib/notifications";

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || secret.length < 24 || !signatureHeader) return false;

  const received = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(received)) return false;

  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

function toRupiah(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    if (rawBody.length > 64_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Generic HMAC adapter until the company chooses the payment gateway.
    // Replace this verifier with the provider's documented signature algorithm when selected.
    if (!verifyWebhookSignature(rawBody, req.headers.get("x-webhook-signature"))) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const transactionId = String(body.transaction_id || "").slice(0, 200);
    const invoiceId = String(body.order_id || "").slice(0, 200);
    const transactionStatus = String(body.transaction_status || "").toLowerCase();
    const paymentType = String(body.payment_type || "UNKNOWN").slice(0, 80);
    const amountPaid = toRupiah(body.gross_amount);

    if (!transactionId || !invoiceId || amountPaid === null) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const existingTransaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId },
    });
    if (existingTransaction) {
      return NextResponse.json({ success: true, message: "Transaction already processed" });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { subscriber: { include: { device: true } } },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const settled = transactionStatus === "settlement" || transactionStatus === "capture";
    const denied = ["deny", "expire", "cancel"].includes(transactionStatus);
    let paymentStatus = settled ? "SETTLEMENT" : denied ? "DENY" : "PENDING";
    let invoiceStatus = invoice.status;
    let paidAt: Date | null = invoice.paidAt;

    // Partial payment, overpayment, and true double-payment policies are still unanswered.
    // Fail safe: exact amount only can auto-settle. Anything else requires Finance review.
    if (settled) {
      if (invoice.status === "PAID" || amountPaid !== invoice.totalAmount) {
        paymentStatus = "REVIEW";
        invoiceStatus = "NEED_REVIEW";
      } else {
        invoiceStatus = "PAID";
        paidAt = new Date();
      }
    }

    const systemUser = await prisma.user.findFirst({ where: { role: "SYSTEM" } });
    const operations = [
      prisma.paymentTransaction.create({
        data: {
          transactionId,
          invoiceId,
          amountPaid,
          paymentMethod: paymentType,
          status: paymentStatus,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: invoiceStatus, paidAt },
      }),
    ];

    if (systemUser) {
      operations.push(
        prisma.auditLog.create({
          data: {
            action: "WEBHOOK_PAYMENT_RECEIVED",
            entity: "Invoice",
            entityId: invoiceId,
            newValue: JSON.stringify({ transactionId, paymentStatus, amountPaid, invoiceStatus }),
            actorId: systemUser.id,
            actorRole: "SYSTEM",
          },
        }) as never,
      );
    }

    await prisma.$transaction(operations);

    if (invoiceStatus === "PAID") {
      // Freeze semantics are not finalized by the company, so network restoration is opt-in.
      if (process.env.ENABLE_AUTOMATIC_UNISOLATION === "true" && invoice.subscriber.status === "FREEZE") {
        const restored = invoice.subscriber.device?.macAddress
          ? await unIsolateClient(invoice.subscriber.device.macAddress)
          : false;
        if (restored) {
          await prisma.subscriber.update({
            where: { id: invoice.subscriber.id },
            data: { status: "ACTIVE" },
          });
        }
      }

      await sendPaymentThanksNotification(
        invoice.subscriber.phone,
        invoice.subscriber.email,
        invoice.id,
        amountPaid,
      );
    }

    return NextResponse.json({ success: true, paymentStatus, invoiceStatus });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
