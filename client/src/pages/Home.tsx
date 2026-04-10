import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, LogIn, LogOut, Shield, Users, Activity,
  ChevronRight, Sparkles, Settings, Clock, Target, TrendingUp, Zap
} from "lucide-react";
import { HomePageSkeleton } from "@/components/Skeleton";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { DrillEditModal } from "@/components/DrillEditModal";
import { Pencil } from "lucide-react";
import { useDrillListParams } from "@/hooks/useDrillListParams";
import { getYouTubeThumbnail } from "@/lib/youtubeUtils";

interface Drill {
  id: string;
  name: string;
  difficulty: string;
  categories: string[];
  duration: string;
  url?: string;
  is_direct_link?: boolean;
  isCustom?: boolean;
}

const DIFFICULTY_CONFIG: Record<
  string,
  { label: string; color: string; class: string; dotClass: string }
> = {
  Easy: {
    label: "Easy",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    class: "bg-emerald-500/80 text-white",
    dotClass: "bg-emerald-500",
  },
  Medium: {
    label: "Medium",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    class: "bg-amber-500/80 text-white",
    dotClass: "bg-amber-500",
  },
  Hard: {
    label: "Hard",
    color: "bg-red-50 text-red-700 border border-red-200",
    class: "bg-red-500/80 text-white",
    dotClass: "bg-red-500",
  },
};

const CATEGORIES = ["All", "Hitting", "Bunting", "Pitching", "Infield", "Outfield"];

