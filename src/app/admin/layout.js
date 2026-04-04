import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";
import { getUnreadContactMessageCount } from "@/lib/contact";
import { getNavPermissionMap } from "@/lib/permissions-policy";

export default async function AdminLayout({ children }) {
  const session = await auth();

  // Server-side auth check - customers cannot access admin
  if (!session || session.user.role === "CUSTOMER") {
    redirect("/");
  }

  const [unreadContactCount, permissionNavMap] = await Promise.all([
    getUnreadContactMessageCount(),
    getNavPermissionMap(session.user.role),
  ]);

  return (
    <AdminLayoutClient
      unreadContactCount={unreadContactCount}
      permissionNavMap={permissionNavMap}
    >
      {children}
    </AdminLayoutClient>
  );
}
