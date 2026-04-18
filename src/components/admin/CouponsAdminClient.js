"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Loader2, Trash2, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCouponAdmin,
  deleteCouponAdmin,
  listCouponsAdmin,
  updateCouponAdmin,
} from "@/app/actions/coupons-admin";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

function CouponForm({ value, onChange, onSubmit, onCancel, saving, t, isEdit = false, lang = "en" }) {
  const isAr = lang === "ar";
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card/70 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-foreground">
            {t.couponCode || (isAr ? "كود الخصم" : "Coupon Code")} <span className="text-red-500">*</span>
          </label>
          <Input
            value={value.code}
            onChange={(e) => onChange({ ...value, code: e.target.value.toUpperCase() })}
            placeholder={isAr ? "مثال: SAVE20" : "e.g. SAVE20"}
            className="border-border bg-background font-mono text-foreground uppercase"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {t.discountLabel || (isAr ? "نسبة الخصم %" : "Discount %")} <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min={1}
            max={100}
            value={value.percentOff}
            onChange={(e) => onChange({ ...value, percentOff: e.target.value })}
            placeholder="10"
            className="border-border bg-background text-foreground"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            {isAr ? "تاريخ الانتهاء" : "Expires At"} <span className="text-xs text-muted-foreground">{isAr ? "(اختياري)" : "(optional)"}</span>
          </label>
          <Input
            type="datetime-local"
            value={value.expiresAt}
            onChange={(e) => onChange({ ...value, expiresAt: e.target.value })}
            className="border-border bg-background text-foreground"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted/50">
          <input
            type="checkbox"
            checked={value.isActive}
            onChange={(e) => onChange({ ...value, isActive: e.target.checked })}
            className="h-4 w-4 accent-amber-500"
          />
          {t.status || (isAr ? "مفعل" : "Active")}
        </label>
        <div className="flex items-center gap-2">
          {isEdit ? (
            <Button type="button" variant="outline" onClick={onCancel} className="border-border text-foreground hover:bg-muted">
              {t.cancel || (isAr ? "إلغاء" : "Cancel")}
            </Button>
          ) : null}
          <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-600">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.saving || (isAr ? "جاري الحفظ..." : "Saving...")}</> : isEdit ? (t.edit || (isAr ? "تحديث" : "Update")) : (t.save || (isAr ? "إنشاء" : "Create"))}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function CouponsAdminClient({
  initialRows,
  initialTotal,
  initialPage,
  initialPages,
  initialSearch,
  initialStatus,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.en;
  const router = useRouter();

  const [rows, setRows] = useState(initialRows || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(initialPage || 1);
  const [pages, setPages] = useState(initialPages || 1);
  const [search, setSearch] = useState(initialSearch || "");
  const [status, setStatus] = useState(initialStatus || "all");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    code: "",
    percentOff: "10",
    expiresAt: "",
    isActive: true,
  });
  const [isPending, startTransition] = useTransition();
  const formWrapRef = useRef(null);

  const load = (next = {}) => {
    const q = {
      page: next.page ?? page,
      search: next.search ?? search,
      status: next.status ?? status,
    };
    startTransition(async () => {
      const res = await listCouponsAdmin(q);
      if (res.success) {
        setRows(res.rows || []);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setPages(res.pages || 1);
      } else {
        setError(res.error || "Failed to load coupons.");
      }
    });
  };

  const resetForm = () => {
    setForm({ code: "", percentOff: "10", expiresAt: "", isActive: true });
    setEditingId("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    const res = await createCouponAdmin(form);
    if (!res.success) {
      setError(res.error || "Failed to create coupon.");
      return;
    }
    resetForm();
    load({ page: 1 });
    router.refresh();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingId) {
      setError(lang === "ar" ? "يرجى اختيار كوبون للتعديل أولاً." : "Please select a coupon to edit first.");
      return;
    }
    setError("");
    const res = await updateCouponAdmin(editingId, form);
    if (!res.success) {
      setError(res.error || "Failed to update coupon.");
      return;
    }
    setRows((prev) =>
      prev.map((row) =>
        row.id === editingId
          ? {
              ...row,
              code: String(form.code || "").trim().toUpperCase(),
              percentOff: Math.round(Number(form.percentOff) || row.percentOff),
              expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
              isActive: form.isActive !== false,
            }
          : row
      )
    );
    resetForm();
    load();
    router.refresh();
  };

  const handleDelete = async (id) => {
    if (!confirm(lang === "ar" ? "حذف هذا الكوبون؟" : "Delete this coupon?")) return;
    const res = await deleteCouponAdmin(id);
    if (!res.success) {
      setError(res.error || "Failed to delete coupon.");
      return;
    }
    load();
    router.refresh();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      code: row.code || "",
      percentOff: String(row.percentOff ?? 10),
      expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString().slice(0, 16) : "",
      isActive: !!row.isActive,
    });
    formWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isExpired = (row) => row.expiresAt && new Date(row.expiresAt) < new Date();

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{lang === "ar" ? "إدارة الكوبونات" : "Coupons Management"}</h1>
        <p className="mt-1 text-muted-foreground">{lang === "ar" ? "إنشاء وتعديل كوبونات الخصم في المتجر." : "Create and manage discount coupons for checkout."}</p>
      </div>

      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      <div ref={formWrapRef} className="space-y-2">
        {editingId ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-300">
            {lang === "ar" ? "وضع التعديل مفعل" : "Edit mode is active"}
          </div>
        ) : null}
        <CouponForm
          value={form}
          onChange={setForm}
          onSubmit={editingId ? handleUpdate : handleCreate}
          onCancel={resetForm}
          saving={isPending}
          t={t}
          lang={lang}
          isEdit={!!editingId}
        />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/70 p-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={lang === "ar" ? "ابحث بالكود..." : "Search by code..."}
          className="h-9 border-border bg-background text-foreground sm:w-64"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="all">{lang === "ar" ? "الكل" : "All"}</option>
          <option value="active">{lang === "ar" ? "نشط" : "Active"}</option>
          <option value="inactive">{lang === "ar" ? "غير نشط" : "Inactive"}</option>
          <option value="expired">{lang === "ar" ? "منتهي" : "Expired"}</option>
        </select>
        <Button type="button" variant="outline" onClick={() => load({ page: 1, search, status })} className="h-9 border-border text-foreground hover:bg-muted">
          {lang === "ar" ? "تصفية" : "Filter"}
        </Button>
        <div className="ms-auto text-xs text-muted-foreground">{lang === "ar" ? "الإجمالي" : "Total"}: {total}</div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card/70">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">{lang === "ar" ? "الكود" : "Code"}</th>
              <th className="px-4 py-3">{lang === "ar" ? "الخصم" : "Discount"}</th>
              <th className="px-4 py-3">{lang === "ar" ? "ينتهي" : "Expires"}</th>
              <th className="px-4 py-3">{lang === "ar" ? "الحالة" : "Status"}</th>
              <th className="px-4 py-3">{lang === "ar" ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <TicketPercent className="mx-auto mb-2 h-6 w-6 opacity-40" />
                  {lang === "ar" ? "لا توجد كوبونات" : "No coupons found"}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">{row.code}</td>
                  <td className="px-4 py-3 text-foreground">{row.percentOff}%</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.expiresAt ? new Date(row.expiresAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US") : (lang === "ar" ? "بدون تاريخ" : "No expiry")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${isExpired(row) ? "bg-red-500/15 text-red-700 dark:text-red-300" : row.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {isExpired(row) ? (lang === "ar" ? "منتهي" : "Expired") : row.isActive ? (lang === "ar" ? "نشط" : "Active") : (lang === "ar" ? "غير نشط" : "Inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => startEdit(row)} className="h-8 w-8 border-border text-foreground hover:bg-muted">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => handleDelete(row.id)} className="h-8 w-8 border-red-500/40 text-red-300 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 1 || isPending}
          onClick={() => load({ page: page - 1 })}
          className="border-border text-foreground hover:bg-muted"
        >
          {lang === "ar" ? "السابق" : "Previous"}
        </Button>
        <span className="text-sm text-muted-foreground">
          {lang === "ar" ? "صفحة" : "Page"} {page} / {pages}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page >= pages || isPending}
          onClick={() => load({ page: page + 1 })}
          className="border-border text-foreground hover:bg-muted"
        >
          {lang === "ar" ? "التالي" : "Next"}
        </Button>
      </div>
    </div>
  );
}
