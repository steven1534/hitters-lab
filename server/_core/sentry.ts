/**
 * Sentry init for the Express/Node server.
 *
 * Fully env-gated — if SENTRY_DSN is not set, this is a no-op and Sentry
 * is never initialised. Safe to import unconditionally.
 */
import * as Sentry from "@sentry/node";

let initialised = false;

export function initSentryNode() {
  if (initialised) return;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) {
    console.log("[Sentry] SENTRY_DSN not set — error reporting disabled.");
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || "production",
      release: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || undefined,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
      // Keep dependency set small — default integrations only.
    });
    initialised = true;
    console.log("[Sentry] Node SDK initialised");
  } catch (err) {
    console.warn("[Sentry] init failed:", err);
  }
}

/** True once `initSentryNode()` has successfully set up Sentry. */
export function sentryReady(): boolean {
  return initialised;
}

export { Sentry };
