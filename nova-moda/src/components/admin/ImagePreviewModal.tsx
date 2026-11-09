"use client";

import { useState } from "react";
import { ImageOff, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LazyImage } from "@/components/shop/LazyImage";
import { cn } from "@/lib/utils";

export interface PreviewImageData {
  src: string;
  alt: string;
}

interface ZoomableThumbProps {
  src?: string | null;
  alt: string;
  onPreview: (image: PreviewImageData) => void;
  className?: string;
  priority?: boolean;
}

export function ZoomableThumb({
  src,
  alt,
  onPreview,
  className = "h-12 w-10 rounded-lg",
  priority = false,
}: ZoomableThumbProps) {
  const cleanSrc = src?.trim() ?? "";

  if (!cleanSrc) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center bg-secondary text-muted-foreground/40",
          className
        )}
        aria-hidden="true"
      >
        <ImageOff className="h-4 w-4" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview({ src: cleanSrc, alt })}
      aria-label={`Ampliar imagen de ${alt}`}
      title="Toca para ampliar"
      className={cn(
        "group/thumb relative block shrink-0 cursor-zoom-in overflow-hidden bg-secondary ring-offset-background transition hover:ring-2 hover:ring-camel/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <LazyImage
        src={cleanSrc}
        alt={alt}
        priority={priority}
        fallbackIconSize="sm"
        wrapperClassName="h-full w-full"
        className="transition duration-300 group-hover/thumb:scale-105"
      />
      <span
        className="pointer-events-none absolute right-1 bottom-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/60 text-white shadow-sm transition group-hover/thumb:scale-110"
        aria-hidden="true"
      >
        <ZoomIn className="h-2.5 w-2.5" />
      </span>
    </button>
  );
}

interface ImagePreviewModalProps {
  image: PreviewImageData | null;
  onClose: () => void;
}

export function ImagePreviewModal({ image, onClose }: ImagePreviewModalProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const broken = Boolean(image && failedSrc === image.src);

  return (
    <Dialog
      open={image !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-[1.6rem] bg-card p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle className="line-clamp-2 text-base sm:text-lg">
            {image?.alt || "Imagen del producto"}
          </DialogTitle>
        </DialogHeader>

        {image && (
          <div className="flex min-h-48 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-secondary/55 p-2 sm:min-h-72 sm:p-4">
            {broken ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <ImageOff className="h-8 w-8 opacity-45" />
                <span>No se pudo cargar la imagen.</span>
              </div>
            ) : (
              <div className="w-full min-w-0">
                <img
                  src={image.src}
                  alt={image.alt}
                  onError={() => setFailedSrc(image.src)}
                  className="mx-auto block h-auto max-h-[58dvh] w-auto max-w-full rounded-xl object-contain sm:max-h-[68dvh]"
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-10 w-full rounded-full border-input bg-card sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

