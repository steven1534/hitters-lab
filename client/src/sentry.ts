/**
 * Sentry init for the React client.
 *
 * Fully env-gated — if VITE_SENTRY_DSN is not set at build time, this is a
 * no-op and `@sentry/react` is not even loaded (dynamic import, tree-shaken
 * out of the public bundle).
 */
export function initSentryBrowser() {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return;

  // Fire-and-forget — errors in Sentry setup must never block app boot.
  void import("@sentry/react")
    .then((Sentry) => {
      try {
        Sentry.init({
          dsn,
          environment: (import.meta.env.MODE as string) || "production",
          release:
            (import.meta.env.VITE_RENDER_GIT_COMMIT as string | undefined) ||
            (import.meta.env.VITE_GIT_COMMIT as string | undefined) ||
            undefined,
          tracesSampleRate: Number(
            (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ??
              "0.1",
          ),
        });
        // eslint-disable-next-line no-console
        console.log("[Sentry] Browser SDK initialised");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Sentry] init failed:", err);
      }
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[Sentry] failed to load:", err);
    });
}
