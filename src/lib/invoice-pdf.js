import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

/**
 * Server-only: A4 invoice PDF aligned with the admin / customer invoice view.
 */
export function generateInvoicePdfBuffer(receipt) {
  const L = receipt.labels || {};
  const lang = receipt.lang === "ar" ? "ar" : "en";
  const isRTL = !!receipt.isRTL;
  const chunks = [];

  const fontPath = path.join(process.cwd(), "src", "fonts", "NotoSansArabic-Regular.ttf");
  const hasArabicFont = fs.existsSync(fontPath);

  const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });

  if (hasArabicFont) {
    doc.registerFont("InvBody", fontPath);
  }

  const body = hasArabicFont && lang === "ar" ? "InvBody" : "Helvetica";
  const bold = hasArabicFont && lang === "ar" ? "InvBody" : "Helvetica-Bold";

  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.once("end", () => resolve(Buffer.concat(chunks)));
    doc.once("error", reject);
  });

  const money = (n) =>
    `${Number(n).toLocaleString(lang === "ar" ? "ar-SD" : "en-US", { maximumFractionDigits: 2 })} ${receipt.currency}`;

  const { left, width: pageInnerW } = { left: doc.page.margins.left, width: doc.page.width - doc.page.margins.left - doc.page.margins.right };
  const right = left + pageInnerW;

  const textBlock = (text, opts = {}) => {
    const { size = 9, color = "#111827", font = body, align = isRTL ? "right" : "left", width = pageInnerW } = opts;
    doc.font(font).fontSize(size).fillColor(color);
    const x = align === "right" ? right - width : left;
    doc.text(text || "", x, doc.y, { width, align });
  };

  doc.font(bold).fontSize(22).fillColor("#0f172a");
  textBlock(receipt.storeName || "—", { size: 22, font: bold, align: isRTL ? "right" : "left" });

  doc.moveDown(0.3);
  textBlock(receipt.documentLabel || L.documentTitle || "", { size: 10, color: "#64748b", font: body });

  if (receipt.storeAddress) {
    doc.moveDown(0.2);
    textBlock(receipt.storeAddress, { size: 9, color: "#475569" });
  }
  if (receipt.storePhone) {
    doc.moveDown(0.15);
    textBlock(receipt.storePhone, { size: 9, color: "#475569" });
  }
  if (receipt.vatNumber) {
    doc.moveDown(0.15);
    textBlock(`${L.vatReg || "VAT"}: ${receipt.vatNumber}`, { size: 9, color: "#475569" });
  }

  doc.moveDown(0.8);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.moveDown(0.6);

  textBlock(`${L.invoiceNo || "Invoice"}: ${receipt.invoiceNumber}`, { font: bold, size: 10 });
  doc.moveDown(0.25);
  textBlock(`${L.orderRef || "Order"}: ${receipt.orderRef || "—"}`, { size: 9 });
  doc.moveDown(0.2);
  textBlock(`${L.date || "Date"}: ${receipt.date} · ${receipt.time}`, { size: 9 });
  doc.moveDown(0.2);
  textBlock(`${L.cashier || "Cashier"}: ${receipt.cashierName}`, { size: 9 });

  doc.moveDown(0.7);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.moveDown(0.5);

  textBlock(L.billTo || "Bill to", { font: bold, size: 10, color: "#334155" });
  doc.moveDown(0.3);
  if (receipt.customerName) {
    textBlock(`${L.customer}: ${receipt.customerName}`, { size: 9 });
    doc.moveDown(0.15);
  }
  if (receipt.customerPhone) {
    textBlock(`${L.phone}: ${receipt.customerPhone}`, { size: 9 });
    doc.moveDown(0.15);
  }
  if (receipt.customerEmail) {
    textBlock(`${L.email}: ${receipt.customerEmail}`, { size: 9 });
    doc.moveDown(0.15);
  }
  if (receipt.customerAddress) {
    textBlock(`${L.address}: ${receipt.customerAddress}`, { size: 9 });
    doc.moveDown(0.15);
  }
  if (receipt.customerCity) {
    textBlock(`${L.city}: ${receipt.customerCity}`, { size: 9 });
    doc.moveDown(0.15);
  }

  doc.moveDown(0.6);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.moveDown(0.45);

  textBlock(`${L.item || "Item"} · ${L.qty || "Qty"} · ${L.unitPrice || "Price"} · ${L.lineTotal || "Line"}`, {
    font: bold,
    size: 8,
    color: "#64748b",
  });
  doc.moveDown(0.35);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
  doc.moveDown(0.4);

  doc.font(body).fontSize(9).fillColor("#0f172a");
  for (const it of receipt.items || []) {
    const lineStr = `${it.name}${it.sku ? ` · ${L.sku} ${it.sku}` : ""}\n${it.qty} × ${money(it.unitPrice)} → ${money(it.subtotal)}`;
    textBlock(lineStr, { size: 9 });
    doc.moveDown(0.35);
    if (doc.y > doc.page.height - 160) {
      doc.addPage();
    }
  }

  doc.moveDown(0.4);
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#e2e8f0").lineWidth(1).stroke();
  doc.moveDown(0.5);

  const totX = isRTL ? left : right - 220;
  const totW = 220;
  doc.font(body).fontSize(9).fillColor("#334155");
  doc.text(`${L.subtotal}: ${money(receipt.subtotal)}`, totX, doc.y, { width: totW, align: "right" });
  doc.moveDown(0.3);
  if (receipt.discount > 0) {
    doc.text(`${L.discount}: −${money(receipt.discount)}`, totX, doc.y, { width: totW, align: "right" });
    doc.moveDown(0.3);
  }
  if (receipt.shipping > 0) {
    doc.text(`${L.shipping}: ${money(receipt.shipping)}`, totX, doc.y, { width: totW, align: "right" });
    doc.moveDown(0.3);
  }
  if (receipt.tax > 0) {
    const taxL =
      receipt.taxPercent != null ? `${receipt.taxLabel} (${receipt.taxPercent}%)` : receipt.taxLabel;
    doc.text(`${taxL}: ${money(receipt.tax)}`, totX, doc.y, { width: totW, align: "right" });
    doc.moveDown(0.3);
  }

  doc.font(bold).fontSize(12).fillColor("#0f172a");
  doc.text(`${L.total}: ${money(receipt.total)}`, totX, doc.y, { width: totW, align: "right" });
  doc.moveDown(0.6);

  doc.font(body).fontSize(9).fillColor("#334155");
  textBlock(`${L.payment}: ${receipt.paymentMethod}`, { size: 9 });

  if (receipt.qrImage && String(receipt.qrImage).startsWith("data:image")) {
    doc.moveDown(0.6);
    try {
      const m = receipt.qrImage.match(/^data:image\/(\w+);base64,(.+)$/);
      if (m) {
        const buf = Buffer.from(m[2], "base64");
        const sz = 96;
        const cx = (left + right) / 2 - sz / 2;
        doc.image(buf, cx, doc.y, { width: sz });
        doc.moveDown(3.2);
      }
    } catch {
      /* ignore */
    }
  }

  doc.moveDown(0.8);
  doc.font(body).fontSize(8).fillColor("#64748b");
  if (receipt.footerTextAr) {
    doc.text(receipt.footerTextAr, left, doc.y, {
      width: pageInnerW,
      align: lang === "ar" ? "right" : "center",
    });
    doc.moveDown(0.2);
  }
  if (receipt.footerTextEn) {
    doc.text(receipt.footerTextEn, left, doc.y, { width: pageInnerW, align: "left" });
  }

  doc.end();
  return done;
}
