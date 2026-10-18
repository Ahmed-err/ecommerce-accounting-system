"use client";

import { useSession } from "next-auth/react";
import NotificationBell from "@/components/admin/NotificationBell";

export default function StoreNotificationBell() {
  const { data: session } = useSession();
  const isAdmin = ["ADMIN", "MANAGER", "SUPPORT"].includes(session?.user?.role);
  return <NotificationBell customerOnly={!isAdmin} />;
}
