import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateMonthlyInvoices } from "@/lib/invoice-generator";

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
    const result = await generateMonthlyInvoices();
    const systemUser = await prisma.user.findFirst({ where: { role: "SYSTEM" } });
    if (systemUser) {
      await prisma.auditLog.create({
        data: {
          action: "CRON_GENERATE_INVOICE",
          entity: "System",
          entityId: "CronJob",
          newValue: JSON.stringify(result),
          actorId: systemUser.id,
          actorRole: "SYSTEM",
        },
      });
    }
    return NextResponse.json({ success: true, generated: result.generatedCount, ...result });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
