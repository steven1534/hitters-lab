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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

  const { data: drillCustomizations = [], refetch: refetchCustomizations } = trpc.drillCustomizations.getAll.useQuery();
  const customizationsMap = useMemo(() => {
    const map = new Map<string, typeof drillCustomizations[0]>();
    drillCustomizations.forEach((c) => map.set(c.drillId, c));
    return map;
  }, [drillCustomizations]);

  const { data: allVideos = [] } = trpc.drillVideos.getAllVideos.useQuery();
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

  const handleDrillClick = () => saveScrollPosition(currentQuery || '__default__');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header / Nav ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-sm shadow-red-600/30">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-slate-900 text-sm tracking-tight">Coach Steve's Hitters Lab</span>
            </div>
            <span className="sm:hidden font-bold text-slate-900 text-sm">Hitters Lab</span>
          </div>

          {/* Nav actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <>
                    <Link href="/coach-dashboard">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:text-slate-900">
                        <Users className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </Button>
                    </Link>
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-200 text-slate-600 hover:text-slate-900">
                        <Shield className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === 'athlete' && (
                  <Link href="/athlete-portal">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                      <Activity className="h-3.5 w-3.5" />
                      My Portal
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 text-xs border-slate-200 text-slate-600">
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Log out</span>
                </Button>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                  <LogIn className="h-3.5 w-3.5" />
                  Log In
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-semibold text-red-600 uppercase tracking-widest">Player Development Platform</span>
            </div>
            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-none mb-4">
              Coach Steve's<br />
              <span className="text-red-600">Hitters Lab</span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              Professional training drills to build elite mechanics, explosive power, and game-ready confidence.
            </p>
            {/* Stats */}
            <div className="flex items-center gap-8">
              {[
                { value: `${allDrills.length}+`, label: "Drills" },
                { value: "8", label: "Categories" },
                { value: "3", label: "Skill Levels" },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-2xl font-black text-slate-900">{s.value}</div>
                  <div className="text-xs text-slate-400 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        {/* Search + Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search drills by name..."
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus-visible:ring-red-500/30 focus-visible:border-red-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3">
            {/* Difficulty */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {["All", "Easy", "Medium", "Hard"].map((level) => {
                const active = difficultyFilter === level;
                const baseActive =
                  level === "Easy"   ? "bg-emerald-600 text-white border-emerald-600" :
                  level === "Medium" ? "bg-amber-500  text-white border-amber-500" :
                  level === "Hard"   ? "bg-red-600    text-white border-red-600" :
                                       "bg-slate-900  text-white border-slate-900";
                return (
                  <button
                    key={level}
                    onClick={() => setDifficultyFilter(level)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      active ? baseActive : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {level === "All" ? "All Levels" : level}
                  </button>
                );
              })}
            </div>

            <div className="w-px h-5 bg-slate-200 self-center hidden sm:block" />

            {/* Category */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {cat === "All" ? "All Skills" : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 text-sm">Training Library</h2>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {filteredDrills.length} drills
            </span>
          </div>
          {(searchQuery || difficultyFilter !== "All" || categoryFilter !== "All") && (
            <button onClick={() => resetAll()} className="text-xs text-red-600 hover:text-red-700 font-medium">
              Clear filters
            </button>
          )}
        </div>

        {/* ── Drill Cards Grid ── */}
        {paginatedDrills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedDrills.map((drill, index) => {
              const customization = customizationsMap.get(drill.id);
              const displayDifficulty = customization?.difficulty || drill.difficulty;
              const displayCategory = customization?.category || drill.categories[0] || "General";
              const displayDescription = customization?.briefDescription ||
                `Master your ${displayCategory.toLowerCase()} mechanics with focused repetition.`;
              const imageSource =
                customization?.thumbnailUrl ||
                (customization?.imageBase64 && customization?.imageMimeType
                  ? `data:${customization.imageMimeType};base64,${customization.imageBase64}`
                  : null) ||
                videosMap.get(drill.id);
              const drillDetailHref = `/drill/${drill.id}${currentQuery}`;

              return (
                <div key={drill.id} className="group relative">
                  {/* Admin edit btn */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        setEditingDrill(drill); setEditModalOpen(true);
                      }}
                      className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-white/90 hover:bg-white border border-slate-200 text-slate-500 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <Link href={drillDetailHref} className="block h-full" onClick={handleDrillClick}>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                      {/* Image */}
                      <div className="relative h-40 bg-slate-100 overflow-hidden">
                        {imageSource ? (
                          <img
                            src={imageSource}
                            alt={drill.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                            <Target className="w-8 h-8 text-slate-300" />
                          </div>
                        )}
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                        {/* Duration */}
                        {drill.duration && drill.duration !== "Unknown" && (
                          <div className="absolute bottom-2 right-2">
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/50 text-white backdrop-blur-sm">
                              <Clock className="h-2.5 w-2.5" />{drill.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Body */}
                      <div className="p-4 flex-1 flex flex-col">
                        {/* Category + difficulty row */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{displayCategory}</span>
                          <DifficultyBadge difficulty={displayDifficulty} />
                        </div>
                        {/* Title */}
                        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5 group-hover:text-red-600 transition-colors line-clamp-2">
                          {drill.name}
                        </h3>
                        {/* Description */}
                        <p className="text-xs text-slate-400 flex-1 line-clamp-2 leading-relaxed mb-3">
                          {displayDescription}
                        </p>
                        {/* CTA */}
                        <div className="flex items-center text-slate-400 group-hover:text-red-600 transition-colors pt-2 border-t border-slate-100">
                          <span className="text-xs font-semibold">View Drill</span>
                          <ChevronRight className="h-3.5 w-3.5 ml-auto group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">No drills found</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto mb-5">
              Try adjusting your search or filters.
            </p>
            <Button onClick={() => resetAll()} className="bg-red-600 hover:bg-red-700 text-white h-9 text-sm rounded-lg">
              Clear Filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-slate-200 text-slate-600 disabled:opacity-40"
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
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
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
              variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-200 text-slate-600 disabled:opacity-40"
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
          onSaved={() => refetchCustomizations()}
        />
      )}
    </div>
  );
}
