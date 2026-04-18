import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { staffCanViewModule } from "@/lib/permissions-policy";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";
import { getOrdersTabData } from "@/app/actions/orders";
import OrdersModuleClient from "@/components/orders/OrdersModuleClient";

export const metadata = {
  title: "Orders Management | Admin Dashboard",
};

export const dynamic = "force-dynamic";

function buildOrdersSearchParams(params) {
  const p = new URLSearchParams();
  if (!params) return p;
  for (const key of Object.keys(params)) {
    if (key === "tab") continue;
    const val = params[key];
    if (val == null || val === "") continue;
    if (Array.isArray(val)) {
      val.forEach((v) => p.append(key, String(v)));
    } else {
      p.set(key, String(val));
    }
  }
  return p;
}

export default async function AdminOrdersPage({ searchParams }) {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    redirect("/admin");
  }
  if (!(await staffCanViewModule(session.user.role, "orders"))) {
    redirect("/admin");
  }

  const params = await searchParams;
  let activeTab = params?.tab || "all";
  if (session.user.role === "CASHIER" && activeTab === "reports") {
    const p = buildOrdersSearchParams(params);
    p.set("tab", "all");
    redirect(`/admin/orders?${p.toString()}`);
  }

  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value || "ar";
  const t = translations[lang];
  const isRTL = lang === "ar";

  const listQuery = {
    search: params?.search || "",
    status: params?.status || "all",
    source: params?.source || "all",
    paymentMethod: params?.paymentMethod || "all",
    page: params?.page ? parseInt(params.page, 10) || 1 : 1,
    dateFrom: params?.dateFrom,
    dateTo: params?.dateTo,
  };

  const initialData = await getOrdersTabData(activeTab, listQuery);

  const permissions = { role: session.user.role };

  return (
    <div className={`space-y-6 ${isRTL ? "text-right" : "text-left"}`} dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t.adminOrders || (lang === "ar" ? "إدارة الطلبات" : "Orders Management")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.adminRecentOrders || (lang === "ar" ? "عرض وإدارة طلبات العملاء." : "View and manage customer orders.")}
        </p>
      </div>

      <OrdersModuleClient
        initialData={initialData?.ok ? initialData : null}
        initialTab={activeTab}
        initialListQuery={listQuery}
        permissions={permissions}
      />
    </div>
  );
}
