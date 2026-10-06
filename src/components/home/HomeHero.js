"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ProductImage from "@/components/media/ProductImage";
import DepthStage from "@/components/motion/DepthStage";
import Tilt3D from "@/components/motion/Tilt3D";
import { buttonVariants } from "@/components/ui/button";
import { useLanguage, useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

// Card placement in the stage: depth (parallax strength), resting tilt, float rhythm.
const SLOTS = [
  { pos: "start-[6%] top-[8%] w-[46%]", depth: 1, tilt: "-4deg", float: "float-slow" },
  { pos: "end-[4%] top-[18%] w-[42%]", depth: 2.2, tilt: "5deg", float: "float-slow-2" },
  { pos: "start-[26%] bottom-[2%] w-[40%]", depth: 3.2, tilt: "-2deg", float: "float-slow-3" },
];

export function heroSubtitle(t, total, brands) {
  const names = brands.slice(0, 3).map((b) => b.name);
  if (!total) return t.homeHeroSubtitleEmpty;
  if (!names.length) return t.homeHeroSubtitleCount.replace("{count}", total);
  return t.homeHeroSubtitle.replace("{count}", total).replace("{brands}", names.join(t.listSeparator));
}

export default function HomeHero({ products, total, brands }) {
  const t = useT();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  return (
    <DepthStage className="relative overflow-hidden border-b border-border bg-card">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_75%_40%,rgb(242_162_12/0.14),transparent_70%)] rtl:bg-[radial-gradient(60%_70%_at_25%_40%,rgb(242_162_12/0.14),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-6 lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <p className="text-sm font-bold text-accent-text">{t.homeHeroEyebrow}</p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">{t.homeHeroTitle}</h1>
          <p className="mt-4 text-lg leading-8 text-ink-2">{heroSubtitle(t, total, brands)}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 px-6 text-base")}>
              {t.homeHeroCta}
              <Arrow className="size-4" aria-hidden="true" />
            </Link>
            <Link href="#categories" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 px-6 text-base")}>
              {t.homeHeroSecondary}
            </Link>
          </div>
        </div>

        {products.length ? (
          <div className="relative mx-auto aspect-[5/4] w-full max-w-[560px]">
            {products.map((p, i) => {
              const slot = SLOTS[i];
              const name = isRTL ? p.nameAr || p.name : p.nameEn || p.name;
              return (
                <div
                  key={p.id}
                  className={cn("depth-layer absolute", slot.pos)}
                  style={{ "--depth": slot.depth, "--tilt": slot.tilt, zIndex: i + 1 }}
                >
                  <div className={slot.float}>
                    <Tilt3D className="rounded-2xl">
                      <Link
                        href={`/products/${p.id}`}
                        className="block overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_48px_-20px_rgb(14_26_43/0.35)]"
                      >
                        <span className="relative block aspect-square">
                          <ProductImage src={p.image} alt={name} sizes="(max-width: 1024px) 45vw, 260px" priority={i === 0} />
                          <span className="tilt3d-shine pointer-events-none absolute inset-0" aria-hidden="true" />
                        </span>
                        <span className="tilt3d-pop block truncate border-t border-border px-3 py-2 text-sm font-semibold text-slate-800">
                          {name}
                        </span>
                      </Link>
                    </Tilt3D>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </DepthStage>
  );
}
