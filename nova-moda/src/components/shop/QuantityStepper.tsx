"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  className,
  ariaLabel = "Cantidad",
}: QuantityStepperProps) {
  const btn =
    "flex items-center justify-center rounded-full transition hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent";
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-input bg-card p-1",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className={cn(btn, dim)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Reducir cantidad"
      >
        <Minus className={icon} />
      </button>
      <span
        className={cn(
          "min-w-7 text-center font-medium tabular-nums",
          size === "sm" ? "text-xs" : "text-sm"
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, dim)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
