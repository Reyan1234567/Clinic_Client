"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Renders a storage image from an embedded signed URL (`file.filePath`).
 * Click opens a larger lightbox preview.
 */
export function AuthImage({
  src,
  alt,
  className,
  caption,
}: {
  src: string;
  alt: string;
  className?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center bg-muted text-[10px] text-muted-foreground",
          className,
        )}
      >
        Could not load image
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={`View larger: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={className}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl gap-3 p-3 sm:p-4">
          <DialogHeader className="space-y-1 px-1">
            <DialogTitle className="truncate text-sm">{alt}</DialogTitle>
            {caption ? (
              <DialogDescription className="truncate text-xs">{caption}</DialogDescription>
            ) : null}
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[75vh] w-full object-contain bg-muted"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
