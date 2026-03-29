"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Store,
  Monitor,
  ShoppingBag,
  UserPlus,
  Package,
  AlertTriangle,
  Plus,
  FileText,
  Truck,
  Clock3,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

const PIE_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#14b8a6"];

function timeAgo(iso, lang) {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return lang === "ar" ? "الآن" : "now";
  if (diff < 3600) return lang === "ar" ? `منذ ${Math.floor(diff / 60)} د` : `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return lang === "ar" ? `منذ ${Math.floor(diff / 3600)} س` : `${Math.floor(diff / 3600)}h ago`;
  return lang === "ar" ? `منذ ${Math.floor(diff / 86400)} ي` : `${Math.floor(diff / 86400)}d ago`;
}

function statusClass(status) {
  if (status === "DELIVERED") return "bg-emerald-500/15 text-emerald-400";
  if (status === "SHIPPED") return "bg-blue-500/15 text-blue-400";
  if (status === "CANCELLED") return "bg-red-500/15 text-red-400";
  if (status === "PROCESSING") return "bg-violet-500/15 text-violet-400";
  return "bg-amber-500/15 text-amber-300";
}

const KPI_ICONS = {
  totalRevenue: DollarSign,
  storeRevenue: Store,
  posRevenue: Monitor,
  totalOrders: ShoppingBag,
  newCustomers: UserPlus,
  avgOrderValue: DollarSign,
  totalProducts: Package,
  lowStock: AlertTriangle,
};

export default function DashboardClient({ data, filters }) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];
  const kpiLabels = {
    totalRevenue: lang === "ar" ? "إجمالي الإيراد" : "Total Revenue",
    storeRevenue: lang === "ar" ? "إيراد المتجر" : "Online Store Revenue",
    posRevenue: lang === "ar" ? "إيراد نقطة البيع" : "POS Revenue",
    totalOrders: lang === "ar" ? "إجمالي الطلبات" : "Total Orders",
    newCustomers: lang === "ar" ? "عملاء جدد" : "New Customers",
    avgOrderValue: lang === "ar" ? "متوسط قيمة الطلب" : "Average Order Value",
    totalProducts: lang === "ar" ? "إجمالي المنتجات" : "Total Products",
    lowStock: lang === "ar" ? "مخزون منخفض" : "Low Stock Items",
  };

  return (
    <div className={`space-y-6 ${isRTL ? "text-right font-arabic" : "text-left font-sans"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{t.adminOverview}</h1>
          <p className="text-gray-400 text-sm">{t.adminWelcomeBack}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["today", "week", "month"].map((r) => (
            <Link key={r} href={`/admin?range=${r}&view=${filters.view}`}>
              <Button size="sm" variant={filters.range === r ? "default" : "outline"} className={filters.range === r ? "bg-amber-500 text-black" : "border-white/10 bg-gray-800 text-white"}>
                {r}
              </Button>
            </Link>
          ))}
          <Link href={`/admin?range=${filters.range}&view=${filters.view === "monthly" ? "weekly" : "monthly"}`}>
            <Button size="sm" variant="outline" className="border-white/10 bg-gray-800 text-white">
              {filters.view === "monthly" ? (lang === "ar" ? "أسبوعي" : "Weekly") : (lang === "ar" ? "شهري" : "Monthly")}
            </Button>
          </Link>
          <Button size="sm" onClick={() => window.print()} className="bg-amber-500 text-black hover:bg-amber-600">
            {lang === "ar" ? "تصدير PDF" : "Export PDF"}
          </Button>
        </div>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => {
          const Icon = KPI_ICONS[k.id] || DollarSign;
          const up = k.change >= 0;
          return (
            <motion.div key={k.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Link href={k.href}>
                <Card className="bg-gray-900 border-white/5 rounded-2xl hover:border-amber-500/30 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-400">{kpiLabels[k.id]}</CardTitle>
                    <Icon className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white regular-nums">
                      {["totalOrders", "newCustomers", "totalProducts", "lowStock"].includes(k.id)
                        ? Number(k.value).toLocaleString()
                        : `${Number(k.value).toLocaleString()} ${t.currency}`}
                    </div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-emerald-400" : "text-red-400"}`}>
                      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      <span>{k.change}%</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <Card className="bg-gray-900 border-white/5 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-white">{lang === "ar" ? "اتجاه الإيرادات" : "Revenue Trend"}</CardTitle>
          <CardDescription className="text-gray-400">{lang === "ar" ? "المتجر مقابل نقطة البيع" : "Store vs POS over time"}</CardDescription>
        </CardHeader>
        <CardContent className="h-[330px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chart}>
              <defs>
                <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #ffffff22" }} />
              <Area type="monotone" dataKey="total" fill="url(#totalFill)" stroke="transparent" />
              <Line type="monotone" dataKey="store" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pos" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">{lang === "ar" ? "أحدث الطلبات" : "Recent Orders"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentOrders.map((o) => (
              <Link href={`/admin/orders/${o.id}`} key={o.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.05]">
                <div>
                  <p className="font-semibold text-white">#{o.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">{o.customer} - {timeAgo(o.createdAt, lang)}</p>
                </div>
                <div className={isRTL ? "text-left" : "text-right"}>
                  <div className="text-sm font-bold text-emerald-400">{o.total.toLocaleString()} {t.currency}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={o.source === "POS" ? "bg-blue-500/15 text-blue-300" : "bg-violet-500/15 text-violet-300"}>{o.source}</Badge>
                    <Badge className={statusClass(o.status)}>{o.status}</Badge>
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/admin/orders" className="inline-flex text-xs text-amber-400 hover:text-amber-300">{lang === "ar" ? "عرض كل الطلبات" : "View all orders"}</Link>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">{lang === "ar" ? "الأكثر مبيعاً" : "Top Selling Products"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topProducts.map((p) => (
              <div key={p.productId} className="flex items-center justify-between rounded-lg border border-white/5 p-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-bold text-amber-500">{p.rank}</span>
                  <span className="text-sm text-white">{p.name}</span>
                </div>
                <div className={isRTL ? "text-left" : "text-right"}>
                  <p className="text-xs text-gray-400">{p.unitsSold} {lang === "ar" ? "وحدة" : "units"}</p>
                  <p className="text-xs text-emerald-400">{p.revenue.toLocaleString()} {t.currency}</p>
                </div>
              </div>
            ))}
            <Link href="/admin/inventory" className="inline-flex text-xs text-amber-400 hover:text-amber-300">{lang === "ar" ? "عرض المخزون" : "View inventory"}</Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">{lang === "ar" ? "المبيعات حسب الفئة" : "Sales by Category"}</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.salesByCategory} dataKey="revenue" nameKey="name" outerRadius={80}>
                  {data.salesByCategory.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">{lang === "ar" ? "توزيع حالات الطلب" : "Order Status Distribution"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.statusDistribution.map((s) => (
              <div key={s.status} className="flex items-center justify-between rounded border border-white/10 p-2 text-sm">
                <span className="text-gray-300">{s.status}</span>
                <span className="font-bold text-white">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader><CardTitle className="text-white">{lang === "ar" ? "إجراءات سريعة" : "Quick Actions"}</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/admin/inventory?action=add"><Button className="w-full justify-start bg-gray-800 text-white hover:bg-gray-700"><Plus className="h-4 w-4 me-2" />{lang === "ar" ? "إضافة منتج" : "Add Product"}</Button></Link>
            <Link href="/pos"><Button className="w-full justify-start bg-gray-800 text-white hover:bg-gray-700"><Monitor className="h-4 w-4 me-2" />{lang === "ar" ? "طلب نقطة بيع جديد" : "New POS Order"}</Button></Link>
            <Link href="/admin/accounting?tab=expenses"><Button className="w-full justify-start bg-gray-800 text-white hover:bg-gray-700"><DollarSign className="h-4 w-4 me-2" />{lang === "ar" ? "إضافة مصروف" : "Add Expense"}</Button></Link>
            <Link href="/admin/accounting?tab=reports"><Button className="w-full justify-start bg-gray-800 text-white hover:bg-gray-700"><FileText className="h-4 w-4 me-2" />{lang === "ar" ? "عرض التقارير" : "View Reports"}</Button></Link>
            <Link href="/admin/orders"><Button className="w-full justify-start bg-gray-800 text-white hover:bg-gray-700"><Truck className="h-4 w-4 me-2" />{lang === "ar" ? "إدارة الطلبات" : "Manage Orders"}</Button></Link>
            <Link href="/admin/inventory?filter=low"><Button className="w-full justify-start bg-amber-500 text-black hover:bg-amber-600"><AlertTriangle className="h-4 w-4 me-2" />{lang === "ar" ? "تنبيه المخزون المنخفض" : "Low Stock Alert"} ({data.quick.lowStockCount})</Button></Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader><CardTitle className="text-white">{lang === "ar" ? "سجل النشاط" : "Recent Activity"}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.activity.map((a) => (
              <div key={a.id} className="flex items-start justify-between rounded border border-white/10 p-2">
                <div className="flex items-start gap-2">
                  <Clock3 className="h-4 w-4 mt-0.5 text-amber-500" />
                  <div>
                    <p className="text-sm text-white">{a.action}</p>
                    <p className="text-xs text-gray-500">{a.details || ""}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{timeAgo(a.createdAt, lang)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-white/5 rounded-2xl">
          <CardHeader><CardTitle className="text-white">{lang === "ar" ? "ملخص مالي" : "Financial Summary"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs"><span className="text-gray-400">{lang === "ar" ? "الإيراد" : "Revenue"}</span><span className="text-emerald-400">{data.finance.revenue.toLocaleString()} {t.currency}</span></div>
              <div className="h-2 rounded bg-white/10"><div className="h-2 rounded bg-emerald-500" style={{ width: "100%" }} /></div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs"><span className="text-gray-400">{lang === "ar" ? "المصاريف" : "Expenses"}</span><span className="text-red-400">{data.finance.expenses.toLocaleString()} {t.currency}</span></div>
              <div className="h-2 rounded bg-white/10"><div className="h-2 rounded bg-red-500" style={{ width: `${Math.min(100, data.finance.revenue ? (data.finance.expenses / data.finance.revenue) * 100 : 0)}%` }} /></div>
            </div>
            <div className="rounded border border-white/10 p-3">
              <p className="text-xs text-gray-400">{lang === "ar" ? "صافي الربح" : "Net Profit"}</p>
              <p className={`text-xl font-bold ${data.finance.net >= 0 ? "text-emerald-400" : "text-red-400"}`}>{data.finance.net.toLocaleString()} {t.currency}</p>
            </div>
            <Link href="/admin/accounting" className="inline-flex text-xs text-amber-400 hover:text-amber-300">{lang === "ar" ? "تقرير كامل" : "Full report"}</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
