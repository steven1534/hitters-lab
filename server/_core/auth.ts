/**
 * Email + Password authentication — replaces Manus OAuth
 * Uses bcryptjs for password hashing and jose for JWT session tokens
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { ENV } from "./env";
import * as db from "../db";
import type { User } from "../../drizzle/schema";

export type SessionPayload = {
  userId: number;
  email: string;
};

// ── Password utilities ──────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ── JWT session utilities ───────────────────────────────────

function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function createSessionToken(userId: number, email: string): Promise<string> {
  const expirationSeconds = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const { userId, email } = payload as Record<string, unknown>;
    if (typeof userId !== "number" || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}

// ── Request authentication ──────────────────────────────────

export async function authenticateRequest(req: Request): Promise<User> {
  const cookieHeader = req.headers.cookie;
  const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
  const token = cookies[COOKIE_NAME];

  const session = await verifySessionToken(token);
  if (!session) throw ForbiddenError("Invalid or missing session");

  const user = await db.getUserById(session.userId);
  if (!user) throw ForbiddenError("User not found");

  // Update last signed in (fire and forget)
  db.updateLastSignedIn(user.id).catch(() => {});

  return user;
}
