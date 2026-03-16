import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, ShoppingBag, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "@/components/DashboardCharts";

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dashboard Overview</h1>
        <p className="text-gray-400 text-sm">Welcome back! Analyze your store's performance and recent activity below.</p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-emerald-500 mt-1 font-medium">+20.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Customers</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalUsers}</div>
            <p className="text-xs text-blue-500 mt-1 font-medium">+18.1% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Orders</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
            <p className="text-xs text-amber-500 mt-1 font-medium">+19% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-900 border-white/5 shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Now</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Activity className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">+12</div>
            <p className="text-xs text-gray-500 mt-1">Since last hour</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Main Chart Section */}
        <Card className="bg-gray-900 border-white/5 col-span-4 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Revenue Overview</CardTitle>
            <CardDescription className="text-gray-400">Showing transaction trends for the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pb-4">
            <DashboardCharts />
          </CardContent>
        </Card>

        {/* Recent Orders Section */}
        <Card className="bg-gray-900 border-white/5 col-span-3 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-white">Recent Orders</CardTitle>
            <CardDescription className="text-gray-400">Latest 5 orders placed by customers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-xl border border-white/5 border-dashed">
                  <ShoppingBag className="h-8 w-8 text-gray-500 mb-2 opacity-50" />
                  <p className="text-sm text-gray-400 font-medium">No recent orders yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Sales will appear here automatically.</p>
                </div>
              ) : (
                recentOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0 hover:bg-white/5 rounded-lg p-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{order.user?.name || "Unknown Customer"}</p>
                      <p className="text-xs text-gray-500">{order.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-400">${order.totalAmount.toFixed(2)}</p>
                      <p className="text-[10px] font-bold tracking-wider text-amber-500 uppercase mt-0.5 bg-amber-500/10 inline-block px-1.5 py-0.5 rounded">{order.status}</p>
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
