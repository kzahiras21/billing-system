import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isolateClient } from "@/lib/mikrotik";
import { sendIsolirNotification } from "@/lib/notifications";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const today = new Date();
    
    // Find UNPAID invoices that are past their due date + grace period (e.g. 3 days)
    const gracePeriodDays = 3;
    const gracePeriodThreshold = new Date();
    gracePeriodThreshold.setDate(today.getDate() - gracePeriodDays);

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: "UNPAID",
        dueDate: { lt: gracePeriodThreshold },
        subscriber: { status: "ACTIVE" } // Only process active subscribers
      },
      include: { subscriber: { include: { device: true } } }
    });

    let frozenCount = 0;

    for (const invoice of overdueInvoices) {
      // 1. Mark Invoice as OVERDUE
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" }
      });

      // 2. Freeze Subscriber
      await prisma.subscriber.update({
        where: { id: invoice.subscriber.id },
        data: { status: "FREEZE" }
      });

      // 3. Trigger Mikrotik Isolir
      if (invoice.subscriber.device?.macAddress) {
        await isolateClient(invoice.subscriber.device.macAddress);
      }

      // 4. Send Notification
      await sendIsolirNotification(invoice.subscriber.phone, invoice.subscriber.email);
      
      frozenCount++;
    }

    if (frozenCount > 0) {
      await prisma.auditLog.create({
        data: {
          action: "CRON_DUNNING_FREEZE",
          entity: "System",
          entityId: "CronJob",
          newValue: JSON.stringify({ frozenCount }),
          actorId: "system",
          actorRole: "SYSTEM"
        }
      });
    }

    return NextResponse.json({ success: true, frozen: frozenCount });
  } catch (error) {
    console.error("Daily Check Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
