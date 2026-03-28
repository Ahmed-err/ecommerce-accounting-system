"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, ShoppingBag, Activity } from "lucide-react";
import DashboardCharts from "@/components/DashboardCharts";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/lib/translations";

export default function DashboardClient({ 
  totalUsers, 
  totalOrders, 
  revenue, 
  recentOrders,
  changes = {},
  chartData = [],
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {t.adminOverview}
        </h1>
        <p className="text-gray-400 text-sm">
          {t.adminWelcomeBack}
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {t.adminTotalRevenue}
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">
              {revenue.toLocaleString()} {t.currency}
            </div>
            <p className={`text-xs mt-1 font-medium ${changes.revenue?.startsWith("+") ? "text-emerald-500" : "text-red-400"}`}>
              {changes.revenue || "—"} {t.adminFromLastMonth}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {t.adminTotalCustomers}
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">{totalUsers}</div>
            <p className={`text-xs mt-1 font-medium ${changes.customers?.startsWith("+") ? "text-blue-500" : "text-red-400"}`}>
              {changes.customers || "—"} {t.adminFromLastMonth}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {t.adminTotalOrders}
            </CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">{totalOrders}</div>
            <p className={`text-xs mt-1 font-medium ${changes.orders?.startsWith("+") ? "text-amber-500" : "text-red-400"}`}>
              {changes.orders || "—"} {t.adminFromLastMonth}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {t.adminActiveNow}
            </CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">—</div>
            <p className="text-xs text-gray-500 mt-1">
              {t.adminSinceLastHour}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Main Chart Section */}
        <Card className="bg-gray-900 border-white/5 lg:col-span-4 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">
              {t.adminRevenueOverview}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {t.adminTransactionTrends}
            </CardDescription>
          </CardHeader>
          <CardContent className="pr-0 pb-4">
            <DashboardCharts chartData={chartData} />
          </CardContent>
        </Card>

        {/* Recent Orders Section */}
        <Card className="bg-gray-900 border-white/5 lg:col-span-3 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">
              {t.adminRecentOrders}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {lang === 'ar' ? 'آخر 5 طلبات تم تقديمها.' : 'Latest 5 orders placed.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-xl border border-white/5 border-dashed">
                  <ShoppingBag className="h-8 w-8 text-gray-500 mb-2 opacity-50" />
                  <p className="text-sm text-gray-400 font-medium">
                    {t.adminNoRecentOrders}
                  </p>
                </div>
              ) : (
                recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-white/5 rounded-lg p-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || t.adminKnownCustomer}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{order.user?.email || order.guestEmail}</p>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                      <p className="text-sm font-bold text-emerald-400 regular-nums">
                        {order.totalAmount.toLocaleString()} {t.currency}
                      </p>
                      <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'} gap-1 mt-1`}>
                        <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded leading-none">
                          {order.status === 'DELIVERED' ? t.adminStatusDelivered :
                           order.status === 'CANCELLED' ? t.adminStatusCancelled : t.adminStatusPending}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
