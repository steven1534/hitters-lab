import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LogOut, User } from "lucide-react";

const NAV_ITEMS = [
  { label: "HITTING DRILLS", href: "/" },
  { label: "PATHWAYS", href: "/pathways" },
  { label: "MY PROGRESS", href: "/progress" },
] as const;

export default function SiteNav() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isCoachOrAdmin =
    user?.role === "admin" || user?.role === "coach";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--film-border,rgba(255,255,255,0.06))] bg-canvas/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/15 text-gold font-display text-sm font-bold tracking-wider">
            CS
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="block font-heading text-[0.7rem] font-bold uppercase tracking-[0.15em] text-film-fg">
              Coach Steve&apos;s
            </span>
            <span className="block font-heading text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-film-muted">
              Hitter&apos;s Lab
            </span>
          </div>
        </Link>

        {/* Center nav tabs */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? location === "/" || location === "/drills"
                : location.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 font-heading text-[0.72rem] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  active
                    ? "text-gold border-b-2 border-gold"
                    : "text-film-muted hover:text-film-fg"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side — auth */}
        <div className="flex items-center gap-3">
          {isCoachOrAdmin && (
            <Link
              href="/coach-dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-heading font-semibold uppercase tracking-[0.1em] text-film-muted hover:text-film-fg transition-colors"
            >
              Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[0.65rem] font-heading font-semibold uppercase tracking-[0.1em] text-film-muted hover:text-film-fg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : (
            <Link
              href={getLoginUrl()}
              className="inline-flex items-center gap-1.5 rounded-sm bg-gold px-3.5 py-1.5 text-[0.7rem] font-heading font-bold uppercase tracking-[0.1em] text-canvas transition-colors hover:bg-gold-dim"
            >
              <User className="h-3.5 w-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
