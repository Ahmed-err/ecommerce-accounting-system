import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canOpenArea, staffHome } from "@/lib/staff-access";
import DashboardClient from "@/components/admin/DashboardClient";
import { getDashboardData } from "@/lib/dashboard";
import { adminMetadata } from "@/lib/admin-meta";

export const generateMetadata = adminMetadata("adminDashboard");

export const revalidate = 30;

export default async function AdminDashboard({ searchParams }) {
  const session = await auth();
  if (!canOpenArea(session?.user?.role, "dashboard")) {
    redirect(staffHome(session?.user?.role));
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
