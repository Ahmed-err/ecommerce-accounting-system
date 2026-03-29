"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Star, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UploadButton } from "@/lib/uploader";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { getProductReviewsAction, submitReviewAction, toggleHelpfulAction } from "@/app/actions/reviews";
import { cn } from "@/lib/utils";

function Stars({ value, embedded }) {
  const empty = embedded ? "text-muted-foreground" : "text-gray-600";
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${value >= s ? "fill-amber-400 text-amber-400" : empty}`}
        />
      ))}
    </div>
  );
}

export default function ProductReviewsClient({ productId, embedded = false }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
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
  const [form, setForm] = useState({
    rating: 0,
    title: "",
    body: "",
    guestName: "",
    guestEmail: "",
    images: [],
  });
  const [err, setErr] = useState("");

  const canMore = rows.length < total;

  const card = cn(
    "rounded-2xl border p-5",
    embedded ? "border-border bg-card" : "border-white/10 bg-white/5"
  );
  const titleCls = embedded ? "text-foreground" : "text-white";
  const mutedCls = embedded ? "text-muted-foreground" : "text-gray-400";
  const bodyCls = embedded ? "text-foreground/90" : "text-gray-300";
  const barTrack = embedded ? "bg-muted" : "bg-white/10";
  const barLabel = embedded ? "text-muted-foreground" : "text-gray-300";
  const filterBtn = embedded
    ? "border-border bg-background text-foreground hover:bg-muted"
    : "border-white/10 bg-gray-900 text-white";
  const emptyBox = embedded
    ? "rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground"
    : "rounded-2xl border border-dashed border-white/10 p-8 text-center text-gray-400";
  const reviewCard = cn(
    "rounded-2xl border p-4",
    embedded ? "border-border bg-muted/30" : "border-white/10 bg-white/5"
  );
  const imgBorder = embedded ? "border-border" : "border-white/10";
  const dialogSurface = embedded
    ? "border-border bg-card text-foreground"
    : "border-white/10 bg-gray-900 text-white";
  const inputSurface = embedded
    ? "border-border bg-background"
    : "bg-gray-800 border-white/10";
  const loadMoreBtn = embedded
    ? "bg-muted text-foreground hover:bg-muted/80"
    : "bg-gray-800 text-white hover:bg-gray-700";

  const load = async ({ reset = false } = {}) => {
    setLoading(true);
    const targetPage = reset ? 1 : page;
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
      setRows(reset ? res.rows : [...rows, ...res.rows]);
      if (reset) setPage(1);
    }
    setLoading(false);
  };

  useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, sort, ratingFilter]);

  const bars = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((s) => {
        const count = summary.breakdown?.[s] || 0;
        const pct = summary.total ? (count / summary.total) * 100 : 0;
        return { s, count, pct };
      }),
    [summary]
  );

  const submit = async () => {
    setErr("");
    if (!form.rating) return setErr(lang === "ar" ? "اختر التقييم" : "Rating is required");
    const res = await submitReviewAction({ productId, ...form });
    if (!res.success)
      return setErr(res.error || (lang === "ar" ? "فشل الإرسال" : "Submission failed"));
    setOpen(false);
    setForm({ rating: 0, title: "", body: "", guestName: "", guestEmail: "", images: [] });
  };

  return (
    <section className={cn("space-y-6", embedded ? "mt-0" : "mt-12")} dir={isRTL ? "rtl" : "ltr"}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={card}>
          <p className={cn("text-4xl font-black", titleCls)}>{summary.average.toFixed(1)}</p>
          <Stars value={Math.round(summary.average)} embedded={embedded} />
          <p className={cn("mt-1 text-xs", mutedCls)}>
            {summary.total} {lang === "ar" ? "مراجعة" : "reviews"}
          </p>
          <Button className="mt-4 w-full bg-amber-500 text-black hover:bg-amber-600" onClick={() => setOpen(true)}>
            {lang === "ar" ? "اكتب مراجعة" : "Write a Review"}
          </Button>
        </div>
        <div className={cn(card, "lg:col-span-2")}>
          {bars.map((b) => (
            <div key={b.s} className="mb-2 flex items-center gap-3 text-sm">
              <span className={cn("w-8", barLabel)}>{b.s}★</span>
              <div className={cn("h-2 flex-1 rounded", barTrack)}>
                <div className="h-2 rounded bg-amber-500" style={{ width: `${b.pct}%` }} />
              </div>
              <span className={cn("w-10", mutedCls)}>{Math.round(b.pct)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className={filterBtn} onClick={() => setSort("recent")}>
          {lang === "ar" ? "الأحدث" : "Most Recent"}
        </Button>
        <Button size="sm" variant="outline" className={filterBtn} onClick={() => setSort("helpful")}>
          {lang === "ar" ? "الأكثر فائدة" : "Most Helpful"}
        </Button>
        <Button size="sm" variant="outline" className={filterBtn} onClick={() => setSort("highest")}>
          {lang === "ar" ? "الأعلى تقييماً" : "Highest Rated"}
        </Button>
        <Button size="sm" variant="outline" className={filterBtn} onClick={() => setSort("lowest")}>
          {lang === "ar" ? "الأقل تقييماً" : "Lowest Rated"}
        </Button>
        {[5, 4, 3, 2, 1].map((n) => (
          <Button
            key={n}
            size="sm"
            variant="outline"
            className={filterBtn}
            onClick={() => setRatingFilter(String(n))}
          >
            {n}★
          </Button>
        ))}
        <Button size="sm" variant="outline" className={filterBtn} onClick={() => setRatingFilter("all")}>
          {lang === "ar" ? "الكل" : "All"}
        </Button>
      </div>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className={emptyBox}>
            {lang === "ar"
              ? "لا توجد مراجعات بعد. كن أول من يكتب مراجعة."
              : "No reviews yet. Be the first to review this product."}
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} className={reviewCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Stars value={r.rating} embedded={embedded} />
                <p className={cn("mt-1 text-sm font-semibold", titleCls)}>{r.title}</p>
                <p className={cn("text-xs", mutedCls)}>
                  {r.reviewerName} - {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
              {r.verified && (
                <span className="rounded bg-emerald-500/15 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-300">
                  {lang === "ar" ? "شراء موثق" : "Verified Purchase"}
                </span>
              )}
            </div>
            <p className={cn("mt-2 whitespace-pre-wrap text-sm", bodyCls)}>{r.body}</p>
            {r.images?.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {r.images.map((img, i) => (
                  <a
                    href={img}
                    target="_blank"
                    rel="noreferrer"
                    key={i}
                    className={cn("relative block aspect-square overflow-hidden rounded border", imgBorder)}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </a>
                ))}
              </div>
            )}
            {r.adminReply && (
              <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-100">
                <strong>{lang === "ar" ? "رد المتجر:" : "Store Response:"}</strong> {r.adminReply}
              </div>
            )}
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "mt-2",
                embedded ? "text-foreground hover:bg-muted" : "text-gray-300 hover:bg-white/10"
              )}
              onClick={async () => {
                await toggleHelpfulAction(r.id);
                load({ reset: true });
              }}
            >
              <ThumbsUp className="me-1 h-4 w-4" /> {lang === "ar" ? "مفيد؟" : "Helpful?"} (
              {r.helpfulCount})
            </Button>
          </div>
        ))}
      </div>
      {canMore && (
        <Button
          disabled={loading}
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
          className={loadMoreBtn}
        >
          {loading
            ? lang === "ar"
              ? "جاري التحميل..."
              : "Loading..."
            : lang === "ar"
              ? "تحميل المزيد"
              : "Load more"}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={dialogSurface}>
          <DialogHeader>
            <DialogTitle>{lang === "ar" ? "اكتب مراجعة" : "Write a Review"}</DialogTitle>
            <DialogDescription className={mutedCls}>
              {lang === "ar" ? "ستظهر بعد موافقة الإدارة" : "Your review will appear after approval"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-1" dir="ltr">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Rate ${s}`}
                  onClick={() => setForm((f) => ({ ...f, rating: s }))}
                >
                  <Star
                    className={`h-6 w-6 ${form.rating >= s ? "fill-amber-400 text-amber-400" : embedded ? "text-muted-foreground" : "text-gray-500"}`}
                  />
                </button>
              ))}
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 100) }))}
              placeholder={lang === "ar" ? "العنوان" : "Title"}
              className={inputSurface}
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value.slice(0, 1000) }))}
              rows={4}
              className={cn("w-full rounded-md border p-2 text-sm", inputSurface)}
              placeholder={lang === "ar" ? "اكتب تجربتك..." : "Write your experience..."}
            />
            <Input
              value={form.guestName}
              onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
              placeholder={lang === "ar" ? "الاسم (للضيف)" : "Name (guest)"}
              className={inputSurface}
            />
            <Input
              value={form.guestEmail}
              onChange={(e) => setForm((f) => ({ ...f, guestEmail: e.target.value }))}
              placeholder={lang === "ar" ? "البريد الإلكتروني (للضيف)" : "Email (guest)"}
              className={inputSurface}
            />
            <UploadButton
              endpoint="reviewImage"
              content={{
                button: ({ ready }) =>
                  ready
                    ? lang === "ar"
                      ? "رفع صور"
                      : "Upload images"
                    : lang === "ar"
                      ? "جاري التحضير..."
                      : "Preparing...",
                allowedContent: lang === "ar" ? "حتى 3 صور" : "Up to 3 images",
              }}
              className="rounded-md bg-amber-500 px-4 py-2 font-bold text-black hover:bg-amber-600"
              onClientUploadComplete={(res) => {
                const urls = (res || []).map((x) => x.url).filter(Boolean);
                setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 3) }));
              }}
              onUploadError={() =>
                setErr(
                  lang === "ar"
                    ? "فشل رفع الصور، يمكنك الإرسال بدون صور"
                    : "Image upload failed, you can still submit without images"
                )
              }
            />
            {err ? <p className="text-sm text-red-500">{err}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t.cancel}
              </Button>
              <Button className="bg-amber-500 text-black hover:bg-amber-600" onClick={submit}>
                {lang === "ar" ? "إرسال" : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
