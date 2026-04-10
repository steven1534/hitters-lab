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
  { icon: Wrench, label: "Fix a Flaw", sub: "Target a mechanical issue", filter: "problem" },
  { icon: TrendingUp, label: "Build a Skill", sub: "Develop a hitting attribute", filter: "goal" },
  { icon: Route, label: "Start with a Pathway", sub: "Follow a progression", href: "/pathways" },
  { icon: Baby, label: "Younger Hitters", sub: "Foundation drills", filter: "ageLevel", value: "beginner-drills" },
  { icon: HomeIcon, label: "At-Home Work", sub: "No cage required", filter: "drillType", value: "Tee Work" },
  { icon: ClipboardList, label: "View Assigned Drills", sub: "Your coach-assigned work", href: "/athlete-portal" },
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
    <div className="border-b border-film-border">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-1 py-3 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-film-muted hover:text-film-fg transition-colors"
      >
        {title}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-3 space-y-1 max-h-52 overflow-y-auto pr-1">{children}</div>}
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
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[0.72rem] text-film-muted hover:text-film-fg hover:bg-white/[0.03] transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded-[2px] border-film-border bg-transparent accent-gold"
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

      {/* Hero */}
      <header className="border-b border-film-border bg-canvas">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12">
          <p className="mb-1 font-heading text-[0.65rem] font-bold uppercase tracking-[0.15em] text-gold">
            Find the Right Hitting Drill
          </p>
          <h1 className="font-display text-3xl font-black uppercase tracking-wider text-film-fg sm:text-4xl md:text-5xl">
            For Your Player
          </h1>
          <p className="mt-3 max-w-xl text-[0.8rem] leading-relaxed text-film-muted">
            Find the right hitting drills for your player&apos;s needs &mdash; whether you&apos;re
            building rhythm, cleaning up barrel path, improving lower-half sequencing, or creating
            better game transfer.
          </p>

          {/* Search */}
          <div className="relative mt-5 max-w-lg">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-film-muted pointer-events-none" />
            <Input
              placeholder="Search drills by name, mechanic, or goal..."
              className="h-10 rounded-[2px] border-film-border bg-surface pl-10 text-[0.8rem] text-film-fg placeholder:text-film-muted focus-visible:ring-gold/30"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="mt-4 flex items-center gap-4 text-[0.7rem] text-film-muted">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Train by player need</span>
            <span className="flex items-center gap-1.5"><span className="text-gold">&rarr;</span>Follow clear progressions</span>
            <span className="flex items-center gap-1.5"><span className="text-gold">&#10022;</span>Build drills into real development</span>
          </div>
        </div>
      </header>

      {/* Intent Cards */}
      <section className="border-b border-film-border bg-canvas/50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <p className="mb-3 font-heading text-[0.6rem] font-bold uppercase tracking-[0.15em] text-film-muted">
            Where do you want to start?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {INTENT_CARDS.map((card) => {
              const Icon = card.icon;
              const inner = (
                <div className="flex flex-col items-start gap-2 rounded-[2px] border border-film-border bg-surface px-4 py-3.5 transition-colors hover:border-gold/30 hover:bg-surface-raised cursor-pointer">
                  <Icon className="h-4 w-4 text-gold" />
                  <div>
                    <span className="block font-heading text-[0.7rem] font-bold text-film-fg">{card.label}</span>
                    <span className="block text-[0.6rem] text-film-muted">{card.sub}</span>
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
      <div className="border-b border-film-border bg-canvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="font-heading text-[0.55rem] font-bold uppercase tracking-[0.15em] text-gold">
              Build your session with intent
            </p>
            <h2 className="font-display text-xl font-black uppercase tracking-wider text-film-fg sm:text-2xl">
              Hitting Drills
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 rounded-[2px] border border-film-border px-3 py-1.5 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-film-muted transition-colors hover:border-gold/30 hover:text-film-fg">
              <Star className="h-3 w-3" />My Drills
            </button>
            <span className="font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-film-muted">
              {filteredDrills.length} Drills
            </span>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-heading text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition-colors ${
                showSidebar
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : "border-film-border text-film-muted hover:border-gold/30 hover:text-film-fg"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />Refine
            </button>
          </div>
        </div>
      </div>

      {/* Main: sidebar + grid */}
      <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-16">
              <div className="flex items-center justify-between mb-2">
                <h3 className="flex items-center gap-1.5 font-heading text-[0.65rem] font-bold uppercase tracking-[0.12em] text-gold">
                  <SlidersHorizontal className="h-3 w-3" />Refine Drills
                </h3>
                {hasFilters && (
                  <button onClick={clearAll} className="text-[0.6rem] text-gold hover:text-gold-dim">
                    Clear
                  </button>
                )}
              </div>

              {/* Problem filter */}
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

              {/* Goal filter */}
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

              {/* Drill Type filter */}
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

              {/* Age / Level filter */}
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
              <div className={`grid gap-4 ${showSidebar ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
                {paginatedDrills.map((drill, idx) => (
                  <DrillCard key={drill.id} drill={drill} animationDelay={idx * 50} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2 text-[0.7rem]">
                  <span className="text-film-muted">
                    Page {currentPage} of {totalPages} &middot; {filteredDrills.length} Drills
                  </span>
                  <div className="flex gap-1 ml-3">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`h-7 w-7 rounded-[2px] font-heading text-[0.65rem] font-bold transition-colors ${
                          p === currentPage
                            ? "bg-gold text-canvas"
                            : "text-film-muted hover:text-film-fg hover:bg-white/5"
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
              <Search className="mb-4 h-10 w-10 text-film-muted" />
              <h3 className="font-heading text-lg font-bold text-film-fg">No drills found</h3>
              <p className="mt-1 max-w-sm text-[0.8rem] text-film-muted">
                Try adjusting your filters or clearing your search.
              </p>
              <Button
                onClick={clearAll}
                className="mt-4 bg-gold text-canvas hover:bg-gold-dim font-heading text-[0.7rem] font-bold uppercase tracking-[0.1em]"
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
