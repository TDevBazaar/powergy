"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionTitle({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function Stars({
  rating,
  reviews,
  className,
}: {
  rating: number;
  reviews?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      aria-label={`Valoración: ${rating} de 5`}
    >
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              "h-3.5 w-3.5",
              i <= Math.round(rating)
                ? "fill-camel text-camel"
                : "fill-transparent text-camel/40"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {rating.toFixed(1)}
        {reviews !== undefined && ` (${reviews})`}
      </span>
    </div>
  );
}

/** Chip de etiqueta genérico */
export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
