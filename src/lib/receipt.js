/**
 * POS receipt data + ESC/POS generation (browser) + invoice HTML (thermal / A4).
 */

import { PAYMENT_METHODS } from "@/lib/constants";

export function resolvePaymentMethodLabel(methodId, lang) {
  const id = String(methodId || "").trim();
  const hit = PAYMENT_METHODS.find((x) => x.id === id);
  if (hit) return lang === "ar" ? hit.arName : hit.enName;
  const legacy = {
    CASH: { ar: "نقدي", en: "Cash" },
    CARD: { ar: "بطاقة", en: "Card" },
    CREDIT: { ar: "آجل", en: "Credit" },
  };
  if (legacy[id]) return lang === "ar" ? legacy[id].ar : legacy[id].en;
  if (id) return id;
  return lang === "ar" ? "غير محدد" : "—";
}

export function getInvoiceLabels(isAr) {
  if (isAr) {
    return {
      documentTitle: "فاتورة ضريبية",
      invoiceNo: "رقم الفاتورة",
      orderRef: "مرجع الطلب",
      date: "التاريخ",
      time: "الوقت",
      cashier: "أمين الصندوق",
      customer: "العميل",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      address: "العنوان",
      city: "المدينة",
      billTo: "بيانات العميل",
      fromStore: "بيانات المتجر",
      sku: "رمز SKU",
      item: "الصنف",
      qty: "الكمية",
      unitPrice: "سعر الوحدة",
      lineTotal: "المبلغ",
      subtotal: "المجموع الفرعي",
      discount: "الخصم",
      shipping: "الشحن",
      tax: "الضريبة",
      total: "الإجمالي المستحق",
      payment: "طريقة الدفع",
      vatReg: "الرقم الضريبي",
      tendered: "المبلغ المستلم",
      change: "الباقي",
    };
  }
  return {
    documentTitle: "Tax invoice",
    invoiceNo: "Invoice no.",
    orderRef: "Order ref.",
    date: "Date",
    time: "Time",
    cashier: "Cashier",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    billTo: "Bill to",
    fromStore: "From",
    sku: "SKU",
    item: "Item",
    qty: "Qty",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    tax: "Tax",
    total: "Total due",
    payment: "Payment method",
    vatReg: "VAT registration no.",
    tendered: "Tendered",
    change: "Change",
  };
}

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
  const footerAr = store.receiptFooterAr?.trim() || "شكراً لتسوقكم معنا.";
  const footerEn = store.receiptFooterEn?.trim() || "Thank you for shopping with us.";

  const pay = receiptFromServer.paymentMethod || "CASH";
  const paymentLabel = resolvePaymentMethodLabel(pay, lang);

  const items = (receiptFromServer.items || []).map((it) => ({
    name: isAr
      ? (it.nameAr || it.name || it.nameEn || "")
      : (it.nameEn || it.name || it.nameAr || ""),
    sku: it.sku || "",
    qty: it.qty,
    unitPrice: it.unitPrice,
    subtotal: it.subtotal,
  }));

  const labels = getInvoiceLabels(isAr);

  const d = receiptFromServer.createdAt ? new Date(receiptFromServer.createdAt) : new Date();
  const shipping = Number(receiptFromServer.shippingAmount || 0);
  const orderRef = receiptFromServer.orderRef || receiptFromServer.orderId || "";
  const hasTax = Number(receiptFromServer.taxAmount || 0) > 0;
  const defaultDocumentLabel = isAr
    ? hasTax
      ? "فاتورة ضريبية"
      : "فاتورة"
    : hasTax
      ? "Tax invoice"
      : "Invoice";
  const documentLabel = receiptFromServer.documentLabel || defaultDocumentLabel;

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
    customerEmail: receiptFromServer.guestEmail || "",
    customerAddress: receiptFromServer.guestAddress || "",
    customerCity: receiptFromServer.guestCity || "",
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
    labels,
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
  const L = data.labels || getInvoiceLabels(data.lang === "ar");

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
    printer.text(padLine(`${L.tendered}:`, money(data.amountTendered), width));
    printer.newLine();
  }
  if (data.change != null && !Number.isNaN(data.change) && data.change >= 0) {
    printer.text(padLine(`${L.change}:`, money(data.change), width));
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
  printer.text(data.footerTextAr);
  printer.newLine();
  printer.text(data.footerTextEn);
  printer.newLine();
  printer.newLine();
  printer.cut(false);

  return printer.getData();
}

