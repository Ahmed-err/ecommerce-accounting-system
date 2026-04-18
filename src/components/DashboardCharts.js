"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
  itemStyle: { color: "#f59e0b" },
};

export default function DashboardCharts({ chartData }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  const data = chartData && chartData.length > 0 ? chartData : [
    { name: "—", revenue: 0 },
  ];
  return (
    <div className="h-[350px] w-full px-4" dir={isRTL ? "rtl" : "ltr"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: -20,
            left: 10,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            dy={10}
            reversed={isRTL}
          />
          <YAxis
            orientation={isRTL ? "right" : "left"}
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toLocaleString()} ${t.currency}`}
            dx={isRTL ? 10 : -10}
          />
          <Tooltip
            {...CHART_TOOLTIP}
            contentStyle={{ ...CHART_TOOLTIP.contentStyle, textAlign: isRTL ? "right" : "left" }}
            formatter={(value) => [`${value.toLocaleString()} ${t.currency}`, lang === "ar" ? "الإيرادات" : "Revenue"]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#f59e0b"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
