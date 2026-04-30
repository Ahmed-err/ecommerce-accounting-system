"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/components/store/CartProvider";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { getReorderPayloadForOrder, submitCustomerOrderReturn } from "@/app/actions/account-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function returnErrorMessage(code, t) {
  const map = {
    RETURN_PENDING_EXISTS: t.accountReturnErrPending,
    RETURN_WINDOW_CLOSED: t.accountReturnErrWindow,
    RETURN_NOT_DELIVERED: t.accountReturnErrNotDelivered,
    RETURN_QTY_EXCEEDS: t.accountReturnErrQty,
    RETURN_INVALID_PRODUCT: t.accountReturnErrGeneric,
    RETURN_PRICE_MISMATCH: t.accountReturnErrGeneric,
    VALIDATION: t.accountReturnErrGeneric,
    SERVER: t.accountReturnErrGeneric,
    NOT_FOUND: t.accountReturnErrGeneric,
    UNAUTHORIZED: t.accountReturnErrGeneric,
  };
  return map[code] || t.accountReturnErrGeneric;
}

export default function AccountOrderActions({ orderId, status, returnOpen, lines }) {
  const router = useRouter();
  const { lang, isRTL } = useLanguage();
  const t = translations[lang] || translations.ar;
  const { addToCart } = useCart();

  const [reorderBusy, setReorderBusy] = useState(false);
  const [returnOpenDlg, setReturnOpenDlg] = useState(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundMethod, setRefundMethod] = useState("STORE_CREDIT");

  const [pick, setPick] = useState({});

  const buildDefaultPick = () => {
    const o = {};
    for (const ln of lines) {
      if (ln.isActive) o[ln.productId] = { checked: true, qty: ln.quantity };
    }
    return o;
  };

  const openReturn = () => {
    setPick(buildDefaultPick());
    setReason("");
    setNotes("");
    setRefundMethod("STORE_CREDIT");
    setReturnOpenDlg(true);
  };

  const toggleLine = (productId, maxQty) => {
    setPick((prev) => {
      const cur = prev[productId] || { checked: false, qty: maxQty };
      return {
        ...prev,
        [productId]: { ...cur, checked: !cur.checked, qty: cur.checked ? cur.qty : maxQty },
      };
    });
  };

  const setLineQty = (productId, maxQty, raw) => {
    const n = Math.max(1, Math.min(maxQty, Math.floor(Number(raw)) || 1));
    setPick((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || { checked: true, qty: n }), qty: n, checked: true },
    }));
  };

  const handleReorder = async () => {
    setReorderBusy(true);
    try {
      const res = await getReorderPayloadForOrder(orderId);
      if (!res.success) {
        toast.error(res.error || t.accountReorderFail);
        return;
      }
      if (!res.lines?.length) {
        toast.message(t.accountReorderEmpty);
        return;
      }
      let n = 0;
      for (const row of res.lines) {
        addToCart(row.product, row.quantity);
        n += row.quantity;
      }
      if (n === 0) {
        toast.message(t.accountReorderEmpty);
        return;
      }
      toast.success(t.accountReorderSuccess);
      router.push("/cart");
      router.refresh();
    } catch (e) {
      toast.error(e?.message || t.accountReorderFail);
    } finally {
      setReorderBusy(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 2) {
      toast.error(t.ordReturnErrReason || t.accountReturnErrGeneric);
      return;
    }
    const items = [];
    for (const ln of lines) {
      if (!ln.isActive) continue;
      const p = pick[ln.productId];
      if (!p?.checked) continue;
      const qty = Math.min(ln.quantity, Math.max(1, p.qty || 1));
      items.push({
        productId: ln.productId,
        quantity: qty,
        price: ln.price,
      });
    }
    if (items.length === 0) {
      toast.error(t.ordReturnErrNoItems || t.accountReturnErrGeneric);
      return;
    }

    setReturnBusy(true);
    try {
      const res = await submitCustomerOrderReturn({
        orderId,
        reason: reason.trim(),
        notes: notes.trim() || null,
        refundMethod,
        items,
      });
      if (!res.success) {
        const msg =
          (res.errorCode && returnErrorMessage(res.errorCode, t)) ||
          res.error ||
          t.accountReturnErrGeneric;
        toast.error(msg);
        return;
      }
      toast.success(t.accountReturnSuccess);
      setReturnOpenDlg(false);
      router.refresh();
    } catch (err) {
      toast.error(err?.message || t.accountReturnErrGeneric);
    } finally {
      setReturnBusy(false);
    }
  };

  const btnClass =
    "rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground hover:bg-muted touch-manipulation";

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", isRTL && "flex-row-reverse")}>
        {status === "DELIVERED" && (
          <Button
            type="button"
            variant="secondary"
            className={btnClass}
            disabled={reorderBusy}
            onClick={handleReorder}
          >
            {reorderBusy ? "…" : t.accountReorderBtn}
          </Button>
        )}
        <a
          className={btnClass}
          href={`/orders/${orderId}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.accountDownloadInvoice}
        </a>
        <Button
          type="button"
          className="rounded-lg bg-amber-500 px-3 py-2 text-sm text-black hover:bg-amber-600 disabled:opacity-50"
          disabled={!returnOpen}
          onClick={returnOpen ? openReturn : undefined}
        >
          {returnOpen ? t.accountRequestReturn : t.accountReturnPeriodEnded}
        </Button>
      </div>

      <Dialog open={returnOpenDlg} onOpenChange={setReturnOpenDlg}>
        <DialogContent className={cn("max-w-md", isRTL && "text-right")} dir={isRTL ? "rtl" : "ltr"}>
          <form onSubmit={handleReturnSubmit}>
            <DialogHeader>
              <DialogTitle>{t.accountReturnDlgTitle}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[50vh] pe-1">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t.ordReturnReason}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                  minLength={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t.accountReturnRefundLabel}</label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="STORE_CREDIT">{t.accountReturnRefundCredit}</option>
                  <option value="BANK_TRANSFER">{t.accountReturnRefundBank}</option>
                  <option value="CASH">{t.accountReturnRefundCash}</option>
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t.accountReturnItemsHint}</p>
                <ul className="space-y-3">
                  {lines.map((ln) => (
                    <li
                      key={ln.productId}
                      className={cn(
                        "flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between",
                        !ln.isActive && "opacity-50"
                      )}
                    >
                      <label className={cn("flex items-center gap-2 text-sm", isRTL && "flex-row-reverse")}>
                        <input
                          type="checkbox"
                          checked={!!pick[ln.productId]?.checked}
                          disabled={!ln.isActive}
                          onChange={() => toggleLine(ln.productId, ln.quantity)}
                        />
                        <span className="min-w-0">
                          {ln.name} × {ln.quantity}
                        </span>
                      </label>
                      {ln.isActive && pick[ln.productId]?.checked ? (
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                          <span className="text-xs text-muted-foreground">{t.accountReturnQty}</span>
                          <Input
                            type="number"
                            min={1}
                            max={ln.quantity}
                            value={pick[ln.productId]?.qty ?? ln.quantity}
                            className="h-8 w-16"
                            onChange={(e) => setLineQty(ln.productId, ln.quantity, e.target.value)}
                          />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">{t.ordReturnNote}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <DialogFooter className={cn("mt-4 sm:justify-between", isRTL && "sm:flex-row-reverse")}>
              <Button type="button" variant="outline" onClick={() => setReturnOpenDlg(false)}>
                {t.cancel}
              </Button>
              <Button type="submit" className="bg-amber-500 text-black hover:bg-amber-600" disabled={returnBusy}>
                {returnBusy ? "…" : t.accountReturnSubmit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
