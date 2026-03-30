import { useAuth } from "@/_core/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, LogIn, LogOut, Shield, X, Users, Activity } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { useAllDrills } from "@/hooks/useAllDrills";
import { filterOptions, drillTypeOptions } from "@/data/drills";

// Get difficulty color pill
const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy": return "bg-green-500";
    case "Medium": return "bg-orange-500";
    case "Hard": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const getDrillTypeColor = (drillType: string) => {
  if (!drillType) return "bg-slate-600";
  if (drillType.includes("Tee")) return "bg-blue-600";
  if (drillType.includes("Front Toss") || drillType.includes("Soft Toss")) return "bg-purple-600";
  if (drillType.includes("Flaw")) return "bg-red-700";
  if (drillType.includes("Balance") || drillType.includes("Load")) return "bg-teal-600";
  if (drillType.includes("Recognition") || drillType.includes("Decision") || drillType.includes("Tracking")) return "bg-indigo-600";
  if (drillType.includes("Machine") || drillType.includes("Velocity") || drillType.includes("Live BP")) return "bg-orange-600";
  return "bg-slate-600";
};

export default function DrillsDirectory() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [ageLevelFilter, setAgeLevelFilter] = useState("all-levels");
  const [drillTypeFilter, setDrillTypeFilter] = useState("all-types");
  const [problemFilter, setProblemFilter] = useState("all-problems");
  const [goalFilter, setGoalFilter] = useState("all-goals");
  const [tagFilter, setTagFilter] = useState("all-tags");
  const [currentPage, setCurrentPage] = useState(1);

  const DRILLS_PER_PAGE = 20;

  const allDrills = useAllDrills();

  // Extract unique categories
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    allDrills.forEach(drill => {
      drill.categories.forEach(cat => categories.add(cat));
    });
    return ["All", ...Array.from(categories).sort()];
  }, [allDrills]);

  // Flatten all drill types for the select
  const allDrillTypes = useMemo(() => {
    return drillTypeOptions.flatMap(group => group.options);
  }, []);

  // Filter drills
  const filteredDrills = useMemo(() => {
    return allDrills.filter(drill => {
      const matchesSearch = drill.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDifficulty = difficultyFilter === "All" || drill.difficulty === difficultyFilter;
      const matchesCategory = categoryFilter === "All" || drill.categories.includes(categoryFilter);
      const matchesAgeLevel = ageLevelFilter === "all-levels" || (drill.ageLevel ?? []).includes(ageLevelFilter);
      const matchesDrillType = drillTypeFilter === "all-types" || drill.drillType === drillTypeFilter;
      const matchesProblem = problemFilter === "all-problems" || (drill.problem ?? []).includes(problemFilter);
      const matchesGoal = goalFilter === "all-goals" || (drill.goal ?? []).includes(goalFilter);
      const matchesTag = tagFilter === "all-tags" || (drill.tags ?? []).includes(tagFilter);
      return matchesSearch && matchesDifficulty && matchesCategory && matchesAgeLevel && matchesDrillType && matchesProblem && matchesGoal && matchesTag;
    });
  }, [allDrills, searchQuery, difficultyFilter, categoryFilter, ageLevelFilter, drillTypeFilter, problemFilter, goalFilter, tagFilter]);

  const totalPages = Math.ceil(filteredDrills.length / DRILLS_PER_PAGE);
  const startIndex = (currentPage - 1) * DRILLS_PER_PAGE;
  const paginatedDrills = filteredDrills.slice(startIndex, startIndex + DRILLS_PER_PAGE);

  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setCurrentPage(1);
    setter(value);
  };

  const hasActiveFilters =
    searchQuery !== "" ||
    difficultyFilter !== "All" ||
    categoryFilter !== "All" ||
    ageLevelFilter !== "all-levels" ||
    drillTypeFilter !== "all-types" ||
    problemFilter !== "all-problems" ||
    goalFilter !== "all-goals" ||
    tagFilter !== "all-tags";

  const clearAllFilters = () => {
    setSearchQuery("");
    setDifficultyFilter("All");
    setCategoryFilter("All");
    setAgeLevelFilter("all-levels");
    setDrillTypeFilter("all-types");
    setProblemFilter("all-problems");
    setGoalFilter("all-goals");
    setTagFilter("all-tags");
    setCurrentPage(1);
  };

  // Count active filters (excluding search)
  const activeFilterCount = [
    difficultyFilter !== "All",
    categoryFilter !== "All",
    ageLevelFilter !== "all-levels",
    drillTypeFilter !== "all-types",
    problemFilter !== "all-problems",
    goalFilter !== "all-goals",
    tagFilter !== "all-tags",
  ].filter(Boolean).length;

  // All logged-in users (regardless of isActiveClient) can browse the directory.
  // Anonymous visitors can browse freely but get a login prompt after 2 drill views.

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/><path d="M12 3v18M3 12h18" stroke="white" strokeWidth="1.5"/></svg>
              </div>
              <span className="font-bold text-slate-900 text-sm hidden sm:block">Hitters Lab</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <>
                    <Link href="/coach-dashboard">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-200 text-slate-600">
                        <Users className="h-3.5 w-3.5" /><span className="hidden sm:inline">Dashboard</span>
                      </Button>
                    </Link>
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs border-slate-200 text-slate-600">
                        <Shield className="h-3.5 w-3.5" /><span className="hidden sm:inline">Admin</span>
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === 'athlete' && (
                  <Link href="/athlete-portal">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                      <Activity className="h-3.5 w-3.5" />My Portal
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 text-xs border-slate-200 text-slate-600">
                  <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
                  <LogIn className="h-3.5 w-3.5" />Log In
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="container py-8 md:py-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-600 uppercase tracking-widest">Coach Steve's Hitters Lab</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
            Drills Directory
          </h1>
          <p className="text-slate-500 text-sm md:text-base mb-6 max-w-xl">
            {allDrills.length} professional baseball drills. Filter by skill set, difficulty, age level, and more.
          </p>
          <div className="relative w-full md:max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search drills by name..."
              className="pl-10 h-11 bg-white border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus-visible:ring-red-500/30 focus-visible:border-red-300"
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container py-6 md:py-8">

        {/* Filter Controls Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-red-600 text-white h-5 w-5 flex items-center justify-center text-xs rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1">
              <X className="h-3 w-3" />Clear all
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-sm mb-6 space-y-4">

            {/* Row 1: Difficulty, Skill Set, Age Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Difficulty</label>
                <Select value={difficultyFilter} onValueChange={(v) => handleFilterChange(setDifficultyFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Difficulties</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Skill Set</label>
                <Select value={categoryFilter} onValueChange={(v) => handleFilterChange(setCategoryFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Skill Sets" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Age / Level</label>
                <Select value={ageLevelFilter} onValueChange={(v) => handleFilterChange(setAgeLevelFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-levels">All Levels</SelectItem>
                    {filterOptions.ageLevel.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Drill Type, Problem, Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Drill Type</label>
                <Select value={drillTypeFilter} onValueChange={(v) => handleFilterChange(setDrillTypeFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Drill Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-types">All Drill Types</SelectItem>
                    {drillTypeOptions.map(group => (
                      <div key={group.label}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</div>
                        {group.options.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Fix a Problem</label>
                <Select value={problemFilter} onValueChange={(v) => handleFilterChange(setProblemFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Problems" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-problems">All Problems</SelectItem>
                    {filterOptions.problem.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Training Goal</label>
                <Select value={goalFilter} onValueChange={(v) => handleFilterChange(setGoalFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Goals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-goals">All Goals</SelectItem>
                    {filterOptions.goal.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: Tags */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Tag / Focus Area</label>
                <Select value={tagFilter} onValueChange={(v) => handleFilterChange(setTagFilter, v)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-tags">All Tags</SelectItem>
                    {filterOptions.tags.map(tag => (
                      <SelectItem key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {searchQuery && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setSearchQuery, "")}>
                Search: "{searchQuery}" <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {difficultyFilter !== "All" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setDifficultyFilter, "All")}>
                {difficultyFilter} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {categoryFilter !== "All" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setCategoryFilter, "All")}>
                {categoryFilter} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {ageLevelFilter !== "all-levels" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setAgeLevelFilter, "all-levels")}>
                {filterOptions.ageLevel.find(o => o.value === ageLevelFilter)?.label} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {drillTypeFilter !== "all-types" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setDrillTypeFilter, "all-types")}>
                {drillTypeFilter} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {problemFilter !== "all-problems" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setProblemFilter, "all-problems")}>
                Fix: {filterOptions.problem.find(o => o.value === problemFilter)?.label} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {goalFilter !== "all-goals" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setGoalFilter, "all-goals")}>
                Goal: {filterOptions.goal.find(o => o.value === goalFilter)?.label} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
            {tagFilter !== "all-tags" && (
              <Badge variant="secondary" className="gap-1 pr-1 cursor-pointer" onClick={() => handleFilterChange(setTagFilter, "all-tags")}>
                Tag: {tagFilter} <X className="h-3 w-3 ml-0.5" />
              </Badge>
            )}
          </div>
        )}

        {/* Results Count */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-heading font-bold">
            Available Drills
            <Badge variant="secondary" className="ml-3 text-base md:text-lg">
              {filteredDrills.length}
            </Badge>
          </h2>
        </div>

        {/* Drills Grid */}
        {paginatedDrills.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
              {paginatedDrills.map((drill) => (
                <Link
                  key={drill.id}
                  href={`/drill/${drill.id}`}
                  className="group block h-full"
                >
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 h-full flex flex-col">
                    <div className="p-4 md:p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <Badge className={`${getDifficultyColor(drill.difficulty)} text-foreground font-semibold text-xs`}>
                          {drill.difficulty}
                        </Badge>
                        {drill.duration && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {drill.duration}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-bold mb-3 group-hover:text-red-600 transition-colors line-clamp-2 text-slate-900">
                        {drill.name}
                      </h3>

                      {/* Drill Type badge */}
                      {drill.drillType && (
                        <div className="mb-3">
                          <Badge className={`${getDrillTypeColor(drill.drillType)} text-foreground text-xs font-medium`}>
                            {drill.drillType}
                          </Badge>
                        </div>
                      )}

                      {/* Tags */}
                      {(drill.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-auto">
                          {(drill.tags ?? []).slice(0, 3).map((tag: string, idx: number) => (
                            <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {(drill.tags ?? []).length > 3 && (
                            <span className="text-xs text-muted-foreground px-1">+{(drill.tags ?? []).length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                    // Show pages around current page
                    let page: number;
                    if (totalPages <= 10) {
                      page = i + 1;
                    } else if (currentPage <= 5) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      page = totalPages - 9 + i;
                    } else {
                      page = currentPage - 4 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => setCurrentPage(page)}
                        size="sm"
                        className="w-9"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No drills found</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              We couldn't find any drills matching your search criteria. Try adjusting your filters.
            </p>
            <Button onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
