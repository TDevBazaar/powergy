"use client";

import { cn } from "@/lib/utils";

/** Skeleton individual de tarjeta de categoría */
export function CategoryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex animate-pulse items-center justify-between gap-4 overflow-hidden rounded-[1.6rem] bg-card p-4 pl-6 shadow-card",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="h-5 w-24 rounded-md bg-secondary" />
        <div className="h-3 w-32 rounded-md bg-secondary/70" />
        <div className="h-4 w-16 rounded-md bg-secondary/50 pt-1" />
      </div>
      <div className="h-24 w-28 shrink-0 rounded-2xl bg-secondary sm:h-28 sm:w-36" />
    </div>
  );
}

/** Grid de skeletons de categorías */
export function CategoryGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <CategoryCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Skeleton individual de tarjeta de producto */
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.6rem] bg-secondary shadow-card">
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent" />
      </div>
      <div className="space-y-1.5 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-16 rounded-md bg-secondary/60" />
          <div className="h-3 w-10 rounded-md bg-secondary/40" />
        </div>
        <div className="h-4 w-3/4 rounded-md bg-secondary" />
        <div className="h-4 w-1/3 rounded-md bg-secondary/80 font-bold" />
      </div>
    </div>
  );
}

/** Grid de skeletons de productos */
export function ProductGridSkeleton({
  count = 6,
  columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
}: {
  count?: number;
  columns?: string;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-7", columns)}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
