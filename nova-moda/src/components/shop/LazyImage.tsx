"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type IntersectCallback = () => void;

const viewportObservers = new Map<
  string,
  {
    observer: IntersectionObserver;
    targets: Map<Element, IntersectCallback>;
  }
>();

function observeViewport(
  element: Element,
  rootMargin: string,
  onEnter: IntersectCallback
): () => void {
  if (typeof IntersectionObserver === "undefined") {
    onEnter();
    return () => {};
  }

  let entry = viewportObservers.get(rootMargin);
  if (!entry) {
    const targets = new Map<Element, IntersectCallback>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const item of entries) {
          if (item.isIntersecting) {
            const callback = targets.get(item.target);
            if (callback) {
              targets.delete(item.target);
              observer.unobserve(item.target);
              callback();
            }
          }
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );
    entry = { observer, targets };
    viewportObservers.set(rootMargin, entry);
  }

  entry.targets.set(element, onEnter);
  entry.observer.observe(element);

  return () => {
    entry.targets.delete(element);
    entry.observer.unobserve(element);
  };
}

export interface LazyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  /** Carga inmediata para imágenes visibles desde el primer pantallazo. */
  priority?: boolean;
  /** Margen del IntersectionObserver para iniciar la carga al acercarse a pantalla. */
  rootMargin?: string;
  /** Muestra un punto central suave dentro del skeleton de carga. */
  showPulseDot?: boolean;
  /** Tamaño del icono de respaldo si la imagen falla al cargar. */
  fallbackIconSize?: "sm" | "md";
}

export function LazyImage({
  src,
  alt,
  className,
  wrapperClassName,
  priority = false,
  rootMargin = "80px 0px",
  showPulseDot = false,
  fallbackIconSize = "md",
}: LazyImageProps) {
  const cleanSrc = src?.trim() ?? "";
  const containerRef = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(priority);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const shouldLoad = priority || inView;
  const loaded = Boolean(cleanSrc) && loadedSrc === cleanSrc;
  const failed = Boolean(cleanSrc) && failedSrc === cleanSrc;

  useEffect(() => {
    if (priority || inView || !cleanSrc) return;
    const node = containerRef.current;
    if (!node) return;

    return observeViewport(node, rootMargin, () => {
      setInView(true);
    });
  }, [priority, inView, cleanSrc, rootMargin]);

  const handleImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node || !cleanSrc) return;
      if (node.complete && node.naturalWidth > 0) {
        setLoadedSrc((prev) => (prev === cleanSrc ? prev : cleanSrc));
      }
    },
    [cleanSrc]
  );

  return (
    <span
      ref={containerRef}
      className={cn(
        "relative block overflow-hidden bg-secondary",
        wrapperClassName
      )}
    >
      {!cleanSrc || failed ? (
        <span className="flex h-full w-full items-center justify-center bg-secondary/70 text-muted-foreground/35">
          <ImageOff
            className={fallbackIconSize === "sm" ? "h-4 w-4" : "h-6 w-6"}
          />
        </span>
      ) : (
        <>
          {!loaded && (
            <span className="absolute inset-0 flex animate-pulse items-center justify-center bg-secondary/80">
              {showPulseDot && (
                <span className="h-6 w-6 rounded-full bg-muted-foreground/10" />
              )}
            </span>
          )}
          {shouldLoad && (
            <img
              ref={handleImgRef}
              src={cleanSrc}
              alt={alt}
              loading="eager"
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onLoad={() => setLoadedSrc(cleanSrc)}
              onError={() => setFailedSrc(cleanSrc)}
              className={cn(
                "relative h-full w-full object-cover",
                priority
                  ? className
                  : cn(
                      "transition-all duration-700 ease-out",
                      loaded ? "scale-100 opacity-100" : "scale-95 opacity-0",
                      className
                    )
              )}
            />
          )}
        </>
      )}
    </span>
  );
}
