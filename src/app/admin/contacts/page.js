import { adminMetadata } from "@/lib/admin-meta";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { staffCanViewModule } from "@/lib/permissions-policy";
import ContactsModuleClient from "@/components/admin/ContactsModuleClient";

export const dynamic = "force-dynamic";

export const generateMetadata = adminMetadata("adminContactsTitle");

export default async function AdminContactsPage() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!(await staffCanViewModule(session.user.role, "store"))) {
    redirect("/admin");
  }
  return <ContactsModuleClient />;
}
