"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function OfflinePage() {
  const [isRTL, setIsRTL] = useState(false);

  useEffect(() => {
    setIsRTL(document.documentElement.dir === "rtl");
  }, []);

  return (
    <main
      className={`min-h-screen bg-background px-4 py-16 ${isRTL ? "text-right" : "text-left"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-black text-foreground">
          {isRTL ? "أنت غير متصل بالإنترنت" : "You are offline"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isRTL
            ? "تحقق من الاتصال ثم أعد المحاولة."
            : "Please check your connection and try again."}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-black"
          >
            {isRTL ? "إعادة المحاولة" : "Retry"}
          </button>
          <Link
            href="/"
            className="rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground"
          >
            {isRTL ? "الصفحة الرئيسية" : "Home"}
          </Link>
        </div>
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? "صفحات يمكن الوصول لها من الكاش:"
              : "Cached pages you can still access:"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>/</li>
            <li>/products</li>
            <li>/about</li>
            <li>/contact</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
