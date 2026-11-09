"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/shop/PaginationControls";

interface CatalogFeedFooterProps {
  isPaginated: boolean;
  page: number;
  totalPages: number;
  totalItems: number | null;
  pageSize: number;
  hasMore: boolean;
  itemCount: number;
  loadingInitial: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onPageChange: (page: number) => void;
  onRetryMore: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}

export function CatalogFeedFooter({
  isPaginated,
  page,
  totalPages,
  totalItems,
  pageSize,
  hasMore,
  itemCount,
  loadingInitial,
  loadingMore,
  loadMoreError,
  onPageChange,
  onRetryMore,
  sentinelRef,
}: CatalogFeedFooterProps) {
  if (isPaginated) {
    return (
      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={totalItems ?? 0}
        pageSize={pageSize}
        onPageChange={onPageChange}
        disabled={loadingInitial}
      />
    );
  }

  return (
    <div className="mt-8">
      {loadingMore && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-camel-deep" />
          <span>Cargando más productos…</span>
        </div>
      )}

      {loadMoreError && !loadingMore && (
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
          <p className="text-xs text-muted-foreground">{loadMoreError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetryMore}
            className="h-9 rounded-full border-input bg-card px-4 text-xs"
          >
            Reintentar
          </Button>
        </div>
      )}

      {hasMore && !loadingMore && !loadMoreError && (
        <div ref={sentinelRef} className="h-10 w-full" aria-hidden="true" />
      )}

      {!hasMore && itemCount > 0 && !loadingInitial && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Mostrando todos los productos ({itemCount})
        </p>
      )}
    </div>
  );
}

