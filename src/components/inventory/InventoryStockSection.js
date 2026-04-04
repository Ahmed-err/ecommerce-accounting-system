"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn, formatServerActionError } from "@/lib/utils";
import { toast } from "sonner";
import {
  receiveStockAction,
  issueStockAction,
  getStockMovementsAction,
  searchProductsForStock,
} from "@/app/actions/inventory";

export default function InventoryStockSection({
  suppliers = [],
  initialMovements = [],
  initialMovementsTotal = 0,
  canStockOps = true,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const [recvOpen, setRecvOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [movements, setMovements] = useState(initialMovements);
  const [mTotal, setMTotal] = useState(initialMovementsTotal);
  const [mPage, setMPage] = useState(1);
  const [mType, setMType] = useState("");
  const [loading, setLoading] = useState(false);
  const skipNextFetch = useRef(true);

  useEffect(() => {
    setMovements(initialMovements);
    setMTotal(initialMovementsTotal);
  }, [initialMovements, initialMovementsTotal]);

  const reloadMovements = useCallback(
    async (page, typeFilter) => {
      setLoading(true);
      try {
        const res = await getStockMovementsAction({
          page,
          limit: 15,
          type: !typeFilter || typeFilter === "all" ? "" : typeFilter,
        });
        setMovements(res.movements || []);
        setMTotal(res.total || 0);
      } catch (err) {
        console.error(err);
        toast.error(formatServerActionError(err) || t.genericError || "Error");
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    reloadMovements(mPage, mType);
  }, [mPage, mType, reloadMovements]);

  const mPages = Math.ceil(mTotal / 15) || 1;

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-white/5 bg-gray-900 p-4 md:p-6",
        isRTL && "text-right"
      )}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
          isRTL && "sm:flex-row-reverse"
        )}
      >
        <h2 className="text-lg font-bold text-white">{t.inventoryStockLog}</h2>
        {canStockOps && (
          <div className={cn("flex flex-wrap gap-2", isRTL && "sm:flex-row-reverse")}>
            <Button
              type="button"
              onClick={() => setRecvOpen(true)}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <ArrowDownCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.inventoryReceiveStock}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIssueOpen(true)}
              className="border-red-400/50 text-red-300 hover:bg-red-500/10"
            >
              <ArrowUpCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {t.inventoryIssueStock}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={mType || "all"} onValueChange={(v) => { setMPage(1); setMType(v === "all" ? "" : v); }}>
          <SelectTrigger className="h-9 w-40 bg-gray-800/80 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-white/10 text-white">
            <SelectItem value="all">{t.inventoryAllTypes}</SelectItem>
            <SelectItem value="IN">{t.inventoryMovementIn}</SelectItem>
            <SelectItem value="OUT">{t.inventoryMovementOut}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="w-full min-w-[640px] text-sm text-gray-300">
          <thead className="border-b border-white/5 bg-gray-800/40 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">{t.inventoryMovementDate}</th>
              <th className="px-3 py-2">{t.inventoryMovementType}</th>
              <th className="px-3 py-2">{t.inventoryColProduct}</th>
              <th className="px-3 py-2 regular-nums">{t.inventoryColStock}</th>
              <th className="px-3 py-2">{t.inventoryNotes}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  …
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                  {t.inventoryNoMovements}
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.03]">
                  <td className="regular-nums px-3 py-2 text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString(lang === "ar" ? "ar-SD" : "en-GB")}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        m.type === "IN"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      )}
                    >
                      {m.type === "IN" ? t.inventoryMovementIn : t.inventoryMovementOut}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-white">{m.product?.name}</div>
                    <div className="font-mono text-[10px] text-gray-500">{m.product?.sku}</div>
                  </td>
                  <td className="regular-nums px-3 py-2 font-semibold text-white">{m.quantity}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs text-gray-500">
                    {[m.reason, m.notes, m.user?.name || m.user?.email].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {mPages > 1 && (
        <div className={cn("flex items-center justify-center gap-2", isRTL && "flex-row-reverse")}>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-gray-800 text-white"
            disabled={mPage <= 1 || loading}
            onClick={() => setMPage((p) => Math.max(1, p - 1))}
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <span className="text-xs text-gray-400">
            {mPage} / {mPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-gray-800 text-white"
            disabled={mPage >= mPages || loading}
            onClick={() => setMPage((p) => p + 1)}
          >
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <StockDialogReceive
        open={recvOpen}
        onOpenChange={setRecvOpen}
        suppliers={suppliers}
        onDone={() => { reloadMovements(1, mType); setMPage(1); }}
      />
      <StockDialogIssue
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onDone={() => { reloadMovements(1, mType); setMPage(1); }}
      />
    </div>
  );
}

function StockDialogReceive({ open, onOpenChange, suppliers, onDone }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const searchT = useRef(null);

  useEffect(() => {
    if (!open) return;
    setProductId("");
    setQty("1");
    setSupplierId("");
    setUnitCost("");
    setNotes("");
    setSearch("");
    setOptions([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(searchT.current);
    searchT.current = setTimeout(async () => {
      const rows = await searchProductsForStock({ search, limit: 60 });
      setOptions(rows);
    }, 280);
  }, [search, open]);

  const submit = async () => {
    if (!productId) {
      toast.error(t.inventorySelectProduct);
      return;
    }
    setBusy(true);
    const res = await receiveStockAction({
      productId,
      quantity: Number(qty),
      supplierId: supplierId || undefined,
      unitCost: unitCost === "" ? undefined : Number(unitCost),
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success(lang === "ar" ? "تم الاستلام" : "Received");
      onOpenChange(false);
      onDone();
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
          className="max-h-[90dvh] w-full max-w-xl overflow-y-auto border-white/10 bg-gray-900 p-0 text-white"
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>{t.inventoryReceiveStock}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventorySearchPlaceholder}</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventorySelectProduct}</label>
            <Select
              modal={false}
              value={productId || null}
              onValueChange={(v) => setProductId(typeof v === "string" ? v : "")}
            >
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56 bg-gray-800 border-white/10 text-white">
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">{t.inventoryColStock}</label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="bg-gray-800 border-white/10 regular-nums"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">{t.inventoryUnitCost}</label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="bg-gray-800 border-white/10 regular-nums"
                placeholder="—"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventorySupplier}</label>
            <Select
              modal={false}
              value={supplierId || "none"}
              onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="bg-gray-800 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100] bg-gray-800 border-white/10 text-white">
                <SelectItem value="none">{t.inventoryAllSuppliers}</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventoryNotes}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-gray-800 border-white/10" />
          </div>
        </div>
        <DialogFooter className={cn("border-t border-white/10 bg-gray-900/80 px-4 py-3 sm:px-6", isRTL && "sm:flex-row-reverse")}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} type="button" className="w-full sm:w-auto">
            {t.cancel}
          </Button>
          <Button onClick={submit} disabled={busy} className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
            {busy ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StockDialogIssue({ open, onOpenChange, onDone }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const searchT = useRef(null);

  useEffect(() => {
    if (!open) return;
    setProductId("");
    setQty("1");
    setReason("");
    setNotes("");
    setSearch("");
    setOptions([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    clearTimeout(searchT.current);
    searchT.current = setTimeout(async () => {
      const rows = await searchProductsForStock({ search, limit: 60 });
      setOptions(rows);
    }, 280);
  }, [search, open]);

  const submit = async () => {
    if (!productId) {
      toast.error(t.inventorySelectProduct);
      return;
    }
    setBusy(true);
    const res = await issueStockAction({
      productId,
      quantity: Number(qty),
      reason: reason || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success(lang === "ar" ? "تم الصرف" : "Issued");
      onOpenChange(false);
      onDone();
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto border-white/10 bg-gray-900 p-0 text-white"
      >
        <DialogHeader className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>{t.inventoryIssueStock}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventorySearchPlaceholder}</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventorySelectProduct}</label>
            <Select
              modal={false}
              value={productId || null}
              onValueChange={(v) => setProductId(typeof v === "string" ? v : "")}
            >
              <SelectTrigger className="bg-gray-800 border-white/10 text-white" dir={isRTL ? "rtl" : "ltr"}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56 bg-gray-800 border-white/10 text-white">
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventoryColStock}</label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-gray-800 border-white/10 regular-nums"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventoryReason}</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} className="bg-gray-800 border-white/10" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-400">{t.inventoryNotes}</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-gray-800 border-white/10" />
          </div>
        </div>
        <DialogFooter className={cn("border-t border-white/10 bg-gray-900/80 px-4 py-3 sm:px-6", isRTL && "sm:flex-row-reverse")}>
          <Button variant="ghost" onClick={() => onOpenChange(false)} type="button" className="w-full sm:w-auto">
            {t.cancel}
          </Button>
          <Button onClick={submit} disabled={busy} variant="destructive" className="w-full sm:w-auto">
            {busy ? t.saving : t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
