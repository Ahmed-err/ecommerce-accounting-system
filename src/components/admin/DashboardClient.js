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
  statsLabelPrefix 
}) {
  const { lang, isRTL } = useLanguage();
  const t = translations[lang];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRTL ? 'text-right font-arabic' : 'text-left font-sans'}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          {isRTL ? 'نظرة عامة على لوحة التحكم' : 'Dashboard Overview'}
        </h1>
        <p className="text-gray-400 text-sm">
          {isRTL ? 'مرحباً بعودتك! قم بتحليل أداء متجرك والأنشطة الأخيرة أدناه.' : 'Welcome back! Analyze your store performance and recent activities below.'}
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">
              {revenue.toLocaleString()} {isRTL ? 'ج.س' : 'SDG'}
            </div>
            <p className="text-xs text-emerald-500 mt-1 font-medium">
              {isRTL ? '+20.1% من الشهر الماضي' : '+20.1% from last month'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {isRTL ? 'إجمالي العملاء' : 'Total Customers'}
            </CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">{totalUsers}</div>
            <p className="text-xs text-blue-500 mt-1 font-medium">
              {isRTL ? '+18.1% من الشهر الماضي' : '+18.1% from last month'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {isRTL ? 'إجمالي الطلبات' : 'Total Orders'}
            </CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">{totalOrders}</div>
            <p className="text-xs text-amber-500 mt-1 font-medium">
              {isRTL ? '+19% من الشهر الماضي' : '+19% from last month'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              {isRTL ? 'نشط الآن' : 'Active Now'}
            </CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white regular-nums">+12</div>
            <p className="text-xs text-gray-500 mt-1">
              {isRTL ? 'منذ الساعة الماضية' : 'Since last hour'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Main Chart Section */}
        <Card className="bg-gray-900 border-white/5 lg:col-span-4 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">
              {isRTL ? 'نظرة عامة على الإيرادات' : 'Revenue Overview'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isRTL ? 'عرض اتجاهات المعاملات لآخر 7 أيام.' : 'Transaction trends for the last 7 days.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pr-0 pb-4">
            <DashboardCharts />
          </CardContent>
        </Card>

        {/* Recent Orders Section */}
        <Card className="bg-gray-900 border-white/5 lg:col-span-3 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">
              {isRTL ? 'الطلبات الأخيرة' : 'Recent Orders'}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {isRTL ? 'آخر 5 طلبات تم تقديمها.' : 'Lates 5 orders placed.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-xl border border-white/5 border-dashed">
                  <ShoppingBag className="h-8 w-8 text-gray-500 mb-2 opacity-50" />
                  <p className="text-sm text-gray-400 font-medium">
                    {isRTL ? 'لا توجد طلبات حديثة بعد.' : 'No recent orders yet.'}
                  </p>
                </div>
              ) : (
                recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-white/5 rounded-lg p-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{order.user?.firstName ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || (isRTL ? 'عميل معروف' : 'Known Customer')}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">{order.user?.email || order.guestEmail}</p>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                      <p className="text-sm font-bold text-emerald-400 regular-nums">
                        {order.totalAmount.toLocaleString()} {isRTL ? 'ج.س' : 'SDG'}
                      </p>
                      <div className={`flex flex-col ${isRTL ? 'items-start' : 'items-end'} gap-1 mt-1`}>
                        <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded leading-none">
                          {order.status === 'DELIVERED' ? (isRTL ? 'تم التوصيل' : 'Delivered') :
                           order.status === 'CANCELLED' ? (isRTL ? 'ملغي' : 'Cancelled') : (isRTL ? 'قيد الانتظار' : 'Pending')}
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
