import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/admin/DashboardClient";

export const dynamic = "force-dynamic";

function calcChange(current, previous) {
  if (!previous || previous === 0) return current > 0 ? "+100%" : "0%";
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export default async function AdminDashboard() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalCustomers,
    totalOrders,
    incomingTx,
    outgoingTx,
    recentOrders,
    ordersThisMonth,
    ordersLastMonth,
    customersThisMonth,
    customersLastMonth,
    revenueThisMonth,
    revenueLastMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count(),
    prisma.transaction.aggregate({ where: { type: "INCOMING" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "OUTGOING" }, _sum: { amount: true } }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: true } }),
    prisma.order.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.order.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: thisMonthStart } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
    prisma.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { amount: true } }),
  ]);

  const revenue = Number(incomingTx._sum.amount || 0) - Number(outgoingTx._sum.amount || 0);

  const changes = {
    revenue: calcChange(Number(revenueThisMonth._sum.amount || 0), Number(revenueLastMonth._sum.amount || 0)),
    customers: calcChange(customersThisMonth, customersLastMonth),
    orders: calcChange(ordersThisMonth, ordersLastMonth),
  };

  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(d);
  }

  const dayNames = { en: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], ar: ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"] };
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";

  const chartData = await Promise.all(
    last7Days.map(async (day) => {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const sum = await prisma.transaction.aggregate({
        where: { type: "INCOMING", createdAt: { gte: dayStart, lt: dayEnd } },
        _sum: { amount: true },
      });
      return {
        name: (dayNames[lang] || dayNames.en)[day.getDay()],
        revenue: Number(sum._sum.amount || 0),
      };
    })
  );

  return (
    <DashboardClient
      totalUsers={totalCustomers}
      totalOrders={totalOrders}
      revenue={revenue}
      recentOrders={recentOrders}
      changes={changes}
      chartData={chartData}
    />
  );
}
