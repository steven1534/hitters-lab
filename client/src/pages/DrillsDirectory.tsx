import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, SlidersHorizontal, Star, ChevronDown, X, Wrench, TrendingUp, Route, Baby, Home as HomeIcon, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SiteNav from "@/components/SiteNav";
import DrillCard from "@/components/DrillCard";
import { useAllDrills } from "@/hooks/useAllDrills";
import { filterOptions, drillTypeOptions } from "@/data/drills";

const INTENT_CARDS = [
  { icon: Wrench, label: "Fix a Flaw", sub: "Target a mechanical issue", filter: "problem", color: "from-red-500/20 to-red-600/10 border-red-500/20 hover:border-red-500/40", iconColor: "text-red-400" },
  { icon: TrendingUp, label: "Build a Skill", sub: "Develop a hitting attribute", filter: "goal", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 hover:border-emerald-500/40", iconColor: "text-emerald-400" },
  { icon: Route, label: "Start with a Pathway", sub: "Follow a progression", href: "/pathways", color: "from-blue-500/20 to-blue-600/10 border-blue-500/20 hover:border-blue-500/40", iconColor: "text-blue-400" },
  { icon: Baby, label: "Younger Hitters", sub: "Foundation drills", filter: "ageLevel", value: "beginner-drills", color: "from-amber-500/20 to-amber-600/10 border-amber-500/20 hover:border-amber-500/40", iconColor: "text-amber-400" },
  { icon: HomeIcon, label: "At-Home Work", sub: "No cage required", filter: "drillType", value: "Tee Work", color: "from-purple-500/20 to-purple-600/10 border-purple-500/20 hover:border-purple-500/40", iconColor: "text-purple-400" },
  { icon: ClipboardList, label: "View Assigned Drills", sub: "Your coach-assigned work", href: "/athlete-portal", color: "from-teal-500/20 to-teal-600/10 border-teal-500/20 hover:border-teal-500/40", iconColor: "text-teal-400" },
] as const;

const DRILL_TYPE_FLAT = drillTypeOptions.flatMap((g) => g.options);

interface FilterSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterSection({ title, open, onToggle, children }: FilterSectionProps) {
  return (
    <div className="border-b border-film-border/60">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-1 py-3 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-film-muted hover:text-film-fg transition-colors"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-3 space-y-0.5 max-h-52 overflow-y-auto pr-1">{children}</div>}
    </div>
  );
}

function CheckboxItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[0.72rem] transition-colors ${
      checked ? "bg-gold/10 text-gold" : "text-film-muted hover:text-film-fg hover:bg-white/[0.04]"
    }`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded-[3px] border-film-border bg-transparent accent-gold"
      />
      {label}
    </label>
  );
}

export default function DrillsDirectory() {
  const allDrills = useAllDrills();

  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [selectedDrillTypes, setSelectedDrillTypes] = useState<Set<string>>(new Set());
  const [selectedAgeLevels, setSelectedAgeLevels] = useState<Set<string>>(new Set());

  const [openSections, setOpenSections] = useState({
    problem: false,
    goal: true,
    drillType: false,
    ageLevel: false,
  });

  const DRILLS_PER_PAGE = 21;

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleSetItem = (
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
    checked: boolean
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      checked ? next.add(value) : next.delete(value);
      return next;
    });
    setCurrentPage(1);
  };

  const filteredDrills = useMemo(() => {
    return allDrills.filter((drill) => {
      if (searchQuery && !drill.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedProblems.size > 0 && !(drill.problem ?? []).some((p) => selectedProblems.has(p))) return false;
      if (selectedGoals.size > 0 && !(drill.goal ?? []).some((g) => selectedGoals.has(g))) return false;
      if (selectedDrillTypes.size > 0 && !selectedDrillTypes.has(drill.drillType ?? "")) return false;
      if (selectedAgeLevels.size > 0 && !(drill.ageLevel ?? []).some((a) => selectedAgeLevels.has(a))) return false;
      return true;
    });
  }, [allDrills, searchQuery, selectedProblems, selectedGoals, selectedDrillTypes, selectedAgeLevels]);

  const totalPages = Math.ceil(filteredDrills.length / DRILLS_PER_PAGE);
  const paginatedDrills = filteredDrills.slice(
    (currentPage - 1) * DRILLS_PER_PAGE,
    currentPage * DRILLS_PER_PAGE
  );

  const hasFilters =
    searchQuery !== "" ||
    selectedProblems.size > 0 ||
    selectedGoals.size > 0 ||
    selectedDrillTypes.size > 0 ||
    selectedAgeLevels.size > 0;

  const clearAll = () => {
    setSearchQuery("");
    setSelectedProblems(new Set());
    setSelectedGoals(new Set());
    setSelectedDrillTypes(new Set());
    setSelectedAgeLevels(new Set());
    setCurrentPage(1);
  };

  const applyIntent = (card: (typeof INTENT_CARDS)[number]) => {
    if ("href" in card && card.href) return;
    clearAll();
    if (card.filter === "problem") setOpenSections((s) => ({ ...s, problem: true }));
    if (card.filter === "goal") setOpenSections((s) => ({ ...s, goal: true }));
    if (card.filter === "drillType" && "value" in card && card.value) {
      setSelectedDrillTypes(new Set([card.value]));
      setOpenSections((s) => ({ ...s, drillType: true }));
    }
    if (card.filter === "ageLevel" && "value" in card && card.value) {
      setSelectedAgeLevels(new Set([card.value]));
      setOpenSections((s) => ({ ...s, ageLevel: true }));
    }
  };

  return (
    <div className="film-room min-h-screen bg-background pt-14">
      <SiteNav />

      {/* Hero — Cinematic Film Room */}
      <header className="relative overflow-hidden border-b border-film-border">
        {/* Cinematic layered background — batting cage atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.14_0.020_40)] via-[oklch(0.11_0.008_260)] to-[oklch(0.08_0.006_250)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_30%,oklch(0.22_0.04_55/0.25),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.58_0.16_145/0.04),transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.005_260/0.8)] via-transparent to-transparent" />
        <div className="absolute inset-0 noise-overlay" />

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
          {/* Eyebrow with gold accent line */}
          <div className="flex items-center gap-3 mb-5 animate-fade-up">
            <div className="h-px w-8 bg-gold/60" />
            <p className="font-heading text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">
              Coach Steve&apos;s Hitters Lab
            </p>
          </div>

          <h1 className="font-display text-4xl font-black uppercase tracking-wide text-white sm:text-5xl md:text-[3.8rem] leading-[0.95] animate-fade-up stagger-1">
            Find the Right Hitting
            <br />Drill
          </h1>
          <p className="mt-2 font-display text-3xl font-black uppercase tracking-wide text-gold sm:text-4xl md:text-[2.8rem] animate-fade-up stagger-2">
            For Your Player
          </p>

          <p className="mt-5 max-w-xl text-[0.88rem] leading-relaxed text-[oklch(0.68_0.012_260)] animate-fade-up stagger-3">
            Find the right hitting drills for your player&apos;s needs &mdash; whether you&apos;re
            building rhythm, cleaning up barrel path, improving lower-half sequencing, or creating
            better game transfer.
          </p>

          {/* Search */}
          <div className="relative mt-7 max-w-lg animate-fade-up stagger-4">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-film-muted pointer-events-none" />
            <Input
              placeholder="Search drills by name, mechanic, or goal..."
              className="h-12 rounded-lg border-[oklch(0.26_0.010_260)] bg-[oklch(0.10_0.006_260/0.8)] pl-11 text-[0.85rem] text-film-fg placeholder:text-film-muted/70 focus-visible:ring-gold/40 focus-visible:border-gold/30 backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-5 text-[0.72rem] text-[oklch(0.55_0.012_260)] animate-fade-up stagger-5">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Train by player need</span>
            <span className="flex items-center gap-2"><span className="text-gold">&rarr;</span>Follow clear progressions</span>
            <span className="flex items-center gap-2"><span className="text-gold">&#10022;</span>Build drills into real development</span>
          </div>
        </div>
      </header>

      {/* Intent Cards */}
      <section className="border-b border-film-border bg-[oklch(0.105_0.006_260)]">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
          <p className="mb-4 font-heading text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[oklch(0.55_0.012_260)]">
            Where do you want to start?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {INTENT_CARDS.map((card) => {
              const Icon = card.icon;
              const inner = (
                <div className={`flex flex-col items-start gap-3 rounded-lg border bg-gradient-to-br ${card.color} px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 cursor-pointer`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] ${card.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block font-heading text-[0.75rem] font-bold text-film-fg">{card.label}</span>
                    <span className="block text-[0.62rem] text-film-muted mt-0.5">{card.sub}</span>
                  </div>
                </div>
              );
              if ("href" in card && card.href) {
                return <Link key={card.label} href={card.href}>{inner}</Link>;
              }
              return <div key={card.label} onClick={() => applyIntent(card)}>{inner}</div>;
            })}
          </div>
        </div>
      </section>

      {/* Drill header bar */}
      <div className="border-b border-film-border bg-[oklch(0.115_0.006_260)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="font-heading text-[0.55rem] font-bold uppercase tracking-[0.18em] text-gold mb-1">
              Build your session with intent
            </p>
            <h2 className="font-display text-2xl font-black uppercase tracking-wider text-film-fg sm:text-3xl">
              Hitting Drills
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 rounded-lg border border-film-border px-3.5 py-2 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-film-muted transition-all duration-200 hover:border-gold/30 hover:text-gold hover:bg-gold/5">
              <Star className="h-3.5 w-3.5" />My Drills
            </button>
            <span className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-film-muted bg-white/[0.04] px-3 py-2 rounded-lg">
              {filteredDrills.length} Drills
            </span>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition-all duration-200 ${
                showSidebar
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-film-border text-film-muted hover:border-gold/30 hover:text-gold hover:bg-gold/5"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />Refine
            </button>
          </div>
        </div>
      </div>

      {/* Main: sidebar + grid */}
      <main className="mx-auto flex max-w-7xl gap-6 px-4 py-8 sm:px-6">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-16 rounded-lg border border-film-border/60 bg-[oklch(0.13_0.006_260)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-1.5 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gold">
                  <SlidersHorizontal className="h-3 w-3" />Refine Drills
                </h3>
                {hasFilters && (
                  <button onClick={clearAll} className="flex items-center gap-1 text-[0.6rem] text-gold hover:text-gold-dim transition-colors">
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
              </div>

              <FilterSection title="Problem" open={openSections.problem} onToggle={() => toggleSection("problem")}>
                {filterOptions.problem.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    label={opt.label}
                    checked={selectedProblems.has(opt.value)}
                    onChange={(c) => toggleSetItem(selectedProblems, setSelectedProblems, opt.value, c)}
                  />
                ))}
              </FilterSection>

              <FilterSection title="Goal" open={openSections.goal} onToggle={() => toggleSection("goal")}>
                {filterOptions.goal.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    label={opt.label}
                    checked={selectedGoals.has(opt.value)}
                    onChange={(c) => toggleSetItem(selectedGoals, setSelectedGoals, opt.value, c)}
                  />
                ))}
              </FilterSection>

              <FilterSection title="Drill Type" open={openSections.drillType} onToggle={() => toggleSection("drillType")}>
                {DRILL_TYPE_FLAT.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    label={opt.label}
                    checked={selectedDrillTypes.has(opt.value)}
                    onChange={(c) => toggleSetItem(selectedDrillTypes, setSelectedDrillTypes, opt.value, c)}
                  />
                ))}
              </FilterSection>

              <FilterSection title="Age / Level" open={openSections.ageLevel} onToggle={() => toggleSection("ageLevel")}>
                {filterOptions.ageLevel.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    label={opt.label}
                    checked={selectedAgeLevels.has(opt.value)}
                    onChange={(c) => toggleSetItem(selectedAgeLevels, setSelectedAgeLevels, opt.value, c)}
                  />
                ))}
              </FilterSection>
            </div>
          </aside>
        )}

        {/* Drill grid */}
        <div className="flex-1 min-w-0">
          {paginatedDrills.length > 0 ? (
            <>
              <div className={`grid gap-5 ${showSidebar ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
                {paginatedDrills.map((drill, idx) => (
                  <DrillCard key={drill.id} drill={drill} animationDelay={idx * 40} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-3">
                  <span className="text-[0.72rem] text-film-muted">
                    Page {currentPage} of {totalPages} &middot; {filteredDrills.length} Drills
                  </span>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`h-8 w-8 rounded-lg font-heading text-[0.7rem] font-bold transition-all duration-200 ${
                          p === currentPage
                            ? "bg-gold text-canvas shadow-md shadow-gold/20"
                            : "text-film-muted hover:text-film-fg hover:bg-white/[0.06] border border-transparent hover:border-film-border"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-film-border flex items-center justify-center mb-5">
                <Search className="h-7 w-7 text-film-muted" />
              </div>
              <h3 className="font-heading text-xl font-bold text-film-fg">No drills found</h3>
              <p className="mt-2 max-w-sm text-[0.82rem] text-film-muted leading-relaxed">
                Try adjusting your filters or clearing your search to see all available drills.
              </p>
              <Button
                onClick={clearAll}
                className="mt-5 bg-gold text-canvas hover:bg-gold-dim font-heading text-[0.72rem] font-bold uppercase tracking-[0.1em] rounded-lg px-6 h-10"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
