"use client";

import { toast } from "sonner";

const LS_MODE = "pos_printer_connection_mode";

let cachedSerialPort = null;
let cachedBtChar = null;
let cachedUsbDevice = null;

export function readPrinterModeHint() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_MODE);
}

export function writePrinterModeHint(mode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_MODE, mode || "none");
}

export function clearCachedPrinters() {
  cachedSerialPort = null;
  cachedBtChar = null;
  cachedUsbDevice = null;
  writePrinterModeHint("none");
}

export async function hasAuthorizedSerialPort() {
  if (typeof navigator === "undefined" || !navigator.serial) return false;
  const ports = await navigator.serial.getPorts();
  return ports.length > 0;
}

export async function connectUsbSerialPrinter() {
  if (!navigator.serial) {
    toast.error("Web Serial is not supported in this browser.");
    throw new Error("SERIAL_UNSUPPORTED");
  }
  cachedSerialPort = await navigator.serial.requestPort();
  writePrinterModeHint("serial");
  toast.success("USB serial printer selected. It will be used for the next print.");
  return true;
}

export async function connectWebUsbPrinter() {
  if (!navigator.usb) {
    toast.error("Web USB is not supported in this browser.");
    throw new Error("USB_UNSUPPORTED");
  }
  cachedUsbDevice = await navigator.usb.requestDevice({ filters: [{ classCode: 0x07 }] });
  writePrinterModeHint("usb");
  toast.success("USB printer selected.");
  return true;
}

export async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    toast.error("Web Bluetooth is not supported in this browser.");
    throw new Error("BT_UNSUPPORTED");
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "0000ffe0-0000-1000-8000-00805f9b34fb",
      "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
    ],
  });
  const server = await device.gatt.connect();
  let char;
  try {
    const svc = await server.getPrimaryService("0000ffe0-0000-1000-8000-00805f9b34fb");
    char = await svc.getCharacteristic("0000ffe1-0000-1000-8000-00805f9b34fb");
  } catch {
    const svc = await server.getPrimaryService("6e400001-b5a3-f393-e0a9-e50e24dcca9e");
    char = await svc.getCharacteristic("6e400002-b5a3-f393-e0a9-e50e24dcca2e");
  }
  cachedBtChar = char;
  writePrinterModeHint("bluetooth");
  toast.success("Bluetooth printer paired.");
  return true;
}

async function writeSerialBytes(bytes) {
  if (!navigator.serial) return false;
  let port = cachedSerialPort;
  if (!port) {
    const ports = await navigator.serial.getPorts();
    port = ports[0] || null;
  }
  if (!port) return false;
  if (!port.opened) {
    try {
      await port.open({ baudRate: 9600 });
    } catch {
      try {
        await port.open({ baudRate: 115200 });
      } catch {
        return false;
      }
    }
  }
  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
  return true;
}

async function writeBluetoothBytes(bytes) {
  if (!cachedBtChar) return false;
  const chunk = 64;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    const copy = new Uint8Array(slice.length);
    copy.set(slice);
    await cachedBtChar.writeValue(copy);
  }
  return true;
}

async function writeWebUsbBytes(bytes) {
  if (!cachedUsbDevice || !navigator.usb) return false;
  const device = cachedUsbDevice;
  try {
    await device.open();
    if (device.configuration == null) {
      await device.selectConfiguration(1);
    }
    const configuration = device.configuration;
    if (!configuration) return false;
    let ifaceNum = 0;
    let endpointNumber = null;
    let packetSize = 64;
    for (const iface of configuration.interfaces) {
      for (const alt of iface.alternates) {
        const out = alt.endpoints.find((e) => e.direction === "out");
        if (out) {
          ifaceNum = iface.interfaceNumber;
          endpointNumber = out.endpointNumber;
          packetSize = out.packetSize || 64;
          break;
        }
      }
      if (endpointNumber != null) break;
    }
    if (endpointNumber == null) return false;
    await device.claimInterface(ifaceNum);
    try {
      for (let i = 0; i < bytes.length; i += packetSize) {
        await device.transferOut(endpointNumber, bytes.subarray(i, i + packetSize));
      }
    } finally {
      try {
        await device.releaseInterface(ifaceNum);
      } catch {
        /* ignore */
      }
      try {
        await device.close();
      } catch {
        /* ignore */
      }
    }
    return true;
  } catch (e) {
    console.error("WebUSB print failed:", e);
    return false;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error("PRINT_TIMEOUT")), ms)),
  ]);
}

export async function printThermal(receiptData, settings, messages = {}, opts = {}) {
  const quiet = !!opts.quietToast;
  const thermalSettings = {
    paperWidth: settings.paperWidth === "58" ? "58" : "80",
    showBarcode: settings.showBarcode !== false,
    showLogo: settings.showLogo !== false,
  };
  try {
    const { buildEscPosReceipt } = await import("@/lib/receipt");
    const bytes = await withTimeout(buildEscPosReceipt(receiptData, thermalSettings), 10000);

    if (settings.printerConnection === "BLUETOOTH") {
      const ok = await withTimeout(writeBluetoothBytes(bytes), 10000);
      if (!ok) {
        if (!quiet) toast.info(messages.noPrinterConnected || "No Bluetooth printer connected.");
        return false;
      }
      return true;
    }

    const serialOk = await withTimeout(writeSerialBytes(bytes), 10000);
    if (serialOk) return true;

    const usbOk = await withTimeout(writeWebUsbBytes(bytes), 10000);
    if (usbOk) return true;

    return false;
  } catch (e) {
    console.error("printThermal:", e);
    if (!quiet) {
      if (e?.message === "PRINT_TIMEOUT") {
        toast.info(messages.printTimeout || "Print timed out.");
      } else if (String(e?.message || "").toLowerCase().includes("network")) {
        toast.info(messages.printerOffline || "Printer offline.");
      }
    }
    return false;
  }
}

