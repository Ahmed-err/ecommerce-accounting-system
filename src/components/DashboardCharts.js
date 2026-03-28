"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

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
            right: -20, // adjust standard right offset for RTL
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
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
            reversed={isRTL}
          />
          <YAxis 
            orientation={isRTL ? "right" : "left"}
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value.toLocaleString()} ${t.currency}`}
            dx={isRTL ? 10 : -10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#ffffff10", color: "#f8fafc", borderRadius: "8px", textAlign: isRTL ? "right" : "left" }}
            itemStyle={{ color: "#f59e0b" }}
            formatter={(value) => [`${value.toLocaleString()} ${t.currency}`, lang === 'ar' ? "الإيرادات" : "Revenue"]}
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
