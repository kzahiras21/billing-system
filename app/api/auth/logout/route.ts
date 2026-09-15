import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const token = req.headers.get("cookie")?.match(/(?:^|;\s*)auth_token=([^;]+)/)?.[1];
  if (token) {
    const session = verifySessionToken(decodeURIComponent(token));
    if (session) {
      await prisma.auditLog.create({
        data: {
          action: "LOGOUT",
          entity: "User",
          entityId: session.userId,
          actorId: session.userId,
          actorRole: session.role,
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown",
          userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
        },
      }).catch(() => undefined);
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
