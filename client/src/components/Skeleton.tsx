import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// Base skeleton with shimmer animation
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/5",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r",
        "before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
    />
  );
}

// Skeleton for drill cards in the directory
export function DrillCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 border-l-4 border-l-transparent">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <Skeleton className="h-6 w-3/4 mb-3" />
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        {/* Arrow icon placeholder */}
        <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}

// Skeleton for the drill list on home page
export function DrillListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <DrillCardSkeleton />
        </div>
      ))}
    </div>
  );
}

// Skeleton for the hero section stats
export function HeroStatsSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-5 flex-wrap">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-16 rounded-full" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
  );
}

// Skeleton for athlete portal "Up Next" card
export function UpNextSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden border-glow animate-fade-in-up">
      <div className="relative p-6">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-electric/10 rounded-full blur-3xl" />
        
        <div className="relative">
          {/* Up Next label */}
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          
          {/* Drill name */}
          <Skeleton className="h-8 w-3/4 mb-3" />
          
          {/* Badges */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-18 rounded-full" />
          </div>

          {/* Button */}
          <Skeleton className="w-full h-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Skeleton for progress stats row
export function ProgressStatsSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      {/* Circular progress */}
      <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
      
      <div className="flex-1">
        {/* Progress label */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        {/* Streak */}
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

// Skeleton for playlist item
export function PlaylistItemSkeleton() {
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-4">
      {/* Icon */}
      <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        {/* Title */}
        <Skeleton className="h-5 w-3/4 mb-2" />
        {/* Date/badge */}
        <Skeleton className="h-4 w-24" />
      </div>
      
      {/* Play button */}
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
    </div>
  );
}

// Skeleton for playlist section
export function PlaylistSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      
      {/* Items */}
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <PlaylistItemSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for badge progress card
export function BadgeProgressSkeleton() {
  return (
    <div className="glass-card rounded-2xl p-4 border-glow animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="w-full h-2 rounded-full mb-2" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

// Full athlete portal loading skeleton
export function AthletePortalSkeleton() {
  return (
    <div className="coach-dark min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="flex items-center justify-between max-w-lg mx-auto px-4 py-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <UpNextSkeleton />
        <ProgressStatsSkeleton />
        <PlaylistSkeleton count={3} />
        <BadgeProgressSkeleton />
      </main>
    </div>
  );
}

// Full home page loading skeleton
export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero section skeleton */}
      <header className="relative overflow-hidden gradient-hero">
        <div className="container relative z-10 py-8 md:py-20">
          {/* Auth buttons */}
          <div className="flex justify-end gap-2 mb-6">
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
          
          <div className="max-w-4xl">
            {/* Accent line */}
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-1 w-12 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            
            {/* Title */}
            <Skeleton className="h-16 md:h-20 w-3/4 mb-4" />
            
            {/* Description */}
            <Skeleton className="h-6 w-full max-w-xl mb-2" />
            <Skeleton className="h-6 w-2/3 max-w-md mb-10" />
            
            {/* Search bar */}
            <Skeleton className="h-14 md:h-16 w-full md:max-w-2xl rounded-xl" />
          </div>
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="flex-1 container py-6 md:py-12">
        {/* Filter button */}
        <div className="mb-8">
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* Results count */}
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-12 rounded-full" />
        </div>

        {/* Drill list */}
        <DrillListSkeleton count={10} />
      </main>
    </div>
  );
}
