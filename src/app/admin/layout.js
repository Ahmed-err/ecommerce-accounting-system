import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";
import { getUnreadContactMessageCount } from "@/lib/contact";
import { isStaff } from "@/lib/staff-access";

export default async function AdminLayout({ children }) {
  const session = await auth();

  // Server-side auth check - only staff reach admin
  if (!isStaff(session?.user?.role)) {
    redirect("/");
  }

  const unreadContactCount = await getUnreadContactMessageCount();

  return (
    <AdminLayoutClient
      role={session.user.role}
      unreadContactCount={unreadContactCount}
    >
      {children}
    </AdminLayoutClient>
  );
}
