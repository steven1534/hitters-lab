import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LogIn, LogOut, Shield, Users, Activity, ChevronRight, Sparkles, Settings, Clock, Zap, Target, TrendingUp } from "lucide-react";
import { HomePageSkeleton } from "@/components/Skeleton";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAllDrills } from "@/hooks/useAllDrills";
import { DrillEditModal } from "@/components/DrillEditModal";
import { Pencil } from "lucide-react";
import { useDrillListParams } from "@/hooks/useDrillListParams";

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

// Difficulty config
const DIFFICULTY_CONFIG: Record<string, { label: string; class: string; dotClass: string }> = {
  Easy: { label: "Easy", class: "badge-easy", dotClass: "bg-emerald-400" },
  Medium: { label: "Medium", class: "badge-medium", dotClass: "bg-amber-400" },
  Hard: { label: "Hard", class: "badge-hard", dotClass: "bg-rose-400" },
};

// Category config with icons
const CATEGORIES = ["All", "Hitting", "Bunting", "Pitching", "Infield", "Outfield"];

/**
 * Save scroll position to sessionStorage keyed by the current query string.
 */
function saveScrollPosition(queryKey: string) {
  sessionStorage.setItem(`drill-scroll-${queryKey}`, String(window.scrollY));
}

/**
 * Restore scroll position from sessionStorage for the given query key.
 */
