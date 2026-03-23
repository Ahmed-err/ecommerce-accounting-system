import { prisma } from "@/lib/prisma";
import DashboardClient from "@/components/admin/DashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // Fetch some real numbers from our database
  const totalUsers = await prisma.user.count();
  const totalOrders = await prisma.order.count();
  
  // Calculate total revenue from transactions
  const incomingTx = await prisma.transaction.aggregate({
    where: { type: "INCOMING" },
    _sum: { amount: true }
  });
  const outgoingTx = await prisma.transaction.aggregate({
    where: { type: "OUTGOING" },
    _sum: { amount: true }
  });

  const revenue = (incomingTx._sum.amount || 0) - (outgoingTx._sum.amount || 0);

  // Fetch recent orders
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: true }
  });

  return (
    <DashboardClient 
      totalUsers={totalUsers}
      totalOrders={totalOrders}
      revenue={revenue}
      recentOrders={recentOrders}
    />
  );
}
