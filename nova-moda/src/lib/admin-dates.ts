export type OrderDatePreset =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "single"
  | "range";

export interface OrderDateFilterState {
  preset: OrderDatePreset;
  singleDate: string;
  fromDate: string;
  toDate: string;
}

export const DEFAULT_ORDER_DATE_FILTER: OrderDateFilterState = {
  preset: "all",
  singleDate: "",
  fromDate: "",
  toDate: "",
};

export interface ResolvedOrderDateFilter {
  ordersFrom?: string;
  ordersTo?: string;
  metricsFrom?: string;
  metricsTo?: string;
  periodLabel: string;
  filterSummary: string | null;
  validationError: string | null;
}

const MAX_METRICS_DAYS = 3640;

export function toLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalYmdStart(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function addDaysYmd(ymd: string, days: number): string {
  const start = parseLocalYmdStart(ymd);
  if (!start) return ymd;
  const next = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + days,
    12,
    0,
    0,
    0
  );
  return toLocalYmd(next);
}

export function formatYmdShort(ymd: string): string {
  const start = parseLocalYmdStart(ymd);
  if (!start) return ymd;
  return start.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetweenYmd(startYmd: string, endYmd: string): number {
  const start = parseLocalYmdStart(startYmd);
  const end = parseLocalYmdStart(endYmd);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function resolveOrderDateFilter(
  state: OrderDateFilterState,
  now = new Date()
): ResolvedOrderDateFilter {
  const today = toLocalYmd(now);
  const tomorrow = addDaysYmd(today, 1);

  if (state.preset === "today") {
    const from = parseLocalYmdStart(today)!.toISOString();
    const to = parseLocalYmdStart(tomorrow)!.toISOString();
    return {
      ordersFrom: from,
      ordersTo: to,
      metricsFrom: from,
      metricsTo: to,
      periodLabel: "Solicitudes (hoy)",
      filterSummary: formatYmdShort(today),
      validationError: null,
    };
  }

  if (state.preset === "7d") {
    const startYmd = addDaysYmd(today, -6);
    const from = parseLocalYmdStart(startYmd)!.toISOString();
    const to = parseLocalYmdStart(tomorrow)!.toISOString();
    return {
      ordersFrom: from,
      ordersTo: to,
      metricsFrom: from,
      metricsTo: to,
      periodLabel: "Solicitudes (7 días)",
      filterSummary: `${formatYmdShort(startYmd)} – ${formatYmdShort(today)}`,
      validationError: null,
    };
  }

  if (state.preset === "30d") {
    const startYmd = addDaysYmd(today, -29);
    const from = parseLocalYmdStart(startYmd)!.toISOString();
    const to = parseLocalYmdStart(tomorrow)!.toISOString();
    return {
      ordersFrom: from,
      ordersTo: to,
      metricsFrom: from,
      metricsTo: to,
      periodLabel: "Solicitudes (30 días)",
      filterSummary: `${formatYmdShort(startYmd)} – ${formatYmdShort(today)}`,
      validationError: null,
    };
  }

  if (state.preset === "month") {
    const monthStartYmd = `${today.slice(0, 7)}-01`;
    const from = parseLocalYmdStart(monthStartYmd)!.toISOString();
    const to = parseLocalYmdStart(tomorrow)!.toISOString();
    return {
      ordersFrom: from,
      ordersTo: to,
      metricsFrom: from,
      metricsTo: to,
      periodLabel: "Solicitudes (este mes)",
      filterSummary: `${formatYmdShort(monthStartYmd)} – ${formatYmdShort(today)}`,
      validationError: null,
    };
  }

  if (state.preset === "single") {
    const clean = state.singleDate.trim();
    const parsed = parseLocalYmdStart(clean);
    if (!parsed) {
      const from = parseLocalYmdStart(addDaysYmd(today, -MAX_METRICS_DAYS))!.toISOString();
      const to = parseLocalYmdStart(tomorrow)!.toISOString();
      return {
        metricsFrom: from,
        metricsTo: to,
        periodLabel: "Solicitudes (todas)",
        filterSummary: null,
        validationError: null,
      };
    }

    const from = parsed.toISOString();
    const to = parseLocalYmdStart(addDaysYmd(clean, 1))!.toISOString();
    const formatted = formatYmdShort(clean);
    return {
      ordersFrom: from,
      ordersTo: to,
      metricsFrom: from,
      metricsTo: to,
      periodLabel: `Solicitudes (${formatted})`,
      filterSummary: formatted,
      validationError: null,
    };
  }

  if (state.preset === "range") {
    const fromYmd = state.fromDate.trim();
    const toYmd = state.toDate.trim();
    const validFrom = fromYmd ? parseLocalYmdStart(fromYmd) : null;
    const validTo = toYmd ? parseLocalYmdStart(toYmd) : null;

    if (validFrom && validTo) {
      if (fromYmd > toYmd) {
        return {
          periodLabel: "Solicitudes (rango inválido)",
          filterSummary: null,
          validationError: "La fecha «Desde» debe ser anterior o igual a «Hasta».",
        };
      }
      if (daysBetweenYmd(fromYmd, toYmd) > MAX_METRICS_DAYS) {
        return {
          periodLabel: "Solicitudes (rango amplio)",
          filterSummary: null,
          validationError: "El rango máximo permitido es de 10 años.",
        };
      }

      const from = validFrom.toISOString();
      const to = parseLocalYmdStart(addDaysYmd(toYmd, 1))!.toISOString();
      return {
        ordersFrom: from,
        ordersTo: to,
        metricsFrom: from,
        metricsTo: to,
        periodLabel:
          fromYmd === toYmd
            ? `Solicitudes (${formatYmdShort(fromYmd)})`
            : "Solicitudes (rango)",
        filterSummary:
          fromYmd === toYmd
            ? formatYmdShort(fromYmd)
            : `${formatYmdShort(fromYmd)} – ${formatYmdShort(toYmd)}`,
        validationError: null,
      };
    }

    if (validFrom && !toYmd) {
      const endYmd = fromYmd > today ? fromYmd : today;
      if (daysBetweenYmd(fromYmd, endYmd) > MAX_METRICS_DAYS) {
        return {
          periodLabel: "Solicitudes (rango amplio)",
          filterSummary: null,
          validationError: "El rango máximo permitido es de 10 años.",
        };
      }

      const from = validFrom.toISOString();
      const to = parseLocalYmdStart(addDaysYmd(endYmd, 1))!.toISOString();
      return {
        ordersFrom: from,
        ordersTo: to,
        metricsFrom: from,
        metricsTo: to,
        periodLabel: "Solicitudes (desde fecha)",
        filterSummary: `Desde ${formatYmdShort(fromYmd)}`,
        validationError: null,
      };
    }

    if (!fromYmd && validTo) {
      const to = parseLocalYmdStart(addDaysYmd(toYmd, 1))!.toISOString();
      const metricsFrom = parseLocalYmdStart(
        addDaysYmd(toYmd, -MAX_METRICS_DAYS)
      )!.toISOString();
      return {
        ordersTo: to,
        metricsFrom,
        metricsTo: to,
        periodLabel: "Solicitudes (hasta fecha)",
        filterSummary: `Hasta ${formatYmdShort(toYmd)}`,
        validationError: null,
      };
    }
  }

  const allMetricsFrom = parseLocalYmdStart(
    addDaysYmd(today, -MAX_METRICS_DAYS)
  )!.toISOString();
  const allMetricsTo = parseLocalYmdStart(tomorrow)!.toISOString();
  return {
    metricsFrom: allMetricsFrom,
    metricsTo: allMetricsTo,
    periodLabel: "Solicitudes (todas)",
    filterSummary: null,
    validationError: null,
  };
}