function restoreScrollPosition(queryKey: string) {
  const saved = sessionStorage.getItem(`drill-scroll-${queryKey}`);
  if (saved) {
    window.scrollTo(0, parseInt(saved, 10));
  }
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  // URL-synced filter/pagination state
  const {
    page: currentPage,
    category: categoryFilter,
    difficulty: difficultyFilter,
    search: searchQuery,
    sort,
    setPage: setCurrentPage,
    setCategory: setCategoryFilter,
    setDifficulty: setDifficultyFilter,
    setSearch: setSearchQuery,
    setSort,
    resetAll,
    currentQuery,
  } = useDrillListParams();

  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const DRILLS_PER_PAGE = 21;
  const hasRestoredScroll = useRef(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

  // Fetch drill customizations
  const { data: drillCustomizations = [], refetch: refetchCustomizations } = trpc.drillCustomizations.getAll.useQuery();

  const customizationsMap = useMemo(() => {
    const map = new Map<string, typeof drillCustomizations[0]>();
    drillCustomizations.forEach((c) => map.set(c.drillId, c));
    return map;
  }, [drillCustomizations]);

  // Fetch all drill videos to use YouTube thumbnails on first load
  const { data: allVideos = [] } = trpc.drillVideos.getAllVideos.useQuery();
  const videosMap = useMemo(() => {
    const map = new Map<string, string>();
    allVideos.forEach((v: any) => {
      // Extract YouTube video ID from embed URL and build thumbnail URL
      const match = v.videoUrl?.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (match) map.set(v.drillId, `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`);
    });
    return map;
  }, [allVideos]);

  // Set SEO-friendly document title (30-60 characters)
  useEffect(() => {
    document.title = "Baseball Training Drills | Coach Steve's Library";
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Merge static + custom drills, sorted alphabetically
  const allDrills = useAllDrills();

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    allDrills.forEach(drill => drill.categories.forEach(cat => categories.add(cat)));
    return ["All", ...Array.from(categories).sort()];
  }, [allDrills]);

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

  // Restore scroll position after drills render (on back navigation)
  useEffect(() => {
    if (hasRestoredScroll.current) return;
    if (paginatedDrills.length === 0) return;
    hasRestoredScroll.current = true;
    // Small delay to ensure DOM is painted
    const timer = setTimeout(() => {
      restoreScrollPosition(currentQuery || '__default__');
    }, 80);
    return () => clearTimeout(timer);
  }, [paginatedDrills.length, currentQuery]);

  if (loading) return <HomePageSkeleton />;

  // Unauthenticated view
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-electric/8 rounded-full blur-[80px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        
        <div className="text-center max-w-lg relative z-10 animate-fade-in-up">
          <div className="glass-card p-10 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-secondary to-electric flex items-center justify-center shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-gradient">Access Restricted</h1>
            <h2 className="text-lg text-muted-foreground mb-8 leading-relaxed font-normal">
              Exclusive baseball training drills for invited athletes. Log in to access the full drill library.
            </h2>
            <Button 
              onClick={() => window.location.href = getLoginUrl()} 
              size="lg"
              className="btn-premium text-white font-semibold px-8 py-3 text-base"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Log In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Inactive athlete view
  if (!loading && isAuthenticated && user?.role === 'athlete' && !user?.isActiveClient) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-destructive/10 rounded-full blur-[80px]" />
        <div className="text-center max-w-md relative z-10 animate-fade-in-up">
          <div className="glass-card p-10 rounded-2xl">
            <h1 className="text-4xl font-heading font-bold mb-4">Account Inactive</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your account has been deactivated. Please contact your coach for more information.
            </p>
            <Button onClick={() => logout()} variant="outline" size="lg" className="hover-lift">
              <LogOut className="h-5 w-5 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /** Handle drill card click: save scroll position, then navigate */
  const handleDrillClick = (drillId: string) => {
    saveScrollPosition(currentQuery || '__default__');
  };

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
        
        <div className="container relative z-10 pt-6 pb-12 md:pt-8 md:pb-20">
          {/* Top Navigation Bar */}
          <nav className="flex justify-between items-center mb-10 md:mb-16 animate-fade-in-down">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-secondary to-electric rounded-lg flex items-center justify-center font-heading font-bold text-lg text-white shadow-lg shadow-secondary/20">
                CS
              </div>
              <span className="font-heading font-bold text-lg text-foreground hidden sm:block">Coach Steve</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {user ? (
                <>
                  {user.role === 'admin' && (
                    <>
                      <Link href="/coach-dashboard">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs glass border-white/10 hover:border-electric/30 hover:bg-electric/10 transition-all duration-300">
                          <Users className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Dashboard</span>
                        </Button>
                      </Link>
                      <Link href="/admin">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs glass border-white/10 hover:border-electric/30 hover:bg-electric/10 transition-all duration-300">
                          <Shield className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Admin</span>
                        </Button>
                      </Link>
                    </>
                  )}
                  {user.role === 'athlete' && (
                    <Link href="/athlete-portal">
                      <Button size="sm" className="gap-1.5 text-xs btn-premium text-white">
                        <Activity className="h-3.5 w-3.5" />
                        My Drills
                      </Button>
                    </Link>
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
                <span className="block text-foreground text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
                  UNLEASH YOUR
                </span>
                <span className="block text-6xl sm:text-7xl md:text-8xl lg:text-9xl mt-1 text-gradient">
                  POTENTIAL
                </span>
              </h1>
            </div>
            
            <h2 className="text-sm md:text-lg text-muted-foreground mt-6 mb-8 max-w-xl mx-auto leading-relaxed animate-fade-in-up stagger-3 font-normal">
              Professional training drills designed to build{" "}
              <span className="text-foreground font-semibold">elite mechanics</span>,{" "}
              <span className="text-foreground font-semibold">explosive power</span>, and{" "}
              <span className="text-foreground font-semibold">game-ready confidence</span>.
            </h2>
            
            {/* Stats row */}
            <div className="flex justify-center gap-8 md:gap-12 animate-fade-in-up stagger-4">
              {[
                { value: `${allDrills.length}+`, label: "Drills", icon: Target },
                { value: "8", label: "Categories", icon: Sparkles },
                { value: "3", label: "Levels", icon: TrendingUp },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <stat.icon className="h-4 w-4 text-electric" />
                    <span className="text-2xl md:text-3xl font-heading font-bold text-foreground">{stat.value}</span>
                  </div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 container py-6 md:py-10">
        {/* Search + Filters Section */}
        <div className="max-w-5xl mx-auto mb-8">
          {/* Search Bar */}
          <div className="mb-6 animate-fade-in-up">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-electric transition-colors duration-300" />
              </div>
              <Input
                type="text"
                placeholder="Search drills..."
                className="pl-12 py-6 text-base bg-card/80 text-foreground border-border/50 rounded-xl focus-visible:ring-2 focus-visible:ring-electric/50 focus-visible:border-electric/30 font-medium transition-all duration-300 hover:border-electric/20 placeholder:text-muted-foreground/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Difficulty */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Level</span>
              {["All", "Easy", "Medium", "Hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    difficultyFilter === level
                      ? level === "Easy" ? "badge-easy"
                        : level === "Medium" ? "badge-medium"
                        : level === "Hard" ? "badge-hard"
                        : "bg-electric text-white shadow-lg shadow-electric/25"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50"
                  }`}
                >
                  {level === "All" ? "All Levels" : level}
                </button>
              ))}
            </div>

            {/* Category */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">Skill</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    categoryFilter === cat
                      ? "bg-electric text-white shadow-lg shadow-electric/25"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50"
                  }`}
                >
                  {cat === "All" ? "All Skills" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-heading font-bold text-foreground">Training Library</h2>
            <span className="text-xs font-semibold text-electric bg-electric/10 px-2.5 py-1 rounded-full">
              {filteredDrills.length} drills
            </span>
          </div>
        </div>

        {/* ===== DRILL CARDS GRID ===== */}
        {paginatedDrills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {paginatedDrills.map((drill, index) => {
              const customization = customizationsMap.get(drill.id);
              const displayDifficulty = customization?.difficulty || drill.difficulty;
              const displayCategory = customization?.category || drill.categories[0] || "General";
              const displayDescription = customization?.briefDescription || `Master this drill to improve your ${drill.categories[0]?.toLowerCase() || "baseball"} skills.`;
              const imageSource = customization?.thumbnailUrl 
                || (customization?.imageBase64 && customization?.imageMimeType
                  ? `data:${customization.imageMimeType};base64,${customization.imageBase64}`
                  : null)
                || videosMap.get(drill.id)  // YouTube thumbnail from video data (loads instantly)
              const diffConfig = DIFFICULTY_CONFIG[displayDifficulty] || DIFFICULTY_CONFIG.Easy;

              // Build drill detail URL preserving current query params
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
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingDrill(drill);
                        setEditModalOpen(true);
                      }}
                      className="absolute top-3 left-3 z-20 p-2 rounded-lg bg-black/60 hover:bg-electric/80 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-105 shadow-lg backdrop-blur-sm"
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
                    <div className="glass-card rounded-xl overflow-hidden drill-card-hover cursor-pointer h-full flex flex-col">
                      {/* Card Image */}
                      <div className="relative h-44 bg-gradient-to-br from-card to-accent overflow-hidden">
                        {imageSource && (
                          <img 
                            src={imageSource}
                            alt={drill.name}
                            className="w-full h-full object-cover opacity-90 group-hover:scale-108 transition-transform duration-700 ease-out"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        
                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br from-electric/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* Difficulty Badge */}
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${diffConfig.class}`}>
                            {displayDifficulty}
                          </span>
                        </div>
                        
                        {/* Duration badge */}
                        {drill.duration && drill.duration !== "Unknown" && (
                          <div className="absolute bottom-3 right-3">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/50 text-white/80 backdrop-blur-sm">
                              <Clock className="h-2.5 w-2.5" />
                              {drill.duration}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Card Body */}
                      <div className="p-4 flex-1 flex flex-col">
                        {/* Category */}
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${diffConfig.dotClass}`} />
                          <span className="text-electric text-[10px] font-bold uppercase tracking-wider">
                            {displayCategory}
                          </span>
                        </div>
                        
                        {/* Title */}
                        <h3 className="text-base font-heading font-bold text-foreground mb-2 group-hover:text-electric transition-colors duration-300 leading-tight">
                          {drill.name}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2 leading-relaxed">
                          {displayDescription}
                        </p>
                        
                        {/* Footer */}
                        <div className="flex items-center text-muted-foreground group-hover:text-electric transition-all duration-300 pt-2 border-t border-border/30">
                          <span className="text-xs font-semibold">View Details</span>
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
          <div className="text-center py-16 glass-card rounded-2xl border-dashed border border-border/30 max-w-md mx-auto">
            <div className="bg-accent/50 h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-heading font-bold mb-2">No drills found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              No drills match your current filters. Try adjusting your search or filters.
            </p>
            <Button 
              onClick={() => resetAll()}
              className="btn-premium text-white text-sm"
            >
              Clear All Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10 animate-fade-in-up">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="glass border-border/50 hover:border-electric/30 hover:bg-electric/5 disabled:opacity-40 transition-all duration-300"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-300 ${
                      currentPage === page
                        ? "bg-electric text-white shadow-lg shadow-electric/25"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="glass border-border/50 hover:border-electric/30 hover:bg-electric/5 disabled:opacity-40 transition-all duration-300"
            >
              Next
            </Button>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="relative py-8 mt-auto border-t border-border/20">
        <div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent" />
        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gradient-to-br from-secondary to-electric rounded-lg flex items-center justify-center font-heading font-bold text-sm text-white">
                CS
              </div>
              <div>
                <h3 className="font-heading font-bold text-sm text-foreground">USA Baseball Drills Directory</h3>
                <p className="text-xs text-muted-foreground">Coach Steve Baseball — Player Drill Library</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-center md:text-right">
              <p>Data sourced from USA Baseball Mobile Coach.</p>
              <p className="mt-0.5">&copy; {new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Drill Edit Modal */}
      {editingDrill && (
        <DrillEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingDrill(null);
          }}
          drill={editingDrill}
          customization={customizationsMap.get(editingDrill.id)}
          onSaved={() => refetchCustomizations()}
        />
      )}
    </div>
  );
}
