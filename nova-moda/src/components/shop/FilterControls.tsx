"use client";

/* ── Controles de filtrado compartidos (catálogo / búsqueda / categoría) ── */

import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { priceCeiling, SORT_OPTIONS, useCategories } from "@/lib/catalog";
import type { CategoryId, FilterState, Product, SortId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterControlsProps {
  products: Product[];
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  /** Bloquea el bloque de categorías (p. ej. dentro de una categoría) */
  hideCategories?: boolean;
  className?: string;
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

export function FilterControls({
  products,
  filters,
  onChange,
  onReset,
  hideCategories = false,
  className,
}: FilterControlsProps) {
  const categories = useCategories();
  const precioMaximo = priceCeiling(products);
  const precioActual = filters.maxPrice > 0 ? filters.maxPrice : precioMaximo;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filtros</p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Limpiar
        </button>
      </div>

      {!hideCategories && categories.length > 0 && (
        <Group title="Categoría">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = filters.cats.includes(c.slug);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      cats: filters.cats.includes(c.slug as CategoryId)
                        ? filters.cats.filter((v) => v !== c.slug)
                        : [...filters.cats, c.slug as CategoryId],
                    })
                  }
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-input bg-card hover:border-camel"
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </Group>
      )}

      <Group title={`Precio hasta $${Math.round(precioActual)}`}>
        <Slider
          value={[precioActual]}
          min={0}
          max={precioMaximo}
          step={5}
          onValueChange={([v]) =>
            onChange({ maxPrice: v >= precioMaximo ? 0 : v })
          }
          className="w-full"
        />
      </Group>

      <Group title="Otros">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={filters.onlyOffers}
            onChange={(e) => onChange({ onlyOffers: e.target.checked })}
            className="h-4 w-4 rounded border-input accent-[#B08968]"
          />
          Solo ofertas
        </label>
      </Group>

      <Group title="Ordenar por">
        <Select
          value={filters.sort}
          onValueChange={(v) => onChange({ sort: v as SortId })}
        >
          <SelectTrigger className="w-full rounded-full border-input bg-card">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Group>
    </div>
  );
}
