"use client";

import { motion } from "framer-motion";
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
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

function fmtMonth(d, lang) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(lang === "ar" ? "ar-SD" : "en-GB", {
    month: "short",
    year: "2-digit",
  });
}

export default function InventoryChartsClient({
  receiptValueByMonth = [],
  topByQuantity = [],
  movementByMonth = [],
  originAnalysis,
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

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
  const distCount = originAnalysis?.distribution?.byCount || [];
  const distValue = originAnalysis?.distribution?.byValue || [];
  const distRevenue = originAnalysis?.distribution?.byRevenue || [];
  const importedRows = originAnalysis?.imported || [];
  const exportImportedTaxCsv = () => {
    const headers = ["product", "country", "basePrice", "taxRate", "taxAmount", "landedCost", "qty", "totalTaxPaid"];
    const lines = [
      headers.join(","),
      ...importedRows.map((r) => {
        const base = Number(r.importedPrice || 0);
        const taxRate = Number(r.importTaxRate || 0);
        const taxAmount = base * (taxRate / 100);
        const landed = base + taxAmount;
        const totalTax = taxAmount * Number(r.stock || 0);
        return [r.name, r.countryOfOrigin || "", base, taxRate, taxAmount, landed, r.stock, totalTax]
          .map((x) => (String(x).includes(",") ? `"${String(x).replace(/"/g, '""')}"` : x))
          .join(",");
      }),
    ];
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `imported-tax-summary-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const card = (title, children, delay) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl border border-white/5 bg-gray-900 p-4 md:p-5"
    >
      <h3
        className={cn(
          "mb-4 text-sm font-bold text-white",
          isRTL && "text-right"
        )}
      >
        {title}
      </h3>
      <div className="h-56 w-full min-w-0">{children}</div>
    </motion.div>
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {card(
        t.inventoryChartsReceiptTitle,
        receiptData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={receiptData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-gray-500">
            {t.inventoryNoMovements}
          </p>
        ),
        0
      )}
      {card(
        t.inventoryChartsTopQtyTitle,
        topData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topData} layout="vertical" margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "#9ca3af", fontSize: 9 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="qty" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-gray-500">—</p>
        ),
        0.08
      )}
      {card(
        t.inventoryChartsInOutTitle,
        moveData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={moveData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
              />
              <Legend />
              <Bar dataKey="in" name={t.inventoryMovementIn} fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name={t.inventoryMovementOut} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-gray-500">
            {t.inventoryNoMovements}
          </p>
        ),
        0.16
      )}
      {card(
        t.inventoryOriginMarginTitle,
        marginData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="category" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="local" name={t.inventoryOriginLocal} fill="#16a34a" />
              <Bar dataKey="imported" name={t.inventoryOriginImported} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-gray-500">{t.inventoryNoMovements}</p>
        ),
        0.24
      )}
      {card(
        t.inventoryOriginDistributionTitle,
        <div className="grid h-full grid-cols-3 gap-2">
          {[distCount, distValue, distRevenue].map((data, idx) => (
            <ResponsiveContainer width="100%" height="100%" key={idx}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={24} outerRadius={38}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.name === "LOCAL" ? "#16a34a" : "#2563eb"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ))}
        </div>,
        0.3
      )}
      <div className="rounded-2xl border border-white/5 bg-gray-900 p-4 md:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{t.inventoryImportTaxSummaryTitle}</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/10 text-white" onClick={exportImportedTaxCsv}>
              {t.inventoryExportCsv}
            </Button>
            <Button size="sm" variant="outline" className="border-white/10 text-white" onClick={() => window.print()}>
              {t.accExportPdf}
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-gray-300">
            <thead>
              <tr className="text-gray-400">
                <th className="py-1 text-left">{t.inventoryColProduct}</th>
                <th className="py-1 text-left">{t.inventoryCountryOfOrigin}</th>
                <th className="py-1 text-left">{t.inventoryImportedPrice}</th>
                <th className="py-1 text-left">{t.inventoryImportTaxRate}</th>
                <th className="py-1 text-left">{t.inventoryLandedCost}</th>
                <th className="py-1 text-left">{t.inventoryColStock}</th>
              </tr>
            </thead>
            <tbody>
              {importedRows.map((r) => {
                const landed = Number(r.importedPrice || 0) * (1 + Number(r.importTaxRate || 0) / 100);
                return (
                  <tr key={r.id} className="border-t border-white/5">
                    <td className="py-1">{r.name}</td>
                    <td className="py-1">{r.countryOfOrigin || "-"}</td>
                    <td className="py-1">{Number(r.importedPrice || 0).toFixed(2)}</td>
                    <td className="py-1">{Number(r.importTaxRate || 0).toFixed(2)}%</td>
                    <td className="py-1">{landed.toFixed(2)}</td>
                    <td className="py-1">{r.stock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
