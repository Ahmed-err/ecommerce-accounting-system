/**
 * POS receipt data + ESC/POS generation (browser).
 */

export function pickPrinterFieldsFromStore(store) {
  if (!store) return null;
  return {
    printerType: store.posPrinterType === "PDF" ? "PDF" : "THERMAL",
    printerConnection: store.posPrinterConnection === "BLUETOOTH" ? "BLUETOOTH" : "USB",
    autoPrint: store.posPrinterAutoPrint !== false,
    paperWidth: store.posPrinterPaperWidth === "58" ? "58" : "80",
    receiptFooterAr: store.posReceiptFooterAr || "",
    receiptFooterEn: store.posReceiptFooterEn || "",
    showLogo: store.posReceiptShowLogo !== false,
    showBarcode: store.posReceiptShowBarcode !== false,
    vatLabelAr: store.vatLabelAr || "",
    vatLabelEn: store.vatLabelEn || "",
    vatPercentage:
      store.vatPercentage != null
        ? typeof store.vatPercentage?.toNumber === "function"
          ? store.vatPercentage.toNumber()
          : Number(store.vatPercentage)
        : null,
    vatEnabled: !!store.vatEnabled,
    nameAr: store.nameAr || "",
    nameEn: store.nameEn || "",
    addressAr: store.addressAr || "",
    addressEn: store.addressEn || "",
    logoUrl: store.logoUrl || "",
    contactPhone: store.contactPhone || "",
    currency: store.currency || "SDG",
  };
}

/**
 * @param {object} params
 * @param {object} params.receiptFromServer - createPOSOrder receipt payload
 * @param {ReturnType<typeof pickPrinterFieldsFromStore>} params.store
 * @param {{ name?: string|null, email?: string|null }} params.cashier
 * @param {string} params.lang - "ar" | "en"
 * @param {number} params.subtotalBeforeDiscount
 * @param {"percent"|"fixed"} params.discountType
 * @param {number|null|undefined} params.amountTendered
 * @param {number|null|undefined} params.change
 */
export function buildReceiptData({
  receiptFromServer,
  store,
  cashier,
  lang,
  subtotalBeforeDiscount,
  discountType,
  amountTendered,
  change,
}) {
  const isAr = lang === "ar";
  const storeName = isAr ? store.nameAr : store.nameEn;
  const storeAddress = isAr ? store.addressAr : store.addressEn;
  const taxLabel =
    store.vatEnabled && (isAr ? store.vatLabelAr : store.vatLabelEn)
      ? isAr
        ? store.vatLabelAr
        : store.vatLabelEn
      : isAr
        ? "ضريبة"
        : "Tax";
  const footerAr =
    store.receiptFooterAr?.trim() ||
    (isAr ? "شكراً لتسوقكم معنا" : "Thank you for your purchase");
  const footerEn =
    store.receiptFooterEn?.trim() ||
    (isAr ? "Thank you for your purchase" : "شكراً لتسوقكم معنا");

  const pay = receiptFromServer.paymentMethod || "CASH";
  const paymentLabel =
    pay === "CARD" ? (isAr ? "بطاقة" : "Card") : pay === "CREDIT" ? (isAr ? "آجل" : "Credit") : isAr ? "نقدي" : "Cash";

  const items = (receiptFromServer.items || []).map((it) => ({
    name: it.name,
    sku: it.sku || "",
    qty: it.qty,
    unitPrice: it.unitPrice,
    subtotal: it.subtotal,
  }));

  const d = receiptFromServer.createdAt ? new Date(receiptFromServer.createdAt) : new Date();
  const shipping = Number(receiptFromServer.shippingAmount || 0);
  const orderRef = receiptFromServer.orderRef || receiptFromServer.orderId || "";
  const documentLabel =
    receiptFromServer.documentLabel || (isAr ? "فاتورة ضريبية" : "Tax Invoice");

  return {
    storeName,
    storeAddress: storeAddress || "",
    storePhone: store.contactPhone || "",
    storeLogo: store.showLogo ? store.logoUrl || "" : "",
    invoiceNumber: receiptFromServer.invoiceNumber || receiptFromServer.orderId?.slice(-8) || "",
    date: d.toLocaleDateString(isAr ? "ar-SD" : "en-US"),
    time: d.toLocaleTimeString(isAr ? "ar-SD" : "en-US", { hour: "2-digit", minute: "2-digit" }),
    cashierName: cashier?.name || cashier?.email || (isAr ? "كاشير" : "Cashier"),
    customerName: receiptFromServer.guestName || "",
    customerPhone: receiptFromServer.guestPhone || "",
    orderRef,
    documentLabel,
    items,
    subtotal: Number(subtotalBeforeDiscount ?? 0),
    shipping,
    discount: Number(receiptFromServer.discountAmount || 0),
    discountType: discountType === "percent" ? "percent" : "fixed",
    tax: Number(receiptFromServer.taxAmount || 0),
    taxLabel,
    taxPercent: store.vatPercentage,
    total: Number(receiptFromServer.totalAmount || 0),
    paymentMethod: paymentLabel,
    amountTendered: amountTendered != null ? Number(amountTendered) : null,
    change: change != null ? Number(change) : null,
    footerTextAr: footerAr,
    footerTextEn: footerEn,
    invoiceBarcode: String(receiptFromServer.invoiceNumber || receiptFromServer.orderId || ""),
    vatNumber: receiptFromServer.vatNumber || "",
    qrImage: receiptFromServer.qrImage || "",
    currency: store.currency || "SDG",
    lang,
    isRTL: isAr,
  };
}

