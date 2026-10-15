"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { adminDeleteReviewsAction, adminReplyReviewAction, adminSetReviewStatusAction } from "@/app/actions/reviews";
import { useLanguage, useT } from "@/context/LanguageContext";
import { formatDate } from "@/lib/account-format";

const STATUS_STYLE = {
  APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-red-500/15 text-red-700 dark:text-red-300",
  PENDING: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
};

export default function ReviewsManagerClient({ initialRows, stats, total = 0, page = 1, pages = 1 }) {
  const { lang, isRTL } = useLanguage();
  const t = useT();
  const ar = lang === "ar";
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [rows, setRows] = useState(initialRows || []);
  const [selected, setSelected] = useState(new Set());
  const [replyRow, setReplyRow] = useState(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const [busy, startTransition] = useTransition();
  const [confirm, confirmDialog] = useConfirm();

  const statusLabel = { APPROVED: ar ? "منشورة" : "Approved", REJECTED: ar ? "مرفوضة" : "Rejected", PENDING: ar ? "بانتظار الموافقة" : "Pending" };
  const ids = Array.from(selected);

  // Filters and paging live in the URL; the server page reloads the rows.
  const go = (changes) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v && v !== "all") q.set(k, String(v));
      else q.delete(k);
    }
    if (!("page" in changes)) q.delete("page");
    startTransition(() => router.replace(`${pathname}?${q.toString()}`));
  };

  const fail = () => toast.error(t.errGeneric);

  const setStatus = async (targetIds, status) => {
    if (!targetIds.length) return;
    const res = await adminSetReviewStatusAction({ ids: targetIds, status });
    if (!res.success) return fail();
    setRows((prev) => prev.map((r) => (targetIds.includes(r.id) ? { ...r, status } : r)));
    setSelected(new Set());
  };

  const remove = async () => {
    if (!ids.length) return;
    const ok = await confirm({ title: ar ? `حذف ${ids.length} مراجعة؟` : `Delete ${ids.length} review(s)?`, body: ar ? "لا يمكن التراجع عن الحذف." : "This can't be undone.", action: t.delete, danger: true });
    if (!ok) return;
    const res = await adminDeleteReviewsAction(ids);
    if (!res.success) return fail();
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  };

  const saveReply = async () => {
    const res = await adminReplyReviewAction({ id: replyRow.id, reply });
    if (!res.success) return fail();
    setRows((prev) => prev.map((r) => (r.id === replyRow.id ? { ...r, adminReply: reply } : r)));
    setReplyRow(null);
    toast.success(t.toastSaved);
  };

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const productName = (r) => (ar && r.product?.nameAr) || r.product?.name || "—";
  const reviewer = (r) => r.user?.name || [r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") || r.guestName || (ar ? "زائر" : "Guest");

  const rowButtons = (r) => (
    <div className="flex flex-wrap gap-1">
      {r.status !== "APPROVED" && (
        <Button size="sm" variant="outline" className="h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-300" onClick={() => setStatus([r.id], "APPROVED")}>
          {ar ? "نشر" : "Approve"}
        </Button>
      )}
      {r.status !== "REJECTED" && (
        <Button size="sm" variant="outline" className="h-8 border-red-500/40 text-red-700 dark:text-red-300" onClick={() => setStatus([r.id], "REJECTED")}>
          {ar ? "رفض" : "Reject"}
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-8" onClick={() => { setReplyRow(r); setReply(r.adminReply || ""); }}>
        {ar ? "رد" : "Reply"}
      </Button>
    </div>
  );

  const stat = (label, value, cls = "text-foreground") => (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className={`space-y-4 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t.adminReviews}</h1>
        <p className="mt-1 text-muted-foreground">{ar ? "مراجعة آراء العملاء قبل نشرها على صفحات المنتجات." : "Check customer reviews before they appear on product pages."}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {stat(ar ? "إجمالي المراجعات" : "Total reviews", stats?.total ?? 0)}
        {stat(ar ? "بانتظار الموافقة" : "Pending", stats?.pending ?? 0, "text-amber-700 dark:text-amber-400")}
        {stat(ar ? "متوسط التقييم" : "Average rating", Number(stats?.averageRating || 0).toFixed(1), "text-emerald-700 dark:text-emerald-400")}
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({ search: search.trim() });
        }}
      >
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث بالمراجع أو المنتج أو النص" : "Search reviewer, product or text"} className="w-full bg-background sm:max-w-xs" />
        <Select value={params.get("status") || "all"} onValueChange={(v) => go({ status: v })}>
          <SelectTrigger className="w-full bg-background sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "كل الحالات" : "All statuses"}</SelectItem>
            <SelectItem value="PENDING">{statusLabel.PENDING}</SelectItem>
            <SelectItem value="APPROVED">{statusLabel.APPROVED}</SelectItem>
            <SelectItem value="REJECTED">{statusLabel.REJECTED}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" disabled={busy}>{ar ? "بحث" : "Search"}</Button>
      </form>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/70 p-2 text-sm">
          <span className="px-1 text-muted-foreground tabular-nums">{ar ? `محدد: ${selected.size}` : `${selected.size} selected`}</span>
          <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300" onClick={() => setStatus(ids, "APPROVED")}>{ar ? "نشر" : "Approve"}</Button>
          <Button size="sm" variant="outline" className="border-red-500/40 text-red-700 dark:text-red-300" onClick={() => setStatus(ids, "REJECTED")}>{ar ? "رفض" : "Reject"}</Button>
          <Button size="sm" variant="outline" onClick={remove}>{t.delete}</Button>
        </div>
      )}

      {/* Phone: one card per review */}
      <ul className="space-y-3 md:hidden">
        {rows.length === 0 && <li className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{ar ? "لا توجد مراجعات" : "No reviews found"}</li>}
        {rows.map((r) => (
          <li key={r.id} className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={ar ? "تحديد" : "Select"} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{productName(r)}</p>
                <p className="text-xs text-muted-foreground">{reviewer(r)} · {formatDate(r.createdAt, lang)}</p>
              </div>
              <Badge className={STATUS_STYLE[r.status]}>{statusLabel[r.status] || r.status}</Badge>
            </div>
            <p className="text-sm"><span className="text-amber-600 dark:text-amber-400">{"★".repeat(r.rating)}</span> <span className="font-medium">{r.title}</span></p>
            {r.body && <p className="line-clamp-3 text-sm text-muted-foreground">{r.body}</p>}
            {rowButtons(r)}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr className="text-start">
              <th className="px-3 py-2"><input type="checkbox" aria-label={ar ? "تحديد الكل" : "Select all"} checked={rows.length > 0 && selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} /></th>
              <th className="px-3 py-2 text-start">{ar ? "المنتج" : "Product"}</th>
              <th className="px-3 py-2 text-start">{ar ? "المراجع" : "Reviewer"}</th>
              <th className="px-3 py-2 text-start">{ar ? "التقييم" : "Rating"}</th>
              <th className="px-3 py-2 text-start">{ar ? "المراجعة" : "Review"}</th>
              <th className="px-3 py-2 text-start">{ar ? "الحالة" : "Status"}</th>
              <th className="px-3 py-2 text-start">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr><td colSpan="7" className="px-6 py-12 text-center text-muted-foreground">{ar ? "لا توجد مراجعات" : "No reviews found"}</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="bg-card/70 align-top">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={ar ? "تحديد" : "Select"} /></td>
                <td className="px-3 py-2 text-foreground">{productName(r)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {reviewer(r)}
                  {r.verified && <span className="ms-1 text-xs text-emerald-700 dark:text-emerald-400">({ar ? "مشترٍ موثّق" : "verified buyer"})</span>}
                  <div className="text-xs">{formatDate(r.createdAt, lang)}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-amber-600 dark:text-amber-400">{"★".repeat(r.rating)}</td>
                <td className="max-w-sm px-3 py-2">
                  <p className="font-medium text-foreground">{r.title}</p>
                  {r.body && <p className="line-clamp-2 text-muted-foreground">{r.body}</p>}
                </td>
                <td className="px-3 py-2"><Badge className={STATUS_STYLE[r.status]}>{statusLabel[r.status] || r.status}</Badge></td>
                <td className="px-3 py-2">{rowButtons(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Button variant="outline" size="sm" disabled={page <= 1 || busy} onClick={() => go({ page: page - 1 })}>{ar ? "السابق" : "Previous"}</Button>
        <span className="tabular-nums">{ar ? `صفحة ${page} من ${pages} · ${total} مراجعة` : `Page ${page} of ${pages} · ${total} reviews`}</span>
        <Button variant="outline" size="sm" disabled={page >= pages || busy} onClick={() => go({ page: page + 1 })}>{ar ? "التالي" : "Next"}</Button>
      </div>

      <Dialog open={!!replyRow} onOpenChange={(o) => !o && setReplyRow(null)}>
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader><DialogTitle>{ar ? "رد المتجر" : "Shop reply"}</DialogTitle></DialogHeader>
          <textarea className="w-full rounded-md border border-border bg-background p-2 text-sm" rows={5} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReplyRow(null)}>{t.cancel}</Button>
            <Button className="bg-amber-500 text-black hover:bg-amber-600" disabled={!reply.trim()} onClick={saveReply}>{t.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
}
