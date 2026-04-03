"use client";

import { useCallback, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { buildReceiptData } from "@/lib/receipt";
import {
  connectBluetoothPrinter,
  connectUsbSerialPrinter,
  connectWebUsbPrinter,
  hasAuthorizedSerialPort,
  readPrinterModeHint,
} from "@/lib/print-service";

export default function PrinterStatus({ printerSettings, lang, cashierName, messages }) {
  const [open, setOpen] = useState(false);
  const [serialOk, setSerialOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const ok = await hasAuthorizedSerialPort();
    setSerialOk(ok);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const isPdfMode = printerSettings?.printerType === "PDF";
  const modeHint = typeof window !== "undefined" ? readPrinterModeHint() : null;
  const dotClass = isPdfMode
    ? "bg-gray-500"
    : serialOk || modeHint === "bluetooth" || modeHint === "usb"
      ? "bg-emerald-500"
      : "bg-red-500";

  const runTestPrint = async () => {
    setBusy(true);
    try {
      const testReceipt = buildReceiptData({
        receiptFromServer: {
          invoiceNumber: "TEST-RECEIPT",
          createdAt: new Date().toISOString(),
          paymentMethod: "CASH",
          guestName: "",
          guestPhone: "",
          totalAmount: 10,
          taxAmount: 0,
          discountAmount: 0,
          items: [{ name: "Test line", sku: "TST", qty: 1, unitPrice: 10, subtotal: 10 }],
        },
        store: printerSettings,
        cashier: { name: cashierName || "Cashier" },
        lang: lang === "ar" ? "ar" : "en",
        subtotalBeforeDiscount: 10,
        discountType: "fixed",
        amountTendered: 20,
        change: 10,
      });
      const { printReceipt: pr } = await import("@/lib/print-service");
      await pr(testReceipt, printerSettings, messages, {});
    } catch (e) {
      console.error(e);
      toast.error(messages?.printFailed || "Print failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          refresh();
        }}
        className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 text-[10px] font-black uppercase text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={messages?.printerSetup || "Printer"}
      >
        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden />
        <Printer className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-border bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-amber-500">
              {messages?.printerSetup || "Printer setup"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              {messages?.printerBrowserNote ||
                "Web USB / Serial / Bluetooth work best in Chrome or Edge. Other browsers use PDF / print dialog."}
            </p>
            <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">{messages?.paperWidth || "Paper width"}</p>
              <p className="text-xs">
                {printerSettings?.paperWidth === "58" ? "58mm" : "80mm"} ({messages?.fromStoreSettings || "from store settings"})
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="font-bold"
                onClick={async () => {
                  try {
                    await connectUsbSerialPrinter();
                    await refresh();
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                {messages?.connectUsbSerial || "Connect USB (Serial)"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="font-bold"
                onClick={async () => {
                  try {
                    await connectWebUsbPrinter();
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                {messages?.connectWebUsb || "Connect WebUSB printer"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                className="font-bold"
                onClick={async () => {
                  try {
                    await connectBluetoothPrinter();
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                {messages?.connectBluetooth || "Connect Bluetooth"}
              </Button>
              <Button type="button" disabled={busy} className="bg-amber-500 font-black text-black" onClick={runTestPrint}>
                {messages?.testPrint || "Test print"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {messages?.close || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
