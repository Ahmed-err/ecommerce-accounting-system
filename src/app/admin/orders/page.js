import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getOrdersTabData } from "@/app/actions/orders";
import OrdersModuleClient from "@/components/orders/OrdersModuleClient";

export const metadata = {
  title: "Orders Management | Admin Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    redirect("/admin");
  }

  const params = await searchParams;
  const activeTab = params?.tab || "all";

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const initialData = await getOrdersTabData(activeTab, {
    search: params?.search || "",
    status: params?.status || "all",
    source: params?.source || "all",
    page: params?.page ? parseInt(params.page) : 1,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  });

  const permissions = { role: session.user.role };

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {t.adminOrders || (lang === "ar" ? "إدارة الطلبات" : "Orders Management")}
        </h1>
        <p className="text-gray-400 mt-1">
          {t.adminRecentOrders || (lang === "ar" ? "عرض وإدارة طلبات العملاء." : "View and manage customer orders.")}
        </p>
      </div>

      <OrdersModuleClient
        initialData={initialData?.ok ? initialData : null}
        initialTab={activeTab}
        permissions={permissions}
      />
    </div>
  );
}
