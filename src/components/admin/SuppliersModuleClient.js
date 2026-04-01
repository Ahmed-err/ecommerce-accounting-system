"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  loadSuppliersOverviewAction,
  loadSuppliersTableAction,
  loadPurchasesTableAction,
  loadPurchaseFormOptionsAction,
  loadSupplierDetailAction,
  loadPurchaseDetailAction,
  loadReportsAction,
  createSupplierAction,
  updateSupplierAction,
  deleteSupplierAction,
  createPurchaseAction,
  markPurchaseReceivedAction,
  recordPurchasePaymentAction,
  deletePurchaseAction,
  exportPurchasePdfAction,
} from "@/app/actions/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Download, Truck, CreditCard, FileText, RefreshCw } from "lucide-react";

const TAB_KEYS = ["overview", "suppliers", "purchases", "reports"];

function purchaseRowUi(r) {
  const total = Number(r.totalAmount);
  const paid = Number(r.paidAmount);
  const fullyPaid = total > 0 && paid >= total - 0.005;
  const canDelete = r.deliveryStatus === "PENDING" && paid <= 0.005;
  const canPay = total > 0 && !fullyPaid;
  const canReceive = r.deliveryStatus !== "RECEIVED";
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  return { fullyPaid, canDelete, canPay, canReceive, remaining, total, paid };
}