function saveScrollPosition(queryKey: string) {
  sessionStorage.setItem(`drill-scroll-${queryKey}`, String(window.scrollY));
}
function restoreScrollPosition(queryKey: string) {
  const saved = sessionStorage.getItem(`drill-scroll-${queryKey}`);
  if (saved) window.scrollTo(0, parseInt(saved, 10));
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const d = difficulty?.toLowerCase();
  const styles =
    d === "easy"   ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
    d === "hard"   ? "bg-red-50    text-red-700    border border-red-200" :
                     "bg-amber-50  text-amber-700  border border-amber-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
      {difficulty}
    </span>
  );
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  const {
    page: currentPage, category: categoryFilter, difficulty: difficultyFilter,
    search: searchQuery, setPage: setCurrentPage, setCategory: setCategoryFilter,
    setDifficulty: setDifficultyFilter, setSearch: setSearchQuery,
    resetAll, currentQuery,
  } = useDrillListParams();

  const DRILLS_PER_PAGE = 21;
  const hasRestoredScroll = useRef(false);
  const heroRef = useRef<HTMLElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

  // drillCustomizations removed — superseded by Manus data + drillCatalogOverrides
  const customizationsMap = new Map();

  const { data: allVideos = [] } = trpc.videos.getAllVideos.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const videosMap = useMemo(() => {
    const map = new Map<string, string>();
    allVideos.forEach((v: any) => {
      const thumb = v.videoUrl ? getYouTubeThumbnail(v.videoUrl) : null;
      if (thumb) map.set(v.drillId, thumb);
    });
    return map;
  }, [allVideos]);

  useEffect(() => {
    document.title = "Baseball Training Drills | Coach Steve's Hitters Lab";
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allDrills = useAllDrills();

  const filteredDrills = useMemo(() => {
    return allDrills.filter(drill => {
      const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === "All" || drill.difficulty === difficultyFilter;
      const matchesCategory = categoryFilter === "All" || drill.categories.includes(categoryFilter);
      return matchesSearch && matchesDifficulty && matchesCategory;
    });
  }, [allDrills, searchQuery, difficultyFilter, categoryFilter]);

  const totalPages = Math.ceil(filteredDrills.length / DRILLS_PER_PAGE);
  const startIndex = (currentPage - 1) * DRILLS_PER_PAGE;
  const paginatedDrills = filteredDrills.slice(startIndex, startIndex + DRILLS_PER_PAGE);

  useEffect(() => {
    if (hasRestoredScroll.current || paginatedDrills.length === 0) return;
    hasRestoredScroll.current = true;
    const timer = setTimeout(() => restoreScrollPosition(currentQuery || '__default__'), 80);
    return () => clearTimeout(timer);
  }, [paginatedDrills.length, currentQuery]);

  if (loading) return <HomePageSkeleton />;

  // ── Unauthenticated splash ────────────────────────────────────────────────
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm max-w-md w-full p-10 text-center">
          <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-600/20">
            <Target className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Coach Steve's<br/>Hitters Lab</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Professional baseball training drills for serious athletes. Log in to access the full library.
          </p>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl gap-2"
          >
            <LogIn className="h-4 w-4" />
            Log In to Continue
          </Button>
        </div>
      </div>
    );
  }

  const handleDrillClick = (_drillId?: string) => saveScrollPosition(currentQuery || '__default__');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ===== HERO SECTION ===== */}
      <header ref={heroRef} className="relative overflow-hidden">
        {/* Layered background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 gradient-mesh opacity-60" />
          <div className="absolute inset-0 gradient-glow" />
        </div>
        
        {/* Floating ambient orbs */}
        <div 
          className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-electric/8 rounded-full blur-[100px] animate-float"
          style={{ transform: `translateY(${scrollY * -0.08}px)` }}
        />
        <div 
          className="absolute top-40 -left-20 w-[300px] h-[300px] bg-secondary/6 rounded-full blur-[80px] animate-float"
          style={{ animationDelay: '2s', transform: `translateY(${scrollY * -0.12}px)` }}
        />
        <div 
          className="absolute bottom-0 right-1/3 w-[250px] h-[250px] bg-electric/5 rounded-full blur-[60px] animate-float"
          style={{ animationDelay: '3.5s' }}
        />
        
        <div className="container relative z-10 pt-4 pb-8 md:pt-8 md:pb-20">
          {/* Top Navigation Bar */}
          <nav className="flex justify-between items-center mb-6 md:mb-16 animate-fade-in-down">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-secondary to-electric rounded-lg flex items-center justify-center font-heading font-bold text-lg text-white shadow-lg shadow-secondary/20">
                CS
              </div>
              <span className="font-heading font-bold text-lg text-white hidden sm:block">Coach Steve</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-white text-sm tracking-tight">Coach Steve's Hitters Lab</span>
            </div>
            <span className="sm:hidden font-bold text-white text-sm">Hitters Lab</span>
            <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <>
                    <Link href="/coach-dashboard">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs border-white/20 text-white/70 hover:text-white hover:border-white/30">
                        <Users className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </Button>
                    </Link>
                  </>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={logout} 
                  className="gap-1.5 text-xs glass border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="sm" className="gap-1.5 text-xs btn-premium text-white">
                    <LogIn className="h-3.5 w-3.5" />
                    Login
                  </Button>
                </a>
              )}
            </div>
          </nav>
          
          {/* Hero Content */}
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="flex justify-center mb-6 animate-fade-in-down stagger-1">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-electric/20 bg-electric/5 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-electric animate-pulse-glow" />
                <span className="text-electric text-xs font-semibold tracking-wider uppercase">Player Development Platform</span>
              </div>
            </div>
            
            {/* Main heading */}
            <div className="animate-fade-in-up stagger-2">
              <h1 className="font-heading font-black tracking-tight leading-none">
                <span className="block text-white text-4xl sm:text-6xl md:text-7xl lg:text-8xl">
                  COACH STEVE'S
                </span>
                <span className="block text-5xl sm:text-7xl md:text-8xl lg:text-9xl mt-1 text-gradient">
                  HITTERS LAB
                </span>
              </h1>
            </div>

            <h2 className="text-xs md:text-lg text-white/60 mt-4 mb-6 max-w-xl mx-auto leading-relaxed animate-fade-in-up stagger-3 font-normal">
              Professional training drills designed to build{" "}
              <span className="text-white font-semibold">elite mechanics</span>,{" "}
              <span className="text-white font-semibold">explosive power</span>, and{" "}
              <span className="text-white font-semibold">game-ready confidence</span>.
            </h2>
            
            {/* Stats row */}
            <div className="flex justify-center gap-8 md:gap-12 animate-fade-in-up stagger-4">
              {[
                { value: `${allDrills.length}+`, label: "Drills" },
                { value: "8", label: "Categories" },
                { value: "3", label: "Skill Levels" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-white/50 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ===== STICKY SEARCH + FILTER BAR ===== */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/20 shadow-sm shadow-black/20">
        <div className="container max-w-5xl py-3 md:py-4 space-y-2.5">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-electric transition-colors duration-300" />
            </div>
            <Input
              type="text"
              placeholder="Search drills..."
              className="pl-10 h-11 text-sm bg-card/60 text-foreground border-border/40 rounded-xl focus-visible:ring-2 focus-visible:ring-electric/50 focus-visible:border-electric/30 font-medium transition-all duration-200 hover:border-electric/20 placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Difficulty Filter — horizontal scroll */}
          <div className="-mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex-shrink-0">Level</span>
              {["All", "Easy", "Medium", "Hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    difficultyFilter === level
                      ? level === "Easy" ? "badge-easy shadow-sm"
                        : level === "Medium" ? "badge-medium shadow-sm"
                        : level === "Hard" ? "badge-hard shadow-sm"
                        : "bg-electric text-white shadow-md shadow-electric/30"
                      : "bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/40"
                  }`}
                >
                  {level === "All" ? "All Levels" : level}
                </button>
              ))}
              <div className="flex-shrink-0 w-px h-5 bg-border/40 mx-0.5" />
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex-shrink-0">Skill</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    categoryFilter === cat
                      ? "bg-electric text-white shadow-md shadow-electric/30"
                      : "bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/40"
                  }`}
                >
                  {cat === "All" ? "All Skills" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 container py-5 md:py-8">

        {/* Results Header */}
        <div className="flex items-center justify-between mb-5 max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-heading font-bold text-foreground">Training Library</h2>
            <span className="text-xs font-semibold text-electric bg-electric/10 px-2.5 py-1 rounded-full">
              {filteredDrills.length}
            </span>
          </div>
          {(searchQuery || difficultyFilter !== "All" || categoryFilter !== "All") && (
            <button
              onClick={() => resetAll()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-accent active:scale-95"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Drill Cards Grid ── */}
        {paginatedDrills.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 max-w-5xl mx-auto">
            {paginatedDrills.map((drill, index) => {
              const customization = customizationsMap.get(drill.id);
              const displayDifficulty = customization?.difficulty || drill.difficulty;
              const displayCategory = customization?.category || drill.categories[0] || "General";
              const displayDescription = customization?.briefDescription || `Master this drill to improve your ${drill.categories[0]?.toLowerCase() || "baseball"} skills.`;
              const imageSource = customization?.thumbnailUrl
                || (customization?.imageBase64 && customization?.imageMimeType
                  ? `data:${customization.imageMimeType};base64,${customization.imageBase64}`
                  : null)
                || videosMap.get(drill.id)
              const diffConfig = DIFFICULTY_CONFIG[displayDifficulty] || DIFFICULTY_CONFIG.Easy;
              const drillDetailHref = `/drill/${drill.id}${currentQuery}`;

              return (
                <div
                  key={drill.id}
                  className="group animate-fade-in-up relative"
                  style={{ animationDelay: `${Math.min(index * 0.04, 0.4)}s` }}
                >
                  {/* Admin Edit Button */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setEditingDrill(drill); setEditModalOpen(true);
                      }}
                      className="absolute top-2.5 left-2.5 z-20 p-2 rounded-lg bg-black/60 hover:bg-electric/80 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
                      title="Edit drill card"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <Link
                    href={drillDetailHref}
                    className="block h-full"
                    onClick={() => handleDrillClick(drill.id)}
                  >
                    <div className="glass-card rounded-xl overflow-hidden drill-card-hover cursor-pointer h-full flex flex-col active:scale-[0.98] transition-transform duration-150">
                      {/* Card Image */}
                      <div className="relative h-32 sm:h-44 bg-gradient-to-br from-card to-accent overflow-hidden">
                        {imageSource ? (
                          <img
                            src={imageSource}
                            alt={drill.name}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700 ease-out"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-electric/10 via-card to-accent/30 flex items-center justify-center">
                            <Target className="h-8 w-8 text-electric/20" />
                          </div>
                        )}

                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br from-electric/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Difficulty Badge */}
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${diffConfig.class}`}>
                            {displayDifficulty}
                          </span>
                        </div>

                        {/* Duration badge */}
                        {drill.duration && drill.duration !== "Unknown" && (
                          <div className="absolute bottom-2 right-2">
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-black/60 text-white/80 backdrop-blur-sm">
                              <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                              <span className="hidden sm:inline">{drill.duration}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-3 sm:p-4 flex-1 flex flex-col">
                        {/* Category */}
                        <div className="flex items-center gap-1 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${diffConfig.dotClass}`} />
                          <span className="text-electric text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">
                            {displayCategory}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-sm sm:text-base font-heading font-bold text-foreground mb-1.5 group-hover:text-electric transition-colors duration-300 leading-tight line-clamp-2">
                          {drill.name}
                        </h3>

                        {/* Description — hidden on very small screens */}
                        <p className="hidden sm:block text-xs text-muted-foreground mb-3 flex-1 line-clamp-2 leading-relaxed">
                          {displayDescription}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center text-muted-foreground group-hover:text-electric transition-all duration-300 pt-2 border-t border-border/30 mt-auto">
                          <span className="text-xs font-semibold">View</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-auto group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 glass-card rounded-2xl border-dashed border border-border/30 max-w-sm mx-auto">
            <div className="bg-accent/50 h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-bold mb-2">No drills found</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              Try adjusting your search or filters.
            </p>
            <Button
              onClick={() => resetAll()}
              className="btn-premium text-white text-sm px-6 py-2.5 active:scale-95"
            >
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentPage(Math.max(1, currentPage - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="glass border-border/40 hover:border-electric/30 hover:bg-electric/5 disabled:opacity-40 transition-all duration-300 h-10 px-4 active:scale-95"
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) page = i + 1;
                else if (currentPage <= 3) page = i + 1;
                else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
                else page = currentPage - 2 + i;
                return (
                  <button
                    key={page}
                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      currentPage === page
                        ? "bg-red-600 text-white"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCurrentPage(Math.min(totalPages, currentPage + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="glass border-border/40 hover:border-electric/30 hover:bg-electric/5 disabled:opacity-40 transition-all duration-300 h-10 px-4 active:scale-95"
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Coach Steve's Hitters Lab</span>
          </div>
          <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Coach Steve Baseball. All rights reserved.</p>
        </div>
      </footer>

      {/* Edit modal */}
      {editingDrill && (
        <DrillEditModal
          isOpen={editModalOpen}
          onClose={() => { setEditModalOpen(false); setEditingDrill(null); }}
          drill={editingDrill}
          customization={customizationsMap.get(editingDrill.id)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