function padLine(left, right, width) {
  const L = String(left);
  const R = String(right);
  const space = Math.max(1, width - L.length - R.length);
  return L + " ".repeat(space) + R;
}

function wrapText(str, width) {
  const s = String(str || "").replace(/\r\n/g, "\n");
  const lines = [];
  for (const paragraph of s.split("\n")) {
    let rest = paragraph;
    while (rest.length > width) {
      lines.push(rest.slice(0, width));
      rest = rest.slice(width);
    }
    lines.push(rest);
  }
  return lines;
}

async function loadLogoImageData(url, maxWidth) {
  if (typeof document === "undefined" || !url) return null;
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) return null;
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / bmp.width);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * @param {Awaited<ReturnType<typeof buildReceiptData>>} data
 * @param {{ paperWidth: "58"|"80", showBarcode: boolean, showLogo?: boolean }} settings
 */
export async function buildEscPosReceipt(data, settings) {
  const { getPrinter } = await import("@react-thermal-printer/printer");
  const width = settings.paperWidth === "58" ? 32 : 42;
  const cs = data.lang === "ar" ? "wpc1256_arabic" : "pc437_usa";
  const printer = getPrinter({ type: "epson", characterSet: cs });

  const money = (n) =>
    `${Number(n).toLocaleString(data.lang === "ar" ? "ar-SD" : "en-US", { maximumFractionDigits: 2 })} ${data.currency}`;

  printer.initialize();
  if (settings.showLogo !== false && data.storeLogo) {
    try {
      const maxW = settings.paperWidth === "58" ? 280 : 384;
      const img = await loadLogoImageData(data.storeLogo, maxW);
      if (img?.width && img?.height && img.data) {
        printer.setAlign("center");
        printer.image(img);
        printer.newLine();
      }
    } catch (e) {
      console.warn("Receipt logo skipped:", e);
    }
  }
  printer.setAlign("center");
  printer.setTextBold(true);
  printer.text(data.storeName);
  printer.newLine();
  printer.setTextBold(false);
  if (data.storeAddress) {
    wrapText(data.storeAddress, width).forEach((ln) => {
      printer.text(ln);
      printer.newLine();
    });
  }
  if (data.storePhone) {
    printer.text(data.storePhone);
    printer.newLine();
  }
  printer.setAlign("left");
  printer.text("-".repeat(width));
  printer.newLine();
  printer.text(padLine(`${data.lang === "ar" ? "فاتورة" : "Invoice"}:`, data.invoiceNumber, width));
  printer.newLine();
  printer.text(padLine(data.lang === "ar" ? "التاريخ:" : "Date:", data.date, width));
  printer.newLine();
  printer.text(padLine(data.lang === "ar" ? "الوقت:" : "Time:", data.time, width));
  printer.newLine();
  printer.text(
    padLine(data.lang === "ar" ? "الكاشير:" : "Cashier:", data.cashierName.slice(0, 18), width)
  );
  printer.newLine();
  printer.text("-".repeat(width));
  printer.newLine();
  if (data.customerName) {
    printer.text(`${data.lang === "ar" ? "العميل" : "Customer"}: ${data.customerName}`);
    printer.newLine();
  }
  if (data.customerPhone) {
    printer.text(`${data.lang === "ar" ? "الهاتف" : "Phone"}: ${data.customerPhone}`);
    printer.newLine();
  }
  printer.text("-".repeat(width));
  printer.newLine();
  printer.setTextBold(true);
  printer.text(data.lang === "ar" ? "الصنف          العدد   السعر" : "ITEM           QTY  PRICE");
  printer.newLine();
  printer.setTextBold(false);
  printer.text("-".repeat(width));
  printer.newLine();

  for (const it of data.items) {
    const nameLines = wrapText(it.name, width - 14);
    nameLines.forEach((line, i) => {
      if (i === nameLines.length - 1) {
        const q = String(it.qty);
        const p = money(it.unitPrice);
        const tail = `${q} ${p}`.slice(0, 12);
        printer.text(padLine(line.slice(0, width - tail.length - 1), tail, width));
      } else {
        printer.text(line);
      }
      printer.newLine();
    });
    printer.text(padLine(" ", money(it.subtotal), width));
    printer.newLine();
  }

  printer.text("-".repeat(width));
  printer.newLine();
  printer.text(padLine(data.lang === "ar" ? "المجموع الفرعي:" : "Subtotal:", money(data.subtotal), width));
  printer.newLine();
  if (data.discount > 0) {
    printer.text(
      padLine(
        data.discountType === "percent"
          ? data.lang === "ar"
            ? "خصم %:"
            : "Disc %:"
          : data.lang === "ar"
            ? "خصم:"
            : "Discount:",
        `-${money(data.discount)}`,
        width
      )
    );
    printer.newLine();
  }
  if (data.tax > 0) {
    const lbl =
      data.taxPercent != null ? `${data.taxLabel} (${data.taxPercent}%)` : data.taxLabel;
    printer.text(padLine(lbl + ":", money(data.tax), width));
    printer.newLine();
  }
  printer.setTextBold(true);
  printer.text(padLine(data.lang === "ar" ? "الإجمالي:" : "TOTAL:", money(data.total), width));
  printer.newLine();
  printer.setTextBold(false);
  printer.text("-".repeat(width));
  printer.newLine();
  printer.text(padLine(data.lang === "ar" ? "الدفع:" : "Payment:", data.paymentMethod, width));
  printer.newLine();
  if (data.amountTendered != null && !Number.isNaN(data.amountTendered)) {
    printer.text(padLine(data.lang === "ar" ? "المستلم:" : "Tendered:", money(data.amountTendered), width));
    printer.newLine();
  }
  if (data.change != null && !Number.isNaN(data.change) && data.change >= 0) {
    printer.text(padLine(data.lang === "ar" ? "الباقي:" : "Change:", money(data.change), width));
    printer.newLine();
  }
  printer.text("-".repeat(width));
  printer.newLine();

  if (settings.showBarcode && data.invoiceBarcode) {
    try {
      printer.setAlign("center");
      printer.qrcode(data.invoiceBarcode, { cellSize: 4, correction: "M" });
      printer.newLine();
      printer.text(data.invoiceNumber);
      printer.newLine();
      printer.setAlign("left");
    } catch {
      /* ignore QR failure */
    }
  }

  printer.setAlign("center");
  printer.text(data.footerTextEn);
  printer.newLine();
  printer.text(data.footerTextAr);
  printer.newLine();
  printer.newLine();
  printer.cut(false);

  return printer.getData();
}

