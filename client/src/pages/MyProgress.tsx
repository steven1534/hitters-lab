import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import {
  Target, Zap, Calendar, Flame, Star, Upload, LogIn, Clock,
} from "lucide-react";

const STAT_CARDS = [
  { key: "uniqueDrills", label: "Drills Completed", icon: Target, color: "text-gold" },
  { key: "totalSessions", label: "Total Sessions", icon: Zap, color: "text-teal" },
  { key: "thisWeek", label: "This Week", icon: Calendar, color: "text-foundation" },
  { key: "favoritesCount", label: "Favorites", icon: Star, color: "text-gold" },
  { key: "submissionsCount", label: "Submissions", icon: Upload, color: "text-teal" },
] as const;

export default function MyProgress() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: stats } = trpc.progress.stats.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: recentProgress = [] } = trpc.progress.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  return (
    <div className="film-room min-h-screen bg-background pt-14">
      <SiteNav />

      {/* Hero */}
      <header className="border-b border-film-border bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
          <p className="mb-1 font-heading text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gold">
            Your Training
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-wider text-film-fg sm:text-4xl md:text-5xl">
            My Progress
          </h1>
          <p className="mt-3 max-w-xl text-[0.8rem] leading-relaxed text-film-muted">
            Track your drill completions and training sessions.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Not logged in */}
        {!loading && !isAuthenticated && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
              <LogIn className="h-7 w-7 text-gold" />
            </div>
            <h2 className="font-heading text-xl font-bold text-film-fg">Sign in to track progress</h2>
            <p className="mt-2 max-w-sm text-[0.8rem] text-film-muted">
              Log in to start logging drill completions and track your training.
            </p>
            <Link href={getLoginUrl()}>
              <Button className="mt-5 bg-gold text-canvas hover:bg-gold-dim font-heading text-[0.7rem] font-bold uppercase tracking-[0.1em]">
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Button>
            </Link>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
          </div>
        )}

        {/* Authenticated */}
        {isAuthenticated && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {STAT_CARDS.map((card) => {
                const Icon = card.icon;
                const val = stats ? (stats as Record<string, number>)[card.key] ?? 0 : "—";
                return (
                  <div
                    key={card.key}
                    className="rounded-[2px] border border-film-border bg-surface p-4 text-center"
                  >
                    <Icon className={`mx-auto mb-2 h-5 w-5 ${card.color}`} />
                    <span className="block font-display text-2xl font-black text-film-fg">
                      {val}
                    </span>
                    <span className="block mt-0.5 font-heading text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-film-muted">
                      {card.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="mt-8">
              <h2 className="mb-4 font-heading text-[0.7rem] font-bold uppercase tracking-[0.12em] text-gold">
                Recent Activity
              </h2>

              {recentProgress.length === 0 ? (
                <div className="rounded-[2px] border border-dashed border-film-border bg-surface px-6 py-12 text-center">
                  <Target className="mx-auto mb-3 h-8 w-8 text-film-muted" />
                  <h3 className="font-heading text-base font-bold text-film-fg">No sessions logged yet</h3>
                  <p className="mt-1 max-w-sm mx-auto text-[0.75rem] text-film-muted">
                    Complete a drill and log it to start building your activity timeline.
                  </p>
                  <Link href="/">
                    <Button className="mt-4 bg-gold text-canvas hover:bg-gold-dim font-heading text-[0.65rem] font-bold uppercase tracking-[0.1em]">
                      Browse Drills
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProgress.slice(0, 20).map((entry: { id: number; drillId: string; completedAt: string | Date; notes?: string | null; rating?: number | null }) => (
                    <Link key={entry.id} href={`/drill/${entry.drillId}`}>
                      <div className="group flex items-center gap-3 rounded-[2px] border border-film-border bg-surface px-4 py-3 transition-colors hover:border-gold/30 hover:bg-surface-raised cursor-pointer">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foundation/10">
                          <Target className="h-4 w-4 text-foundation" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="block text-[0.8rem] font-medium text-film-fg group-hover:text-gold transition-colors">
                            {entry.drillId.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                          {entry.notes && (
                            <span className="block text-[0.65rem] text-film-muted line-clamp-1">{entry.notes}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[0.6rem] text-film-muted">
                          {entry.rating && (
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-gold fill-gold" />
                              {entry.rating}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(entry.completedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
