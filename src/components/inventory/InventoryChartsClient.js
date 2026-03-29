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
} from "recharts";
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
    </div>
  );
}
