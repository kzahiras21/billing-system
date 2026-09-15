import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { prisma } from "@/lib/db";
import { clientIp, signSession } from "@/lib/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const TWO_FACTOR_REQUIRED_ROLES = new Set(["SUPER_ADMIN", "FINANCE"]);

function safeText(value: unknown, max = 254) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const ipAddress = clientIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

  try {
    const body = await req.json();
    const email = safeText(body.email).toLowerCase();
    const password = safeText(body.password, 200);
    const twoFactorCode = safeText(body.twoFactorCode, 12).replace(/\s/g, "");

    if (!email || !password || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Keep response intentionally generic to prevent account enumeration.
    if (!user) {
      await bcrypt.compare(password, "$2b$12$7EqJtq98hPqEX7fNZaFWoO5V2B6f4n9v6n4dP/7v8p4Sq7W8xQp4S").catch(() => false);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json({ error: "Account temporarily locked. Try again later." }, { status: 423 });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60_000)
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockedUntil ? 0 : attempts,
          lockedUntil,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "LOGIN_FAILED",
          entity: "User",
          entityId: user.id,
          actorId: user.id,
          actorRole: user.role,
          ipAddress,
          userAgent,
        },
      }).catch(() => undefined);

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (TWO_FACTOR_REQUIRED_ROLES.has(user.role) && !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication must be configured before this account can access billing data.", requires2FASetup: true },
        { status: 403 },
      );
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return NextResponse.json({ requires2FA: true }, { status: 200 });
      }
      if (!user.twoFactorSecret) {
        return NextResponse.json({ error: "2FA configuration is invalid. Contact IT." }, { status: 403 });
      }
      const valid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorCode,
        window: 1,
      });
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
    }

    const token = signSession({
      userId: user.id,
      role: user.role as "SUPER_ADMIN" | "BOD" | "FINANCE" | "MARKETING" | "SYSTEM",
      email: user.email,
      sessionVersion: user.sessionVersion,
    });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          actorId: user.id,
          actorRole: user.role,
          ipAddress,
          userAgent,
        },
      }),
    ]);

    const response = NextResponse.json({ success: true, redirect: "/dashboard" });
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60,
      path: "/",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
