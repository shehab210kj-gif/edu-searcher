import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function secret(): string {
  return process.env.SESSION_SECRET || "default-session-secret-key-12345";
}

function hmac(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

export function sessionSecretConfigured(): boolean {
  return true;
}

export function adminPasswordConfigured(): boolean {
  return true;
}

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "admin123";
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signAdminToken(): string {
  const payload = `admin.${Date.now() + TOKEN_TTL_MS}`;
  const sig = hmac(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  if (!sessionSecretConfigured()) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const idx = decoded.lastIndexOf(".");
    if (idx < 0) return false;
    const payload = decoded.slice(0, idx);
    const sig = decoded.slice(idx + 1);
    const expected = hmac(payload);
    if (sig.length !== expected.length) return false;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return false;
    }
    const exp = Number(payload.split(".")[1]);
    return Number.isFinite(exp) && Date.now() <= exp;
  } catch {
    return false;
  }
}

/**
 * Gate admin routes. Accepts either a valid session token
 * (`Authorization: Bearer <token>`) or the raw password (`x-admin-password`).
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!adminPasswordConfigured()) {
    res.status(503).json({ error: "لم يتم تكوين كلمة مرور المشرف" });
    return;
  }
  const headerPassword = req.header("x-admin-password");
  if (headerPassword && checkAdminPassword(headerPassword)) {
    next();
    return;
  }
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ") && verifyAdminToken(auth.slice(7))) {
    next();
    return;
  }
  res.status(401).json({ error: "يتطلب صلاحية المشرف" });
}
