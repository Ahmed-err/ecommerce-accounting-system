"use client";

import { useMemo, useState, useCallback } from "react";
import { Printer, Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

function printHtmlDocument(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "print");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;inset:0;width:0;height:0;border:0;opacity:0;pointer-events:none;visibility:hidden;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return false;
  }
  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  const runPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error(e);
      cleanup();
    }
  };

  win.addEventListener("afterprint", cleanup);
  const schedule = () => setTimeout(runPrint, 50);
  if (doc.readyState === "complete") {
    schedule();
  } else {
    win.onload = schedule;
  }
  setTimeout(cleanup, 180000);
  return true;
}

function printHtmlInNewWindow(html) {
  const w = window.open("about:blank", "_blank");
  if (!w) return false;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
    const go = () => {
      try {
        w.focus();
        w.print();
      } catch (e) {
        console.error(e);
      }
    };
    if (w.document.readyState === "complete") {
      setTimeout(go, 100);
    } else {
      w.onload = () => setTimeout(go, 100);
    }
  } catch (e) {
    console.error(e);
    w.close();
    return false;
  }
  return true;
}

function displayName(p, lang) {
  if (lang === "ar") return p.nameAr || p.name;
  return p.nameEn || p.name;
}

function stockTier(p) {
  if (p.stock <= 0) return "out";
  if (p.stock <= p.minStock) return "low";
  return "ok";
}

function stockLabel(p, t) {
  const tier = stockTier(p);
  if (tier === "out") return t.inventoryStatusBadgeOut;
  if (tier === "low") return t.inventoryStatusBadgeLow;
  return t.inventoryStatusBadgeOk;
}

function isImportedProduct(p) {
  return p.origin === "IMPORTED";
}

function originLabel(p, t) {
  return isImportedProduct(p) ? t.inventoryOriginImportedBadge : t.inventoryOriginLocalBadge;
}

function originRowsUnitsLine(t, lines, units) {
  return String(t.inventoryReportOriginRowsUnits)
    .replace("{lines}", String(lines))
    .replace("{units}", String(units));
}

function sortLineLabel(sortKey, t, lang) {
  const k = sortKey || "newest";
  const map = {
    newest: t.inventorySortNewest,
    name_asc: t.inventorySortNameAsc,
    name_desc: lang === "ar" ? "الاسم: ي-أ" : "Name: Z-A",
    sku_asc: lang === "ar" ? "SKU تصاعدي" : "SKU A–Z",
    sku_desc: lang === "ar" ? "SKU تنازلي" : "SKU Z–A",
    stock_asc: t.inventorySortStockAsc,
    stock_desc: t.inventorySortStockDesc,
    cost_asc: lang === "ar" ? "التكلفة: من الأقل" : "Cost: Low to high",
    cost_desc: lang === "ar" ? "التكلفة: من الأعلى" : "Cost: High to low",
    price_asc: t.inventorySortPriceAsc,
    price_desc: t.inventorySortPriceDesc,
    minStock_asc: lang === "ar" ? "الحد الأدنى تصاعدي" : "Min stock ↑",
    minStock_desc: lang === "ar" ? "الحد الأدنى تنازلي" : "Min stock ↓",
  };
  return map[k] || k;
}

function usePageStats(products, isCashier) {
  return useMemo(() => {
    let totalUnits = 0;
    let low = 0;
    let out = 0;
    let ok = 0;
    let valueCost = 0;
    let valueRetail = 0;
    let impLines = 0;
    let impUnits = 0;
    let impValueCost = 0;
    let impValueRetail = 0;
    let locLines = 0;
    let locUnits = 0;
    let locValueCost = 0;
    let locValueRetail = 0;
    for (const p of products) {
      const q = Number(p.stock) || 0;
      totalUnits += q;
      const tier = stockTier(p);
      if (tier === "out") out += 1;
      else if (tier === "low") low += 1;
      else ok += 1;
      const imported = isImportedProduct(p);
      if (imported) {
        impLines += 1;
        impUnits += q;
      } else {
        locLines += 1;
        locUnits += q;
      }
      if (!isCashier) {
        const cost = Number(p.purchasePrice) || 0;
        const sell = Number(p.sellingPrice) || 0;
        const extCost = cost * q;
        const extRetail = sell * q;
        valueCost += extCost;
        valueRetail += extRetail;
        if (imported) {
          impValueCost += extCost;
          impValueRetail += extRetail;
        } else {
          locValueCost += extCost;
          locValueRetail += extRetail;
        }
      }
    }
    return {
      lineCount: products.length,
      totalUnits,
      low,
      out,
      ok,
      valueCost,
      valueRetail,
      importedLines: impLines,
      importedUnits: impUnits,
      importedValueCost: impValueCost,
      importedValueRetail: impValueRetail,
      localLines: locLines,
      localUnits: locUnits,
      localValueCost: locValueCost,
      localValueRetail: locValueRetail,
    };
  }, [products, isCashier]);
}

