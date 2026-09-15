import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export type AppRole = "SUPER_ADMIN" | "BOD" | "FINANCE" | "MARKETING" | "SYSTEM";

type SessionClaims = JwtPayload & {
  userId: string;
  role: AppRole;
  email: string;
  sessionVersion: number;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters");
  }
  return secret;
}

export function signSession(input: { userId: string; role: AppRole; email: string; sessionVersion: number }) {
  return jwt.sign(input, getJwtSecret(), {
    expiresIn: "1h",
    issuer: "isp-billing",
    audience: "isp-billing-dashboard",
    algorithm: "HS256",
  });
}

export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "isp-billing",
      audience: "isp-billing-dashboard",
      algorithms: ["HS256"],
    });
    if (typeof payload === "string" || !payload.userId || !payload.role || !payload.email) return null;
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("auth_token")?.value;
  if (!raw) return null;

  const session = verifySessionToken(raw);
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.sessionVersion) return null;

  return user;
}

export async function requireUser(allowedRoles?: AppRole[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (allowedRoles && !allowedRoles.includes(user.role as AppRole)) redirect("/dashboard");
  return user;
}

export function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
