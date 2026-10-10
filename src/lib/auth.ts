import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export type Role = "OWNER" | "OFFICE" | "FLOOR" | "BUYER";

export interface SessionUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
  buyerId?: string | null;
}

const SESSION_COOKIE = "texflow_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "texflow-everest-textile-secret-key-2026-auth";

// HMAC-SHA256 signature using Web Crypto
async function sign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

async function verify(data: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return await crypto.subtle.verify(
    "HMAC",
    key,
    Buffer.from(signature, "base64url"),
    encoder.encode(data)
  );
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser): Promise<void> {
  const payload = JSON.stringify(user);
  const sig = await sign(payload);
  const token = `${Buffer.from(payload).toString("base64url")}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;

    const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    const isValid = await verify(payload, sig);
    if (!isValid) return null;

    const user = JSON.parse(payload) as SessionUser;
    return user;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Session required");
  }
  return session;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`FORBIDDEN: Role ${session.role} does not have access`);
  }
  return session;
}
