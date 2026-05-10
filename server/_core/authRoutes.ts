/**
 * Auth routes: /api/auth/login, /api/auth/logout, /api/auth/register
 * Replaces Manus OAuth callback routes
 */
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { ENV } from "./env";
import { isSecureRequest } from "./cookies";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
} from "./auth";

function getCookieOptions(req: Request) {
  // SameSite=None requires Secure. Browsers drop Secure cookies on plain HTTP — so we must
  // NOT set secure=true unless the request is actually HTTPS (including behind a proxy).
  // Using NODE_ENV===production alone breaks local/prod smoke tests over http://localhost.
  const isSecure = isSecureRequest(req);
  // SameSite=None + Secure is for cross-site contexts (e.g. iframes). Same-origin browser
  // login uses Lax + non-Secure on HTTP dev servers.
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

    const normalizedEmail = email.toLowerCase().trim();
    const isOwner = normalizedEmail === ENV.ownerEmail.toLowerCase();

    // Require invite token for non-owner registrations
    if (!inviteToken && !isOwner) {
      res.status(403).json({ error: "An invite link is required to register. Please contact Coach Steve." });
      return;
    }

    try {
      let inviteRole: string = "athlete";
      if (inviteToken) {
        const invite = await db.getInviteByToken(inviteToken);
        if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
          res.status(400).json({ error: "Invalid or expired invite link" });
          return;
        }
        if (invite.email.toLowerCase() !== normalizedEmail) {
          res.status(400).json({ error: "This invite was sent to a different email address" });
          return;
        }
        inviteRole = invite.role;
      }

      const existing = await db.getUserByEmail(normalizedEmail);
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const role = isOwner ? "admin" : inviteRole as any;

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

      // Use the full invites.ts acceptInvite which updates role, activates athlete, and links assignments
      if (inviteToken) {
        try {
          const inviteDb = await import("../invites");
          await inviteDb.acceptInvite(inviteToken, userId);
        } catch (inviteErr) {
          console.warn("[Auth] Invite acceptance post-register warning:", inviteErr);
        }
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

  // ── Accept Invite (athlete chooses their own password on the invite page) ──
  app.post("/api/auth/accept-invite", async (req: Request, res: Response) => {
    const { token, password, name } = req.body ?? {};
    if (!token) {
      res.status(400).json({ error: "Invite token is required" });
      return;
    }
    if (!password || typeof password !== "string") {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    try {
      const inviteDb = await import("../invites");
      const invite = await inviteDb.getInviteByToken(token);

      if (!invite || !inviteDb.isInviteValid(invite)) {
        res.status(400).json({ error: "Invalid or expired invite link" });
        return;
      }

      const normalizedEmail = invite.email.toLowerCase().trim();
      let user = await db.getUserByEmail(normalizedEmail);

      if (!user) {
        try {
          const passwordHash = await hashPassword(password);
          const displayName =
            (typeof name === "string" && name.trim()) ||
            (invite as any).name ||
            normalizedEmail.split("@")[0];
          const role = invite.role === "coach" ? "coach" : "athlete";

          const userId = await db.createUser({
            email: normalizedEmail,
            passwordHash,
            name: displayName,
            role: role as any,
            isActiveClient: 1,
            emailVerified: 1,
            loginMethod: "email",
            lastSignedIn: new Date(),
          });

          user = await db.getUserById(userId);
          console.log(`[Auth] Created account for ${normalizedEmail} via invite`);
        } catch (createErr: any) {
          // Handle duplicate email race condition — account was created
          // between our lookup and our insert. Fall back to existing user,
          // but DO NOT overwrite their password; force them to log in normally.
          if (createErr.message?.includes("unique") || createErr.code === "23505") {
            console.log(`[Auth] User ${normalizedEmail} already exists (race), returning 409`);
            res.status(409).json({
              error: "An account with this email already exists. Please log in instead.",
            });
            return;
          }
          throw createErr;
        }

        if (!user) {
          res.status(500).json({ error: "Failed to create account" });
          return;
        }
      } else {
        // Account already exists — do NOT change its password via the invite
        // endpoint. The user should log in normally.
        res.status(409).json({
          error: "An account with this email already exists. Please log in instead.",
        });
        return;
      }

      await inviteDb.acceptInvite(token, user.id);

      const sessionToken = await createSessionToken(user.id, user.email!);
      res.cookie(COOKIE_NAME, sessionToken, getCookieOptions(req));
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (err: any) {
      console.error("[Auth] Accept-invite error:", err);
      const friendlyMsg = err.message?.includes("unique") || err.code === "23505"
        ? "An account with this email already exists. Please log in instead."
        : "Failed to accept invite. Please try again or contact your coach.";
      res.status(500).json({ error: friendlyMsg });
    }
  });

  // ── Request Password Reset (public — creates a pending request for the admin) ──
  app.post("/api/auth/request-reset", async (req: Request, res: Response) => {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    try {
      await db.createPasswordResetRequest(email);
    } catch {
      // swallow — don't reveal whether the email exists
    }
    res.json({ message: "If an account with that email exists, your reset request has been sent to Coach Steve." });
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
