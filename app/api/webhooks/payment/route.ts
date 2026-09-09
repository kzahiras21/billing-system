import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { unIsolateClient } from "@/lib/mikrotik";
import { sendPaymentThanksNotification } from "@/lib/notifications";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Example Payload from Midtrans / Payment Aggregator
    // {
    //   "transaction_id": "trx-12345",
    //   "order_id": "invoice-id-uuid",
    //   "gross_amount": "388500.00",
    //   "transaction_status": "settlement",
    //   "payment_type": "bank_transfer"
    // }

    const { transaction_id, order_id, gross_amount, transaction_status, payment_type } = body;

    if (!transaction_id || !order_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Idempotency Check
    const existingTransaction = await prisma.paymentTransaction.findUnique({
      where: { transactionId: transaction_id }
    });

    if (existingTransaction) {
      // Transaction already processed
      return NextResponse.json({ success: true, message: "Transaction already processed" }, { status: 200 });
    }

    // 2. Validate Invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: order_id },
      include: { subscriber: { include: { device: true } } }
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // 3. Process Payment based on status
    let newInvoiceStatus = invoice.status;
    let paymentStatus = "PENDING";

    if (transaction_status === "settlement" || transaction_status === "capture") {
      newInvoiceStatus = "PAID";
      paymentStatus = "SETTLEMENT";
      
      // Phase 3: Trigger Un-Isolir if the client was frozen
      if (invoice.subscriber.status === "FREEZE") {
        if (invoice.subscriber.device?.macAddress) {
          await unIsolateClient(invoice.subscriber.device.macAddress);
        }
        // Update subscriber status back to ACTIVE
        await prisma.subscriber.update({
          where: { id: invoice.subscriber.id },
          data: { status: "ACTIVE" }
        });
      }

      // Phase 3: Send Thank You Notification
      await sendPaymentThanksNotification(
        invoice.subscriber.phone, 
        invoice.subscriber.email, 
        invoice.id, 
        parseFloat(gross_amount)
      );

    } else if (transaction_status === "deny" || transaction_status === "expire" || transaction_status === "cancel") {
      paymentStatus = "DENY";
    }

    // 4. Update Database in a Transaction
    await prisma.$transaction([
      prisma.paymentTransaction.create({
        data: {
          transactionId: transaction_id,
          invoiceId: order_id,
          amountPaid: parseFloat(gross_amount),
          paymentMethod: payment_type || "UNKNOWN",
          status: paymentStatus
        }
      }),
      prisma.invoice.update({
        where: { id: order_id },
        data: { status: newInvoiceStatus }
      }),
      // Log the event
      prisma.auditLog.create({
        data: {
          action: "WEBHOOK_PAYMENT_RECEIVED",
          entity: "Invoice",
          entityId: order_id,
          newValue: JSON.stringify({ transaction_id, status: paymentStatus }),
          actorId: "system-webhook",
          actorRole: "SYSTEM"
        }
      })
    ]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
