"use client";

import { useEffect, useMemo, useRef } from "react";
import { Search, SlidersHorizontal, PackageSearch } from "lucide-react";
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
import { useFilterState } from "@/components/shop/useFilterState";
import { activeFilterCount, applyFilters, searchProducts, useCatalog, useCategories, useProductsStatus } from "@/lib/catalog";
import { navigate } from "@/lib/router";

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const catalog = useCatalog();
  const categories = useCategories();
  const productsStatus = useProductsStatus();
  const { filters, patch, reset } = useFilterState({ q: initialQuery });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    patch({ q: initialQuery });
  }, [initialQuery, patch]);

  /* Sugerencias reales de la tienda: categorías y etiquetas del catálogo */
  const populares = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const p of catalog) {
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
  }, [catalog, categories]);

  const results = useMemo(
    () => applyFilters(searchProducts(catalog, filters.q), filters),
    [catalog, filters]
  );
  const activeCount = activeFilterCount(filters);
  const hasQuery = filters.q.trim().length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    navigate(`/buscar${q ? `?q=${encodeURIComponent(q)}` : ""}`, { replace: true });
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
            onClick={() => navigate(`/buscar?q=${encodeURIComponent(term)}`, { replace: true })}
            className="rounded-full bg-secondary px-3.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-accent"
          >
            {term}
          </button>
        ))}
      </div>

      {/* Móvil: filtros */}
      <div className="mb-6 mt-8 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-muted-foreground">
          {results.length} {results.length === 1 ? "resultado" : "resultados"}
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
                products={catalog}
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
              products={catalog}
              filters={filters}
              onChange={patch}
              onReset={reset}
            />
          </div>
        </aside>

        <div>
          <p className="mb-5 hidden text-sm text-muted-foreground lg:block">
            {hasQuery ? (
              <>
                Resultados para <span className="font-semibold text-foreground">“{filters.q}”</span> —{" "}
                {results.length}
              </>
            ) : (
              <>{results.length} productos · escribe arriba para filtrar por texto</>
            )}
          </p>
          {productsStatus === "loading" && catalog.length === 0 ? (
            <ProductGridSkeleton
              count={8}
              columns="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4"
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={hasQuery ? `Sin resultados para “${filters.q}”` : "Nada encontrado"}
              description="Prueba con otro término o relaja los filtros de precio."
              ctaLabel="Limpiar filtros"
              onCta={reset}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
