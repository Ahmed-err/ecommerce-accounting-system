import { adminMetadata } from "@/lib/admin-meta";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { staffCanViewModule } from "@/lib/permissions-policy";
import SuppliersModuleClient from "@/components/admin/SuppliersModuleClient";

export const dynamic = "force-dynamic";

export const generateMetadata = adminMetadata("adminSuppliersTitle");

export default async function AdminSuppliersPage() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!(await staffCanViewModule(session.user.role, "inventory"))) {
    redirect("/admin");
  }
  return <SuppliersModuleClient role={session.user.role} />;
}
