"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useT } from "@/context/LanguageContext";

export default function ErrorState({ onRetry }) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
      <h1 className="type-h1">{t.err500Title}</h1>
      <p className="mt-3 text-muted-foreground">{t.err500Desc}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={onRetry}>{t.err500TryAgain}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t.err500Home}
        </Link>
      </div>
      <Link href="/contact?subject=TECH" className="mt-6 text-sm font-semibold text-accent-text hover:underline">
        {t.err500Report}
      </Link>
    </div>
  );
}
