"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Star, ThumbsUp, Check, Loader2, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadButton } from "@/lib/uploader";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { getProductReviewsAction, submitReviewAction, toggleHelpfulAction } from "@/app/actions/reviews";
import { cn } from "@/lib/utils";

function reviewImageUnoptimized(url) {
  if (!url || typeof url !== "string") return true;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !(host.endsWith("cloudinary.com") || host.endsWith("unsplash.com"));
  } catch {
    return true;
  }
}

const STAR_SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

function Stars({ value, size = "md", className }) {
  const dim = STAR_SIZES[size] || STAR_SIZES.md;
  const v = Math.min(5, Math.max(0, Number(value) || 0));
  const rounded = Math.round(v);
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      dir="ltr"
      role="img"
      aria-label={`${rounded} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            dim,
            v >= s - 0.25 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"
          )}
        />
      ))}
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-hidden>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,240px)_1fr]">
        <div className="h-44 rounded-2xl bg-muted/60" />
        <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-8 rounded bg-muted-foreground/15" />
              <div className="h-2 flex-1 rounded-full bg-muted-foreground/15" />
              <div className="h-3 w-10 rounded bg-muted-foreground/15" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-10 max-w-full rounded-lg bg-muted/50" />
      <div className="space-y-3">
        <div className="h-32 rounded-2xl bg-muted/50" />
        <div className="h-32 rounded-2xl bg-muted/50" />
      </div>
    </div>
  );
}

export default function ProductReviewsClient({ productId, embedded = false }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;
  const [open, setOpen] = useState(false);
  const [sort, setSort] = useState("recent");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    total: 0,
    average: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 0,
    title: "",
    body: "",
    guestName: "",
    guestEmail: "",
    images: [],
  });
  const [err, setErr] = useState("");
  const [votedIds, setVotedIds] = useState({});
  const firstFetchDone = useRef(false);
  const [showContent, setShowContent] = useState(false);
  const [reviewLightbox, setReviewLightbox] = useState(null);

  const canMore = rows.length < total;

  const load = useCallback(
    async ({ reset = false, pageValue = 1 } = {}) => {
      setLoading(true);
      try {
        const targetPage = reset ? 1 : pageValue;
        const res = await getProductReviewsAction({
          productId,
          page: targetPage,
          limit: 5,
          sort,
          rating: ratingFilter,
        });
        if (res?.ok) {
          setSummary(res.summary);
          setTotal(res.total);
          if (reset) {
            setRows(res.rows);
            setPage(1);
          } else {
            setRows((prev) => [...prev, ...res.rows]);
          }
        }
      } finally {
        setLoading(false);
        if (!firstFetchDone.current) {
          firstFetchDone.current = true;
          setShowContent(true);
        }
      }
    },
    [productId, ratingFilter, sort]
  );

  useEffect(() => {
    load({ reset: true });
  }, [load]);

  const bars = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((s) => {
        const count = summary.breakdown?.[s] || 0;
        const pct = summary.total ? (count / summary.total) * 100 : 0;
        return { s, count, pct };
      }),
    [summary]
  );

  const reviewCountLabel =
    summary.total === 1
      ? `1 ${t.pdpReviewsSingular}`
      : lang === "ar"
        ? `${summary.total} مراجعات`
        : `${summary.total} ${t.pdpReviewsCount}`;

  const submit = async () => {
    setErr("");
    if (form.title.trim().length < 2) {
      setErr(lang === "ar" ? "العنوان قصير جداً" : "Title is too short");
      return;
    }
    if (form.body.trim().length < 20) {
      setErr(lang === "ar" ? "المراجعة قصيرة جداً" : "Review is too short");
      return;
    }
    if (!form.rating) return setErr(lang === "ar" ? "اختر التقييم" : "Rating is required");
    setSubmitting(true);
    const res = await submitReviewAction({
      productId,
      ...form,
      title: form.title.trim(),
      body: form.body.trim(),
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim(),
    });
    setSubmitting(false);
    if (!res.success)
      return setErr(res.error || (lang === "ar" ? "فشل الإرسال" : "Submission failed"));
    setOpen(false);
    setForm({ rating: 0, title: "", body: "", guestName: "", guestEmail: "", images: [] });
    setSort("recent");
    setRatingFilter("all");
    await load({ reset: true });
  };

  const inner = (
    <>
      {!showContent ? (
        <ReviewsSkeleton />
      ) : (
        <>
          {/* Summary + distribution */}
          <div className="grid min-w-0 max-w-full gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-8 lg:items-start">
            <div
              className={cn(
                "flex min-w-0 max-w-full flex-col rounded-2xl border border-border bg-gradient-to-b from-amber-500/10 to-transparent p-6 text-center lg:text-start",
                isRTL && "lg:text-right"
              )}
            >
              <p
                className="text-5xl font-black tabular-nums tracking-tight text-foreground sm:text-6xl [overflow-wrap:anywhere]"
                aria-live="polite"
              >
                {summary.total > 0 ? summary.average.toFixed(1) : "—"}
              </p>
              <Stars
                value={summary.total > 0 ? summary.average : 0}
                size="lg"
                className={cn("mt-2 justify-center", isRTL ? "lg:justify-end" : "lg:justify-start")}
              />
              <p className="mt-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                {reviewCountLabel}
              </p>
              <Button
                type="button"
                className="mt-6 h-11 w-full bg-amber-500 font-semibold text-black shadow-md shadow-amber-500/20 hover:bg-amber-600"
                onClick={() => setOpen(true)}
              >
                {lang === "ar" ? "اكتب مراجعة" : "Write a review"}
              </Button>
            </div>

            <div className="min-w-0 max-w-full rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pdpReviewsDistribution || (lang === "ar" ? "توزيع التقييمات" : "Rating breakdown")}
              </p>
              <ul className="space-y-3.5">
                {bars.map((b) => (
                  <li key={b.s} className="min-w-0">
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-2 text-sm sm:gap-3",
                        isRTL && "flex-row-reverse"
                      )}
                    >
                      <span className="w-8 shrink-0 text-center tabular-nums text-muted-foreground sm:w-9">
                        {b.s}★
                      </span>
                      <div
                        className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                        role="presentation"
                      >
                        <div
                          className="h-full rounded-full bg-amber-500 transition-[width] duration-500 ease-out"
                          style={{ width: `${b.pct}%` }}
                        />
                      </div>
                      <div
                        className={cn(
                          "flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground",
                          isRTL && "flex-row-reverse"
                        )}
                      >
                        <span className="min-w-[2.75rem] text-end">{Math.round(b.pct)}%</span>
                        <span className="min-w-[2.5rem] text-muted-foreground/70 tabular-nums">
                          ({b.count})
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pdpReviewsSortBy}
              </p>
              <div
                className={cn(
                  "-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]",
                  isRTL && "flex-row-reverse"
                )}
              >
                {[
                  { key: "recent", ar: "الأحدث", en: "Most recent" },
                  { key: "helpful", ar: "الأكثر فائدة", en: "Most helpful" },
                  { key: "highest", ar: "الأعلى", en: "Highest" },
                  { key: "lowest", ar: "الأقل", en: "Lowest" },
                ].map(({ key, ar, en }) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={sort === key ? "default" : "outline"}
                    className={cn(
                      "shrink-0 rounded-full",
                      sort === key
                        ? "bg-amber-500 text-black hover:bg-amber-600"
                        : "border-border bg-background"
                    )}
                    onClick={() => setSort(key)}
                  >
                    {lang === "ar" ? ar : en}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pdpReviewsFilterStars}
              </p>
              <div
                className={cn(
                  "-mx-1 flex flex-wrap gap-2 px-1",
                  isRTL && "flex-row-reverse"
                )}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={ratingFilter === String(n) ? "default" : "outline"}
                    className={cn(
                      "rounded-full",
                      ratingFilter === String(n)
                        ? "bg-amber-500 text-black hover:bg-amber-600"
                        : "border-border bg-background"
                    )}
                    onClick={() => setRatingFilter(String(n))}
                  >
                    {n}★
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant={ratingFilter === "all" ? "default" : "outline"}
                  className={cn(
                    "rounded-full",
                    ratingFilter === "all"
                      ? "bg-amber-500 text-black hover:bg-amber-600"
                      : "border-border bg-background"
                  )}
                  onClick={() => setRatingFilter("all")}
                >
                  {t.filterAll || (lang === "ar" ? "الكل" : "All")}
                </Button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="space-y-4 border-t border-border pt-6">
            {rows.length === 0 && !loading && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
                <MessageSquareQuote className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="mt-4 text-base font-semibold text-foreground">{t.pdpReviewsEmptyTitle}</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t.pdpReviewsEmptyDesc}</p>
                <Button
                  type="button"
                  className="mt-6 bg-amber-500 font-semibold text-black hover:bg-amber-600"
                  onClick={() => setOpen(true)}
                >
                  {lang === "ar" ? "اكتب أول مراجعة" : "Write the first review"}
                </Button>
              </div>
            )}

            {rows.map((r) => {
              const initial = (r.reviewerName || "?").trim().charAt(0).toUpperCase() || "?";
              return (
                <article
                  key={r.id}
                  className="max-w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                >
                  <div
                    className={cn(
                      "flex min-w-0 gap-4 sm:gap-5",
                      isRTL ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-800 dark:text-amber-200"
                      aria-hidden
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 overflow-hidden">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-4 sm:gap-y-2">
                        <div className="min-w-0 max-w-full flex-1 sm:max-w-[calc(100%-9rem)]">
                          <Stars value={r.rating} className="mb-1.5" />
                          <h4 className="break-words text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
                            {r.title}
                          </h4>
                          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                            <span className="min-w-0 max-w-full break-words font-medium text-foreground/85 [overflow-wrap:anywhere]">
                              {r.reviewerName}
                            </span>
                            <span className="text-muted-foreground/45" aria-hidden>
                              ·
                            </span>
                            <time dateTime={r.createdAt}>
                              {new Date(r.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </p>
                        </div>
                        {r.verified ? (
                          <span className="inline-flex w-fit max-w-full shrink-0 items-center gap-1 self-start rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 [overflow-wrap:anywhere]">
                            <Check className="h-3 w-3" strokeWidth={2.5} />
                            {lang === "ar" ? "شراء موثق" : "Verified purchase"}
                          </span>
                        ) : null}
                      </div>

                      <p
                        className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere] [word-break:break-word]"
                        dir="auto"
                      >
                        {r.body}
                      </p>

                      {r.images?.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {lang === "ar" ? "صور العميل" : "Customer photos"}
                          </p>
                          <div
                            className={cn(
                              "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3",
                              r.images.length === 1 && "sm:grid-cols-1 sm:max-w-xs",
                              r.images.length === 2 && "sm:grid-cols-2 sm:max-w-md"
                            )}
                          >
                            {r.images.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setReviewLightbox(img)}
                                className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted/20 text-start ring-offset-background transition hover:ring-2 hover:ring-amber-500/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                              >
                                <Image
                                  src={img}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 240px"
                                  unoptimized={reviewImageUnoptimized(img)}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {r.adminReply ? (
                        <div
                          className={cn(
                            "max-w-full min-w-0 overflow-hidden rounded-xl border border-amber-500/20 border-s-4 border-s-amber-500 bg-amber-500/[0.08] p-4 ps-5 text-sm text-amber-950 dark:text-amber-50"
                          )}
                        >
                          <p className="text-xs font-bold uppercase tracking-wide text-amber-800/90 dark:text-amber-200/90">
                            {lang === "ar" ? "رد المتجر" : "Store response"}
                          </p>
                          <p
                            className="mt-2 whitespace-pre-wrap break-words leading-relaxed [overflow-wrap:anywhere] [word-break:break-word]"
                            dir="auto"
                          >
                            {r.adminReply}
                          </p>
                        </div>
                      ) : null}

                      <div className="flex w-full min-w-0 justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!!votedIds[r.id]}
                          className="gap-2 rounded-full border-border"
                          onClick={async () => {
                            const res = await toggleHelpfulAction(r.id);
                            if (res?.success) {
                              setVotedIds((prev) => ({ ...prev, [r.id]: true }));
                              setRows((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, helpfulCount: (x.helpfulCount || 0) + 1 } : x
                                )
                              );
                            }
                          }}
                        >
                          <ThumbsUp className="h-4 w-4 shrink-0" />
                          <span>{t.pdpReviewsHelpful}</span>
                          {r.helpfulCount > 0 && (
                            <span className="tabular-nums text-muted-foreground">({r.helpfulCount})</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {canMore && (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={loading}
                className="min-w-[200px] gap-2 rounded-full border-border"
                onClick={async () => {
                  const next = page + 1;
                  setPage(next);
                  setLoading(true);
                  const res = await getProductReviewsAction({
                    productId,
                    page: next,
                    limit: 5,
                    sort,
                    rating: ratingFilter,
                  });
                  if (res?.ok) {
                    setRows((p) => [...p, ...res.rows]);
                    setTotal(res.total);
                  }
                  setLoading(false);
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.pdpReviewsLoading}
                  </>
                ) : lang === "ar" ? (
                  "تحميل المزيد"
                ) : (
                  "Load more reviews"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );

  return (
    <section
      className={cn("w-full min-w-0 max-w-full space-y-6", embedded ? "mt-0" : "mt-12")}
      dir={isRTL ? "rtl" : "ltr"}
      aria-label={t.pdpTabReviews}
    >
      <div className="min-w-0 max-w-full">
        {embedded && showContent && loading && rows.length === 0 ? (
          <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {t.pdpReviewsLoading}
          </p>
        ) : null}
        {inner}
      </div>

      <Dialog open={!!reviewLightbox} onOpenChange={(o) => !o && setReviewLightbox(null)}>
        <DialogContent
          showCloseButton
          className="max-h-[min(92dvh,880px)] w-[min(96vw,920px)] gap-0 overflow-hidden border-border bg-zinc-950 p-0 text-white"
        >
          <div className="relative aspect-square w-full bg-black">
            {reviewLightbox ? (
              <Image
                src={reviewLightbox}
                alt=""
                fill
                className="object-contain"
                sizes="min(96vw, 920px)"
                unoptimized={reviewImageUnoptimized(reviewLightbox)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(90dvh,720px)] max-w-lg gap-0 overflow-y-auto border-border bg-card p-0 text-foreground"
        >
          <DialogHeader className="border-b border-border bg-muted/30 px-5 py-4 sm:px-6">
            <DialogTitle className="text-lg font-bold">
              {lang === "ar" ? "اكتب مراجعة" : "Write a review"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {lang === "ar" ? "ستُنشر بعد موافقة المتجر." : "It will be published after the store approves it."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pdpReviewsTapToRate}
              </p>
              <div className="flex gap-1 rounded-xl bg-muted/40 p-3" dir="ltr">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-lg p-1 transition hover:bg-background"
                    aria-label={`${s} stars`}
                    onClick={() => setForm((f) => ({ ...f, rating: s }))}
                  >
                    <Star
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9",
                        form.rating >= s ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="review-title" className="text-sm font-medium text-foreground">
                {t.pdpReviewsTitleField}
              </label>
              <Input
                id="review-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 100) }))}
                placeholder={lang === "ar" ? "مثال: جودة ممتازة" : "e.g. Great quality"}
                className="h-11 border-border bg-background"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="review-body" className="text-sm font-medium text-foreground">
                {t.pdpReviewsReviewBody}
              </label>
              <textarea
                id="review-body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value.slice(0, 1000) }))}
                rows={5}
                className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/25"
                placeholder={
                  lang === "ar" ? "صف تجربتك، الشحن، التركيب…" : "Describe your experience, shipping, install…"
                }
              />
              <p className="text-xs text-muted-foreground">
                {form.body.length}/1000 · {lang === "ar" ? "20 حرفاً على الأقل" : "Min. 20 characters"}
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t.pdpReviewsGuestFields}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  placeholder={lang === "ar" ? "الاسم" : "Name"}
                  className="border-border bg-background"
                />
                <Input
                  type="email"
                  value={form.guestEmail}
                  onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
                  placeholder={lang === "ar" ? "البريد" : "Email"}
                  className="border-border bg-background"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <UploadButton
                endpoint="reviewImage"
                content={{
                  button: ({ ready }) =>
                    ready
                      ? lang === "ar"
                        ? "إضافة صور"
                        : "Add photos"
                      : lang === "ar"
                        ? "جاري التحضير…"
                        : "Preparing…",
                  allowedContent: lang === "ar" ? "حتى 3 صور" : "Up to 3 images",
                }}
                className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-600"
                onClientUploadComplete={(res) => {
                  const urls = (res || []).map((x) => x.url).filter(Boolean);
                  setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 3) }));
                }}
                onUploadError={() =>
                  setErr(
                    lang === "ar"
                      ? "تعذّر رفع الصور؛ يمكنك الإرسال بدونها."
                      : "Upload failed; you can submit without photos."
                  )
                }
              />
              {form.images.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {form.images.length} / 3 {lang === "ar" ? "صور" : "photos"}
                </p>
              )}
            </div>

            {err ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button
              type="button"
              disabled={submitting}
              className="gap-2 bg-amber-500 font-semibold text-black hover:bg-amber-600"
              onClick={submit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {lang === "ar" ? "جاري الإرسال…" : "Submitting…"}
                </>
              ) : lang === "ar" ? (
                "إرسال المراجعة"
              ) : (
                "Submit review"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
