"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { href } from "@/lib/router";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCta,
}: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-8 w-8 text-camel-deep" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {ctaLabel &&
        (onCta ? (
          <Button
            onClick={onCta}
            className="mt-6 h-11 rounded-full px-7 font-medium"
          >
            {ctaLabel}
          </Button>
        ) : (
          <Button asChild className="mt-6 h-11 rounded-full px-7 font-medium">
            <Link href={ctaHref ?? href("/")}>{ctaLabel}</Link>
          </Button>
        ))}
    </div>
  );
}
