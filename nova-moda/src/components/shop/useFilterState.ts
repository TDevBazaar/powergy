"use client";

import { useCallback, useState } from "react";
import { DEFAULT_FILTERS } from "@/lib/catalog";
import type { FilterState } from "@/lib/types";

export function useFilterState(initial?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initial,
  });

  const patch = useCallback(
    (p: Partial<FilterState>) => setFilters((f) => ({ ...f, ...p })),
    []
  );
  const reset = useCallback(
    () => setFilters({ ...DEFAULT_FILTERS }),
    []
  );

  return { filters, patch, reset, setFilters };
}
