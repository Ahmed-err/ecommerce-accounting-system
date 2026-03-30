import { auth } from "@/auth";
import { redirect } from "next/navigation";
import NotificationsPageClient from "@/components/admin/NotificationsPageClient";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/admin");
  }
  return <NotificationsPageClient />;
}
