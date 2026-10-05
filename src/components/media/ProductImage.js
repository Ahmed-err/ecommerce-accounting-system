"use client";

import Image from "next/image";
import { useState } from "react";
import BoltMark from "@/components/brand/BoltMark";
import { useT } from "@/context/LanguageContext";
import cloudinaryLoader, { isCloudinary } from "@/lib/cloudinary-loader";
import { cn } from "@/lib/utils";

// Product photo on a white tile (most product photos have white backgrounds), never
// cropped. Missing or broken photos show a quiet placeholder instead of an emoji.
export function ProductImagePlaceholder({ className, compact = false }) {
  const t = useT();
  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2 bg-white text-slate-400", className)}>
      <BoltMark size={compact ? 24 : 40} tone="navy" className="opacity-25" />
      {compact ? null : <span className="text-xs font-semibold">{t.photoComingSoon}</span>}
    </div>
  );
}

export default function ProductImage({ src, alt = "", sizes, className, priority, compact, padded = true }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <ProductImagePlaceholder compact={compact} />;
  return (
    <div className="absolute inset-0 bg-white">
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loader={isCloudinary(src) ? cloudinaryLoader : undefined}
        className={cn("object-contain", padded && "p-2", className)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
