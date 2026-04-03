"use client";

import { useMemo, useState, useCallback } from "react";
import { Printer, Eye } from "lucide-react";
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

function displayName(p, lang) {
  if (lang === "ar") return p.nameAr || p.name;
  return p.nameEn || p.name;
}

function stockLabel(p, t) {
  if (p.stock <= 0) return t.inventoryStatusBadgeOut;
  if (p.stock <= p.minStock) return t.inventoryStatusBadgeLow;
  return t.inventoryStatusBadgeOk;
}

function originLabel(p, t) {
  return p.origin === "IMPORTED" ? t.inventoryOriginImportedBadge : t.inventoryOriginLocalBadge;
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
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

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

  const filterLines = useMemo(() => {
    const lines = [];
    const s = getParam("search");
    if (s) lines.push(`${t.inventorySearchPlaceholder}: ${s}`);
    lines.push(`${t.categoriesTab}: ${categoryName}`);
    lines.push(`${t.inventorySupplier}: ${supplierName}`);
    const st = getParam("status") || "all";
    const statusMap = {
      all: t.inventoryStatusAll,
      in: t.adminInventoryInStockFilter,
      low: t.inventoryStatusLow,
      out: t.inventoryStatusOut,
    };
    lines.push(`${t.inventoryColStatus}: ${statusMap[st] || st}`);
    const or = getParam("origin") || "all";
    lines.push(
      `${t.inventoryOriginLabel}: ${
        or === "all" ? t.inventoryOriginAll : or === "IMPORTED" ? t.inventoryOriginImported : t.inventoryOriginLocal
      }`
    );
    lines.push(`${t.sortBy}: ${sortLineLabel(getParam("sort"), t, lang)}`);
    return lines;
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

  const buildPrintableHtml = useCallback(() => {
    const esc = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const dir = isRTL ? "rtl" : "ltr";
    const rows = products
      .map((p) => {
        const name = esc(displayName(p, lang));
        const sku = esc(p.sku || "—");
        const origin = esc(originLabel(p, t));
        const cat = esc(p.category?.name || "—");
        const stock = esc(String(p.stock));
        const minS = esc(String(p.minStock ?? ""));
        const status = esc(stockLabel(p, t));
        const unit = esc(p.unit || "pcs");
        const active = p.isActive
          ? t.inventoryActive
          : t.inventoryInactiveBadge;
        let costCol = "";
        let sellCol = "";
        if (!isCashier) {
          costCol = `<td class="n">${esc(p.purchasePrice != null ? Number(p.purchasePrice).toLocaleString() : "—")}</td>`;
          sellCol = `<td class="n">${esc(p.sellingPrice != null ? Number(p.sellingPrice).toLocaleString() : "—")}</td>`;
        }
        return `<tr>
          <td>${name}</td>
          <td>${sku}</td>
          <td>${origin}</td>
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
      t.inventoryOriginLabel,
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

    const meta = filterLines.map((l) => `<li>${esc(l)}</li>`).join("");

    const style = `
      body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:24px;color:#111;}
      h1{font-size:1.25rem;margin:0 0 8px;}
      .muted{color:#555;font-size:12px;margin-bottom:16px;}
      ul{font-size:11px;margin:0 0 16px;padding-${isRTL ? "right" : "left"}:18px;}
      table{width:100%;border-collapse:collapse;font-size:10px;}
      th,td{border:1px solid #ccc;padding:5px;text-align:${isRTL ? "right" : "left"};vertical-align:top;}
      th{background:#f3f4f6;font-weight:700;}
      td.n{text-align:end;white-space:nowrap;}
      .foot{margin-top:12px;font-size:11px;color:#555;}
    `;

    return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"/><title>${esc(
      title
    )}</title><style>${style}</style></head><body>
      <h1>${esc(title)}</h1>
      <div class="muted">${esc(t.inventoryReportGenerated)}: ${esc(generated)}</div>
      <ul>${meta}</ul>
      <table>${thead}<tbody>${rows}</tbody></table>
      <p class="foot">${esc(pageSummary)}</p>
    </body></html>`;
  }, [
    products,
    lang,
    isRTL,
    t,
    isCashier,
    filterLines,
    generated,
    title,
    pageSummary,
  ]);

  const openPrint = useCallback(() => {
    const html = buildPrintableHtml();
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      toast.error(t.inventoryReportPopupBlocked);
      return;
    }
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
      setTimeout(go, 150);
    } else {
      w.onload = () => setTimeout(go, 150);
    }
  }, [buildPrintableHtml, t]);

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
          className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-start">
            <DialogTitle>{title}</DialogTitle>
            <p className="pt-1 text-sm font-normal text-muted-foreground">
              {t.inventoryReportGenerated}: {generated}
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
            <ul className="mb-4 list-disc text-xs text-muted-foreground ps-4">
              {filterLines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="p-2 text-start font-semibold">{t.inventoryColProduct}</th>
                    <th className="p-2 text-start font-semibold">{t.inventoryColSku}</th>
                    <th className="p-2 text-start font-semibold">{t.inventoryOriginLabel}</th>
                    <th className="p-2 text-start font-semibold">{t.categoriesTab}</th>
                    <th className="p-2 text-end font-semibold">{t.inventoryColStock}</th>
                    <th className="p-2 text-end font-semibold">{t.inventoryColMinStock}</th>
                    <th className="p-2 text-start font-semibold">{t.inventoryColUnit}</th>
                    {!isCashier && (
                      <>
                        <th className="p-2 text-end font-semibold">{t.inventoryCostShort}</th>
                        <th className="p-2 text-end font-semibold">{t.inventorySalePriceShort}</th>
                      </>
                    )}
                    <th className="p-2 text-start font-semibold">{t.inventoryColStatus}</th>
                    <th className="p-2 text-start font-semibold">{t.inventoryReportColStoreStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isCashier ? 9 : 11}
                        className="p-8 text-center text-muted-foreground"
                      >
                        {t.inventoryNoProducts}
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="max-w-[200px] p-2 align-top font-medium">{displayName(p, lang)}</td>
                        <td className="p-2 align-top font-mono text-[11px]">{p.sku || "—"}</td>
                        <td className="p-2 align-top">
                          <span className={cn("inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase")}>
                            {originLabel(p, t)}
                          </span>
                        </td>
                        <td className="p-2 align-top text-muted-foreground">{p.category?.name || "—"}</td>
                        <td className="p-2 align-top text-end tabular-nums">{p.stock}</td>
                        <td className="p-2 align-top text-end tabular-nums">{p.minStock}</td>
                        <td className="p-2 align-top">{p.unit || "pcs"}</td>
                        {!isCashier && (
                          <>
                            <td className="p-2 align-top text-end tabular-nums">
                              {p.purchasePrice != null ? Number(p.purchasePrice).toLocaleString() : "—"}
                            </td>
                            <td className="p-2 align-top text-end tabular-nums">
                              {p.sellingPrice != null ? Number(p.sellingPrice).toLocaleString() : "—"}
                            </td>
                          </>
                        )}
                        <td className="p-2 align-top">{stockLabel(p, t)}</td>
                        <td className="p-2 align-top text-xs">
                          {p.isActive ? t.inventoryActive : t.inventoryInactiveBadge}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{pageSummary}</p>
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
