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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <header className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-bg.jpg"
            alt="Baseball Field"
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/95" />
        </div>

        <div className="container relative z-10 py-8 md:py-20">
          {/* Auth & Admin Controls */}
          <div className="flex justify-end gap-2 mb-6 flex-wrap">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <>
                    <Link href="/coach">
                      <Button variant="secondary" size="sm" className="gap-2 text-xs md:text-sm">
                        <Users className="h-4 w-4" />
                        Coach Dashboard
                      </Button>
                    </Link>
                    <Link href="/admin">
                      <Button variant="secondary" size="sm" className="gap-2 text-xs md:text-sm">
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">Admin Dashboard</span>
                        <span className="sm:hidden">Admin</span>
                      </Button>
                    </Link>
                  </>
                )}
                {user.role === 'athlete' && (
                  <Link href="/athlete-portal">
                    <Button variant="secondary" size="sm" className="gap-2 text-xs md:text-sm">
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">My Drills</span>
                      <span className="sm:hidden">Drills</span>
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={logout} className="gap-2 bg-background/20 hover:bg-background/30 text-xs md:text-sm">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Exit</span>
                </Button>
              </>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="secondary" size="sm" className="gap-2 text-xs md:text-sm">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </a>
            )}
          </div>

          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-1 w-12 bg-secondary rounded-full" />
              <span className="text-secondary font-bold tracking-wider uppercase text-xs">Coach Steve's Mobile Coach</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-heading font-black mb-3 md:mb-4 leading-tight">
              Drills Directory
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/90 mb-6 md:mb-10 max-w-3xl leading-relaxed font-medium">
              {allDrills.length} professional baseball drills. Filter by skill set, difficulty, age level, drill type, and more.
            </p>

            {/* Search Bar in Hero */}
            <div className="relative w-full md:max-w-2xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                type="text"
                placeholder="Search drills..."
                className="pl-11 py-5 md:py-7 text-sm md:text-base bg-background/95 text-foreground border-0 shadow-2xl rounded-xl md:rounded-2xl focus-visible:ring-2 focus-visible:ring-secondary font-medium"
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6 md:py-12">

        {/* Filter Controls Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="bg-secondary text-secondary-foreground h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>

        {/* Filters Panel - always visible */}
        <div className="bg-card border rounded-xl p-5 md:p-6 shadow-sm mb-8 space-y-5">

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
                  <div className="bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col hover:border-secondary">
                    <div className="p-4 md:p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <Badge className={`${getDifficultyColor(drill.difficulty)} text-white font-semibold text-xs`}>
                          {drill.difficulty}
                        </Badge>
                        {drill.duration && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {drill.duration}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base md:text-lg font-heading font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {drill.name}
                      </h3>

                      {/* Drill Type badge */}
                      {drill.drillType && (
                        <div className="mb-3">
                          <Badge className={`${getDrillTypeColor(drill.drillType)} text-white text-xs font-medium`}>
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
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed">
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
