import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";
import { getUnreadContactMessageCount } from "@/lib/contact";

export default async function AdminLayout({ children }) {
  const session = await auth();

  // Server-side auth check - customers cannot access admin
  if (!session || session.user.role === "CUSTOMER") {
    redirect("/");
  }

  const unreadContactCount = await getUnreadContactMessageCount();

  return (
    <AdminLayoutClient unreadContactCount={unreadContactCount}>{children}</AdminLayoutClient>
  );
}
