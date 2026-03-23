"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Static data for layout demonstration purposes
const data = [
  { name: "الإثنين", revenue: 4000 },
  { name: "الثلاثاء", revenue: 3000 },
  { name: "الأربعاء", revenue: 2000 },
  { name: "الخميس", revenue: 2780 },
  { name: "الجمعة", revenue: 1890 },
  { name: "السبت", revenue: 2390 },
  { name: "الأحد", revenue: 3490 },
];

export default function DashboardCharts() {
  return (
    <div className="h-[350px] w-full px-4" dir="rtl">
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
            reversed={true} // RTL
          />
          <YAxis 
            orientation="right" // RTL
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value.toLocaleString()} ج.س`}
            dx={10}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#ffffff10", color: "#f8fafc", borderRadius: "8px", textAlign: "right" }}
            itemStyle={{ color: "#f59e0b" }}
            formatter={(value) => [`${value.toLocaleString()} ج.س`, "الإيرادات"]}
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