export function buildReceiptInnerHtml(data, { paper = "thermal", paperWidth = "80" } = {}) {
  const L = data.labels || getInvoiceLabels(data.lang === "ar");
  const money = (n) =>
    `${Number(n).toLocaleString(data.lang === "ar" ? "ar-SD" : "en-US", { maximumFractionDigits: 2 })} ${data.currency}`;

  if (paper === "a4") {
    const rows = (data.items || [])
      .map(
        (it) =>
          `<tr>
            <td class="inv-desc">${escapeHtml(it.name)}${it.sku ? `<span class="inv-sku">${escapeHtml(L.sku)} ${escapeHtml(it.sku)}</span>` : ""}</td>
            <td class="inv-qty n">${it.qty}</td>
            <td class="inv-unit n">${money(it.unitPrice)}</td>
            <td class="inv-line n">${money(it.subtotal)}</td>
          </tr>`
      )
      .join("");

    const logoBlock = data.storeLogo
      ? `<div class="inv-logo"><img src="${escapeHtml(data.storeLogo)}" alt="" crossorigin="anonymous" /></div>`
      : "";

    const taxRow =
      data.tax > 0
        ? `<div class="inv-tot-row"><span>${escapeHtml(data.taxPercent != null ? `${data.taxLabel} (${data.taxPercent}%)` : data.taxLabel)}</span><span class="n">${money(data.tax)}</span></div>`
        : "";

    return `<div class="receipt-paper receipt-paper--a4 invoice-pro" id="invoice-print-root" dir="${data.isRTL ? "rtl" : "ltr"}" lang="${data.lang === "ar" ? "ar" : "en"}">
  <header class="inv-header">
    <div class="inv-brand">
      ${logoBlock}
      <div class="inv-brand-text">
        <h1 class="inv-store-name">${escapeHtml(data.storeName)}</h1>
        <p class="inv-doc-title">${escapeHtml(data.documentLabel || L.documentTitle)}</p>
      </div>
    </div>
    <div class="inv-meta-card">
      <div class="inv-meta-row"><span>${escapeHtml(L.invoiceNo)}</span><strong class="n">${escapeHtml(data.invoiceNumber)}</strong></div>
      ${data.orderRef ? `<div class="inv-meta-row"><span>${escapeHtml(L.orderRef)}</span><span class="n">${escapeHtml(data.orderRef)}</span></div>` : ""}
      <div class="inv-meta-row"><span>${escapeHtml(L.date)}</span><span class="n">${escapeHtml(data.date)} · ${escapeHtml(data.time)}</span></div>
      <div class="inv-meta-row"><span>${escapeHtml(L.cashier)}</span><span class="n">${escapeHtml(data.cashierName)}</span></div>
    </div>
  </header>

  <section class="inv-addresses">
    <div class="inv-box">
      <h2>${escapeHtml(L.billTo)}</h2>
      ${data.customerName ? `<p><strong>${escapeHtml(L.customer)}</strong> ${escapeHtml(data.customerName)}</p>` : ""}
      ${data.customerPhone ? `<p><strong>${escapeHtml(L.phone)}</strong> ${escapeHtml(data.customerPhone)}</p>` : ""}
      ${data.customerEmail ? `<p><strong>${escapeHtml(L.email)}</strong> ${escapeHtml(data.customerEmail)}</p>` : ""}
      ${data.customerAddress ? `<p><strong>${escapeHtml(L.address)}</strong> ${escapeHtml(data.customerAddress)}</p>` : ""}
      ${data.customerCity ? `<p><strong>${escapeHtml(L.city)}</strong> ${escapeHtml(data.customerCity)}</p>` : ""}
    </div>
    <div class="inv-box inv-box-muted">
      <h2>${escapeHtml(L.fromStore)}</h2>
      ${data.storeAddress ? `<p>${escapeHtml(data.storeAddress)}</p>` : ""}
      ${data.storePhone ? `<p>${escapeHtml(data.storePhone)}</p>` : ""}
      ${data.vatNumber ? `<p><strong>${escapeHtml(L.vatReg)}</strong> ${escapeHtml(data.vatNumber)}</p>` : ""}
    </div>
  </section>

  <table class="inv-lines">
    <thead>
      <tr>
        <th>${escapeHtml(L.item)}</th>
        <th class="n">${escapeHtml(L.qty)}</th>
        <th class="n">${escapeHtml(L.unitPrice)}</th>
        <th class="n">${escapeHtml(L.lineTotal)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="inv-totals">
    <div class="inv-tot-inner">
      <div class="inv-tot-row"><span>${escapeHtml(L.subtotal)}</span><span class="n">${money(data.subtotal)}</span></div>
      ${data.discount > 0 ? `<div class="inv-tot-row inv-discount"><span>${escapeHtml(L.discount)}</span><span class="n">−${money(data.discount)}</span></div>` : ""}
      ${data.shipping > 0 ? `<div class="inv-tot-row"><span>${escapeHtml(L.shipping)}</span><span class="n">${money(data.shipping)}</span></div>` : ""}
      ${taxRow}
      <div class="inv-tot-row inv-grand"><span>${escapeHtml(L.total)}</span><span class="n">${money(data.total)}</span></div>
      <div class="inv-tot-row inv-pay"><span>${escapeHtml(L.payment)}</span><span class="n">${escapeHtml(data.paymentMethod)}</span></div>
      ${data.amountTendered != null ? `<div class="inv-tot-row"><span>${escapeHtml(L.tendered)}</span><span class="n">${money(data.amountTendered)}</span></div>` : ""}
      ${data.change != null ? `<div class="inv-tot-row"><span>${escapeHtml(L.change)}</span><span class="n">${money(data.change)}</span></div>` : ""}
    </div>
  </div>

  ${data.qrImage ? `<div class="inv-qr"><img src="${escapeHtml(data.qrImage)}" alt="" width="120" height="120" /></div>` : ""}

  <footer class="inv-footer-bilingual">
    <p class="footer-ar" dir="rtl">${escapeHtml(data.footerTextAr)}</p>
    <p class="footer-en" dir="ltr">${escapeHtml(data.footerTextEn)}</p>
  </footer>
</div>`;
  }

  const rows = (data.items || [])
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.name)}</td><td class="n">${it.qty}</td><td class="n">${money(it.unitPrice)}</td><td class="n">${money(it.subtotal)}</td></tr>`
    )
    .join("");
  const logoBlock = data.storeLogo
    ? `<div class="logo"><img src="${escapeHtml(data.storeLogo)}" alt="" crossorigin="anonymous" /></div>`
    : "";

  const thermalPaperClass = paperWidth === "58" ? "paper-58" : "";
  return `<div class="receipt-paper receipt-paper--thermal ${thermalPaperClass}" id="pos-receipt-print" dir="${data.isRTL ? "rtl" : "ltr"}" lang="${data.lang === "ar" ? "ar" : "en"}">
  ${logoBlock}
  <div class="h1">${escapeHtml(data.storeName)}</div>
  <div class="muted">${escapeHtml(data.documentLabel || L.documentTitle)}</div>
  <div class="muted">${escapeHtml(data.storeAddress)}</div>
  <div class="muted">${escapeHtml(data.storePhone)}</div>
  ${data.vatNumber ? `<div class="muted">${escapeHtml(L.vatReg)}: ${escapeHtml(data.vatNumber)}</div>` : ""}
  <hr/>
  <div class="row"><span>${escapeHtml(L.invoiceNo)}</span><span class="n">${escapeHtml(data.invoiceNumber)}</span></div>
  ${data.orderRef ? `<div class="row"><span>${escapeHtml(L.orderRef)}</span><span class="n">${escapeHtml(data.orderRef)}</span></div>` : ""}
  <div class="row"><span>${escapeHtml(L.date)}</span><span class="n">${escapeHtml(data.date)} ${escapeHtml(data.time)}</span></div>
  <div class="row"><span>${escapeHtml(L.cashier)}</span><span class="n">${escapeHtml(data.cashierName)}</span></div>
  <hr/>
  <div class="row"><span>${escapeHtml(L.customer)}</span><span class="n">${escapeHtml(data.customerName)}</span></div>
  <div class="row"><span>${escapeHtml(L.phone)}</span><span class="n">${escapeHtml(data.customerPhone)}</span></div>
  ${data.customerEmail ? `<div class="row"><span>${escapeHtml(L.email)}</span><span class="n">${escapeHtml(data.customerEmail)}</span></div>` : ""}
  <hr/>
  <table class="items"><thead><tr><th>${escapeHtml(L.item)}</th><th class="n">${escapeHtml(L.qty)}</th><th class="n">${escapeHtml(L.unitPrice)}</th><th class="n">${escapeHtml(L.lineTotal)}</th></tr></thead><tbody>${rows}</tbody></table>
  <hr/>
  <div class="row"><span>${escapeHtml(L.subtotal)}</span><span class="n">${money(data.subtotal)}</span></div>
  ${data.discount > 0 ? `<div class="row"><span>${escapeHtml(L.discount)}</span><span class="n">-${money(data.discount)}</span></div>` : ""}
  ${data.shipping > 0 ? `<div class="row"><span>${escapeHtml(L.shipping)}</span><span class="n">${money(data.shipping)}</span></div>` : ""}
  ${data.tax > 0 ? `<div class="row"><span>${escapeHtml(data.taxLabel)}</span><span class="n">${money(data.tax)}</span></div>` : ""}
  <div class="row total"><span>${escapeHtml(L.total)}</span><span class="n">${money(data.total)}</span></div>
  <hr/>
  <div class="row"><span>${escapeHtml(L.payment)}</span><span class="n">${escapeHtml(data.paymentMethod)}</span></div>
  ${data.amountTendered != null ? `<div class="row"><span>${escapeHtml(L.tendered)}</span><span class="n">${money(data.amountTendered)}</span></div>` : ""}
  ${data.change != null ? `<div class="row"><span>${escapeHtml(L.change)}</span><span class="n">${money(data.change)}</span></div>` : ""}
  <div class="qr-host" id="receipt-qr">${data.qrImage ? `<img src="${escapeHtml(data.qrImage)}" alt="" width="160" height="160" />` : ""}</div>
  <hr/>
  <footer class="footer footer-bilingual"><p dir="rtl">${escapeHtml(data.footerTextAr)}</p><p dir="ltr">${escapeHtml(data.footerTextEn)}</p></footer>
</div>`;
}

export function buildReceiptPrintHtml(data, options = {}) {
  const inner = buildReceiptInnerHtml(data, options);
  const title = options.paper === "a4" ? "Invoice" : "Receipt";
  const mode = options.paper === "a4" ? "receipt-root--a4" : "receipt-root--thermal";
  return `<!DOCTYPE html><html lang="${data.lang}" dir="${data.isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><link rel="stylesheet" href="/receipt-print.css"/><title>${title}</title></head><body class="receipt-root ${mode}">${inner}</body></html>`;
}

export function buildReceiptMarkup(data, options = {}) {
  return buildReceiptInnerHtml(data, options);
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
