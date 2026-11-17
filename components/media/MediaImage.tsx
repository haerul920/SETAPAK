"use client";

import Image from "next/image";
import { altFor, srcSetFor, type MediaEntry } from "@/lib/media";
import { useCopy } from "@/lib/useCopy";
import { cn } from "@/lib/utils";
import { Credit } from "./Credit";

interface MediaImageProps {
  media: MediaEntry;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** posisi kredit; "none" jika kredit ditampilkan di tempat lain */
  credit?: "corner" | "inline" | "none";
  creditAlign?: "left" | "right";
  style?: React.CSSProperties;
}

/**
 * Foto berlisensi terbuka dengan AVIF (via <picture>) + WebP fallback, blur placeholder, dan kredit.
 * Gambar priority hanya memakai WebP supaya preload tidak mengunduh dua format.
 */
export function MediaImage({
  media,
  sizes,
  priority = false,
  className,
  imgClassName,
  credit = "corner",
  creditAlign = "right",
  style,
}: MediaImageProps) {
  const { lang } = useCopy();
  const img = (
    <Image
      src={media.src}
      alt={altFor(media, lang)}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={media.blurDataURL ? "blur" : "empty"}
      blurDataURL={media.blurDataURL}
      className={cn("object-cover", imgClassName)}
      style={{ objectPosition: media.focus ?? "50% 50%", ...style }}
    />
  );
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {priority ? (
        img
      ) : (
        <picture>
          <source type="image/avif" srcSet={srcSetFor(media, "avif")} sizes={sizes} />
          {img}
        </picture>
      )}
      {credit !== "none" && <Credit media={media} variant={credit} align={creditAlign} />}
    </div>
  );
}
