"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { PackageSearch, Search, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGridSkeleton } from "@/components/shop/Skeletons";
import { EmptyState } from "@/components/shop/EmptyState";
import { FilterControls } from "@/components/shop/FilterControls";
import { CatalogFeedFooter } from "@/components/shop/CatalogFeedFooter";
import { useFilterState } from "@/components/shop/useFilterState";
import {
  activeFilterCount,
  priceCeilingFromMax,
  useCatalogMeta,
  useCategories,
} from "@/lib/catalog";
import { useCatalogFeed } from "@/lib/useCatalogFeed";
import { navigate } from "@/lib/router";

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const categories = useCategories();
  const meta = useCatalogMeta();
  const { filters, patch, reset } = useFilterState({ q: initialQuery });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    patch({ q: initialQuery });
  }, [initialQuery, patch]);

  const feed = useCatalogFeed({
    filters,
    pageSize: 20,
    cursorLimit: 12,
  });

  const handlePageChange = useCallback(
    (nextPage: number) => {
      feed.setPage(nextPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [feed]
  );

  /* Sugerencias reales de la tienda: categorías y etiquetas visibles */
  const populares = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of feed.items) {
      for (const t of p.tags) {
        const clave = t.trim().toLowerCase();
        if (!clave || clave === "nova moda" || clave === "general") continue;
        cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
      }
    }
    const etiquetas = [...cuenta.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
    const nombres = categories.map((c) => c.name.toLowerCase());
    return [...nombres, ...etiquetas.filter((t) => !nombres.includes(t))].slice(
      0,
      7
    );
  }, [feed.items, categories]);

  const activeCount = activeFilterCount(filters);
  const maxPriceCeiling = priceCeilingFromMax(meta?.maxPriceUsd);
  const hasQuery = filters.q.trim().length > 0;
  const totalDisplay = feed.totalItems ?? feed.items.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    navigate(`/buscar${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
      replace: true,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          BÚSQUEDA Y FILTROS
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Encuentra tu estilo
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Busca por nombre, descripción o marca y combina el resultado con
          los filtros disponibles.
        </p>
      </header>

      {/* Buscador grande */}
      <form onSubmit={submit} role="search" className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          key={initialQuery}
          type="search"
          defaultValue={initialQuery}
          placeholder="Busca por nombre, marca o categoría…"
          aria-label="Buscar productos"
          className="h-14 w-full rounded-full border border-input bg-card pl-13 pr-28 text-sm shadow-card placeholder:text-muted-foreground/70 focus:border-camel focus:outline-none focus:ring-2 focus:ring-camel/40"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 h-10 -translate-y-1/2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-foreground transition hover:bg-foreground/90"
        >
          Buscar
        </button>
      </form>

      {/* Términos populares */}
      <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
        {populares.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() =>
              navigate(`/buscar?q=${encodeURIComponent(term)}`, {
                replace: true,
              })
            }
            className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-accent"
          >
            {term}
          </button>
        ))}
      </div>

      {/* Móvil: filtros */}
      <div className="mb-6 mt-8 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {feed.loadingInitial
            ? "Buscando productos…"
            : `${totalDisplay} ${totalDisplay === 1 ? "resultado" : "resultados"}`}
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 rounded-full border-input bg-card">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filtros
              {activeCount > 0 && (
                <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-camel px-1 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85%] max-w-sm overflow-y-auto">
            <SheetHeader className="p-0">
              <SheetTitle className="sr-only">Filtros</SheetTitle>
            </SheetHeader>
            <div className="px-1 pb-6">
              <FilterControls
                maxPriceCeiling={maxPriceCeiling}
                filters={filters}
                onChange={patch}
                onReset={reset}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <FilterControls
              maxPriceCeiling={maxPriceCeiling}
              filters={filters}
              onChange={patch}
              onReset={reset}
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {feed.loadingInitial ? (
              "Buscando productos…"
            ) : hasQuery ? (
              <>
                Resultados para{" "}
                <span className="font-semibold text-foreground">“{filters.q}”</span>{" "}
                — {totalDisplay}
              </>
            ) : (
              <>{totalDisplay} productos · escribe arriba para filtrar por texto</>
            )}
          </p>
          {feed.loadingInitial ? (
            <ProductGridSkeleton
              count={8}
              columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            />
          ) : feed.error ? (
            <EmptyState
              icon={PackageSearch}
              title="No se pudo completar la búsqueda"
              description={feed.error}
              ctaLabel="Reintentar"
              onCta={feed.retry}
            />
          ) : feed.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={hasQuery ? `Sin resultados para “${filters.q}”` : "Nada encontrado"}
              description="Prueba con otro término o relaja los filtros de precio."
              ctaLabel="Limpiar filtros"
              onCta={reset}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
                {feed.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <CatalogFeedFooter
                isPaginated={feed.isPaginated}
                page={feed.page}
                totalPages={feed.totalPages}
                totalItems={feed.totalItems}
                pageSize={feed.pageSize}
                hasMore={feed.hasMore}
                itemCount={feed.items.length}
                loadingInitial={feed.loadingInitial}
                loadingMore={feed.loadingMore}
                loadMoreError={feed.loadMoreError}
                onPageChange={handlePageChange}
                onRetryMore={feed.retry}
                sentinelRef={feed.sentinelRef}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
