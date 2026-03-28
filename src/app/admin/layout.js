import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({ children }) {
  const session = await auth();
  
  // Server-side auth check - customers cannot access admin
  if (!session || session.user.role === "CUSTOMER") {
    redirect("/");
  }
  
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