function purchaseActionToastError(t, res) {
  const code = typeof res?.error === "string" ? res.error : "";
  if (
    code === "amount_over_remaining" &&
    res?.remaining != null &&
    Number.isFinite(Number(res.remaining))
  ) {
    return `${t.suppliersPurchasePayOver} (${t.suppliersPurchaseRemaining}: ${Number(res.remaining).toLocaleString()})`;
  }
  const map = {
    not_found: t.errGeneric,
    validation: t.errGeneric,
    already: t.suppliersPurchaseAlreadyReceived,
    blocked: t.suppliersPoDeleteBlocked,
    has_movements: t.suppliersPoDeleteHasMoves,
    has_payment: t.suppliersPoDeleteHasPayment,
    fully_paid: t.suppliersPurchaseFullyPaid,
    amount_over_remaining: t.suppliersPurchasePayOver,
    invalid_total: t.errGeneric,
  };
  return map[code] || res?.error || t.errGeneric;
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function csvEscape(s) {
  const x = String(s ?? "");
  if (/[",\n]/.test(x)) return `"${x.replace(/"/g, '""')}"`;
  return x;
}

export default function SuppliersModuleClient() {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const router = useRouter();
  const sp = useSearchParams();
  const tab = TAB_KEYS.includes(sp.get("tab")) ? sp.get("tab") : "overview";

  const setTab = (k) => {
    const p = new URLSearchParams(sp.toString());
    p.set("tab", k);
    router.replace(`?${p.toString()}`);
  };

  const [ov, setOv] = useState(null);
  const [loadingOv, setLoadingOv] = useState(true);

  const loadOv = useCallback(async () => {
    setLoadingOv(true);
    const r = await loadSuppliersOverviewAction();
    setLoadingOv(false);
    if (r.ok) setOv(r);
    else toast.error(t.suppliersLoadError);
  }, [t.suppliersLoadError]);

  useEffect(() => {
    if (tab === "overview") loadOv();
  }, [tab, loadOv]);

  return (
    <div className={cn("space-y-8", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-black text-white">{t.adminSuppliersTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.adminSuppliersSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {TAB_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
              tab === k ? "bg-amber-500 text-black" : "bg-white/5 text-gray-400 hover:text-white"
            )}
          >
            {t[`adminSuppliersTab_${k}`] || k}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab data={ov} loading={loadingOv} onRefresh={loadOv} />}
      {tab === "suppliers" && <SuppliersTab t={t} isRTL={isRTL} />}
      {tab === "purchases" && <PurchasesTab t={t} isRTL={isRTL} />}
      {tab === "reports" && <ReportsTab t={t} isRTL={isRTL} />}
    </div>
  );
}

function OverviewTab({ data, loading, onRefresh }) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const kpis = data?.kpis;
  const top = data?.top || [];
  const recent = data?.recent || [];
  const trend = (data?.trend || []).map((r) => ({
    name: r.month ? new Date(r.month).toLocaleDateString(lang === "ar" ? "ar" : "en", { month: "short" }) : "",
    total: r.total,
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="border-white/10 text-white" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {loading || !kpis ? (
        <p className="text-gray-500">{t.loading}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: t.suppliersKpiTotalSuppliers, value: kpis.totalSuppliers },
              { label: t.suppliersKpiActiveSuppliers, value: kpis.activeSuppliers },
              { label: t.suppliersKpiPurchasesMonth, value: kpis.purchasesThisMonthCount },
              { label: t.suppliersKpiSpentMonth, value: kpis.purchasesThisMonthTotal.toLocaleString() },
              { label: t.suppliersKpiPendingDelivery, value: kpis.pendingDeliveries },
              { label: t.suppliersKpiOverduePay, value: kpis.overduePayments },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
                <p className="mt-2 text-2xl font-black text-white">{c.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-4 text-sm font-bold text-white">{t.suppliersChartTopSuppliers}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                    <Bar dataKey="total" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-4 text-sm font-bold text-white">{t.suppliersChartSpendTrend}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                    <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                    <Line type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 text-sm font-bold text-white">{t.suppliersRecentPurchases}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-gray-500">
                    <th className="p-2">{t.suppliersColPo}</th>
                    <th className="p-2">{t.suppliersColSupplier}</th>
                    <th className="p-2">{t.suppliersColDate}</th>
                    <th className="p-2">{t.suppliersColItems}</th>
                    <th className="p-2">{t.suppliersColTotal}</th>
                    <th className="p-2">{t.suppliersColDelivery}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="p-2 font-mono text-xs">{r.purchaseNumber}</td>
                      <td className="p-2">{r.supplierName}</td>
                      <td className="p-2">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="p-2">{r.itemCount}</td>
                      <td className="p-2">{r.totalAmount.toLocaleString()}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="border-white/20 text-[10px]">
                          {r.deliveryStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SuppliersTab({ t, isRTL }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("");
  const dq = useDebounced(q, 300);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [sheetId, setSheetId] = useState(null);
  const [sheetData, setSheetData] = useState(null);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    const r = await loadSuppliersTableAction({ search: dq, status, category: cat, take: 200 });
    if (r.ok) setRows(r.rows);
  }, [dq, status, cat]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    const h = ["name", "company", "phone", "email", "category", "totalPurchases", "outstanding", "active"];
    const lines = [h.join(",")].concat(
      rows.map((s) =>
        [s.name, s.companyName, s.phone, s.email, s.category, s.totalPurchases, s.outstanding, s.isActive]
          .map(csvEscape)
          .join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "suppliers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNew = () => {
    setEdit(null);
    setForm({
      name: "",
      companyName: "",
      phone: "",
      email: "",
      address: "",
      taxId: "",
      paymentTerms: "NET30",
      notes: "",
      category: "",
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (s) => {
    setEdit(s);
    setForm({ ...s, paymentTerms: s.paymentTerms || "NET30" });
    setOpen(true);
  };

  const save = async () => {
    const r = edit ? await updateSupplierAction(edit.id, form) : await createSupplierAction(form);
    if (r.ok) {
      toast.success(t.toastSaved);
      setOpen(false);
      load();
    } else toast.error(t.suppliersSaveError);
  };

  const del = async (id) => {
    if (!confirm(t.suppliersConfirmDelete)) return;
    const r = await deleteSupplierAction(id);
    if (r.ok) {
      toast.success(t.toastDeleted);
      load();
    } else if (r.error === "has_purchases") toast.error(t.suppliersDeleteBlocked);
    else toast.error(t.errGeneric);
  };

  const openSheet = async (id) => {
    setSheetId(id);
    const r = await loadSupplierDetailAction(id);
    if (r.ok) setSheetData(r.data);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <Input
          placeholder={t.suppliersSearch}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-white/10 bg-gray-900 text-white"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">{t.filterAll}</option>
          <option value="active">{t.suppliersFilterActive}</option>
          <option value="inactive">{t.suppliersFilterInactive}</option>
        </select>
        <Input
          placeholder={t.suppliersCategoryFilter}
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="max-w-xs border-white/10 bg-gray-900 text-white"
        />
        <Button onClick={openNew} className="bg-amber-500 text-black">
          <Plus className="h-4 w-4" />
          {t.suppliersAdd}
        </Button>
        <Button variant="outline" className="border-white/10 text-white" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase text-gray-500">
              <th className="p-3">{t.suppliersColName}</th>
              <th className="p-3">{t.suppliersColPhone}</th>
              <th className="p-3">{t.suppliersColEmail}</th>
              <th className="p-3">{t.suppliersColCategory}</th>
              <th className="p-3">{t.suppliersColPurchases}</th>
              <th className="p-3">{t.suppliersColOutstanding}</th>
              <th className="p-3">{t.suppliersColStatus}</th>
              <th className="p-3">{t.suppliersColActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="p-3 font-medium text-white">{s.name}</td>
                <td className="p-3" dir="ltr">
                  {s.phone}
                </td>
                <td className="p-3">{s.email}</td>
                <td className="p-3">{s.category}</td>
                <td className="p-3">{s.totalPurchases.toLocaleString()}</td>
                <td className="p-3">{s.outstanding.toLocaleString()}</td>
                <td className="p-3">
                  <Badge className={s.isActive ? "bg-emerald-600" : "bg-gray-600"}>
                    {s.isActive ? t.active : t.inactive}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => openSheet(s.id)}>
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-400" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400" onClick={() => del(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto border-white/10 bg-gray-900 p-0 text-white">
          <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle>{edit ? t.suppliersEdit : t.suppliersAdd}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 sm:py-5">
            {["name", "companyName", "phone", "email", "category", "taxId", "address", "notes"].map((f) => (
              <div key={f} className={f === "address" || f === "notes" ? "sm:col-span-2" : ""}>
                <label className="text-xs text-gray-400">{t[`suppliersField_${f}`] || f}</label>
                {f === "notes" || f === "address" ? (
                  <textarea
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm"
                    rows={f === "address" ? 2 : 3}
                    value={form[f] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  />
                ) : (
                  <Input
                    className="mt-1 border-white/10 bg-black/40"
                    value={form[f] || ""}
                    onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
                  />
                )}
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400">{t.suppliersField_paymentTerms}</label>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2 text-sm"
                value={form.paymentTerms || "NET30"}
                onChange={(e) => setForm((p) => ({ ...p, paymentTerms: e.target.value }))}
              >
                <option value="CASH">CASH</option>
                <option value="NET30">NET30</option>
                <option value="NET60">NET60</option>
                <option value="NET90">NET90</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              />
              {t.active}
            </label>
            <div className={cn("sm:col-span-2 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-end", isRTL && "sm:flex-row-reverse")}>
              <Button variant="ghost" onClick={() => setOpen(false)} type="button" className="w-full sm:w-auto">
                {t.cancel}
              </Button>
              <Button className="w-full bg-amber-500 text-black sm:w-auto" onClick={save}>
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={!!sheetId} onOpenChange={(o) => !o && setSheetId(null)}>
        <SheetContent side={isRTL ? "left" : "right"} className="w-full overflow-y-auto border-white/10 bg-gray-950 text-white sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{sheetData?.supplier?.name}</SheetTitle>
          </SheetHeader>
          {sheetData && (
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <p>
                {t.suppliersOutstanding}: {sheetData.stats.outstanding.toLocaleString()}
              </p>
              <p>
                {t.suppliersTotalSpent}: {sheetData.stats.totalPurchases.toLocaleString()}
              </p>
              <h4 className="font-bold text-white">{t.suppliersPurchaseHistory}</h4>
              <ul className="max-h-60 space-y-2 overflow-y-auto text-xs">
                {sheetData.supplier.purchases.map((p) => (
                  <li key={p.id} className="rounded border border-white/10 p-2">
                    {p.purchaseNumber} · {new Date(p.createdAt).toLocaleDateString()} · {Number(p.totalAmount).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PurchasesTab({ t, isRTL }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [rows, setRows] = useState([]);
  const [opts, setOpts] = useState(null);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", method: "", notes: "" });
  const [lines, setLines] = useState([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [pForm, setPForm] = useState({
    supplierId: "",
    dueDate: "",
    invoiceRef: "",
    notes: "",
    paymentMethod: "",
    paidAmount: 0,
    receiveNow: true,
  });

  const load = useCallback(async () => {
    const r = await loadPurchasesTableAction({ search: dq, take: 100 });
    if (r.ok) setRows(r.rows);
  }, [dq]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = async () => {
    const r = await loadPurchaseFormOptionsAction();
    if (!r.ok) {
      toast.error(purchaseActionToastError(t, r));
      return;
    }
    if (!r.suppliers?.length) {
      toast.error(t.suppliersPurchaseNoSuppliers);
      return;
    }
    if (!r.products?.length) {
      toast.error(t.suppliersPurchaseNoProducts);
      return;
    }
    setOpts(r);
    setLines([
      {
        productId: r.products[0]?.id || "",
        quantity: 1,
        unitCost: Number(r.products[0]?.purchasePrice) || 0,
      },
    ]);
    setPForm((f) => ({ ...f, supplierId: r.suppliers[0]?.id || "", paidAmount: 0 }));
    setOpen(true);
  };

  const totalPreview = useMemo(() => {
    return lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);
  }, [lines]);

  const submitPurchase = async () => {
    if (!pForm.supplierId) {
      toast.error(t.suppliersPurchasePickSupplier);
      return;
    }
    const cleanLines = lines
      .filter((l) => l.productId)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.max(1, Math.floor(Number(l.quantity)) || 0),
        unitCost: Math.max(0, Number(l.unitCost) || 0),
      }));
    if (!cleanLines.length) {
      toast.error(t.suppliersPurchasePickProduct);
      return;
    }
    const paidNum = Math.max(0, Number(pForm.paidAmount) || 0);
    const r = await createPurchaseAction({
      ...pForm,
      paidAmount: paidNum,
      items: cleanLines,
    });
    if (r.ok) {
      toast.success(t.toastSaved);
      setOpen(false);
      load();
    } else {
      toast.error(purchaseActionToastError(t, r));
    }
  };

  const pdf = async (id) => {
    const r = await exportPurchasePdfAction(id);
    if (r.ok) {
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.error(purchaseActionToastError(t, r));
    }
  };

  const openPayDialog = (row) => {
    const u = purchaseRowUi(row);
    if (!u.canPay || u.remaining <= 0.005) return;
    setPayForm({
      amount: String(u.remaining),
      method: row.paymentMethod || "",
      notes: "",
    });
    setPayOpen(row.id);
  };

  const pay = async () => {
    const amt = Number(payForm.amount);
    if (!payOpen || !Number.isFinite(amt) || amt <= 0) {
      toast.error(t.errGeneric);
      return;
    }
    const r = await recordPurchasePaymentAction(payOpen, {
      amount: amt,
      method: payForm.method,
      notes: payForm.notes,
    });
    if (r.ok) {
      toast.success(t.toastSaved);
      setPayOpen(null);
      load();
    } else {
      toast.error(purchaseActionToastError(t, r));
    }
  };

  const activePayRow = useMemo(() => rows.find((x) => x.id === payOpen), [rows, payOpen]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <Input
          placeholder={t.suppliersPurchaseSearch}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-white/10 bg-gray-900 text-white"
        />
        <Button onClick={openCreate} className="bg-amber-500 text-black">
          <Plus className="h-4 w-4" />
          {t.suppliersAddPurchase}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-sm text-gray-300">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-xs uppercase text-gray-500">
              <th className="p-2">{t.suppliersColPo}</th>
              <th className="p-2">{t.suppliersColDate}</th>
              <th className="p-2">{t.suppliersColSupplier}</th>
              <th className="p-2">{t.suppliersColItems}</th>
              <th className="p-2">{t.suppliersColTotal}</th>
              <th className="p-2">{t.suppliersColPaid}</th>
              <th className="p-2">{t.suppliersColPayStatus}</th>
              <th className="p-2">{t.suppliersColDelivery}</th>
              <th className="p-2">{t.suppliersColActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const u = purchaseRowUi(r);
              return (
              <tr key={r.id} className="border-b border-white/5">
                <td className="p-2 font-mono text-xs">{r.purchaseNumber}</td>
                <td className="p-2">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="p-2">{r.supplierName}</td>
                <td className="p-2">{r.itemCount}</td>
                <td className="p-2">{r.totalAmount.toLocaleString()}</td>
                <td className="p-2">{r.paidAmount.toLocaleString()}</td>
                <td className="p-2">
                  <Badge
                    className={cn(
                      r.payment.key === "PAID" && "bg-emerald-600",
                      r.payment.key === "PARTIAL" && "bg-amber-600",
                      r.payment.key === "UNPAID" && "bg-gray-600",
                      r.payment.key === "OVERDUE" && "bg-red-600"
                    )}
                  >
                    {r.payment.key}
                  </Badge>
                </td>
                <td className="p-2">{r.deliveryStatus}</td>
                <td className="p-2">
                  <div className={cn("flex flex-wrap gap-1", isRTL && "flex-row-reverse")}>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      title={t.suppliersTooltipPdf}
                      onClick={() => pdf(r.id)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={!u.canPay}
                      title={u.canPay ? t.suppliersTooltipPay : t.suppliersPurchaseFullyPaid}
                      onClick={() => openPayDialog(r)}
                    >
                      <CreditCard className="h-4 w-4" />
                    </Button>
                    {u.canReceive ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-400"
                        title={t.suppliersTooltipReceive}
                        onClick={async () => {
                          const x = await markPurchaseReceivedAction(r.id);
                          if (x.ok) {
                            toast.success(t.toastSaved);
                            load();
                          } else {
                            toast.error(purchaseActionToastError(t, x));
                          }
                        }}
                      >
                        <Truck className="h-4 w-4" />
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 disabled:opacity-30"
                      disabled={!u.canDelete}
                      title={
                        u.canDelete
                          ? t.suppliersTooltipDelete
                          : t.suppliersPoDeleteBlocked
                      }
                      onClick={async () => {
                        if (!u.canDelete) return;
                        if (!confirm(t.suppliersConfirmDeletePo)) return;
                        const x = await deletePurchaseAction(r.id);
                        if (x.ok) {
                          toast.success(t.toastDeleted);
                          load();
                        } else {
                          toast.error(purchaseActionToastError(t, x));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto border-white/10 bg-gray-900 p-0 text-white">
          <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle>{t.suppliersAddPurchase}</DialogTitle>
          </DialogHeader>
          {opts && (
            <div className="space-y-4 px-4 py-4 text-sm sm:px-6 sm:py-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">{t.suppliersColSupplier}</label>
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 p-2"
                  value={pForm.supplierId}
                  onChange={(e) => setPForm((p) => ({ ...p, supplierId: e.target.value }))}
                >
                  {opts.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400">{t.suppliersAddLine}</p>
                {lines.map((l, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-2 sm:grid-cols-4">
                  <select
                    className="rounded-lg border border-white/10 bg-black/40 p-2 sm:col-span-2"
                    value={l.productId}
                    onChange={(e) => {
                      const pr = opts.products.find((x) => x.id === e.target.value);
                      const next = [...lines];
                      next[i] = {
                        ...next[i],
                        productId: e.target.value,
                        unitCost: pr ? Number(pr.purchasePrice) : 0,
                      };
                      setLines(next);
                    }}
                  >
                    {opts.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    className="border-white/10 bg-black/40"
                    value={l.quantity}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i] = { ...next[i], quantity: e.target.value };
                      setLines(next);
                    }}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="border-white/10 bg-black/40"
                    value={l.unitCost}
                    onChange={(e) => {
                      const next = [...lines];
                      next[i] = { ...next[i], unitCost: e.target.value };
                      setLines(next);
                    }}
                  />
                </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-white"
                onClick={() => setLines((ls) => [...ls, { productId: opts.products[0]?.id || "", quantity: 1, unitCost: 0 }])}
              >
                + {t.suppliersAddLine}
              </Button>
              <p className="font-bold text-amber-400">
                {t.suppliersTotal}: {totalPreview.toLocaleString()}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">{t.suppliersColDue}</label>
                  <Input
                    type="date"
                    className="border-white/10 bg-black/40"
                    value={pForm.dueDate}
                    onChange={(e) => setPForm((p) => ({ ...p, dueDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">{t.suppliersInvoiceRef}</label>
                  <Input
                    placeholder={t.suppliersInvoiceRef}
                    className="border-white/10 bg-black/40"
                    value={pForm.invoiceRef}
                    onChange={(e) => setPForm((p) => ({ ...p, invoiceRef: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-400">{t.suppliersPaidNow}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t.suppliersPaidNow}
                    className="border-white/10 bg-black/40"
                    value={pForm.paidAmount}
                    onChange={(e) => setPForm((p) => ({ ...p, paidAmount: e.target.value }))}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={pForm.receiveNow}
                  onChange={(e) => setPForm((p) => ({ ...p, receiveNow: e.target.checked }))}
                />
                {t.suppliersReceiveNow}
              </label>
              <div className={cn("flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-end", isRTL && "sm:flex-row-reverse")}>
                <Button variant="ghost" onClick={() => setOpen(false)} type="button" className="w-full sm:w-auto">
                  {t.cancel}
                </Button>
                <Button className="w-full bg-amber-500 text-black sm:w-auto" onClick={submitPurchase}>
                  {t.save}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
        <DialogContent className="w-[95vw] max-w-md border-white/10 bg-gray-900 p-0 text-white">
          <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
            <DialogTitle>{t.suppliersRecordPayment}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 px-4 py-4 sm:px-6 sm:py-5">
            {activePayRow ? (
              <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-gray-400">
                <p className="font-mono text-white">{activePayRow.purchaseNumber}</p>
                <p className="mt-1">
                  {t.suppliersColTotal}: {Number(activePayRow.totalAmount).toLocaleString()} · {t.suppliersColPaid}:{" "}
                  {Number(activePayRow.paidAmount).toLocaleString()}
                </p>
                <p className="mt-1 font-semibold text-amber-400">
                  {t.suppliersPurchaseRemaining}: {purchaseRowUi(activePayRow).remaining.toLocaleString()}
                </p>
              </div>
            ) : null}
            <Input
              placeholder={t.suppliersPayAmount}
              className="border-white/10 bg-black/40"
              value={payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
            />
            <Input
              placeholder={t.suppliersPayMethod}
              className="border-white/10 bg-black/40"
              value={payForm.method}
              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
            />
            <div className={cn("flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-end", isRTL && "sm:flex-row-reverse")}>
              <Button variant="ghost" onClick={() => setPayOpen(null)} type="button" className="w-full sm:w-auto">
                {t.cancel}
              </Button>
              <Button className="w-full bg-amber-500 text-black sm:w-auto" onClick={pay}>
                {t.save}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportsTab({ t, isRTL }) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);

  const load = async () => {
    const r = await loadReportsAction({ from, to });
    if (r.ok) setData(r);
    else toast.error(t.errGeneric);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pieData = (data?.bySupplier || []).slice(0, 8).map((x, i) => ({
    name: x.name,
    value: x.value,
    fill: ["#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#64748b", "#f97316", "#22c55e"][i % 8],
  }));

  const donut = (data?.byCategory || []).map((x, i) => ({
    name: x.name,
    value: x.value,
    fill: ["#f59e0b", "#10b981", "#3b82f6", "#a855f7"][i % 4],
  }));

  const exportReportsCsv = () => {
    if (!data) return;
    const lines = [
      "month,total",
      ...(data.monthly || []).map((m) => `${new Date(m.month).toISOString()},${m.total}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "purchase-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div>
          <label className="text-xs text-gray-400">{t.suppliersReportFrom}</label>
          <Input type="date" className="border-white/10 bg-gray-900 text-white" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">{t.suppliersReportTo}</label>
          <Input type="date" className="border-white/10 bg-gray-900 text-white" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button className="bg-amber-500 text-black" onClick={load}>
          {t.suppliersApplyRange}
        </Button>
        <Button variant="outline" className="border-white/10 text-white" onClick={exportReportsCsv}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>

      {data && (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="h-72 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-bold text-white">{t.suppliersReportMonthly}</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={data.monthly.map((m) => ({ name: new Date(m.month).toLocaleDateString(undefined, { month: "short" }), total: m.total }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                  <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                  <Bar dataKey="total" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72 rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-2 text-sm font-bold text-white">{t.suppliersReportBySupplier}</h3>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="h-72 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 text-sm font-bold text-white">{t.suppliersReportByCategory}</h3>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} label />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #333" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 text-sm font-bold text-white">{t.suppliersOutstandingList}</h3>
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500">
                  <th className="p-2">{t.suppliersColPo}</th>
                  <th className="p-2">{t.suppliersColSupplier}</th>
                  <th className="p-2">{t.suppliersColDue}</th>
                  <th className="p-2">{t.suppliersColOutstanding}</th>
                </tr>
              </thead>
              <tbody>
                {(data.outstanding || []).map((o) => (
                  <tr key={o.id} className={cn("border-b border-white/5", o.overdue && "bg-red-500/10")}>
                    <td className="p-2 font-mono text-xs">{o.purchaseNumber}</td>
                    <td className="p-2">{o.supplierName}</td>
                    <td className="p-2">{o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="p-2">{o.outstanding.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
