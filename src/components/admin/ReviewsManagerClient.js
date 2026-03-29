"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminDeleteReviewsAction, adminReplyReviewAction, adminSetReviewStatusAction } from "@/app/actions/reviews";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function ReviewsManagerClient({ initialRows, stats }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [rows, setRows] = useState(initialRows || []);
  const [selected, setSelected] = useState(new Set());
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyId, setReplyId] = useState("");
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.title || "").toLowerCase().includes(q) || (r.product?.name || "").toLowerCase().includes(q) || (r.guestName || "").toLowerCase().includes(q));
  }, [rows, search]);

  const ids = Array.from(selected);

  return (
    <div className={`space-y-4 ${isRTL ? "text-right font-arabic" : "text-left font-sans"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-gray-900 p-3"><p className="text-xs text-gray-400">{lang === "ar" ? "إجمالي المراجعات" : "Total reviews"}</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
        <div className="rounded-xl border border-white/10 bg-gray-900 p-3"><p className="text-xs text-gray-400">{lang === "ar" ? "بانتظار الموافقة" : "Pending"}</p><p className="text-2xl font-bold text-amber-400">{stats.pending}</p></div>
        <div className="rounded-xl border border-white/10 bg-gray-900 p-3"><p className="text-xs text-gray-400">{lang === "ar" ? "متوسط التقييم" : "Average rating"}</p><p className="text-2xl font-bold text-emerald-400">{stats.averageRating.toFixed(1)}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "ar" ? "بحث بالمراجع أو المنتج" : "Search by reviewer or product"} className="max-w-sm bg-gray-900 border-white/10" />
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => { await adminSetReviewStatusAction({ ids, status: "APPROVED" }); setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status: "APPROVED" } : r))); }}>{lang === "ar" ? "قبول المحدد" : "Approve selected"}</Button>
        <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={async () => { await adminSetReviewStatusAction({ ids, status: "REJECTED" }); setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status: "REJECTED" } : r))); }}>{lang === "ar" ? "رفض المحدد" : "Reject selected"}</Button>
        <Button size="sm" variant="outline" className="border-white/10 bg-gray-900 text-white" onClick={async () => { await adminDeleteReviewsAction(ids); setRows((prev) => prev.filter((r) => !selected.has(r.id))); setSelected(new Set()); }}>{lang === "ar" ? "حذف المحدد" : "Delete selected"}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-900/80 text-gray-400">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set())} /></th>
              <th className="px-3 py-2">{lang === "ar" ? "المنتج" : "Product"}</th>
              <th className="px-3 py-2">{lang === "ar" ? "المراجع" : "Reviewer"}</th>
              <th className="px-3 py-2">{lang === "ar" ? "التقييم" : "Rating"}</th>
              <th className="px-3 py-2">{lang === "ar" ? "العنوان" : "Title"}</th>
              <th className="px-3 py-2">{lang === "ar" ? "الحالة" : "Status"}</th>
              <th className="px-3 py-2">{lang === "ar" ? "موثق" : "Verified"}</th>
              <th className="px-3 py-2">{t.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filtered.map((r) => (
              <tr key={r.id} className="bg-gray-950/70">
                <td className="px-3 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => setSelected((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} /></td>
                <td className="px-3 py-2 text-white">{r.product?.name}</td>
                <td className="px-3 py-2 text-gray-300">{r.user?.name || r.guestName || "Guest"}</td>
                <td className="px-3 py-2 text-amber-300">{r.rating}★</td>
                <td className="px-3 py-2 text-gray-300">{r.title}</td>
                <td className="px-3 py-2"><Badge className={r.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : r.status === "REJECTED" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}>{r.status}</Badge></td>
                <td className="px-3 py-2">{r.verified ? <Badge className="bg-emerald-500/15 text-emerald-300">Yes</Badge> : "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => { await adminSetReviewStatusAction({ ids: [r.id], status: "APPROVED" }); setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "APPROVED" } : x)); }}>{lang === "ar" ? "قبول" : "Approve"}</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={async () => { await adminSetReviewStatusAction({ ids: [r.id], status: "REJECTED" }); setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "REJECTED" } : x)); }}>{lang === "ar" ? "رفض" : "Reject"}</Button>
                    <Button size="sm" variant="outline" className="border-white/10 bg-gray-900 text-white" onClick={() => { setReplyId(r.id); setReply(r.adminReply || ""); setReplyOpen(true); }}>{lang === "ar" ? "رد" : "Reply"}</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader><DialogTitle>{lang === "ar" ? "رد الإدارة" : "Admin reply"}</DialogTitle></DialogHeader>
          <textarea className="w-full rounded-md border border-white/10 bg-gray-800 p-2" rows={5} value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setReplyOpen(false)}>{t.cancel}</Button>
            <Button className="bg-amber-500 text-black hover:bg-amber-600" onClick={async () => { const res = await adminReplyReviewAction({ id: replyId, reply }); if (res.success) { setRows((prev) => prev.map((r) => (r.id === replyId ? { ...r, adminReply: reply } : r))); setReplyOpen(false); } }}>{t.save}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
