import { adminMetadata } from "@/lib/admin-meta";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { canOpenArea, staffHome } from "@/lib/staff-access";
import ContactsModuleClient from "@/components/admin/ContactsModuleClient";

export const dynamic = "force-dynamic";

export const generateMetadata = adminMetadata("adminContactsTitle");

export default async function AdminContactsPage() {
  const session = await auth();
  if (!session?.user?.role || !["ADMIN", "MANAGER", "SUPPORT"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!canOpenArea(session.user.role, "contacts")) {
    redirect(staffHome(session?.user?.role));
  }
  return <ContactsModuleClient />;
}
