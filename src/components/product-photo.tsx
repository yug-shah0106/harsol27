import { PHOTO_WIDTHS } from "@/lib/product-schema";

/**
 * A product photo from /media, with srcset across the pre-made WebP widths so each device downloads
 * the smallest version that looks sharp. Plain <img> on purpose: the files are already sized and
 * compressed by the worker, and Next's image optimiser would cache private (hidden-product) photos.
 */
export function ProductPhoto({
  id,
  alt,
  sizes,
  width,
  height,
  priority = false,
  className,
}: {
  id: string;
  alt: string;
  sizes: string;
  width?: number | null;
  height?: number | null;
  priority?: boolean;
  className?: string;
}) {
  const srcSet = PHOTO_WIDTHS.map((w) => `/media/photos/${id}/${w}.webp ${w}w`).join(", ");
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see component comment
    <img
      src={`/media/photos/${id}/800.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}
