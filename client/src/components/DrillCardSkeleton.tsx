/**
 * DrillCardSkeleton - Loading placeholder for drill cards
 * Shows a skeleton while drill data is being fetched
 */
export function DrillCardSkeleton() {
  return (
    <div className="glass-card rounded-xl overflow-hidden h-full flex flex-col animate-pulse">
      {/* Image skeleton */}
      <div className="h-44 bg-gradient-to-br from-card/50 to-accent/50 animate-pulse relative">
        <div className="absolute inset-0 bg-shimmer" />
      </div>

      {/* Body skeleton */}
      <div className="p-4 flex-1 flex flex-col space-y-3">
        {/* Category badge skeleton */}
        <div className="h-3 w-16 bg-muted rounded-full" />

        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded-md w-3/4" />
          <div className="h-4 bg-muted rounded-md w-1/2" />
        </div>

        {/* Description skeleton */}
        <div className="space-y-2 flex-1">
          <div className="h-3 bg-muted rounded-md w-full" />
          <div className="h-3 bg-muted rounded-md w-5/6" />
        </div>

        {/* Footer skeleton */}
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-12 bg-muted rounded-md" />
          <div className="h-6 w-12 bg-muted rounded-md" />
        </div>
      </div>
    </div>
  );
}
