import { adminMetadata } from "@/lib/admin-meta";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canOpenArea, staffHome } from "@/lib/staff-access";
import SuppliersModuleClient from "@/components/admin/SuppliersModuleClient";

export const dynamic = "force-dynamic";

export const generateMetadata = adminMetadata("adminSuppliersTitle");

export default async function AdminSuppliersPage() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "MANAGER", "ACCOUNTANT"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!canOpenArea(session.user.role, "suppliers")) {
    redirect(staffHome(session?.user?.role));
  }
  return <SuppliersModuleClient role={session.user.role} />;
}
