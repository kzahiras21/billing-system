import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isolateClient } from "@/lib/mikrotik";
import { sendIsolirNotification } from "@/lib/notifications";

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
    const today = new Date();

    // Requirement still needs company confirmation: automatic isolation is OFF by default.
    const automaticIsolation = process.env.ENABLE_AUTOMATIC_ISOLATION === "true";
    const gracePeriodDays = Math.max(0, Number(process.env.GRACE_PERIOD_DAYS || "3"));
    const isolationThreshold = new Date(today);
    isolationThreshold.setDate(today.getDate() - gracePeriodDays);

    const unpaidPastDue = await prisma.invoice.findMany({
      where: {
        status: "UNPAID",
        dueDate: { lt: today },
      },
      include: { subscriber: { include: { device: true } } },
    });

    let overdueCount = 0;
    let isolatedCount = 0;

    for (const invoice of unpaidPastDue) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "OVERDUE" },
      });
      overdueCount++;

      if (
        automaticIsolation
        && invoice.dueDate < isolationThreshold
        && invoice.subscriber.status === "ACTIVE"
      ) {
        const networkSucceeded = invoice.subscriber.device?.macAddress
          ? await isolateClient(invoice.subscriber.device.macAddress)
          : false;

        if (networkSucceeded) {
          await prisma.subscriber.update({
            where: { id: invoice.subscriber.id },
            data: { status: "FREEZE" },
          });
          await sendIsolirNotification(invoice.subscriber.phone, invoice.subscriber.email);
          isolatedCount++;
        }
      }
    }

    const systemUser = await prisma.user.findFirst({ where: { role: "SYSTEM" } });
    if (systemUser && (overdueCount > 0 || isolatedCount > 0)) {
      await prisma.auditLog.create({
        data: {
          action: "CRON_DUNNING_CHECK",
          entity: "System",
          entityId: "CronJob",
          newValue: JSON.stringify({ overdueCount, isolatedCount, automaticIsolation, gracePeriodDays }),
          actorId: systemUser.id,
          actorRole: "SYSTEM",
        },
      });
    }

    return NextResponse.json({
      success: true,
      overdue: overdueCount,
      isolated: isolatedCount,
      automaticIsolation,
    });
  } catch (error) {
    console.error("Daily Check Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