export function buildReceiptPrintHtml(data) {
  const money = (n) =>
    `${Number(n).toLocaleString(data.lang === "ar" ? "ar-SD" : "en-US", { maximumFractionDigits: 2 })} ${data.currency}`;
  const rows = (data.items || [])
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.name)}</td><td class="n">${it.qty}</td><td class="n">${money(it.unitPrice)}</td><td class="n">${money(it.subtotal)}</td></tr>`
    )
    .join("");
  const logoBlock =
    data.storeLogo
      ? `<div class="logo"><img src="${escapeHtml(data.storeLogo)}" alt="" crossorigin="anonymous" /></div>`
      : "";
  const markup = `<div class="receipt-paper" id="pos-receipt-print">
  ${logoBlock}
  <div class="h1">${escapeHtml(data.storeName)}</div>
  <div class="muted">${escapeHtml(data.documentLabel || (data.lang === "ar" ? "فاتورة ضريبية" : "Tax Invoice"))}</div>
  <div class="muted">${escapeHtml(data.storeAddress)}</div>
  <div class="muted">${escapeHtml(data.storePhone)}</div>
  ${data.vatNumber ? `<div class="muted">${data.lang === "ar" ? "الرقم الضريبي" : "VAT"}: ${escapeHtml(data.vatNumber)}</div>` : ""}
  <hr/>
  <div class="row"><span>${data.lang === "ar" ? "فاتورة" : "Invoice"}</span><span class="n">${escapeHtml(data.invoiceNumber)}</span></div>
  ${data.orderRef ? `<div class="row"><span>${data.lang === "ar" ? "مرجع الطلب" : "Order Ref"}</span><span class="n">${escapeHtml(data.orderRef)}</span></div>` : ""}
  <div class="row"><span>${data.lang === "ar" ? "التاريخ" : "Date"}</span><span class="n">${escapeHtml(data.date)} ${escapeHtml(data.time)}</span></div>
  <div class="row"><span>${data.lang === "ar" ? "كاشير" : "Cashier"}</span><span class="n">${escapeHtml(data.cashierName)}</span></div>
  <hr/>
  <div class="row"><span>${data.lang === "ar" ? "عميل" : "Customer"}</span><span class="n">${escapeHtml(data.customerName)}</span></div>
  <div class="row"><span>${data.lang === "ar" ? "هاتف" : "Phone"}</span><span class="n">${escapeHtml(data.customerPhone)}</span></div>
  <hr/>
  <table class="items"><thead><tr><th>${data.lang === "ar" ? "الصنف" : "Item"}</th><th class="n">Qty</th><th class="n">${data.lang === "ar" ? "سعر" : "Price"}</th><th class="n">${data.lang === "ar" ? "المجموع" : "Line"}</th></tr></thead><tbody>${rows}</tbody></table>
  <hr/>
  <div class="row"><span>${data.lang === "ar" ? "المجموع الفرعي" : "Subtotal"}</span><span class="n">${money(data.subtotal)}</span></div>
  ${data.discount > 0 ? `<div class="row"><span>${data.lang === "ar" ? "خصم" : "Discount"}</span><span class="n">-${money(data.discount)}</span></div>` : ""}
  ${data.shipping > 0 ? `<div class="row"><span>${data.lang === "ar" ? "الشحن" : "Shipping"}</span><span class="n">${money(data.shipping)}</span></div>` : ""}
  ${data.tax > 0 ? `<div class="row"><span>${escapeHtml(data.taxLabel)}</span><span class="n">${money(data.tax)}</span></div>` : ""}
  <div class="row total"><span>${data.lang === "ar" ? "الإجمالي" : "TOTAL"}</span><span class="n">${money(data.total)}</span></div>
  <hr/>
  <div class="row"><span>${data.lang === "ar" ? "الدفع" : "Payment"}</span><span class="n">${escapeHtml(data.paymentMethod)}</span></div>
  ${data.amountTendered != null ? `<div class="row"><span>${data.lang === "ar" ? "المستلم" : "Tendered"}</span><span class="n">${money(data.amountTendered)}</span></div>` : ""}
  ${data.change != null ? `<div class="row"><span>${data.lang === "ar" ? "الباقي" : "Change"}</span><span class="n">${money(data.change)}</span></div>` : ""}
  <div class="qr-host" id="receipt-qr">${data.qrImage ? `<img src="${escapeHtml(data.qrImage)}" alt="" width="160" height="160" />` : ""}</div>
  <hr/>
  <div class="footer">${escapeHtml(data.footerTextEn)}<br/>${escapeHtml(data.footerTextAr)}</div>
</div>`;
  return `<!DOCTYPE html><html lang="${data.lang}" dir="${data.isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><link rel="stylesheet" href="/receipt-print.css"/><title>Receipt</title></head><body class="receipt-root">${markup}</body></html>`;
}

export function buildReceiptMarkup(data) {
  const html = buildReceiptPrintHtml(data);
  const start = html.indexOf("<div class=\"receipt-paper\"");
  const end = html.lastIndexOf("</div></body></html>");
  if (start === -1 || end === -1) return "";
  return html.slice(start, end + 6);
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
