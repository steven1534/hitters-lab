/**
 * Auth routes: /api/auth/login, /api/auth/logout, /api/auth/register
 * Replaces Manus OAuth callback routes
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
} from "./auth";

function getCookieOptions(req: Request) {
  // SameSite=None + Secure is required for cookies to work inside cross-site iframes
  // (e.g. when the app is embedded on another domain). Lax blocks third-party cookies.
  const isSecure = ENV.isProduction || req.secure || req.headers["x-forwarded-proto"] === "https";
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: ONE_YEAR_MS,
  };
}

export function registerAuthRoutes(app: Express) {
  // ── Login ──────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      if (!user.isActiveClient && user.role === "athlete") {
        res.status(403).json({ error: "Your account is not yet active. Please contact Coach Steve." });
        return;
      }

      const token = await createSessionToken(user.id, user.email!);
      res.cookie(COOKIE_NAME, token, getCookieOptions(req));
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ── Register (invite-only — token required) ────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, inviteToken } = req.body ?? {};

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    try {
      // Validate invite token if provided
      let inviteRole: string = "athlete";
      if (inviteToken) {
        const invite = await db.getInviteByToken(inviteToken);
        if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
          res.status(400).json({ error: "Invalid or expired invite link" });
          return;
        }
        if (invite.email.toLowerCase() !== email.toLowerCase()) {
          res.status(400).json({ error: "This invite was sent to a different email address" });
          return;
        }
        inviteRole = invite.role;
        // Mark invite as accepted
        await db.acceptInvite(invite.id, 0); // userId will be updated after insert
      }

      // Check if email already exists
      const existing = await db.getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const normalizedEmail = email.toLowerCase().trim();

      // Owner always gets admin role
      const role = normalizedEmail === ENV.ownerEmail.toLowerCase() ? "admin" : inviteRole as any;

      const userId = await db.createUser({
        email: normalizedEmail,
        passwordHash,
        name,
        role,
        isActiveClient: 1,
        emailVerified: 1,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Update invite with userId
      if (inviteToken) {
        const invite = await db.getInviteByToken(inviteToken);
        if (invite) await db.acceptInvite(invite.id, userId);
      }

      const user = await db.getUserById(userId);
      if (!user) {
        res.status(500).json({ error: "Failed to create account" });
        return;
      }

      const token = await createSessionToken(user.id, user.email!);
      res.cookie(COOKIE_NAME, token, getCookieOptions(req));
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ── Logout ─────────────────────────────────────────────────
  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ ok: true });
  });

  // ── Current user (me) ──────────────────────────────────────
  // Note: The tRPC auth.me route handles this — this is a fallback REST endpoint
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const { authenticateRequest } = await import("./auth");
      const user = await authenticateRequest(req);
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActiveClient: user.isActiveClient,
      });
    } catch {
      res.status(401).json({ error: "Not authenticated" });
    }
  });
}
