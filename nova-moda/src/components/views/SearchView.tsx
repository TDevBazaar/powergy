"use client";

import { useCallback, useEffect, useMemo } from "react";
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
  useCategoriesStatus,
} from "@/lib/catalog";
import { useCatalogFeed } from "@/lib/useCatalogFeed";
import { navigate } from "@/lib/router";
import type { CategoryId } from "@/lib/types";

interface SearchViewProps {
  initialQuery?: string;
  initialCat?: string | null;
}

export function SearchView({
  initialQuery = "",
  initialCat,
}: SearchViewProps) {
  const categories = useCategories();
  const categoriesStatus = useCategoriesStatus();
  const meta = useCatalogMeta();

  const validCat = useMemo(
    () =>
      initialCat && categories.some((c) => c.slug === initialCat)
        ? (initialCat as CategoryId)
        : undefined,
    [categories, initialCat]
  );

  const { filters, patch, reset } = useFilterState({
    q: initialQuery,
    ...(initialCat ? { cats: [initialCat as CategoryId] } : {}),
  });

  useEffect(() => {
    patch({ q: initialQuery });
  }, [initialQuery, patch]);

  // Si llega ?cat= desde algún enlace, sincroniza y valida al cargar categorías
  useEffect(() => {
    if (!initialCat) return;
    if (categoriesStatus === "ready") {
      patch({ cats: validCat ? [validCat] : [] });
    } else if (categoriesStatus !== "error") {
      patch({ cats: [initialCat as CategoryId] });
    }
  }, [initialCat, categoriesStatus, validCat, patch]);

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

  const handleReset = useCallback(() => {
    reset();
    if (initialQuery || initialCat) {
      navigate("/catalogo", { replace: true, keepScroll: true });
    }
  }, [reset, initialQuery, initialCat]);

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
    const q = filters.q.trim();
    navigate(`/catalogo${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
      replace: true,
      keepScroll: true,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-7 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-camel-deep">
          NOVA MODA
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Catálogo
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Explora todas las prendas y accesorios. Busca por nombre o marca y
          combina el resultado con los filtros de categoría y precio.
        </p>
      </header>

      {/* Buscador principal */}
      <form onSubmit={submit} role="search" className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id="catalog-search"
          type="search"
          value={filters.q}
          onChange={(e) => patch({ q: e.target.value })}
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
      {populares.length > 0 && (
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {populares.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                patch({ q: term });
                navigate(`/catalogo?q=${encodeURIComponent(term)}`, {
                  replace: true,
                  keepScroll: true,
                });
              }}
              className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-accent"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Móvil: filtros */}
      <div className="mb-6 mt-8 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {feed.loadingInitial
            ? "Cargando productos…"
            : `${totalDisplay} ${totalDisplay === 1 ? "producto" : "productos"}`}
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
          <SheetContent
            side="left"
            className="w-[88%] max-w-sm overflow-y-auto px-5 pt-12 pb-8"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <FilterControls
              maxPriceCeiling={maxPriceCeiling}
              filters={filters}
              onChange={patch}
              onReset={handleReset}
            />
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
              onReset={handleReset}
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {feed.loadingInitial ? (
              "Cargando productos…"
            ) : hasQuery ? (
              <>
                Resultados para{" "}
                <span className="font-semibold text-foreground">“{filters.q}”</span>{" "}
                — {totalDisplay}
              </>
            ) : (
              <>
                {totalDisplay} {totalDisplay === 1 ? "producto" : "productos"}
                {filters.cats.length > 0 &&
                  ` · ${filters.cats
                    .map(
                      (c) => categories.find((cat) => cat.slug === c)?.name ?? c
                    )
                    .join(", ")}`}
              </>
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
              title="No se pudo cargar el catálogo"
              description={feed.error}
              ctaLabel="Reintentar"
              onCta={feed.retry}
            />
          ) : feed.items.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={hasQuery ? `Sin resultados para “${filters.q}”` : "Sin resultados"}
              description="Prueba con otro término o relaja los filtros elegidos."
              ctaLabel="Limpiar filtros"
              onCta={handleReset}
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
