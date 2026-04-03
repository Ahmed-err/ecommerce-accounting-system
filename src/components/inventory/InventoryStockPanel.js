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
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

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
        "space-y-4 rounded-2xl border border-white/5 bg-gray-900 p-4 md:p-6",
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
          className="border-red-500/40 text-red-400 hover:bg-red-500/10"
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
          <h3 className="text-sm font-bold text-white">{t.inventoryStockLog}</h3>
          <Select value={mType || "all"} onValueChange={(v) => setMType(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-40 bg-gray-800 border-white/10 text-white">
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
          <table className="w-full min-w-[640px] text-left text-xs text-gray-300 rtl:text-right">
            <thead className="border-b border-white/5 bg-gray-800/40 text-[10px] uppercase text-gray-500">
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
            <tbody className="divide-y divide-white/5">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    {t.inventoryNoMovements}
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-semibold",
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
                    <td className="regular-nums px-3 py-2 font-bold text-white">{m.quantity}</td>
                    <td className="px-3 py-2">{m.supplier?.name || "—"}</td>
                    <td className="max-w-[120px] truncate px-3 py-2">
                      {m.user?.name || m.user?.email || "—"}
                    </td>
                    <td className="regular-nums px-3 py-2 text-gray-400">
                      {new Date(m.createdAt).toLocaleString(lang === "ar" ? "ar-SD" : "en-GB")}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-gray-500">
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
          className="max-h-[90dvh] max-w-lg overflow-y-auto border-white/10 bg-gray-900 text-white"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{t.inventoryReceiveStock}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t.inventorySearchPlaceholder}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            <Select
              modal={false}
              value={selectedProductId || null}
              onValueChange={(v) => setSelectedProductId(typeof v === "string" ? v : "")}
            >
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue placeholder={t.inventorySelectProduct} />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56 bg-gray-800 border-white/10 text-white">
                {productHits.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
              className="bg-gray-800 border-white/10"
            />
            <Select
              modal={false}
              value={supplierId || "none"}
              onValueChange={(v) => setSupplierId(v === "none" ? "" : v)}
            >
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue placeholder={t.inventorySupplier} />
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
            <Input
              type="number"
              step="0.01"
              placeholder={t.inventoryUnitCost}
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            <Input
              placeholder={t.inventoryNotes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>
          <DialogFooter className="border-t border-white/10 bg-gray-900/80">
            <Button variant="ghost" onClick={() => setReceiveOpen(false)}>
              {t.cancel}
            </Button>
            <Button className="bg-amber-500 text-black" disabled={busy} onClick={submitReceive}>
              {t.submitMessage?.split(" ")[0] || "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent
          className="max-h-[90dvh] max-w-lg overflow-y-auto border-white/10 bg-gray-900 text-white"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>{t.inventoryIssueStock}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder={t.inventorySearchPlaceholder}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            <Select
              modal={false}
              value={selectedProductId || null}
              onValueChange={(v) => setSelectedProductId(typeof v === "string" ? v : "")}
            >
              <SelectTrigger className="bg-gray-800 border-white/10">
                <SelectValue placeholder={t.inventorySelectProduct} />
              </SelectTrigger>
              <SelectContent className="z-[100] max-h-56 bg-gray-800 border-white/10 text-white">
                {productHits.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
              className="bg-gray-800 border-white/10"
            />
            <Input
              placeholder={t.inventoryReason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
            <Input
              placeholder={t.inventoryNotes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-gray-800 border-white/10"
            />
          </div>
          <DialogFooter className="border-t border-white/10 bg-gray-900/80">
            <Button variant="ghost" onClick={() => setIssueOpen(false)}>
              {t.cancel}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={submitIssue}>
              {t.inventoryIssueStock}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
