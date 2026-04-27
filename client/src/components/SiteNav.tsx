import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Menu, X, Dumbbell, GitBranch, ClipboardList, LogOut, Settings, Target } from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Dumbbell;
  primary?: boolean;
};

const PUBLIC_NAV: readonly NavItem[] = [
  { label: "HITTING DRILLS", href: "/drills", icon: Dumbbell },
  { label: "PATHWAYS", href: "/pathways", icon: GitBranch },
] as const;

const ATHLETE_NAV: readonly NavItem[] = [
  { label: "MY PLAN", href: "/my-plan", icon: Target, primary: true },
  { label: "PATHWAYS", href: "/pathways", icon: GitBranch },
  { label: "LIBRARY", href: "/drills", icon: Dumbbell },
  { label: "MY PROGRESS", href: "/progress", icon: ClipboardList },
] as const;

const COACH_NAV: readonly NavItem[] = [
  { label: "DASHBOARD", href: "/coach-dashboard", icon: Settings, primary: true },
  { label: "PATHWAYS", href: "/pathways", icon: GitBranch },
  { label: "LIBRARY", href: "/drills", icon: Dumbbell },
] as const;

export default function SiteNav() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const isCoachOrAdmin = user?.role === "admin" || user?.role === "coach";

  const navItems: readonly NavItem[] = user?.role === "athlete"
    ? ATHLETE_NAV
    : isCoachOrAdmin
      ? COACH_NAV
      : PUBLIC_NAV;

  const isActive = (path: string) => {
    // The library link should also light up when the user lands at "/" as a
    // public visitor (Landing renders DrillsDirectory in that case).
    if (path === "/drills") return location === "/drills" || location === "/";
    return location.startsWith(path);
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(11,11,12,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded"
              style={{ background: "linear-gradient(135deg, #C8A96B 0%, #9E7F4A 100%)" }}
            >
              <Dumbbell size={14} style={{ color: "#0B0B0C" }} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-heading text-sm font-bold tracking-wide" style={{ color: "#F5F5F5", letterSpacing: "0.05em" }}>
                COACH STEVE&apos;S
              </span>
              <span className="font-heading text-[0.6rem] font-semibold" style={{ color: "#C8A96B", letterSpacing: "0.12em" }}>
                HITTERS LAB
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = isActive(item.href);
              if (item.primary) {
                return (
                  <Link key={item.href} href={item.href}>
                    <span
                      className="px-3 py-1.5 rounded font-heading text-[0.8rem] font-bold transition-all cursor-pointer hover:opacity-90"
                      style={{
                        letterSpacing: "0.08em",
                        background: "linear-gradient(135deg, #C8A96B 0%, #9E7F4A 100%)",
                        color: "#0B0B0C",
                        boxShadow: active ? "0 0 0 2px rgba(200,169,107,0.4)" : "none",
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              }
              return (
                <Link key={item.href} href={item.href}>
                  <span
                    className="px-3 py-1.5 rounded font-heading text-[0.8rem] font-medium transition-colors cursor-pointer hover:bg-white/5"
                    style={{
                      letterSpacing: "0.08em",
                      color: active ? "#C8A96B" : "#B8BCC4",
                      background: active ? "rgba(200,169,107,0.08)" : "transparent",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right side: auth + mobile toggle */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="hidden items-center gap-1.5 rounded px-3 py-1.5 transition-colors hover:bg-white/5 md:flex"
                style={{ color: "#B8BCC4" }}
              >
                <LogOut size={14} />
                <span className="font-heading text-[0.75rem]" style={{ letterSpacing: "0.08em" }}>
                  SIGN OUT
                </span>
              </button>
            ) : (
              <Link href={getLoginUrl()}>
                <span
                  className="hidden rounded px-4 py-1.5 font-heading text-[0.75rem] font-semibold transition-all hover:opacity-90 md:inline-flex"
                  style={{
                    letterSpacing: "0.1em",
                    background: "linear-gradient(135deg, #C8A96B 0%, #9E7F4A 100%)",
                    color: "#0B0B0C",
                  }}
                >
                  SIGN IN
                </span>
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              className="rounded p-1.5 hover:bg-white/5 md:hidden"
              style={{ color: "#B8BCC4" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t md:hidden" style={{ background: "#0B0B0C", borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              if (item.primary) {
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                    <span
                      className="flex items-center gap-2 rounded px-3 py-2.5 cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, #C8A96B 0%, #9E7F4A 100%)",
                        color: "#0B0B0C",
                      }}
                    >
                      <Icon size={14} />
                      <span className="font-heading text-[0.85rem] font-bold" style={{ letterSpacing: "0.08em" }}>
                        {item.label}
                      </span>
                    </span>
                  </Link>
                );
              }
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                  <span
                    className="flex items-center gap-2 rounded px-3 py-2.5 cursor-pointer"
                    style={{
                      color: active ? "#C8A96B" : "#B8BCC4",
                      background: active ? "rgba(200,169,107,0.08)" : "transparent",
                    }}
                  >
                    <Icon size={14} />
                    <span className="font-heading text-[0.85rem]" style={{ letterSpacing: "0.08em" }}>
                      {item.label}
                    </span>
                  </span>
                </Link>
              );
            })}

            {isAuthenticated ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-2 rounded px-3 py-2.5 text-left hover:bg-white/5"
                style={{ color: "#B8BCC4" }}
              >
                <LogOut size={14} />
                <span className="font-heading text-[0.85rem]" style={{ letterSpacing: "0.08em" }}>SIGN OUT</span>
              </button>
            ) : (
              <Link href={getLoginUrl()} onClick={() => setMobileOpen(false)}>
                <span
                  className="mt-2 flex items-center justify-center rounded px-4 py-2.5 font-heading text-sm font-semibold"
                  style={{
                    letterSpacing: "0.1em",
                    background: "linear-gradient(135deg, #C8A96B 0%, #9E7F4A 100%)",
                    color: "#0B0B0C",
                  }}
                >
                  SIGN IN
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