async function fetchReceiptPrintStylesheet() {
  if (typeof fetch === "undefined") return "";
  try {
    const res = await fetch(`${window.location.origin}/receipt-print.css`, { cache: "force-cache" });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function embedStylesInReceiptHtml(html, cssText) {
  if (!cssText || !html.includes('href="/receipt-print.css"')) return html;
  return html.replace(
    '<link rel="stylesheet" href="/receipt-print.css"/>',
    `<style>\n${cssText}\n</style>`
  );
}

function injectReceiptQr(html, qrDataUrl, { showBarcode = true } = {}) {
  const empty = '<div class="qr-host" id="receipt-qr"></div>';
  if (showBarcode === false || !qrDataUrl) {
    return html.replace(/<div class="qr-host"[^>]*id="receipt-qr"[^>]*>[\s\S]*?<\/div>/, empty);
  }
  const block = `<div class="qr-host" id="receipt-qr"><img src="${qrDataUrl}" alt="" width="160" height="160" /></div>`;
  return html.replace(/<div class="qr-host"[^>]*id="receipt-qr"[^>]*>[\s\S]*?<\/div>/, block);
}

/**
 * Opens the browser print dialog for a POS receipt (thermal layout).
 * Inlines receipt CSS so print is not blank while stylesheets load; waits for layout before print.
 */
export async function printPDF(receiptData, settings = {}) {
  const showBarcode = settings.showBarcode !== false;
  const paperWidth = settings.paperWidth === "58" ? "58" : "80";

  const receiptMod = await import("@/lib/receipt");
  const { buildReceiptPrintHtml } = receiptMod;

  const payload = String(receiptData.invoiceBarcode || receiptData.invoiceNumber || "").trim();
  let qrDataUrl = "";
  if (showBarcode && payload) {
    try {
      const QRMod = await import("qrcode");
      qrDataUrl = await QRMod.default.toDataURL(payload, {
        margin: 1,
        width: 160,
        errorCorrectionLevel: "M",
      });
    } catch (e) {
      console.warn("Receipt QR skipped:", e);
    }
  }

  let html = buildReceiptPrintHtml(receiptData, { paper: "thermal", paperWidth });
  const cssText = await fetchReceiptPrintStylesheet();
  html = embedStylesInReceiptHtml(html, cssText);
  html = injectReceiptQr(html, qrDataUrl, { showBarcode });

  const iframe = document.createElement("iframe");
  iframe.setAttribute("class", "pos-receipt-print-frame");
  iframe.setAttribute("title", "Receipt");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:420px;max-height:100vh;height:900px;border:0;margin:0;padding:0;opacity:0.01;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("IFRAME_NO_DOCUMENT");
  }
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const removeFrame = () => {
    if (iframe.parentNode) iframe.remove();
  };

  const runPrint = () => {
    if (printed) return;
    printed = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            const w = iframe.contentWindow;
            if (w) {
              w.focus();
              w.print();
            }
          } catch (e) {
            console.error("printPDF:", e);
          } finally {
            setTimeout(removeFrame, 2200);
          }
        }, 100);
      });
    });
  };

  if (doc.readyState === "complete") {
    runPrint();
  } else {
    iframe.onload = () => runPrint();
  }
  setTimeout(() => {
    if (!printed) runPrint();
  }, 600);
}

export async function printReceipt(receiptData, settings, messages = {}, opts = {}) {
  const quiet = !!opts.quietToast;
  console.log("[POS] printReceipt", settings?.printerType, settings?.printerConnection);
  try {
    if (settings.printerType === "PDF") {
      await printPDF(receiptData, settings);
      if (!quiet) toast.success(messages.printOpened || "Receipt ready to print or save as PDF.");
      return;
    }
    const ok = await printThermal(receiptData, settings, messages, { quietToast: quiet });
    if (!ok) {
      if (!quiet) toast.info(messages.thermalFallback || "Thermal printer unavailable — opened print / PDF.");
      await printPDF(receiptData, settings);
      return;
    }
    if (!quiet) toast.success(messages.printSuccess || "Sent to printer.");
  } catch (e) {
    console.error("printReceipt:", e);
    try {
      await printPDF(receiptData, settings);
      if (!quiet) toast.info(messages.thermalFallback || "Opened print dialog as fallback.");
    } catch (e2) {
      console.error("printPDF fallback:", e2);
    }
  }
}

export async function downloadReceiptPdf(receiptData, messages = {}, settings = {}) {
  try {
    await printPDF(receiptData, settings);
    toast.info(messages.downloadPdfHint || "Use your browser print dialog and choose Save as PDF.");
  } catch (e) {
    console.error("downloadReceiptPdf:", e);
    toast.error(messages.printFailed || "Print failed");
  }
}
