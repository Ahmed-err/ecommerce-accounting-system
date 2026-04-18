"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  receiveStockAction,
  issueStockAction,
  getStockMovementsAction,
  searchProductsForStock,
} from "@/app/actions/inventory";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn, formatServerActionError } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from "lucide-react";

export default function InventoryStockPanel({
  suppliers = [],
  initialMovements = [],
  movementsTotal = 0,
  canStockOps = true,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [productHits, setProductHits] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [supplierId, setSupplierId] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [movements, setMovements] = useState(initialMovements);
  const [mTotal, setMTotal] = useState(movementsTotal);
  const [mPage, setMPage] = useState(1);
  const [mType, setMType] = useState("");
  const searchT = useRef(null);

  const resetProductPickers = () => {
    setProductQuery("");
    setProductHits([]);
    setSelectedProductId("");
    setQty(1);
    setSupplierId("");
    setUnitCost("");
    setNotes("");
    setReason("");
  };

  useEffect(() => {
    if (!receiveOpen && !issueOpen) return;
    clearTimeout(searchT.current);
    searchT.current = setTimeout(async () => {
      const rows = await searchProductsForStock({ search: productQuery, limit: 60 });
      setProductHits(rows);
    }, 300);
    return () => clearTimeout(searchT.current);
  }, [productQuery, receiveOpen, issueOpen]);

  const loadMovements = useCallback(
    async (page, type, append) => {
      const { movements: rows, total } = await getStockMovementsAction({
        page,
        limit: 15,
        type: type === "IN" || type === "OUT" ? type : "",
      });
      if (append) setMovements((prev) => [...prev, ...rows]);
      else setMovements(rows);
      setMTotal(total);
    },
    []
  );

  useEffect(() => {
    setMPage(1);
    loadMovements(1, mType, false);
  }, [mType, loadMovements]);

  const submitReceive = async () => {
    if (!selectedProductId) {
      toast.error(t.inventorySelectProduct);
      return;
    }
    setBusy(true);
    const res = await receiveStockAction({
      productId: selectedProductId,
      quantity: qty,
      supplierId: supplierId || undefined,
      unitCost: unitCost === "" ? undefined : Number(unitCost),
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success(t.saving);
      setReceiveOpen(false);
      resetProductPickers();
      loadMovements(1, mType, false);
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError || "Error");
    }
  };

  const submitIssue = async () => {
    if (!selectedProductId) {
      toast.error(t.inventorySelectProduct);
      return;
    }
    setBusy(true);
    const res = await issueStockAction({
      productId: selectedProductId,
      quantity: qty,
      reason: reason || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
    if (res.success) {
      toast.success(t.saving);
      setIssueOpen(false);
      resetProductPickers();
      loadMovements(1, mType, false);
    } else {
      toast.error(formatServerActionError(res.error) || t.genericError || "Error");
    }
  };

  const loadMore = async () => {
    const next = mPage + 1;
    const { movements: rows } = await getStockMovementsAction({
      page: next,
      limit: 15,
      type: mType === "IN" || mType === "OUT" ? mType : "",
    });
    setMPage(next);
    setMovements((prev) => [...prev, ...rows]);
  };

  if (!canStockOps) return null;

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border bg-card text-card-foreground p-4 md:p-6",
        isRTL && "text-right"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          isRTL && "flex-row-reverse"
        )}
      >
        <Button
          type="button"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => {
            resetProductPickers();
            setReceiveOpen(true);
          }}
        >
          <ArrowDownCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {t.inventoryReceiveStock}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-red-400/50 text-red-700 hover:bg-red-500/10 dark:border-red-500/40 dark:text-red-400"
          onClick={() => {
            resetProductPickers();
            setIssueOpen(true);
          }}
        >
          <ArrowUpCircle className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {t.inventoryIssueStock}
        </Button>
      </div>

      <div>
        <div
          className={cn(
            "mb-3 flex flex-wrap items-center gap-3",
            isRTL && "flex-row-reverse"
          )}
        >
          <h3 className="text-sm font-bold text-foreground">{t.inventoryStockLog}</h3>
          <Select value={mType || "all"} onValueChange={(v) => setMType(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-40 bg-background border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground">
              <SelectItem value="all">{t.inventoryAllTypes}</SelectItem>
              <SelectItem value="IN">{t.inventoryMovementIn}</SelectItem>
              <SelectItem value="OUT">{t.inventoryMovementOut}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-xs text-foreground rtl:text-right">
            <thead className="border-b border-border bg-muted/50 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t.inventoryMovementType}</th>
                <th className="px-3 py-2">{t.inventoryColProduct}</th>
                <th className="px-3 py-2">{t.inventoryColStock}</th>
                <th className="px-3 py-2">{t.inventorySupplier}</th>
                <th className="px-3 py-2">{t.settingsTitle?.split(" ")[0] || "User"}</th>
                <th className="px-3 py-2">{t.accountingDate}</th>
                <th className="px-3 py-2">{t.inventoryNotes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    {t.inventoryNoMovements}
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-semibold",
                          m.type === "IN"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-700 dark:text-red-400"
                        )}
                      >
                        {m.type === "IN" ? t.inventoryMovementIn : t.inventoryMovementOut}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{m.product?.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{m.product?.sku}</div>
                    </td>
                    <td className="regular-nums px-3 py-2 font-bold text-foreground">{m.quantity}</td>
                    <td className="px-3 py-2">{m.supplier?.name || "—"}</td>
                    <td className="max-w-[120px] truncate px-3 py-2">
                      {m.user?.name || m.user?.email || "—"}
                    </td>
                    <td className="regular-nums px-3 py-2 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString(lang === "ar" ? "ar-SD" : "en-GB")}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground">
                      {m.reason || m.notes || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {movements.length < mTotal && (
          <Button
            type="button"
            variant="ghost"
            className="mt-2 text-amber-500"
            onClick={loadMore}
          >
            {t.inventoryLoadMore}
          </Button>
        )}
      </div>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent
          className="max-h-[90dvh] max-w-lg overflow-y-auto border-border bg-card text-card-foreground"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{t.inventoryReceiveStock}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventorySearchPlaceholder || (lang === "ar" ? "بحث عن منتج" : "Search product")}</label>
              <Input
                placeholder={lang === "ar" ? "اسم المنتج أو كود SKU..." : "Product name or SKU..."}
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventorySelectProduct || (lang === "ar" ? "اختر المنتج" : "Select product")} <span className="text-red-500">*</span></label>
              <Select
                modal={false}
                value={selectedProductId || null}
                onValueChange={(v) => setSelectedProductId(typeof v === "string" ? v : "")}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t.inventorySelectProduct} />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-56 bg-background border-border text-foreground">
                  {productHits.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {lang === "ar" ? "المخزون:" : "stock:"} {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryColStock || (lang === "ar" ? "الكمية" : "Quantity")} <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventorySupplier || (lang === "ar" ? "المورد" : "Supplier")} <span className="text-xs text-muted-foreground">{t.optional || "(اختياري)"}</span></label>
              <Select
                modal={false}
                value={supplierId || "none"}
                onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t.inventorySupplier} />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-background border-border text-foreground">
                  <SelectItem value="none">{t.inventoryAllSuppliers}</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryUnitCost || (lang === "ar" ? "تكلفة الوحدة" : "Unit cost")} <span className="text-xs text-muted-foreground">{t.optional || "(اختياري)"}</span></label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryNotes || (lang === "ar" ? "ملاحظات" : "Notes")} <span className="text-xs text-muted-foreground">{t.optional || "(اختياري)"}</span></label>
              <Input
                placeholder={lang === "ar" ? "أي ملاحظات إضافية..." : "Any additional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-muted/30 pt-3">
            <Button variant="ghost" onClick={() => setReceiveOpen(false)}>
              {t.cancel}
            </Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={busy} onClick={submitReceive}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.saving}</> : (t.inventoryReceiveStock)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent
          className="max-h-[90dvh] max-w-lg overflow-y-auto border-border bg-card text-card-foreground"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{t.inventoryIssueStock}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{lang === "ar" ? "بحث عن منتج" : "Search product"}</label>
              <Input
                placeholder={lang === "ar" ? "اسم المنتج أو كود SKU..." : "Product name or SKU..."}
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventorySelectProduct || (lang === "ar" ? "اختر المنتج" : "Select product")} <span className="text-red-500">*</span></label>
              <Select
                modal={false}
                value={selectedProductId || null}
                onValueChange={(v) => setSelectedProductId(typeof v === "string" ? v : "")}
              >
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t.inventorySelectProduct} />
                </SelectTrigger>
                <SelectContent className="z-[100] max-h-56 bg-background border-border text-foreground">
                  {productHits.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — {lang === "ar" ? "المخزون:" : "stock:"} {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryColStock || (lang === "ar" ? "الكمية" : "Quantity")} <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || 1)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryReason || (lang === "ar" ? "السبب" : "Reason")} <span className="text-xs text-muted-foreground">{t.optional || "(اختياري)"}</span></label>
              <Input
                placeholder={lang === "ar" ? "مثال: صرف للإنتاج، تالف، إلخ..." : "e.g. Production use, damaged, etc..."}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">{t.inventoryNotes || (lang === "ar" ? "ملاحظات" : "Notes")} <span className="text-xs text-muted-foreground">{t.optional || "(اختياري)"}</span></label>
              <Input
                placeholder={lang === "ar" ? "أي ملاحظات إضافية..." : "Any additional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-border bg-muted/30 pt-3">
            <Button variant="ghost" onClick={() => setIssueOpen(false)}>
              {t.cancel}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={submitIssue}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.saving}</> : t.inventoryIssueStock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