export default function InventoryReportActions({
  products,
  total,
  categories,
  suppliers = [],
  lang,
  isRTL,
  t,
  isCashier,
  getParam,
  currentPage,
  totalPages,
  currency = "",
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const { brandName } = useLanguage();
  const pageStats = usePageStats(products, isCashier);

  const title = t.inventoryReportTitle;

  const categoryName = useMemo(() => {
    const id = getParam("category");
    if (!id || id === "all") return t.inventoryStatusAll;
    const c = categories.find((x) => String(x.id) === String(id));
    return c?.name || id;
  }, [categories, getParam, t]);

  const supplierName = useMemo(() => {
    const id = getParam("supplier");
    if (!id || id === "all") return t.inventoryAllSuppliers;
    const s = suppliers.find((x) => String(x.id) === String(id));
    return s?.name || id;
  }, [suppliers, getParam, t]);

  const filterItems = useMemo(() => {
    const items = [];
    const s = getParam("search");
    if (s) items.push({ k: t.inventorySearchPlaceholder, v: s });
    items.push({ k: t.categoriesTab, v: categoryName });
    items.push({ k: t.inventorySupplier, v: supplierName });
    const st = getParam("status") || "all";
    const statusMap = {
      all: t.inventoryStatusAll,
      in: t.adminInventoryInStockFilter,
      low: t.inventoryStatusLow,
      out: t.inventoryStatusOut,
    };
    items.push({ k: t.inventoryColStatus, v: statusMap[st] || st });
    const or = getParam("origin") || "all";
    items.push({
      k: t.inventoryOriginLabel,
      v:
        or === "all"
          ? t.inventoryOriginAll
          : or === "IMPORTED"
            ? t.inventoryOriginImported
            : t.inventoryOriginLocal,
    });
    items.push({ k: t.sortBy, v: sortLineLabel(getParam("sort"), t, lang) });
    return items;
  }, [getParam, t, categoryName, supplierName, lang]);

  const generated = new Date().toLocaleString(lang === "ar" ? "ar-SD" : "en-US");

  const pageSummary = useMemo(
    () =>
      String(t.inventoryReportPageSummary)
        .replace("{page}", String(currentPage))
        .replace("{pages}", String(totalPages))
        .replace("{total}", String(total)),
    [t, currentPage, totalPages, total]
  );

  const formatMoney = useCallback(
    (n) =>
      `${Math.round(Number(n) || 0).toLocaleString(lang === "ar" ? "ar-SD" : "en-US")} ${currency || ""}`.trim(),
    [lang, currency]
  );

  const reportProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const ai = isImportedProduct(a) ? 0 : 1;
      const bi = isImportedProduct(b) ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return 0;
    });
  }, [products]);

  const buildPrintableHtml = useCallback(() => {
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const dir = isRTL ? "rtl" : "ltr";
    const cur = esc(currency || "");

    const rows = reportProducts
      .map((p) => {
        const name = esc(displayName(p, lang));
        const sku = esc(p.sku || "—");
        const barcode = esc(p.barcode || "—");
        const origin = esc(originLabel(p, t));
        const country = esc(p.countryOfOrigin || "—");
        const cat = esc(p.category?.name || "—");
        const stock = esc(String(p.stock));
        const minS = esc(String(p.minStock ?? ""));
        const unit = esc(p.unit || "pcs");
        const status = esc(stockLabel(p, t));
        const active = p.isActive ? t.inventoryActive : t.inventoryInactiveBadge;
        let costCol = "";
        let sellCol = "";
        if (!isCashier) {
          costCol = `<td class="n">${esc(p.purchasePrice != null ? Number(p.purchasePrice).toLocaleString() : "—")}</td>`;
          sellCol = `<td class="n">${esc(p.sellingPrice != null ? Number(p.sellingPrice).toLocaleString() : "—")}</td>`;
        }
        return `<tr>
          <td>${name}</td>
          <td class="mono">${sku}</td>
          <td class="mono">${barcode}</td>
          <td>${origin}</td>
          <td>${country}</td>
          <td>${cat}</td>
          <td class="n">${stock}</td>
          <td class="n">${minS}</td>
          <td>${unit}</td>
          ${costCol}${sellCol}
          <td>${status}</td>
          <td>${esc(active)}</td>
        </tr>`;
      })
      .join("");

    const headCols = [
      t.inventoryColProduct,
      t.inventoryColSku,
      t.inventoryColBarcode,
      t.inventoryOriginLabel,
      t.inventoryCountryOfOrigin,
      t.categoriesTab,
      t.inventoryColStock,
      t.inventoryColMinStock,
      t.inventoryColUnit,
    ];
    if (!isCashier) {
      headCols.push(t.inventoryCostShort, t.inventorySalePriceShort);
    }
    headCols.push(t.inventoryColStatus, t.inventoryReportColStoreStatus);

    const thead = `<thead><tr>${headCols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;

    const metaRows = filterItems
      .map((it) => `<tr><td class="mk">${esc(it.k)}</td><td>${esc(it.v)}</td></tr>`)
      .join("");

    const sumStock = esc(String(pageStats.totalUnits));
    const footCost = !isCashier
      ? `<td class="n strong">${esc(formatMoney(pageStats.valueCost))}</td><td class="n strong">${esc(formatMoney(pageStats.valueRetail))}</td>`
      : "";
    const tfoot = `<tfoot><tr class="totals-row">
      <td colspan="6" class="strong">${esc(t.inventoryReportTotals)} (${esc(t.inventoryReportThisPage)})</td>
      <td class="n strong">${sumStock}</td>
      <td>—</td>
      <td>—</td>
      ${footCost}
      <td colspan="2">—</td>
    </tr></tfoot>`;

    const importedMoneyPrint = !isCashier
      ? `<div class="ogv"><span class="lb">${esc(t.inventoryCostShort)}:</span> ${esc(formatMoney(pageStats.importedValueCost))} · <span class="lb">${esc(t.inventorySalePriceShort)}:</span> ${esc(formatMoney(pageStats.importedValueRetail))}</div>`
      : "";
    const localMoneyPrint = !isCashier
      ? `<div class="ogv"><span class="lb">${esc(t.inventoryCostShort)}:</span> ${esc(formatMoney(pageStats.localValueCost))} · <span class="lb">${esc(t.inventorySalePriceShort)}:</span> ${esc(formatMoney(pageStats.localValueRetail))}</div>`
      : "";
    const originSection = `
      <h2 class="os-title">${esc(t.inventoryReportByOriginTitle)}</h2>
      <div class="origin-row">
        <div class="og imp">
          <div class="ogh">${esc(t.inventoryOriginImported)}</div>
          <div class="ogm">${esc(originRowsUnitsLine(t, pageStats.importedLines, pageStats.importedUnits))}</div>
          ${importedMoneyPrint}
        </div>
        <div class="og loc">
          <div class="ogh">${esc(t.inventoryOriginLocal)}</div>
          <div class="ogm">${esc(originRowsUnitsLine(t, pageStats.localLines, pageStats.localUnits))}</div>
          ${localMoneyPrint}
        </div>
      </div>`;

    const summaryBox = `
      <div class="summary">
        <div class="sg"><span class="sl">${esc(t.inventoryReportLinesOnPage)}</span><span class="sv">${esc(String(pageStats.lineCount))}</span></div>
        <div class="sg"><span class="sl">${esc(t.inventoryReportSumStock)}</span><span class="sv">${sumStock}</span></div>
        <div class="sg"><span class="sl">${esc(t.inventoryStatusBadgeOk)}</span><span class="sv">${esc(String(pageStats.ok))}</span></div>
        <div class="sg"><span class="sl">${esc(t.inventoryStatusBadgeLow)}</span><span class="sv">${esc(String(pageStats.low))}</span></div>
        <div class="sg"><span class="sl">${esc(t.inventoryStatusBadgeOut)}</span><span class="sv">${esc(String(pageStats.out))}</span></div>
        ${
          !isCashier
            ? `        <div class="sg wide"><span class="sl">${esc(t.inventoryReportTotalCostValue)}</span><span class="sv">${esc(formatMoney(pageStats.valueCost))}</span></div>
               <div class="sg wide"><span class="sl">${esc(t.inventoryReportTotalRetailValue)}</span><span class="sv">${esc(formatMoney(pageStats.valueRetail))}</span></div>`
            : ""
        }
      </div>`;

    const style = `
      @page { margin: 12mm; size: A4 landscape; }
      body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:16px;color:#0f172a;background:#fff;}
      .band{background:linear-gradient(90deg,#f59e0b,#d97706);height:4px;border-radius:2px;margin-bottom:12px;}
      h1{font-size:1.35rem;margin:0 0 4px;color:#0f172a;}
      .sub{font-size:11px;color:#64748b;margin-bottom:14px;}
      .brand{font-weight:700;color:#b45309;}
      .meta{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px;}
      .meta td{padding:4px 8px;border:1px solid #e2e8f0;}
      .meta .mk{font-weight:600;background:#f8fafc;width:28%;color:#475569;}
      .summary{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:16px;}
      .sg{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;background:#fafafa;}
      .sg.wide{grid-column:span 2;}
      .sl{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;}
      .sv{display:block;font-size:14px;font-weight:700;margin-top:2px;}
      table.data{width:100%;border-collapse:collapse;font-size:9px;}
      th,td{border:1px solid #cbd5e1;padding:5px 6px;text-align:${isRTL ? "right" : "left"};vertical-align:top;}
      th{background:#1e293b;color:#fff;font-weight:600;}
      td.mono{font-family:ui-monospace,Menlo,monospace;font-size:8px;}
      td.n{text-align:end;white-space:nowrap;}
      .strong{font-weight:700;}
      tfoot .totals-row td{background:#fffbeb;border-top:2px solid #f59e0b;}
      .foot{margin-top:14px;font-size:10px;color:#64748b;line-height:1.5;}
      .scope{font-size:10px;color:#94a3b8;margin-bottom:10px;padding:8px;background:#f1f5f9;border-radius:6px;}
      .os-title{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin:0 0 8px;font-weight:700;}
      .origin-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
      .og{padding:10px;border-radius:8px;}
      .og.imp{border:1px solid #7dd3fc;background:#f0f9ff;}
      .og.loc{border:1px solid #6ee7b7;background:#ecfdf5;}
      .ogh{font-weight:700;font-size:12px;margin-bottom:6px;color:#0f172a;}
      .ogm{font-size:11px;color:#334155;}
      .ogv{font-size:10px;margin-top:6px;color:#475569;line-height:1.4;}
      .ogv .lb{font-weight:600;}
    `;

    return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/><title>${esc(
      title
    )}</title><style>${style}</style></head><body>
      <div class="band"></div>
      <h1>${esc(title)}</h1>
      <div class="sub"><span class="brand">${esc(brandName || "")}</span> · ${esc(t.inventoryReportGenerated)}: ${esc(generated)}${cur ? ` · ${esc(cur)}` : ""}</div>
      <p class="scope">${esc(t.inventoryReportScopeNote)}</p>
      <table class="meta"><tbody>${metaRows}</tbody></table>
      ${originSection}
      ${summaryBox}
      <table class="data">${thead}<tbody>${rows}</tbody>${tfoot}</table>
      <p class="foot">${esc(pageSummary)}</p>
    </body></html>`;
  }, [
    reportProducts,
    lang,
    isRTL,
    t,
    isCashier,
    filterItems,
    generated,
    title,
    pageSummary,
    pageStats,
    brandName,
    currency,
    formatMoney,
  ]);

  const openPrint = useCallback(() => {
    const html = buildPrintableHtml();
    if (printHtmlDocument(html)) return;
    if (printHtmlInNewWindow(html)) return;
    toast.error(t.inventoryReportPopupBlocked);
  }, [buildPrintableHtml, t]);

  const colCount = isCashier ? 11 : 13;

  const stockBadgeClass = (p) => {
    const tier = stockTier(p);
    return cn(
      "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold",
      tier === "out" && "bg-red-500/15 text-red-400",
      tier === "low" && "bg-amber-500/15 text-amber-400",
      tier === "ok" && "bg-emerald-500/15 text-emerald-400"
    );
  };

  const originBadgeClass = (p) =>
    cn(
      "inline-flex max-w-[9rem] rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-tight",
      isImportedProduct(p)
        ? "border-sky-500/40 bg-sky-500/15 text-sky-200"
        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
    );

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-10 border-white/10 bg-gray-800 text-white"
        onClick={() => setPreviewOpen(true)}
      >
        <Eye className={cn("h-4 w-4 shrink-0", isRTL ? "ms-2" : "me-2")} />
        {t.inventoryReportPreview}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
        onClick={openPrint}
      >
        <Printer className={cn("h-4 w-4 shrink-0", isRTL ? "ms-2" : "me-2")} />
        {t.inventoryReportPrint}
      </Button>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="flex max-h-[92vh] max-w-6xl flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <DialogHeader className="shrink-0 border-b border-amber-500/30 bg-amber-500/5 px-6 py-4 text-start">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg">{title}</DialogTitle>
                <p className="mt-1 text-xs font-semibold text-amber-600/90 dark:text-amber-400/90">
                  {brandName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.inventoryReportGenerated}: {generated}
                  {currency ? ` · ${currency}` : ""}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <p className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {t.inventoryReportScopeNote}
            </p>

            <div className="mb-4 grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {filterItems.map((it, i) => (
                <div key={i} className="min-w-0 rounded-lg bg-background/80 px-3 py-2 text-xs shadow-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {it.k}
                  </span>
                  <span className="mt-0.5 block font-medium text-foreground">{it.v}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t.inventoryReportLinesOnPage}
                </span>
                <p className="text-lg font-black tabular-nums text-foreground">{pageStats.lineCount}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">
                  {t.inventoryReportSumStock}
                </span>
                <p className="text-lg font-black tabular-nums text-foreground">{pageStats.totalUnits}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase text-emerald-600/90 dark:text-emerald-400">
                  {t.inventoryStatusBadgeOk}
                </span>
                <p className="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">{pageStats.ok}</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase text-amber-600/90 dark:text-amber-400">
                  {t.inventoryStatusBadgeLow}
                </span>
                <p className="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400">{pageStats.low}</p>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase text-red-600/90 dark:text-red-400">
                  {t.inventoryStatusBadgeOut}
                </span>
                <p className="text-lg font-black tabular-nums text-red-600 dark:text-red-400">{pageStats.out}</p>
              </div>
              {!isCashier && (
                <>
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {t.inventoryReportTotalCostValue}
                    </span>
                    <p className="text-base font-black tabular-nums text-foreground">
                      {formatMoney(pageStats.valueCost)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card px-3 py-2.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">
                      {t.inventoryReportTotalRetailValue}
                    </span>
                    <p className="text-base font-black tabular-nums text-foreground">
                      {formatMoney(pageStats.valueRetail)}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="mb-4">
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t.inventoryReportByOriginTitle}
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-3">
                  <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
                    {t.inventoryOriginImported}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
                    {originRowsUnitsLine(t, pageStats.importedLines, pageStats.importedUnits)}
                  </p>
                  {!isCashier && (
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground/80">{t.inventoryCostShort}:</span>{" "}
                        {formatMoney(pageStats.importedValueCost)}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground/80">{t.inventorySalePriceShort}:</span>{" "}
                        {formatMoney(pageStats.importedValueRetail)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-3">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {t.inventoryOriginLocal}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
                    {originRowsUnitsLine(t, pageStats.localLines, pageStats.localUnits)}
                  </p>
                  {!isCashier && (
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <p>
                        <span className="font-semibold text-foreground/80">{t.inventoryCostShort}:</span>{" "}
                        {formatMoney(pageStats.localValueCost)}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground/80">{t.inventorySalePriceShort}:</span>{" "}
                        {formatMoney(pageStats.localValueRetail)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[900px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryColProduct}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryColSku}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryColBarcode}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryOriginLabel}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryCountryOfOrigin}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.categoriesTab}</th>
                    <th className="px-2 py-2.5 text-end font-semibold">{t.inventoryColStock}</th>
                    <th className="px-2 py-2.5 text-end font-semibold">{t.inventoryColMinStock}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryColUnit}</th>
                    {!isCashier && (
                      <>
                        <th className="px-2 py-2.5 text-end font-semibold">{t.inventoryCostShort}</th>
                        <th className="px-2 py-2.5 text-end font-semibold">{t.inventorySalePriceShort}</th>
                      </>
                    )}
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryColStatus}</th>
                    <th className="px-2 py-2.5 text-start font-semibold">{t.inventoryReportColStoreStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportProducts.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="p-10 text-center text-muted-foreground">
                        {t.inventoryNoProducts}
                      </td>
                    </tr>
                  ) : (
                    reportProducts.map((p) => (
                      <tr
                        key={p.id}
                        className={cn(
                          "border-b border-border/50 transition-colors hover:bg-muted/30",
                          stockTier(p) === "out" && "bg-red-500/[0.04]",
                          stockTier(p) === "low" && "bg-amber-500/[0.04]"
                        )}
                      >
                        <td className="max-w-[200px] px-2 py-2 align-top font-medium leading-snug">
                          {displayName(p, lang)}
                        </td>
                        <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">
                          {p.sku || "—"}
                        </td>
                        <td className="px-2 py-2 align-top font-mono text-[11px] text-muted-foreground">
                          {p.barcode || "—"}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <span className={originBadgeClass(p)}>{originLabel(p, t)}</span>
                        </td>
                        <td className="px-2 py-2 align-top text-muted-foreground">{p.countryOfOrigin || "—"}</td>
                        <td className="px-2 py-2 align-top text-muted-foreground">{p.category?.name || "—"}</td>
                        <td className="px-2 py-2 align-top text-end tabular-nums font-semibold">{p.stock}</td>
                        <td className="px-2 py-2 align-top text-end tabular-nums">{p.minStock}</td>
                        <td className="px-2 py-2 align-top">{p.unit || "pcs"}</td>
                        {!isCashier && (
                          <>
                            <td className="px-2 py-2 align-top text-end tabular-nums">
                              {p.purchasePrice != null ? Number(p.purchasePrice).toLocaleString() : "—"}
                            </td>
                            <td className="px-2 py-2 align-top text-end tabular-nums">
                              {p.sellingPrice != null ? Number(p.sellingPrice).toLocaleString() : "—"}
                            </td>
                          </>
                        )}
                        <td className="px-2 py-2 align-top">
                          <span className={stockBadgeClass(p)}>{stockLabel(p, t)}</span>
                        </td>
                        <td className="px-2 py-2 align-top text-[11px]">
                          {p.isActive ? (
                            <span className="text-emerald-600 dark:text-emerald-400">{t.inventoryActive}</span>
                          ) : (
                            <span className="text-muted-foreground">{t.inventoryInactiveBadge}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportProducts.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-amber-500/50 bg-amber-500/10">
                      <td colSpan={6} className="px-2 py-2.5 text-start text-xs font-bold uppercase tracking-wide">
                        {t.inventoryReportTotals} ({t.inventoryReportThisPage})
                      </td>
                      <td className="px-2 py-2.5 text-end text-sm font-black tabular-nums">{pageStats.totalUnits}</td>
                      <td className="px-2 py-2.5 text-muted-foreground">—</td>
                      <td className="px-2 py-2.5 text-muted-foreground">—</td>
                      {!isCashier && (
                        <>
                          <td className="px-2 py-2.5 text-end text-sm font-bold tabular-nums">
                            {formatMoney(pageStats.valueCost)}
                          </td>
                          <td className="px-2 py-2.5 text-end text-sm font-bold tabular-nums">
                            {formatMoney(pageStats.valueRetail)}
                          </td>
                        </>
                      )}
                      <td colSpan={2} className="px-2 py-2.5 text-muted-foreground">
                        —
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">{pageSummary}</p>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t border-border px-6 py-4 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              {t.dismiss}
            </Button>
            <Button
              type="button"
              className="bg-amber-500 text-black hover:bg-amber-400"
              onClick={() => {
                setPreviewOpen(false);
                openPrint();
              }}
            >
              <Printer className={cn("h-4 w-4", isRTL ? "ms-2" : "me-2")} />
              {t.inventoryReportPrint}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
