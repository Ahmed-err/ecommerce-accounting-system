"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useLanguage, useT } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { printHtmlDocument } from "./InventoryReportActions";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };
const ORIGIN_COLORS = { LOCAL: "#16a34a", IMPORTED: "#2563eb" };

function fmtMonth(d, lang) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(lang === "ar" ? "ar-SD" : "en-GB", {
    month: "short",
    year: "2-digit",
  });
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function csvCell(x) {
  return String(x).includes(",") ? `"${String(x).replace(/"/g, '""')}"` : x;
}

export default function InventoryChartsClient({
  receiptValueByMonth = [],
  topByQuantity = [],
  movementByMonth = [],
  originAnalysis,
}) {
  const { lang, isRTL } = useLanguage();
  const t = useT();
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const receiptData = receiptValueByMonth.map((r) => ({
    name: fmtMonth(r.month, lang),
    value: Math.round(r.value),
  }));
  const topData = topByQuantity.map((p) => ({
    name: p.name?.length > 18 ? `${p.name.slice(0, 18)}…` : p.name,
    qty: p.stock,
  }));
  const moveData = movementByMonth.map((r) => ({
    name: fmtMonth(r.month, lang),
    in: r.in,
    out: r.out,
  }));
  const marginData = originAnalysis?.marginChart || [];
  const originLabel = (o) => (o === "IMPORTED" ? t.inventoryOriginImportedBadge : t.inventoryOriginLocalBadge);
  const pies = [
    [originAnalysis?.distribution?.byCount || [], t.inventoryOriginCount],
    [originAnalysis?.distribution?.byValue || [], t.inventoryOriginValue],
    [originAnalysis?.distribution?.byRevenue || [], t.inventoryOriginSales],
  ];

  const importedRows = (originAnalysis?.imported || []).map((r) => {
    const base = Number(r.importedPrice || 0);
    const taxRate = Number(r.importTaxRate || 0);
    const taxAmount = base * (taxRate / 100);
    return {
      ...r,
      label: (lang === "ar" && r.nameAr) || r.name,
      base,
      taxRate,
      taxAmount,
      landed: base + taxAmount,
      totalTax: taxAmount * Number(r.stock || 0),
    };
  });
  const landedTotal = importedRows.reduce((a, r) => a + r.landed * Number(r.stock || 0), 0);

  const exportImportedTaxCsv = () => {
    const headers = ["product", "country", "basePrice", "taxRate", "taxAmount", "landedCost", "qty", "totalTaxPaid"];
    const lines = [
      headers.join(","),
      ...importedRows.map((r) =>
        [r.label, r.countryOfOrigin || "", r.base, r.taxRate, r.taxAmount, r.landed, r.stock, r.totalTax]
          .map(csvCell)
          .join(",")
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `imported-tax-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // The full per-product table lives in the printout, not on the page (owner, 2026-10-14).
  const printImportedTax = () => {
    const head = [
      t.inventoryColProduct,
      t.inventoryCountryOfOrigin,
      t.inventoryImportedPrice,
      t.inventoryImportTaxRate,
      t.inventoryLandedCost,
      t.inventoryColStock,
    ];
    const rows = importedRows
      .map(
        (r) =>
          `<tr><td>${esc(r.label)}</td><td>${esc(r.countryOfOrigin || "—")}</td><td>${fmt(r.base)}</td><td>${fmt(
            r.taxRate
          )}%</td><td>${fmt(r.landed)}</td><td>${r.stock}</td></tr>`
      )
      .join("");
    const title = esc(t.inventoryImportTaxSummaryTitle);
    printHtmlDocument(
      `<!DOCTYPE html><html lang="${lang}" dir="${isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8"/><title>${title}</title>` +
        `<style>body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a}h1{font-size:18px}` +
        `table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #e2e8f0;padding:6px;text-align:start}th{color:#475569}</style>` +
        `</head><body><h1>${title}</h1><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows}</tbody></table></body></html>`
    );
  };

  const empty = (text = t.inventoryNoMovements) => (
    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">{text}</p>
  );

  const card = (title, children) => (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
      <h3 className={cn("mb-4 text-sm font-bold text-foreground", isRTL && "text-right")}>{title}</h3>
      <div className="h-56 w-full min-w-0">{children}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {card(
        t.inventoryChartsReceiptTitle,
        receiptData.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={receiptData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={axisTick} reversed={isRTL} />
              <YAxis tick={axisTick} width={48} orientation={isRTL ? "right" : "left"} tickFormatter={fmt} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          empty()
        )
      )}
      {card(
        t.inventoryChartsTopQtyTitle,
        topData.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={topData} layout="vertical" margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" tick={axisTick} reversed={isRTL} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                orientation={isRTL ? "right" : "left"}
                tick={{ ...axisTick, fontSize: 9 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="qty" name={t.inventoryColStock} fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          empty(t.inventoryNoProducts)
        )
      )}
      {card(
        t.inventoryChartsInOutTitle,
        moveData.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={moveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={axisTick} reversed={isRTL} />
              <YAxis tick={axisTick} width={36} orientation={isRTL ? "right" : "left"} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="in" name={t.inventoryMovementIn} fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name={t.inventoryMovementOut} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          empty()
        )
      )}
      {card(
        t.inventoryOriginMarginTitle,
        marginData.length ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={axisTick} reversed={isRTL} />
              <YAxis tick={axisTick} width={36} orientation={isRTL ? "right" : "left"} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${fmt(v)}%`} />
              <Legend />
              <Bar dataKey="local" name={t.inventoryOriginLocalBadge} fill={ORIGIN_COLORS.LOCAL} />
              <Bar dataKey="imported" name={t.inventoryOriginImportedBadge} fill={ORIGIN_COLORS.IMPORTED} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          empty(t.inventoryNoProducts)
        )
      )}
      {card(
        t.inventoryOriginDistributionTitle,
        <div className="grid h-full grid-cols-3 gap-2">
          {pies.map(([data, label]) => (
            <div key={label} className="flex min-w-0 flex-col items-center">
              <ResponsiveContainer width="100%" height="85%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={data.map((d) => ({ ...d, label: originLabel(d.name) }))}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={24}
                    outerRadius={38}
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={ORIGIN_COLORS[entry.name] || ORIGIN_COLORS.LOCAL} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:p-5">
        <h3 className="text-sm font-bold text-foreground">{t.inventoryImportTaxSummaryTitle}</h3>
        {importedRows.length ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t.inventoryImportedProducts}</dt>
              <dd className="regular-nums font-bold text-foreground">{importedRows.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t.inventoryLandedCost}</dt>
              <dd className="regular-nums whitespace-nowrap font-bold text-foreground">
                {fmt(landedTotal)} {t.currency}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">{t.inventoryImportTaxNone}</p>
        )}
        <div className="mt-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border text-foreground"
            onClick={exportImportedTaxCsv}
            disabled={!importedRows.length}
          >
            {t.inventoryExportCsv}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-border text-foreground"
            onClick={printImportedTax}
            disabled={!importedRows.length}
          >
            {t.inventoryImportTaxPrint}
          </Button>
        </div>
      </div>
    </div>
  );
}
