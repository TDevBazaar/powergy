"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
}

function buildPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  if (left > 2) pages.push("ellipsis");
  for (let p = left; p <= right; p += 1) {
    pages.push(p);
  }
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  disabled = false,
  itemLabel = "productos",
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        "mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-6 sm:flex-row",
        className
      )}
    >
      <p className="text-center text-xs text-muted-foreground sm:text-left">
        Mostrando <span className="font-semibold text-foreground">{from}</span>–
        <span className="font-semibold text-foreground">{to}</span> de{" "}
        <span className="font-semibold text-foreground">{totalItems}</span>{" "}
        {itemLabel}
      </p>

      <nav
        aria-label={`Paginación de ${itemLabel}`}
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        <button
          type="button"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Página anterior"
          className="flex h-10 items-center gap-1 rounded-full border border-input bg-card px-3.5 text-xs font-medium transition hover:border-camel disabled:pointer-events-none disabled:opacity-45"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {pages.map((entry, idx) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-10 w-8 items-center justify-center text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(entry)}
              aria-current={entry === page ? "page" : undefined}
              className={cn(
                "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-xs font-semibold transition",
                entry === page
                  ? "bg-foreground text-background shadow-card"
                  : "border border-input bg-card text-foreground hover:border-camel"
              )}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Página siguiente"
          className="flex h-10 items-center gap-1 rounded-full border border-input bg-card px-3.5 text-xs font-medium transition hover:border-camel disabled:pointer-events-none disabled:opacity-45"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}

