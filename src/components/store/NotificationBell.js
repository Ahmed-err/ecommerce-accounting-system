"use client";

import { useSession } from "next-auth/react";
import NotificationBell from "@/components/admin/NotificationBell";

export default function StoreNotificationBell() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";
  return <NotificationBell customerOnly={!isAdmin} />;
}
