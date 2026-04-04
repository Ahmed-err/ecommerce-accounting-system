import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { staffCanViewModule } from "@/lib/permissions-policy";
import DashboardClient from "@/components/admin/DashboardClient";
import { getDashboardData } from "@/lib/dashboard";

export const revalidate = 30;

export default async function AdminDashboard({ searchParams }) {
  const session = await auth();
  if (session?.user?.role === "CASHIER") {
    redirect("/admin/orders");
  }
  if (session?.user?.role === "MANAGER" && !(await staffCanViewModule(session.user.role, "store"))) {
    redirect("/admin/orders");
  }

  const sp = await searchParams;
  const data = await getDashboardData({
    range: sp?.range || "month",
    from: sp?.from,
    to: sp?.to,
    view: sp?.view || "monthly",
  });
  return (
    <DashboardClient data={data} filters={{ range: sp?.range || "month", view: sp?.view || "monthly", from: sp?.from || "", to: sp?.to || "" }} />
  );
}
